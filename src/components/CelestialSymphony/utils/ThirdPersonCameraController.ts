
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
  public camera: THREE.PerspectiveCamera;
  public character: SphericalCharacterCube;
  
  // Camera state
  private cameraDistance: number = 2.0;
  private pitch: number = -20;
  private lerpFactor: number = 0.05;

  constructor(camera: THREE.PerspectiveCamera, character: SphericalCharacterCube) {
    this.camera = camera;
    this.character = character;
  }

  updateCamera(deltaTime: number) {
    const characterMesh = this.character.characterMesh;

    // Get the character's world position and rotation
    const characterWorldPosition = new THREE.Vector3();
    characterMesh.getWorldPosition(characterWorldPosition);
    
    const characterWorldQuaternion = new THREE.Quaternion();
    characterMesh.getWorldQuaternion(characterWorldQuaternion);
    
    // The character's 'up' vector in world space
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(characterWorldQuaternion);
    // The character's 'forward' vector in world space
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterWorldQuaternion);

    // Calculate desired camera position
    const pitchRad = THREE.MathUtils.degToRad(this.pitch);
    const horizontalDistance = Math.cos(pitchRad) * this.cameraDistance;
    const verticalDistance = Math.sin(pitchRad) * this.cameraDistance;
    
    const offset = forward.clone().multiplyScalar(-horizontalDistance).addScaledVector(up, -verticalDistance);
    
    const desiredPosition = characterWorldPosition.clone().add(offset);
    
    // Smoothly interpolate camera position
    this.camera.position.lerp(desiredPosition, this.lerpFactor * (deltaTime * 60)); // Normalize lerp to 60fps

    // Set camera to look at the character
    this.camera.lookAt(characterWorldPosition);
  }

  // Slider integration methods
  setCameraDistance(distance: number) {
    this.cameraDistance = THREE.MathUtils.clamp(distance, 0.5, 5.0);
  }
  
  setPitch(pitch: number) {
    this.pitch = THREE.MathUtils.clamp(pitch, -85, 0);
  }
}
