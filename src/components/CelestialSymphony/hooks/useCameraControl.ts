
import { useEffect } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { BodyData } from "./useBodyData";

interface CameraControlProps {
    camera: THREE.PerspectiveCamera | undefined;
    controls: OrbitControls | undefined;
    cameraTarget: string | null;
    viewFromSebaka: boolean;
    cameraFov: number;
    resetViewToggle: boolean;
    allBodiesRef: React.MutableRefObject<THREE.Mesh[]>;
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
    cameraFov,
    resetViewToggle,
    allBodiesRef,
    bodyData,
    beaconPositionRef,
    originalCameraPosRef,
    orbitMeshesRef,
}: CameraControlProps) => {

    useEffect(() => {
        if (!camera || !controls) return;

        const followTarget = () => {
            if (cameraTarget && !viewFromSebaka) {
                const targetBodyMesh = allBodiesRef.current.find(b => b.name === cameraTarget);
                if (targetBodyMesh) {
                    controls.target.copy(targetBodyMesh.position);
                } else if (cameraTarget === 'Binary Stars') {
                    controls.target.set(0,0,0);
                } else if (cameraTarget === 'Beacon System') {
                    controls.target.copy(beaconPositionRef.current);
                }
            }
        };

        const animationId = requestAnimationFrame(function animate() {
            followTarget();
            requestAnimationFrame(animate);
        });

        return () => cancelAnimationFrame(animationId);

    }, [cameraTarget, viewFromSebaka, allBodiesRef, camera, controls, beaconPositionRef]);

    useEffect(() => {
        if (!camera || !controls) return;
        
        let targetPosition = new THREE.Vector3(0, 0, 0);
        let desiredCameraPosition: THREE.Vector3 | null = null;
        
        if (cameraTarget === 'Binary Stars') {
            targetPosition.set(0, 0, 0);
            desiredCameraPosition = new THREE.Vector3(0, 200, 400);
        } else if (cameraTarget === 'Beacon System') {
            targetPosition.copy(beaconPositionRef.current);
            desiredCameraPosition = new THREE.Vector3(targetPosition.x, targetPosition.y + 1000, targetPosition.z + 2000);
        } else {
            const targetBodyMesh = allBodiesRef.current.find(b => b.name === cameraTarget);
            const targetData = bodyData.find(b => b.name === cameraTarget);
            if (targetBodyMesh && targetData) {
                targetPosition.copy(targetBodyMesh.position);
                const offset = targetData.size * 4;
                desiredCameraPosition = new THREE.Vector3(targetPosition.x, targetPosition.y + offset / 2, targetPosition.z + offset);
            }
        }
  
        if (desiredCameraPosition) {
          camera.position.copy(desiredCameraPosition);
          controls.target.copy(targetPosition);
          controls.update();
        }
      }, [cameraTarget, bodyData, viewFromSebaka, allBodiesRef, beaconPositionRef, camera, controls]);

    useEffect(() => {
        if (!camera || !controls) return;
        
        orbitMeshesRef.current.forEach(orbit => orbit.visible = !viewFromSebaka);
        
        if (viewFromSebaka) {
            camera.near = 0.001;
            controls.enabled = false;
        } else {
            camera.near = 0.001;
            controls.enabled = true;
        }
        camera.updateProjectionMatrix();
    }, [viewFromSebaka, resetViewToggle, camera, controls, orbitMeshesRef]);

    useEffect(() => {
        if (!camera || !controls) return;

        if (!viewFromSebaka && !cameraTarget) {
            camera.position.lerp(originalCameraPosRef.current, 0.05);
            controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.05);
        }
        controls.update();
    }, [cameraTarget, resetViewToggle, viewFromSebaka, camera, controls, originalCameraPosRef]);

    useEffect(() => {
        if (camera && camera.fov !== cameraFov) {
            camera.fov = cameraFov;
            camera.updateProjectionMatrix();
        }
    }, [camera, cameraFov]);
};
