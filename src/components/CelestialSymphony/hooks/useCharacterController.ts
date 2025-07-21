
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { eyeHeight } from '../constants/config';

interface CharacterControllerProps {
    camera?: THREE.PerspectiveCamera;
    planetMesh?: THREE.Mesh;
    planetBody?: THREE.Object3D;
    planetRadius: number;
    enabled: boolean;
}

interface PlayerInputs {
    pitch: number;
    yaw: number;
    lat: number;
    lon: number;
}

export const useCharacterController = ({
    camera,
    planetMesh,
    planetBody,
    planetRadius,
    enabled,
}: CharacterControllerProps) => {
    const playerRef = useRef<THREE.Object3D>();
    const inputsRef = useRef<PlayerInputs>({ pitch: 0, yaw: 0, lat: 0, lon: 0 });

    // Initialize the controller. This function is memoized to only create the player once.
    const controller = useMemo(() => {
        if (!camera || !planetMesh || !planetBody || !enabled) {
            return null;
        }

        const player = new THREE.Object3D();
        player.name = 'SebakaPlayer';
        
        planetMesh.parent?.add(player);
        player.add(camera);
        camera.position.set(0, eyeHeight, 0);
        
        playerRef.current = player;
        
        const update = () => {
            const player = playerRef.current;
            const { lat, lon, pitch, yaw } = inputsRef.current;
            if (!player || !planetMesh || !planetBody) return;

            const playerLocalPosition = new THREE.Vector3();
            playerLocalPosition.setFromSphericalCoords(
                planetRadius,
                THREE.MathUtils.degToRad(90 - lat),
                THREE.MathUtils.degToRad(lon)
            );

            const tiltQuaternion = new THREE.Quaternion().setFromEuler(planetMesh.rotation);
            playerLocalPosition.applyQuaternion(tiltQuaternion);

            player.position.copy(planetBody.position).add(playerLocalPosition);

            const up = player.position.clone().sub(planetBody.position).normalize();
            player.up.copy(up);

            const lookAtTarget = player.position.clone().add(new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion));
            player.lookAt(lookAtTarget);

            camera.rotation.set(0, 0, 0, 'YXZ');
            camera.rotateX(THREE.MathUtils.degToRad(pitch));
            camera.rotateY(THREE.MathUtils.degToRad(yaw));
        };

        const updateInputs = (newInputs: Partial<PlayerInputs>) => {
            inputsRef.current = { ...inputsRef.current, ...newInputs };
        };

        const cleanup = () => {
            const player = playerRef.current;
            if (player && player.parent) {
                player.parent.remove(player);
                player.remove(camera); 
            }
        };

        return { update, updateInputs, cleanup };

    }, [enabled, camera, planetMesh, planetBody, planetRadius]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            controller?.cleanup();
        };
    }, [controller]);

    return controller;
};
