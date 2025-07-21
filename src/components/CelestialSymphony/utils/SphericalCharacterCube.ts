
import * as THREE from 'three';

export class SphericalCharacterCube {
  public characterMesh: THREE.Mesh;
  public planetMesh: THREE.Mesh;
  public planetRadius: number;
  private surfaceHeight: number;
  
  // Character state
  public longitude: number = 0;
  public latitude: number = 0;

  constructor(planetMesh: THREE.Mesh, planetRadius: number) {
    this.planetMesh = planetMesh;
    this.planetRadius = planetRadius;
    this.surfaceHeight = 0.1; // Height above planet surface
    
    // Create character cube
    const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      roughness: 0.3,
      metalness: 0.1,
    });
    this.characterMesh = new THREE.Mesh(geometry, material);
    this.characterMesh.name = "CharacterCube";
    
    // Add simple face or direction indicator
    const faceGeometry = new THREE.BoxGeometry(0.005, 0.005, 0.005);
    const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
    faceMesh.position.set(0, 0, 0.01); // Front face indicator
    this.characterMesh.add(faceMesh);
    
    this.planetMesh.add(this.characterMesh);
  }
  
  // Update character's local position and orientation on the parent sphere
  updateCharacterPosition(camera: THREE.PerspectiveCamera) {
    // 1. Calculate local position on sphere from lat/lon
    const latRad = THREE.MathUtils.degToRad(90 - this.latitude);
    const lonRad = THREE.MathUtils.degToRad(this.longitude);
    const localPosition = new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius + this.surfaceHeight,
      latRad,
      lonRad
    );
    this.characterMesh.position.copy(localPosition);

    // 2. Orient character to stand upright on the surface
    const upVector = localPosition.clone().normalize();
    
    // Base look at target (just look away from the center)
    const lookAtTarget = this.characterMesh.position.clone().add(upVector);

    this.characterMesh.up.copy(upVector);
    this.characterMesh.lookAt(lookAtTarget);

    // Add camera as a child of the character mesh if it's not already
    if (camera.parent !== this.characterMesh) {
      this.characterMesh.add(camera);
    }
  }

  // Method to remove character from scene
  removeFromScene(camera: THREE.PerspectiveCamera) {
    if (this.characterMesh.parent) {
      this.characterMesh.parent.remove(this.characterMesh);
    }
    // Also remove camera from character
    if (camera.parent === this.characterMesh) {
        this.characterMesh.remove(camera);
    }
  }
}
