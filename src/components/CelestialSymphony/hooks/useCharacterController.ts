
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

        // Create the player object, which acts as the character's body/root.
        const player = new THREE.Object3D();
        player.name = 'SebakaPlayer';
        
        // Add the camera to the player object. The camera is the "head".
        player.add(camera);
        // Position the camera slightly above the player's origin (feet) to simulate eye level.
        camera.position.set(0, eyeHeight, 0);

        // Add the player to the scene graph, but not as a child of the planet mesh.
        // This is important to avoid inheriting the planet's self-rotation directly.
        planetMesh.parent?.add(player);
        playerRef.current = player;
        
        const update = () => {
            const player = playerRef.current;
            const { lat, lon, pitch, yaw } = inputsRef.current;
            if (!player || !planetMesh || !planetBody) return;

            // 1. Calculate player's position on the sphere (The "Legs")
            // This is the same spherical coordinate math as before.
            const playerLocalPosition = new THREE.Vector3();
            playerLocalPosition.setFromSphericalCoords(
                planetRadius,
                THREE.MathUtils.degToRad(90 - lat),
                THREE.MathUtils.degToRad(lon)
            );

            // 2. Apply the planet's axial tilt to the local position.
            // This ensures the player is on the correctly tilted surface.
            const tiltQuaternion = new THREE.Quaternion().setFromEuler(planetMesh.rotation);
            playerLocalPosition.applyQuaternion(tiltQuaternion);

            // 3. Set the player's world position.
            // We add the local position to the planet's orbital position.
            // This makes the player stick to the surface as it orbits, but NOT as it self-rotates.
            player.position.copy(planetBody.position).add(playerLocalPosition);

            // 4. Orient the player to stand upright on the surface (The "Body").
            // The "up" vector points from the planet's center to the player.
            const up = player.position.clone().sub(planetBody.position).normalize();
            player.up.copy(up);

            // Create a look-at target slightly ahead of the player along the surface.
            const lookAtTarget = player.position.clone().add(new THREE.Vector3(0,0,-1).applyQuaternion(player.quaternion));
            player.lookAt(lookAtTarget);

            // 5. Rotate the camera (The "Head")
            // We reset the camera's rotation and then apply pitch and yaw.
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
                player.remove(camera); // Detach camera
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
