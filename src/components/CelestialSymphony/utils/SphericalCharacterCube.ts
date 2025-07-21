
import * as THREE from 'three';

export class SphericalCharacterCube {
  public characterMesh: THREE.Mesh;
  public planetMesh: THREE.Mesh;
  public planetRadius: number;
  private surfaceHeight: number;
  
  // Character state
  public longitude: number = 0;
  public latitude: number = 0;
  public yaw: number = 0;

  // Animation state
  private walkAnimation: { time: number; bobAmount: number; };

  constructor(planetMesh: THREE.Mesh, planetRadius: number) {
    this.planetMesh = planetMesh;
    this.planetRadius = planetRadius;
    this.surfaceHeight = 0.1; // Height above planet surface
    
    this.walkAnimation = { time: 0, bobAmount: 0.01 };
    
    // Create character cube
    const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      roughness: 0.3,
      metalness: 0.1,
    });
    this.characterMesh = new THREE.Mesh(geometry, material);
    
    // Add simple face or direction indicator
    const faceGeometry = new THREE.BoxGeometry(0.005, 0.005, 0.005);
    const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
    faceMesh.position.set(0, 0, 0.01); // Front face indicator
    this.characterMesh.add(faceMesh);
    
    this.planetMesh.add(this.characterMesh);
    this.updateCharacterPosition(0);
  }
  
  // Update character's local position and orientation on the parent sphere
  updateCharacterPosition(deltaTime: number) {
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
    
    // Create a target to look at for orientation
    const lookAtTarget = localPosition.clone().add(new THREE.Vector3(0, 1, 0)); // Arbitrary point to establish a forward
    
    // Use lookAt to align the character's 'up' with the surface normal
    this.characterMesh.up.copy(upVector);
    this.characterMesh.lookAt(lookAtTarget);

    // 3. Apply yaw rotation for character turning
    const yawRad = THREE.MathUtils.degToRad(this.yaw);
    this.characterMesh.rotateOnAxis(upVector, yawRad);
    
    // 4. Apply animation
    this.updateCharacterAnimation(deltaTime);
  }
  
  private updateCharacterAnimation(deltaTime: number) {
    if (deltaTime > 0) {
      this.walkAnimation.time += deltaTime * 5;
      const bob = Math.sin(this.walkAnimation.time) * this.walkAnimation.bobAmount;
      const up = this.characterMesh.position.clone().normalize();
      this.characterMesh.position.addScaledVector(up, bob);
    }
  }

  // Method to remove character from scene
  removeFromScene() {
    if (this.characterMesh.parent) {
      this.characterMesh.parent.remove(this.characterMesh);
    }
  }
}
