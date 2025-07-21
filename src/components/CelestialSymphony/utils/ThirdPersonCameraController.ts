
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
    public camera: THREE.PerspectiveCamera;
    public character: SphericalCharacterCube;
    
    // Public properties to be controlled by sliders
    public distance: number = 2.0;
    public pitch: number = 45; // Vertical angle
    public yaw: number = 0;   // Horizontal angle around character

    constructor(camera: THREE.PerspectiveCamera, character: SphericalCharacterCube) {
        this.camera = camera;
        this.character = character;
    }

    updateCamera() {
        if (!this.character || !this.character.characterMesh) return;
        
        // 1. Calculate the ideal camera position in the character's LOCAL space.
        // The character is our stable frame of reference (0,0,0).
        const localOffset = new THREE.Vector3(0, 0, this.distance);
        
        // 2. Create rotation quaternions for pitch and yaw.
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), 
            THREE.MathUtils.degToRad(this.pitch)
        );
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), 
            THREE.MathUtils.degToRad(this.yaw)
        );

        // 3. Combine rotations and apply to the local offset.
        // Yaw first to orbit, then pitch to set the angle.
        const totalRotation = new THREE.Quaternion().multiplyQuaternions(yawQuat, pitchQuat);
        localOffset.applyQuaternion(totalRotation);

        // 4. Set the camera's local position. Since the camera is a child
        // of the character, this is all that's needed.
        this.camera.position.copy(localOffset);
        
        // 5. Look back at the character's local origin.
        // We can add a small vertical offset to the target to aim for the "head".
        const lookAtTarget = new THREE.Vector3(0, 0.01, 0); 
        this.camera.lookAt(lookAtTarget);
    }
}
