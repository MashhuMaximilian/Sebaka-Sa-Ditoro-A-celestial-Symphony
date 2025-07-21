
import * as THREE from 'three';

export class SphericalCharacterCube {
  public characterMesh: THREE.Mesh;
  public scene: THREE.Scene;
  public planetRadius: number;
  public planetMesh: THREE.Mesh;
  private surfaceHeight: number;
  public longitude: number;
  public latitude: number;
  public yaw: number;
  private faceMesh: THREE.Mesh;
  
  private walkAnimation: { time: number; bobAmount: number; rotateAmount: number; };

  constructor(scene: THREE.Scene, planetRadius: number, planetMesh: THREE.Mesh) {
    this.scene = scene;
    this.planetRadius = planetRadius;
    this.planetMesh = planetMesh;
    this.surfaceHeight = 0.1; // Height above planet surface
    
    // Character position state
    this.longitude = 0;    // 0-360 degrees
    this.latitude = 0;     // -90 to 90 degrees
    this.yaw = 0;          // Character facing direction (0-360)

    this.walkAnimation = {
      time: 0,
      bobAmount: 0.05,
      rotateAmount: 5
    };
    
    // Create character cube
    const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      roughness: 0.3,
      metalness: 0.1
    });
    
    this.characterMesh = new THREE.Mesh(geometry, material);
    this.characterMesh.castShadow = true;
    this.characterMesh.receiveShadow = true;
    
    // Add simple face or direction indicator
    const faceGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
    const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    this.faceMesh = new THREE.Mesh(faceGeometry, faceMaterial);
    this.faceMesh.position.set(0, 0, 0.1); // Front face indicator
    this.characterMesh.add(this.faceMesh);
    
    this.scene.add(this.characterMesh);
    this.updateCharacterPosition(0);
  }
  
  // Convert spherical coordinates to world position
  getWorldPosition() {
    const latRad = THREE.MathUtils.degToRad(90 - this.latitude);
    const lonRad = THREE.MathUtils.degToRad(this.longitude);
    
    const localPos = new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius + this.surfaceHeight,
      latRad,
      lonRad
    );
    
    // Transform local position by planet's rotation
    localPos.applyQuaternion(this.planetMesh.quaternion);
    
    // Add planet's orbital position
    return localPos.add(this.planetMesh.position);
  }
  
  // Get local coordinate system at character position
  getLocalCoordinateSystem() {
    const position = this.getWorldPosition();
    const planetCenter = this.planetMesh.position;
    const up = position.clone().sub(planetCenter).normalize();
    
    // North direction (toward north pole, projected on surface)
    const northPoleWorld = new THREE.Vector3(0, this.planetRadius, 0).applyQuaternion(this.planetMesh.quaternion).add(planetCenter);
    let north = northPoleWorld.sub(position).normalize();
    
    // Handle pole singularity
    if (Math.abs(this.latitude) > 89.9) {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.characterMesh.quaternion);
      north = forward;
    }
    
    // Remove component along up vector
    north.addScaledVector(up, -north.dot(up));
    north.normalize();
    
    // East is perpendicular to both
    const east = new THREE.Vector3().crossVectors(up, north).normalize();
    const correctedNorth = new THREE.Vector3().crossVectors(east, up).normalize();
    
    return { up, north: correctedNorth, east };
  }
  
  // Update character position and orientation
  updateCharacterPosition(deltaTime: number) {
    const worldPos = this.getWorldPosition();
    this.characterMesh.position.copy(worldPos);
    
    // Orient character to stand upright on planet surface
    const { up, north, east } = this.getLocalCoordinateSystem();
    
    // Create rotation matrix for character orientation
    const yawRad = THREE.MathUtils.degToRad(this.yaw);
    const forwardDirection = north.clone()
      .multiplyScalar(Math.cos(yawRad))
      .addScaledVector(east, -Math.sin(yawRad)); // Corrected direction
    
    // Set character rotation to face forward direction
    this.characterMesh.up.copy(up);
    this.characterMesh.lookAt(worldPos.clone().add(forwardDirection));
    
    this.updateCharacterAnimation(deltaTime);
  }
  
  // Slider integration methods
  setLongitude(value: number) {
    this.longitude = value % 360;
  }
  
  setLatitude(value: number) {
    this.latitude = THREE.MathUtils.clamp(value, -90, 90);
  }
  
  setYaw(value: number) {
    this.yaw = value % 360;
  }

  updateCharacterAnimation(deltaTime: number) {
    if (deltaTime > 0) { // Animate only if time is passing
        this.walkAnimation.time += deltaTime * 5; // Animation speed
        
        // Bob up and down while moving
        const bob = Math.sin(this.walkAnimation.time) * this.walkAnimation.bobAmount;
        
        // Slight rotation while moving
        const rotateAmount = Math.cos(this.walkAnimation.time) * THREE.MathUtils.degToRad(this.walkAnimation.rotateAmount);
        
        const up = this.getLocalCoordinateSystem().up;
        this.characterMesh.position.addScaledVector(up, bob);
        
        const rotationQuaternion = new THREE.Quaternion().setFromAxisAngle(up, rotateAmount);
        this.characterMesh.quaternion.premultiply(rotationQuaternion);
    }
  }
}
