
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
    public camera: THREE.PerspectiveCamera;
    public character: SphericalCharacterCube;
    
    public distance: number = 2.0;
    public pitch: number = 45; // Vertical angle
    public yaw: number = 0; // Horizontal angle
    private lerpFactor: number = 0.08;

    constructor(camera: THREE.PerspectiveCamera, character: SphericalCharacterCube) {
        this.camera = camera;
        this.character = character;
    }

    updateCamera(deltaTime: number) {
        if (!this.character || !this.character.characterMesh) return;
        
        const characterMesh = this.character.characterMesh;
        
        // 1. Get the character's current world position and orientation
        const characterWorldPosition = new THREE.Vector3();
        characterMesh.getWorldPosition(characterWorldPosition);
        
        const characterUp = new THREE.Vector3(0, 1, 0);
        characterUp.applyQuaternion(characterMesh.getWorldQuaternion(new THREE.Quaternion()));

        // 2. Calculate ideal camera position based on pitch, yaw, and distance
        const pitchRad = THREE.MathUtils.degToRad(this.pitch);
        const yawRad = THREE.MathUtils.degToRad(this.yaw);
        
        // Start with a basic offset behind the character
        const offset = new THREE.Vector3(0, 0, this.distance);

        // Apply pitch (vertical rotation)
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchRad);
        offset.applyQuaternion(pitchQuat);

        // Apply yaw (horizontal rotation around the character's up vector)
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(characterUp, yawRad);
        offset.applyQuaternion(yawQuat);

        // Add the final offset to the character's world position
        const desiredPosition = characterWorldPosition.clone().add(offset);
        
        // 3. Smoothly interpolate camera position
        const lerpSpeed = 1.0 - Math.exp(-this.lerpFactor * 60 * deltaTime);
        this.camera.position.lerp(desiredPosition, lerpSpeed);
        
        // 4. Always look at the character's head and maintain correct orientation
        const lookAtTarget = characterWorldPosition.clone().addScaledVector(characterUp, 0.1);
        this.camera.up.copy(characterUp);
        this.camera.lookAt(lookAtTarget);
    }
}
