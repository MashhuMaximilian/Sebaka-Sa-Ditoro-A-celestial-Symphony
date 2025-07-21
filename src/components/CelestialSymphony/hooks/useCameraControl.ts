
import { useEffect } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { BodyData } from "./useBodyData";

interface CameraControlProps {
    camera: THREE.PerspectiveCamera | undefined;
    controls: OrbitControls | undefined;
    cameraTarget: string | null;
    viewFromSebaka: boolean;
    allBodiesRef: React.MutableRefObject<THREE.Object3D[]>;
    planetMeshesRef: React.MutableRefObject<THREE.Mesh[]>;
    bodyData: BodyData[];
    beaconPositionRef: React.MutableRefObject<THREE.Vector3>;
    originalCameraPosRef: React.MutableRefObject<THREE.Vector3>;
    orbitMeshesRef: React.MutableRefObject<THREE.Mesh[]>;
}

export const useCameraControl = ({
    camera,
    controls,
    cameraTarget,
    viewFromSebaka,
    allBodiesRef,
    planetMeshesRef,
    bodyData,
    beaconPositionRef,
    originalCameraPosRef,
    orbitMeshesRef,
}: CameraControlProps) => {

    useEffect(() => {
        if (!camera || !controls) return;

        const followTarget = () => {
            if (cameraTarget && !viewFromSebaka) {
                const targetBodyObject = allBodiesRef.current.find(b => b.name === cameraTarget);
                if (targetBodyObject) {
                    controls.target.copy(targetBodyObject.position);
                } else if (cameraTarget === 'Binary Stars') {
                    controls.target.set(0,0,0);
                } else if (cameraTarget === 'Beacon System') {
                    controls.target.copy(beaconPositionRef.current);
                }
            }
        };

        const animationId = requestAnimationFrame(function animate() {
            if (!viewFromSebaka) {
                followTarget();
            }
            requestAnimationFrame(animate);
        });

        return () => cancelAnimationFrame(animationId);

    }, [cameraTarget, viewFromSebaka, allBodiesRef, camera, controls, beaconPositionRef]);

    useEffect(() => {
        if (!camera || !controls || viewFromSebaka) return;
        
        let targetPosition = new THREE.Vector3(0, 0, 0);
        let desiredCameraPosition: THREE.Vector3 | null = null;
        
        if (cameraTarget === 'Binary Stars') {
            targetPosition.set(0, 0, 0);
            desiredCameraPosition = originalCameraPosRef.current.clone();
        } else if (cameraTarget === 'Beacon System') {
            targetPosition.copy(beaconPositionRef.current);
            desiredCameraPosition = new THREE.Vector3(targetPosition.x, targetPosition.y + 1000, targetPosition.z + 2000);
        } else {
            const targetBodyObject = allBodiesRef.current.find(b => b.name === cameraTarget);
            const targetData = bodyData.find(b => b.name === cameraTarget);
            if (targetBodyObject && targetData) {
                targetPosition.copy(targetBodyObject.position);
                const offset = targetData.size * 4;
                desiredCameraPosition = new THREE.Vector3(targetPosition.x, targetPosition.y + offset / 2, targetPosition.z + offset);
            }
        }
  
        if (desiredCameraPosition) {
          camera.position.copy(desiredCameraPosition);
          controls.target.copy(targetPosition);
          controls.update();
        }
      }, [cameraTarget, bodyData, viewFromSebaka, allBodiesRef, beaconPositionRef, camera, controls, originalCameraPosRef]);

    useEffect(() => {
        if (!camera || !controls) return;
        
        if (viewFromSebaka) {
            camera.near = 0.01;
            camera.far = 100000;
            controls.enabled = false;
        } else {
            camera.near = 0.001;
            camera.far = 200000;
            controls.enabled = true;
            controls.target.set(0, 0, 0);
        }
        camera.updateProjectionMatrix();
    }, [viewFromSebaka, camera, controls]);

    useEffect(() => {
        if (camera && !viewFromSebaka) {
            camera.fov = 75; // Reset FOV for orbital view
            camera.updateProjectionMatrix();
        }
    }, [camera, viewFromSebaka]);
};
