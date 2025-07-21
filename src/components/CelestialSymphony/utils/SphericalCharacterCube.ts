
import * as THREE from 'three';

export class SphericalCharacterCube {
  public characterMesh: THREE.Mesh;
  public planetMesh: THREE.Mesh;
  public planetRadius: number;
  private surfaceHeight: number;
  public camera: THREE.PerspectiveCamera; // Camera is a child of the character

  constructor(planetMesh: THREE.Mesh, planetRadius: number) {
    this.planetMesh = planetMesh;
    this.planetRadius = planetRadius;
    this.surfaceHeight = 0.1; // Height above planet surface
    
    const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
    this.characterMesh = new THREE.Mesh(geometry, material);
    this.characterMesh.name = "CharacterCube";

    // IMPORTANT: Add character as a child of the planet mesh
    // This makes it inherit the planet's rotation and orbit automatically.
    this.planetMesh.add(this.characterMesh);
  }

  public update(longitude: number, latitude: number, yaw: number) {
    // 1. Calculate character's local position on the sphere surface
    const latRad = THREE.MathUtils.degToRad(90 - latitude);
    const lonRad = THREE.MathUtils.degToRad(longitude);
    
    const localPosition = new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius + this.surfaceHeight,
      latRad,
      lonRad
    );
    this.characterMesh.position.copy(localPosition);

    // 2. Orient character to stand upright on the surface
    const upVector = localPosition.clone().normalize();
    this.characterMesh.up.copy(upVector);

    // 3. Calculate yaw rotation
    // We need a stable forward vector. Let's use the tangent vector along the line of longitude.
    const tangent = new THREE.Vector3().setFromSphericalCoords(
      1,
      latRad + 0.001, // a tiny bit "south"
      lonRad
    );
    tangent.sub(localPosition).normalize();
    
    const forward = new THREE.Vector3().crossVectors(upVector, tangent).cross(upVector).negate();
    
    const lookAtTarget = this.characterMesh.position.clone().add(forward);
    this.characterMesh.lookAt(lookAtTarget);

    // Apply yaw rotation around the character's up axis
    const yawRad = THREE.MathUtils.degToRad(-yaw);
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(upVector, yawRad);
    this.characterMesh.quaternion.premultiply(yawQuaternion);
  }

  public removeFromScene() {
    if (this.characterMesh.parent) {
      this.characterMesh.parent.remove(this.characterMesh);
    }
  }
}

    