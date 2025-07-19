
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { createBodyMesh, createGridTexture } from "../utils/createBodyMesh";
import { createOrbitMesh } from "../utils/createOrbitMesh";
import type { BodyData } from "./useBodyData";
import { createStarfield } from "../utils/createStarfield";
import { MaterialProperties } from "@/types";

interface InitializeSceneProps {
    bodyData: BodyData[];
    setIsInitialized: (isInitialized: boolean) => void;
    materialProperties: MaterialProperties;
    viewFromSebaka: boolean;
}

export const useInitializeScene = ({ bodyData, setIsInitialized, materialProperties, viewFromSebaka }: InitializeSceneProps) => {
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
    const viridisOriginalColorRef = useRef(new THREE.Color("#9ACD32"));
        
    const goldenGiverLightRef = useRef<THREE.DirectionalLight>();
    const twilightLightRef = useRef<THREE.DirectionalLight>();

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
        
        const ambientLight = new THREE.AmbientLight(0x404040, 0.02);
        scene.add(ambientLight);

        const goldenGiverLight = new THREE.DirectionalLight(0xfff8e7, 1.8);
        goldenGiverLight.castShadow = true;
        goldenGiverLight.shadow.mapSize.width = 2048;
        goldenGiverLight.shadow.mapSize.height = 2048;
        goldenGiverLight.shadow.camera.near = 0.5;
        goldenGiverLight.shadow.camera.far = 500;
        goldenGiverLight.shadow.camera.left = -50;
        goldenGiverLight.shadow.camera.right = 50;
        goldenGiverLight.shadow.camera.top = 50;
        goldenGiverLight.shadow.camera.bottom = -50;
        scene.add(goldenGiverLight);
        goldenGiverLightRef.current = goldenGiverLight;
        
        const twilightLight = new THREE.DirectionalLight(0xfff0d4, 1.0);
        twilightLight.castShadow = true;
        twilightLight.shadow.mapSize.width = 1024;
        twilightLight.shadow.mapSize.height = 1024;
        twilightLight.shadow.camera.near = 0.5;
        twilightLight.shadow.camera.far = 500;
        twilightLight.shadow.camera.left = -40;
        twilightLight.shadow.camera.right = 40;
        twilightLight.shadow.camera.top = 40;
        twilightLight.shadow.camera.bottom = -40;
        scene.add(twilightLight);
        twilightLightRef.current = twilightLight;

        // Clear previous objects if any
        allBodiesRef.current.forEach(obj => scene.remove(obj));
        orbitMeshesRef.current.forEach(obj => scene.remove(obj));
        allBodiesRef.current = [];
        planetMeshesRef.current = [];
        orbitMeshesRef.current = [];
        
        bodyData.forEach(body => {
            const mesh = createBodyMesh(body, viridisOriginalColorRef, materialProperties, viewFromSebaka, sebakaGridTexture);
            if (body.name === 'Sebaka') {
                sebakaRadiusRef.current = body.size;
            }
            scene.add(mesh);
            allBodiesRef.current.push(mesh);
            if (body.type === 'Planet') planetMeshesRef.current.push(mesh);
            
            const orbit = createOrbitMesh(body);
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
            setIsInitialized(false);
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener("resize", handleResize);

            if (controlsRef.current) {
                controlsRef.current.dispose();
            }

            if (sceneRef.current) {
                sceneRef.current.traverse(object => {
                    if (object instanceof THREE.Mesh) {
                        if (object.geometry) object.geometry.dispose();
                        if (object.material) {
                            if (Array.isArray(object.material)) {
                                object.material.forEach(material => {
                                    Object.values(material).forEach(prop => {
                                        if (prop instanceof THREE.Texture) {
                                            prop.dispose();
                                        }
                                    });
                                    material.dispose()
                                });
                            } else if (object.material instanceof THREE.Material) {
                                Object.values(object.material).forEach(prop => {
                                    if (prop instanceof THREE.Texture) {
                                        prop.dispose();
                                    }
                                });
                                object.material.dispose();
                            }
                        }
                    }
                });
                sceneRef.current.clear();
            }
            
            if (rendererRef.current) {
                rendererRef.current.forceContextLoss();
                rendererRef.current.dispose();
                if (mountRef.current && rendererRef.current.domElement.parentNode === mountRef.current) {
                    mountRef.current.removeChild(rendererRef.current.domElement);
                }
            }
        };
    }, [bodyData, setIsInitialized, materialProperties, viewFromSebaka, sebakaGridTexture]);

    return {
        mountRef,
        sceneRef,
        cameraRef,
        rendererRef,
        controlsRef,
        allBodiesRef,
        planetMeshesRef,
        orbitMeshesRef,
        viridisOriginalColorRef,
        beaconPositionRef,
        sebakaRadiusRef,
        originalCameraPosRef,
        goldenGiverLightRef,
        twilightLightRef
    };
};
