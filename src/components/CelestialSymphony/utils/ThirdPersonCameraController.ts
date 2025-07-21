
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
    public camera: THREE.PerspectiveCamera;
    public character: SphericalCharacterCube;
    
    // Public properties to be controlled by sliders
    public distance: number = 2.0;
    public pitch: number = 45; // Vertical angle
    public yaw: number = 0;   // Horizontal angle around character

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

        const characterWorldQuaternion = new THREE.Quaternion();
        characterMesh.getWorldQuaternion(characterWorldQuaternion);
        
        // 2. Calculate the ideal camera position in local space
        const offset = new THREE.Vector3(0, 0, this.distance);
        
        // Create rotation quaternions for pitch and yaw
        // Pitch (up/down) is relative to the camera's local X-axis
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), 
            THREE.MathUtils.degToRad(this.pitch)
        );

        // Yaw (left/right orbit) is relative to the character's local Y-axis (their "up")
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), 
            THREE.MathUtils.degToRad(this.yaw)
        );

        // Combine rotations: yaw first, then pitch
        const totalRotation = new THREE.Quaternion().multiplyQuaternions(yawQuat, pitchQuat);
        
        // Apply this rotation to the base offset
        offset.applyQuaternion(totalRotation);

        // 3. Transform the local offset into the character's world space
        offset.applyQuaternion(characterWorldQuaternion);
        
        const desiredPosition = characterWorldPosition.clone().add(offset);
        
        // 4. Smoothly interpolate camera position
        const lerpSpeed = 1.0 - Math.exp(-this.lerpFactor * 60 * deltaTime);
        if(this.camera.position.length() > 0.01){ // Avoid lerping from (0,0,0) on first frame
            this.camera.position.lerp(desiredPosition, lerpSpeed);
        } else {
            this.camera.position.copy(desiredPosition);
        }
        
        // 5. Set camera's "up" vector and look at the character
        // Get the character's "up" vector in world space
        const characterUp = new THREE.Vector3(0, 1, 0).applyQuaternion(characterWorldQuaternion);
        this.camera.up.copy(characterUp);
        
        const lookAtTarget = characterWorldPosition.clone().addScaledVector(characterUp, 0.1); // Look slightly above the character's feet
        this.camera.lookAt(lookAtTarget);
    }
}
