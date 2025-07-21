
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
    public camera: THREE.PerspectiveCamera;
    public character: SphericalCharacterCube;
    private planetMesh: THREE.Mesh;
    private raycaster: THREE.Raycaster;

    constructor(camera: THREE.PerspectiveCamera, character: SphericalCharacterCube, planetMesh: THREE.Mesh) {
        this.camera = camera;
        this.character = character;
        this.planetMesh = planetMesh;
        this.raycaster = new THREE.Raycaster();
        
        // IMPORTANT: Add camera as a child of the character.
        // This makes it inherit the character's position and orientation.
        this.character.characterMesh.add(this.camera);
    }

    public update(distance: number, pitch: number) {
        const pitchRad = THREE.MathUtils.degToRad(pitch);
        
        // 1. Calculate the ideal local position of the camera relative to the character
        const idealOffset = new THREE.Vector3(0, 0, distance);
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchRad);
        idealOffset.applyQuaternion(pitchQuat);
        
        // The character's head position in its local space is (0,0,0)
        const characterHeadPos = new THREE.Vector3(0,0,0);

        // 2. Check for collisions between the character and the ideal camera position
        // The raycaster needs to operate in the planet's local space.
        this.raycaster.set(characterHeadPos, idealOffset.clone().normalize());
        this.raycaster.near = 0;
        this.raycaster.far = distance;
        
        // We need to check for intersections with the planet mesh, but the ray is in character space.
        // So we create a temporary matrix to transform the ray to planet space.
        // Since the character is a direct child of the planet, this is just the character's local matrix.
        const intersects = this.raycaster.intersectObject(this.planetMesh, false);
        
        let finalPosition = idealOffset;
        if (intersects.length > 0) {
            // Collision detected! Position camera at the collision point (with a small buffer).
            const collisionPoint = intersects[0].point;
            // The intersection point is in planet space, but we need it in character space.
            // Since the ray started at the character's origin, the distance to intersection is what we need.
            const collisionDistance = intersects[0].distance;
            finalPosition = idealOffset.clone().normalize().multiplyScalar(collisionDistance * 0.9);
        }

        // 3. Set the final camera position and make it look at the character
        this.camera.position.copy(finalPosition);
        this.camera.lookAt(characterHeadPos);
    }
}

    