
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
    public camera: THREE.PerspectiveCamera;
    public character: SphericalCharacterCube;
    
    // Public properties to be controlled by sliders
    public distance: number = 2.0;
    public pitch: number = 45; // Vertical angle
    public yaw: number = 0;   // Horizontal angle

    private lerpFactor: number = 0.08;

    constructor(camera: THREE.PerspectiveCamera, character: SphericalCharacterCube) {
        this.camera = camera;
        this.character = character;
    }

    updateCamera(deltaTime: number) {
        if (!this.character || !this.character.characterMesh) return;
        
        const characterMesh = this.character.characterMesh;
        
        // 1. Get character's absolute world position and orientation
        const characterWorldPosition = new THREE.Vector3();
        characterMesh.getWorldPosition(characterWorldPosition);
        
        const characterUp = new THREE.Vector3(0, 1, 0);
        characterUp.applyQuaternion(characterMesh.getWorldQuaternion(new THREE.Quaternion()));

        // 2. Calculate the ideal camera position
        // Start with a basic offset vector
        const offset = new THREE.Vector3(0, 0, this.distance);

        // Create quaternions for pitch and yaw rotations
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), 
            THREE.MathUtils.degToRad(this.pitch)
        );
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), 
            THREE.MathUtils.degToRad(this.yaw)
        );

        // Combine rotations: apply yaw first, then pitch
        const totalRotation = new THREE.Quaternion().multiplyQuaternions(yawQuat, pitchQuat);
        offset.applyQuaternion(totalRotation);
        
        // Now, transform this local offset into the character's world space
        offset.applyQuaternion(characterMesh.getWorldQuaternion(new THREE.Quaternion()));
        
        const desiredPosition = characterWorldPosition.clone().add(offset);
        
        // 3. Smoothly interpolate camera position
        const lerpSpeed = 1.0 - Math.exp(-this.lerpFactor * 60 * deltaTime);
        if(this.camera.position.length() > 0){ // Avoid lerping from (0,0,0) on first frame
            this.camera.position.lerp(desiredPosition, lerpSpeed);
        } else {
            this.camera.position.copy(desiredPosition);
        }
        
        // 4. Set camera's "up" vector and look at the character
        // This is crucial for stability on a sphere
        this.camera.up.copy(characterUp);
        
        const lookAtTarget = characterWorldPosition.clone().addScaledVector(characterUp, 0.1); // Look slightly above the character's feet
        this.camera.lookAt(lookAtTarget);
    }
}
