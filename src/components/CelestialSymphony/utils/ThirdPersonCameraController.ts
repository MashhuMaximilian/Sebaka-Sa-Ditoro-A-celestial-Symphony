
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
    public camera: THREE.PerspectiveCamera;
    public character: SphericalCharacterCube;
    private planetMesh: THREE.Mesh;
    
    public distance: number = 2.0;
    public pitch: number = 20; // Degrees
    private lerpFactor: number = 0.05;

    constructor(camera: THREE.PerspectiveCamera, character: SphericalCharacterCube, planetMesh: THREE.Mesh) {
        this.camera = camera;
        this.character = character;
        this.planetMesh = planetMesh;
    }

    updateCamera(deltaTime: number) {
        if (!this.character || !this.character.characterMesh) return;
        
        const characterMesh = this.character.characterMesh;
        
        // 1. Get the character's current world position and orientation
        const characterWorldPosition = new THREE.Vector3();
        characterMesh.getWorldPosition(characterWorldPosition);
        
        const characterWorldQuaternion = new THREE.Quaternion();
        characterMesh.getWorldQuaternion(characterWorldQuaternion);

        // The character's "up" vector in world space is the direction from planet center
        const up = new THREE.Vector3().subVectors(characterWorldPosition, this.planetMesh.getWorldPosition(new THREE.Vector3())).normalize();
        this.camera.up.copy(up);

        // The character's "forward" vector in world space
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterWorldQuaternion);
        
        // 2. Calculate the ideal camera position
        const pitchRad = THREE.MathUtils.degToRad(this.pitch);
        const horizontalDistance = this.distance * Math.cos(pitchRad);
        const verticalDistance = this.distance * Math.sin(pitchRad);

        const offset = forward.clone().multiplyScalar(-horizontalDistance);
        offset.addScaledVector(up, verticalDistance);
        
        let desiredPosition = characterWorldPosition.clone().add(offset);
        
        // 3. Implement Collision Detection
        const raycaster = new THREE.Raycaster(characterWorldPosition, desiredPosition.clone().sub(characterWorldPosition).normalize());
        const intersects = raycaster.intersectObject(this.planetMesh);

        if (intersects.length > 0 && intersects[0].distance < this.distance) {
            desiredPosition.copy(intersects[0].point);
            // Add a small buffer to avoid clipping into the surface
            desiredPosition.addScaledVector(up, 0.1); 
        }

        // 4. Smoothly interpolate camera position
        const lerpSpeed = 1.0 - Math.exp(-this.lerpFactor * 60 * deltaTime);
        this.camera.position.lerp(desiredPosition, lerpSpeed);
        
        // 5. Always look at the character's head
        const lookAtTarget = characterWorldPosition.clone().addScaledVector(up, 0.1);
        this.camera.lookAt(lookAtTarget);
    }
}
