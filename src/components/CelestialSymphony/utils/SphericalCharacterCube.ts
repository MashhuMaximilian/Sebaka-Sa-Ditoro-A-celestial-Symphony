
import * as THREE from 'three';

export class SphericalCharacterCube {
  public characterMesh: THREE.Mesh;
  public planetMesh: THREE.Mesh;
  public planetRadius: number;
  private surfaceHeight: number;
  
  // Character state
  public longitude: number = 0;
  public latitude: number = 0;
  private yaw: number = 0;

  constructor(planetMesh: THREE.Mesh, planetRadius: number, scene: THREE.Scene) {
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
    
    // Add character to the scene root
    scene.add(this.characterMesh);
  }
  
  // Update character's world position and orientation based on planet's transform
  updateCharacterPosition() {
    // 1. Get planet's current world transformation
    const planetWorldPosition = new THREE.Vector3();
    this.planetMesh.getWorldPosition(planetWorldPosition);
    const planetWorldQuaternion = new THREE.Quaternion();
    this.planetMesh.getWorldQuaternion(planetWorldQuaternion);
    
    // 2. Calculate character's local position on the sphere surface
    const latRad = THREE.MathUtils.degToRad(90 - this.latitude);
    const lonRad = THREE.MathUtils.degToRad(this.longitude);
    const localPosition = new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius + this.surfaceHeight,
      latRad,
      lonRad
    );
    
    // 3. Transform the local position by the planet's world orientation
    localPosition.applyQuaternion(planetWorldQuaternion);
    
    // 4. Set the character's final world position
    this.characterMesh.position.copy(planetWorldPosition).add(localPosition);

    // 5. Orient character to stand upright on the surface
    const upVector = localPosition.normalize();
    this.characterMesh.up.copy(upVector);

    const forward = new THREE.Vector3(0,0,-1);
    forward.applyQuaternion(this.characterMesh.quaternion); // initial forward
    
    const lookAtTarget = this.characterMesh.position.clone().add(forward);
    this.characterMesh.lookAt(lookAtTarget);

    const yawRad = THREE.MathUtils.degToRad(this.yaw);
    const yawQuaternion = new THREE.Quaternion().setFromAxisAngle(upVector, yawRad);
    this.characterMesh.quaternion.multiply(yawQuaternion);
  }

  // Method to remove character from scene
  removeFromScene() {
    if (this.characterMesh.parent) {
      this.characterMesh.parent.remove(this.characterMesh);
    }
  }
}
