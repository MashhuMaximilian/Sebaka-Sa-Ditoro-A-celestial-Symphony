
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
    public camera: THREE.PerspectiveCamera;
    public character: SphericalCharacterCube;
    
    // Public properties to be controlled by sliders
    public distance: number = 2.0;
    public pitch: number = 45; // Vertical angle
    public yaw: number = 0;   // Horizontal angle around character

    private characterWorldPosition = new THREE.Vector3();
    private characterWorldQuaternion = new THREE.Quaternion();

    constructor(camera: THREE.PerspectiveCamera, character: SphericalCharacterCube) {
        this.camera = camera;
        this.character = character;
    }

    updateCamera() {
        if (!this.character || !this.character.characterMesh) return;
        
        // 1. Get the character's latest world position and orientation
        this.character.characterMesh.getWorldPosition(this.characterWorldPosition);
        this.character.characterMesh.getWorldQuaternion(this.characterWorldQuaternion);

        // 2. Start with a basic offset vector in the character's local "forward" direction
        const offset = new THREE.Vector3(0, 0, this.distance);

        // 3. Create rotation quaternions for pitch (vertical angle) and yaw (horizontal orbit)
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0), 
            THREE.MathUtils.degToRad(-this.pitch)
        );
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), 
            THREE.MathUtils.degToRad(this.yaw)
        );

        // 4. Combine yaw and pitch rotations and apply to the offset
        const totalRotation = new THREE.Quaternion().multiply(yawQuat, pitchQuat);
        offset.applyQuaternion(totalRotation);

        // 5. Apply the character's world rotation to the camera offset.
        // This makes the camera orbit relative to the character's facing direction.
        offset.applyQuaternion(this.characterWorldQuaternion);
        
        // 6. Calculate the final camera position by adding the offset to the character's world position.
        const cameraPosition = this.characterWorldPosition.clone().add(offset);
        
        this.camera.position.copy(cameraPosition);
        
        // 7. Get the character's "up" vector in world space and apply it to the camera.
        // This is CRUCIAL for keeping the camera oriented correctly with the planet's surface.
        const upVector = new THREE.Vector3(0, 1, 0);
        upVector.applyQuaternion(this.characterWorldQuaternion);
        this.camera.up.copy(upVector);

        // 8. Look at the character's position.
        this.camera.lookAt(this.characterWorldPosition);
    }
}
