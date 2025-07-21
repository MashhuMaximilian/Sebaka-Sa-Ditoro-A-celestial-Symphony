
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


    const allBodiesRef = useRef<THREE.Mesh[]>([]);
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
        
        // Clear previous objects if any
        allBodiesRef.current.forEach(obj => scene.remove(obj));
        orbitMeshesRef.current.forEach(obj => scene.remove(obj));
        allBodiesRef.current = [];
        planetMeshesRef.current = [];
        orbitMeshesRef.current = [];
        
        bodyData.forEach(body => {
            const mesh = createBodyMesh(body, viewFromSebaka, sebakaGridTexture);
            if (body.name === 'Sebaka') {
                sebakaRadiusRef.current = body.size;
            }
            scene.add(mesh);
            allBodiesRef.current.push(mesh);
            if (body.type === 'Planet') planetMeshesRef.current.push(mesh);
            
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
        
        allBodiesRef.current.forEach(mesh => {
            const data = bodyData.find(d => d.name === mesh.name);
            if (data?.orbitRadius) {
                mesh.position.set(data.orbitRadius, 0, 0);
            }
        });

        setIsInitialized(true);

        const handleResize = () => {
            if (cameraRef.current && rendererRef.current && mountRef.current) {
                cameraRef.current.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
                cameraRef.current.updateProjectionMatrix();
                rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
            }
        };
        window.addEventListener("resize", handleResize);

        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
        }
        animate();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);

            if (controlsRef.current) {
                controlsRef.current.dispose();
            }

            if (sceneRef.current) {
                // Proper cleanup of all objects in the scene
                sceneRef.current.traverse(object => {
                    if (object instanceof THREE.Mesh) {
                        if (object.geometry) {
                            object.geometry.dispose();
                        }
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(material => {
                                    if(material.map) material.map.dispose();
                                    material.dispose();
                                });
                            } else {
                                if (object.material.map) object.material.map.dispose();
                                object.material.dispose();
                            }
                        }
                    }
                });
                 // Clear all children from the scene
                while(sceneRef.current.children.length > 0){ 
                    sceneRef.current.remove(sceneRef.current.children[0]); 
                }
            }
            
            if (rendererRef.current) {
                // Ensure the WebGL context is lost
                rendererRef.current.forceContextLoss();
                rendererRef.current.dispose();
                // Remove the canvas from the DOM
                if (mountRef.current && rendererRef.current.domElement.parentNode === mountRef.current) {
                    mountRef.current.removeChild(rendererRef.current.domElement);
                }
            }
            
            // Explicitly set refs to undefined
            rendererRef.current = undefined;
            sceneRef.current = undefined;
            cameraRef.current = undefined;
            controlsRef.current = undefined;

            setIsInitialized(false);
        };
    }, [bodyData, setIsInitialized, viewFromSebaka, sebakaGridTexture, usePlainOrbits]);

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
