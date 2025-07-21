
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
    public camera: THREE.PerspectiveCamera;
    public character: SphericalCharacterCube;
    
    public distance: number = 5.0;
    public pitch: number = 20; // Degrees
    private lerpFactor: number = 0.05;

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
        
        const characterWorldQuaternion = new THREE.Quaternion();
        characterMesh.getWorldQuaternion(characterWorldQuaternion);

        // The character's "up" vector in world space, based on its orientation
        const up = new THREE.Vector3(0, 1, 0).applyQuaternion(characterWorldQuaternion);
        
        // The character's "forward" vector in world space
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterWorldQuaternion);
        
        // 2. Calculate the ideal camera position
        // Start behind the character, move back by distance, and up by pitch
        const pitchRad = THREE.MathUtils.degToRad(this.pitch);
        const offset = forward.clone().multiplyScalar(-this.distance);
        offset.addScaledVector(up, this.distance * Math.sin(pitchRad));
        offset.normalize().multiplyScalar(this.distance); // Maintain consistent distance
        
        const desiredPosition = characterWorldPosition.clone().add(offset);
        
        // 3. Smoothly interpolate camera position
        const lerpSpeed = 1.0 - Math.exp(-this.lerpFactor * 60 * deltaTime);
        this.camera.position.lerp(desiredPosition, lerpSpeed);
        
        // 4. Always look at the character's head
        const lookAtTarget = characterWorldPosition.clone().addScaledVector(up, 0.1);
        this.camera.lookAt(lookAtTarget);
    }
}
