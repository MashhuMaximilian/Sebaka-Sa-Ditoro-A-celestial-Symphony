
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
  private getLocalPosition() {
    const latRad = THREE.MathUtils.degToRad(90 - this.latitude);
    const lonRad = THREE.MathUtils.degToRad(this.longitude);
    
    return new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius + this.surfaceHeight,
      latRad,
      lonRad
    );
  }

  // Update character position and orientation
  updateCharacterPosition(deltaTime: number) {
    // Start with the planet's world transform
    const planetWorldPosition = new THREE.Vector3();
    const planetWorldQuaternion = new THREE.Quaternion();
    this.planetMesh.getWorldPosition(planetWorldPosition);
    this.planetMesh.getWorldQuaternion(planetWorldQuaternion);
    
    // Character's position relative to the planet center
    const localPos = this.getLocalPosition();
    
    // Apply planet's rotation to character's local position
    localPos.applyQuaternion(this.planetMesh.quaternion);
    
    // Now add the planet's orbital position to get final world position
    const finalWorldPos = localPos.add(planetWorldPosition);
    this.characterMesh.position.copy(finalWorldPos);
    
    // Orient character to stand upright on planet surface
    const up = this.characterMesh.position.clone().sub(planetWorldPosition).normalize();
    
    const yawRad = THREE.MathUtils.degToRad(this.yaw);
    const forwardDirection = new THREE.Vector3(Math.sin(yawRad), 0, Math.cos(yawRad));
    
    const tangent = new THREE.Vector3().crossVectors(up, forwardDirection).normalize();
    const finalForward = new THREE.Vector3().crossVectors(tangent, up).normalize();
    
    this.characterMesh.up.copy(up);
    this.characterMesh.lookAt(this.characterMesh.position.clone().add(finalForward));
    
    this.updateCharacterAnimation(deltaTime);
  }
  
  // Slider integration methods
  setLongitude(value: number) {
    this.longitude = value;
  }
  
  setLatitude(value: number) {
    this.latitude = THREE.MathUtils.clamp(value, -90, 90);
  }
  
  setYaw(value: number) {
    this.yaw = value;
  }

  updateCharacterAnimation(deltaTime: number) {
    if (deltaTime > 0) { // Animate only if time is passing
        this.walkAnimation.time += deltaTime * 5; // Animation speed
        
        const bob = Math.sin(this.walkAnimation.time) * this.walkAnimation.bobAmount;
        
        const up = this.characterMesh.position.clone().sub(this.planetMesh.position).normalize();
        this.characterMesh.position.addScaledVector(up, bob);
    }
  }
}
