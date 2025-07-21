
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

interface ThirdPersonCameraControllerParams {
    camera: THREE.PerspectiveCamera;
    character: SphericalCharacterCube;
    planetMesh: THREE.Mesh;
}

export class ThirdPersonCameraController {
    public camera: THREE.PerspectiveCamera;
    public character: SphericalCharacterCube;
    public planetMesh: THREE.Mesh;

    public distance: number = 2.0;
    public pitch: number = 45;
    public yaw: number = 0;

    private _raycaster = new THREE.Raycaster();

    constructor(params: ThirdPersonCameraControllerParams) {
        this.camera = params.camera;
        this.character = params.character;
        this.planetMesh = params.planetMesh;
    }

    update() {
        if (!this.character || !this.character.characterMesh) return;

        const characterMesh = this.character.characterMesh;

        // 1. Get character's world position and orientation
        const characterPosition = new THREE.Vector3();
        characterMesh.getWorldPosition(characterPosition);

        const characterQuaternion = new THREE.Quaternion();
        characterMesh.getWorldQuaternion(characterQuaternion);
        
        // 2. Calculate the ideal camera position
        // Start with a basic offset vector
        const idealOffset = new THREE.Vector3(0, 0, this.distance);

        // Create rotation quaternions for pitch (vertical angle) and yaw (horizontal orbit)
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            THREE.MathUtils.degToRad(-this.pitch)
        );
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            THREE.MathUtils.degToRad(this.yaw)
        );

        // Combine rotations and apply to the offset
        const totalRotation = new THREE.Quaternion().multiply(yawQuat, pitchQuat);
        idealOffset.applyQuaternion(totalRotation);

        // Now, orient the offset based on the character's world rotation
        idealOffset.applyQuaternion(characterQuaternion);
        
        const idealCameraPosition = new THREE.Vector3().addVectors(characterPosition, idealOffset);

        // 3. Perform collision detection
        const characterHeadPosition = characterPosition.clone().add(new THREE.Vector3(0, 0.05, 0).applyQuaternion(characterQuaternion));
        this._raycaster.set(characterHeadPosition, idealCameraPosition.clone().sub(characterHeadPosition).normalize());
        this._raycaster.far = this.distance; // Only check up to the ideal distance
        
        const intersects = this._raycaster.intersectObject(this.planetMesh);
        
        let finalCameraPosition = idealCameraPosition;

        if (intersects.length > 0) {
            // Collision detected, move camera to the intersection point (with a small buffer)
            finalCameraPosition = intersects[0].point.clone().addScaledVector(
                idealCameraPosition.clone().sub(characterHeadPosition).normalize(),
                -0.1 // a small buffer to avoid being inside the geometry
            );
        }

        // 4. Set final camera position and orientation
        this.camera.position.copy(finalCameraPosition);

        // Ensure the camera's "up" vector matches the character's "up"
        const upVector = new THREE.Vector3(0, 1, 0);
        upVector.applyQuaternion(characterQuaternion);
        this.camera.up.copy(upVector);

        // Look at a point slightly above the character's feet for a better view
        this.camera.lookAt(characterHeadPosition);
    }
}
