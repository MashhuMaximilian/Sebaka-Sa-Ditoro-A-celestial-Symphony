
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBodyMesh, createGridTexture } from "../utils/createBodyMesh";
import { createOrbitMesh } from "../utils/createOrbitMesh";
import type { BodyData } from "./useBodyData";
import { createStarfield } from "../utils/createStarfield";

interface InitializeSceneProps {
    bodyData: BodyData[];
    setIsInitialized: (isInitialized: boolean) => void;
    viewFromSebaka: boolean;
    usePlainOrbits: boolean;
}

export const useInitializeScene = ({ bodyData, setIsInitialized, viewFromSebaka, usePlainOrbits }: InitializeSceneProps) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer>();
    const sceneRef = useRef<THREE.Scene>();
    const cameraRef = useRef<THREE.PerspectiveCamera>();
    const controlsRef = useRef<OrbitControls>();
    const [sebakaGridTexture, setSebakaGridTexture] = useState<THREE.CanvasTexture | null>(null);


    const allBodiesRef = useRef<THREE.Object3D[]>([]);
    const planetMeshesRef = useRef<THREE.Mesh[]>([]);
    const orbitMeshesRef = useRef<THREE.Mesh[]>([]);
    const beaconPositionRef = useRef(new THREE.Vector3());
    const sebakaRadiusRef = useRef(0);
    const originalCameraPosRef = useRef(new THREE.Vector3(0, 400, 800));

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
        camera.position.copy(originalCameraPosRef.current);
        cameraRef.current = camera;
        
        const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        rendererRef.current = renderer;
        
        // Clean up previous renderer if it exists
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
        controls.target.set(0, 0, 0);
        controlsRef.current = controls;
        
        // Lighting is now handled by custom shaders per-planet. No scene-wide lights needed.
        
        allBodiesRef.current = [];
        planetMeshesRef.current = [];
        orbitMeshesRef.current = [];
        
        bodyData.forEach(body => {
            const bodyObject = createBodyMesh(body, viewFromSebaka, sebakaGridTexture);
            const mesh = bodyObject.getObjectByProperty('isMesh', true) as THREE.Mesh;
            
            if (body.name === 'Sebaka') {
                sebakaRadiusRef.current = body.size;
            }
            scene.add(bodyObject);
            allBodiesRef.current.push(bodyObject);
            if (mesh && body.type === 'Planet') planetMeshesRef.current.push(mesh);
            
            const orbit = createOrbitMesh(body, usePlainOrbits);
            if (orbit) {
                scene.add(orbit);
                orbitMeshesRef.current.push(orbit);
            }
        });

        const initialBeaconData = bodyData.find(d => d.name === 'Beacon');
        if (initialBeaconData?.orbitRadius) {
            beaconPositionRef.current.set(initialBeaconData.orbitRadius, 0, 0);
        }
        
        allBodiesRef.current.forEach(bodyObject => {
            const data = bodyData.find(d => d.name === bodyObject.name);
            if (data?.orbitRadius) {
                bodyObject.position.set(data.orbitRadius, 0, 0);
            }
        });

        if (viewFromSebaka) {
            const sebakaTiltAxis = allBodiesRef.current.find(p => p.name === 'Sebaka');
            if (sebakaTiltAxis) {
                const radius = sebakaRadiusRef.current + 0.1;
                camera.position.set(sebakaTiltAxis.position.x, sebakaTiltAxis.position.y, sebakaTiltAxis.position.z + radius);
                controls.target.copy(sebakaTiltAxis.position);
            }
        }


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
    }, [bodyData, viewFromSebaka, usePlainOrbits, sebakaGridTexture]);

    return {
        mountRef,
        sceneRef,
        cameraRef,
        rendererRef,
        controlsRef,
        allBodiesRef,
        planetMeshesRef,
        orbitMeshesRef,
        beaconPositionRef,
        sebakaRadiusRef,
        originalCameraPosRef,
    };
};
