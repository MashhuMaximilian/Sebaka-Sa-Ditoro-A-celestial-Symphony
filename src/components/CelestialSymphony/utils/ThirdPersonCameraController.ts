
import * as THREE from 'three';
import type { SphericalCharacterCube } from './SphericalCharacterCube';

export class ThirdPersonCameraController {
  public camera: THREE.PerspectiveCamera;
  public character: SphericalCharacterCube;
  private cameraDistance: number;
  private pitch: number; // Camera angle up/down
  private lerpFactor: number; // For smooth camera movement

  constructor(camera: THREE.PerspectiveCamera, character: SphericalCharacterCube) {
    this.camera = camera;
    this.character = character;
    
    // Camera settings
    this.cameraDistance = 2.0; // Initial distance from character
    this.pitch = -20;          // degrees, looking slightly down
    this.lerpFactor = 0.05;    // Controls smoothness
  }

  updateCamera(deltaTime: number) {
    // Get character's local coordinate system
    const { up, north, east } = this.character.getLocalCoordinateSystem();
    const characterPos = this.character.characterMesh.position;

    // Calculate desired camera position
    const pitchRad = THREE.MathUtils.degToRad(this.pitch);
    const offsetDirection = up.clone().multiplyScalar(Math.sin(pitchRad))
      .add(north.clone().multiplyScalar(-Math.cos(pitchRad)));

    const desiredPosition = characterPos.clone().addScaledVector(offsetDirection, this.cameraDistance);

    // Smoothly interpolate camera position
    this.camera.position.lerp(desiredPosition, this.lerpFactor);

    // Set camera up vector and look at character
    this.camera.up.copy(up);
    this.camera.lookAt(characterPos);
  }

  // Slider integration methods
  setCameraDistance(distance: number) {
    this.cameraDistance = THREE.MathUtils.clamp(distance, 0.5, 5.0);
  }
  
  setPitch(pitch: number) {
    this.pitch = THREE.MathUtils.clamp(pitch, -85, 0);
  }
}
