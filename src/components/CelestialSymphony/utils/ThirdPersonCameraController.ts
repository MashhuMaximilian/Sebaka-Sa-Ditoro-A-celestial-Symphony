import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
  public camera: THREE.PerspectiveCamera;
  public character: SphericalCharacterCube;
  
  // Camera state
  private cameraDistance: number = 2.0;
  private cameraPitch: number = 20; // Degrees above horizon
  private lerpFactor: number = 0.05;

  constructor(camera: THREE.PerspectiveCamera, character: SphericalCharacterCube) {
    this.camera = camera;
    this.character = character;
  }

  updateCamera(deltaTime: number) {
    if (!this.character || !this.character.characterMesh) return;

    const characterMesh = this.character.characterMesh;

    // 1. Get the character's current world position and orientation
    const characterWorldPosition = new THREE.Vector3();
    characterMesh.getWorldPosition(characterWorldPosition);

    const characterWorldQuaternion = new THREE.Quaternion();
    characterMesh.getWorldQuaternion(characterWorldQuaternion);
    
    // The character's 'up' vector in world space
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(characterWorldQuaternion);
    // The character's 'forward' vector in world space
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(characterWorldQuaternion);

    // 2. Calculate the desired camera position
    // Start behind the character and move up
    const offset = forward.clone().multiplyScalar(-this.cameraDistance);
    offset.addScaledVector(up, this.cameraDistance * 0.5); // Adjust height based on distance
    
    const desiredPosition = characterWorldPosition.clone().add(offset);
    
    // 3. Smoothly interpolate camera position
    const lerpSpeed = 1.0 - Math.exp(-this.lerpFactor * 60 * deltaTime); // Frame-rate independent lerp
    this.camera.position.lerp(desiredPosition, lerpSpeed);

    // 4. Set camera to look at a point slightly above the character's base
    const lookAtTarget = characterWorldPosition.clone().addScaledVector(up, 0.1); // Look at the character's "head"
    this.camera.lookAt(lookAtTarget);
  }

  // Slider integration methods
  setCameraDistance(distance: number) {
    this.cameraDistance = THREE.MathUtils.clamp(distance, 0.5, 5.0);
  }
}
