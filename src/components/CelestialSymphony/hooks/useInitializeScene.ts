
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBodyMesh, createGridTexture } from "../utils/createBodyMesh";
import { createOrbitMesh } from "../utils/createOrbitMesh";
import type { ProcessedBodyData } from "./useBodyData";
import { createStarfield } from "../utils/createStarfield";
import { MaterialProperties } from "@/types";
import { SphericalCharacterController } from "../utils/SphericalCharacterController";
import { calculateBodyPositions } from "../utils/calculateBodyPositions";

interface InitializeSceneProps {
    bodyData: ProcessedBodyData[];
    setIsInitialized: (isInitialized: boolean) => void;
    viewFromSebaka: boolean;
    usePlainOrbits: boolean;
    showOrbits: boolean;
    materialProperties: MaterialProperties;
}

export const useInitializeScene = ({ bodyData, setIsInitialized, viewFromSebaka, usePlainOrbits, showOrbits, materialProperties }: InitializeSceneProps) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer>();
    const sceneRef = useRef<THREE.Scene>();
    const cameraRef = useRef<THREE.PerspectiveCamera>();
    const controlsRef = useRef<OrbitControls>();
    const [sebakaGridTexture, setSebakaGridTexture] = useState<THREE.CanvasTexture | null>(null);


    const allBodiesRef = useRef<THREE.Object3D[]>([]);
    const allMeshesRef = useRef<THREE.Mesh[]>([]);
    const orbitMeshesRef = useRef<THREE.Mesh[]>([]);
    const beaconOrbitMeshesRef = useRef<THREE.Mesh[]>([]);
    const beaconPositionRef = useRef(new THREE.Vector3());
    const sebakaRadiusRef = useRef(0);
    const originalCameraPosRef = useRef(new THREE.Vector3(0, 400, 800));
    const characterMeshRef = useRef<THREE.Object3D | null>(null);
    const characterHitboxRef = useRef<THREE.Mesh | null>(null);


    useEffect(() => {
        setSebakaGridTexture(createGridTexture());
    }, []);

    useEffect(() => {
        if (!mountRef.current || !bodyData.length) return;
        if(viewFromSebaka && !sebakaGridTexture) return;

        setIsInitialized(false);
        const currentMount = mountRef.current;
        const scene = new THREE.Scene();
        sceneRef.current = scene;

        scene.background = new THREE.Color(0x000000);
        createStarfield(scene);

        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.001, 200000);
        cameraRef.current = camera;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;
        
        while (currentMount.firstChild) {
            currentMount.removeChild(currentMount.firstChild);
        }
        currentMount.appendChild(renderer.domElement);
        
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = true; 
        controls.minDistance = 1;
        controls.maxDistance = 200000;
        controlsRef.current = controls;
        
        allBodiesRef.current = [];
        allMeshesRef.current = [];
        orbitMeshesRef.current = [];
        beaconOrbitMeshesRef.current = [];
        characterMeshRef.current = null;
        characterHitboxRef.current = null;
        
        bodyData.forEach(body => {
            const bodyObject = createBodyMesh(body, viewFromSebaka, sebakaGridTexture, materialProperties[body.name]);
            const mesh = bodyObject.getObjectByProperty('isMesh', true) as THREE.Mesh;
            
            if (body.type === 'Planet' && body.name === 'Sebaka') {
                sebakaRadiusRef.current = body.size;
            }
            scene.add(bodyObject);
            allBodiesRef.current.push(bodyObject);
            if (mesh) allMeshesRef.current.push(mesh);
            
            if (showOrbits) {
                const orbit = createOrbitMesh(body, usePlainOrbits);
                if (orbit) {
                    scene.add(orbit);
                     // Orbits around Beacon need to be updated dynamically
                    if (body.name === 'Gelidis' || body.name === 'Liminis') {
                        beaconOrbitMeshesRef.current.push(orbit);
                    } else {
                        orbitMeshesRef.current.push(orbit);
                    }
                }
            }
        });
        
        const sebakaMesh = allMeshesRef.current.find(m => m.name === "Sebaka") as THREE.Mesh;
        if (viewFromSebaka && sebakaMesh) {
            const characterController = new SphericalCharacterController(sebakaMesh);
            characterMeshRef.current = characterController.characterMesh;
            characterHitboxRef.current = characterController.characterHitbox;
        }

        const initialPositions = calculateBodyPositions(0, bodyData);
        
        Object.entries(initialPositions).forEach(([name, position]) => {
             const bodyObject = allBodiesRef.current.find(b => b.name === name);
             if (bodyObject) {
                 bodyObject.position.copy(position);
             }
        });
        
        beaconPositionRef.current.copy(initialPositions['Beacon']);

        camera.position.copy(originalCameraPosRef.current);
        controls.target.set(0, 0, 0);

        setIsInitialized(true);

        const handleResize = () => {
            if (cameraRef.current && rendererRef.current && mountRef.current) {
                cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
            }
        };
        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            setIsInitialized(false);
            if (controlsRef.current) {
                controlsRef.current.dispose();
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
            if (mountRef.current && rendererRef.current?.domElement) {
                mountRef.current.removeChild(rendererRef.current.domElement);
            }
        };
    }, [bodyData, viewFromSebaka, usePlainOrbits, showOrbits, sebakaGridTexture, setIsInitialized, materialProperties]);

    return {
        mountRef,
        sceneRef,
        cameraRef,
        rendererRef,
        controlsRef,
        allBodiesRef,
        allMeshesRef: allMeshesRef,
        orbitMeshesRef,
        beaconOrbitMeshesRef,
        beaconPositionRef,
        sebakaRadiusRef,
        originalCameraPosRef,
        characterMeshRef,
        characterHitboxRef
    };
};
