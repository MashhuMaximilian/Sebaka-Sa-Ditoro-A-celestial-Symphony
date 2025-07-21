
import * as THREE from 'three';
import { eyeHeight } from '../constants/config';

export class CloseUpCharacterCamera {
  public camera: THREE.PerspectiveCamera;
  public character: THREE.Object3D;
  public planet: THREE.Mesh;
  
  private planetRadius: number;
  private distance = 0.1; // Default to min zoom
  private height = eyeHeight;
  
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private horizontalAngle = Math.PI; // Start behind the character
  private verticalAngle = 0.1; // Slight upward angle

  // Bound event handlers
  private onMouseDown: (event: MouseEvent) => void;
  private onMouseUp: () => void;
  private onMouseMove: (event: MouseEvent) => void;
  private onWheel: (event: WheelEvent) => void;
  private domElement: HTMLElement;
  
  constructor(camera: THREE.PerspectiveCamera, character: THREE.Object3D, planet: THREE.Mesh, domElement: HTMLElement) {
    this.camera = camera;
    this.character = character;
    this.planet = planet;
    this.domElement = domElement;
    
    // Ensure planetRadius is calculated correctly
    if (planet.geometry.boundingSphere === null) {
      planet.geometry.computeBoundingSphere();
    }
    this.planetRadius = planet.geometry.boundingSphere!.radius * planet.scale.x;

    this.onMouseDown = this._onMouseDown.bind(this);
    this.onMouseUp = this._onMouseUp.bind(this);
    this.onMouseMove = this._onMouseMove.bind(this);
    this.onWheel = this._onWheel.bind(this);
    
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('wheel', this.onWheel);
  }

  public dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }

  private _onMouseDown(event: MouseEvent) {
    if (event.target !== this.domElement) return;
    this.isMouseDown = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }
  
  private _onMouseUp() {
    this.isMouseDown = false;
  }
  
  private _onMouseMove(event: MouseEvent) {
    if (!this.isMouseDown) return;
    
    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;
    
    this.horizontalAngle -= deltaX * 0.005;
    this.verticalAngle = THREE.MathUtils.clamp(
      this.verticalAngle - deltaY * 0.005,
      0.05, // Prevent looking underground
      Math.PI / 2.5 // Limit looking too high up
    );
    
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }
  
  private _onWheel(event: WheelEvent) {
    this.distance = THREE.MathUtils.clamp(
      this.distance + event.deltaY * 0.01,
      0.1,  // Min zoom (point blank)
      40     // Max zoom
    );
  }
  
  update() {
    const characterWorldPos = new THREE.Vector3();
    this.character.getWorldPosition(characterWorldPos);

    const planetWorldPos = new THREE.Vector3();
    this.planet.getWorldPosition(planetWorldPos);

    // Vector from planet center to character
    const toCharacter = characterWorldPos.clone().sub(planetWorldPos);
    
    // Create a stable local coordinate system at the character's position
    // This system is independent of the character's own rotation.
    const surfaceNormal = toCharacter.clone().normalize(); // This is our "UP"
    const someVector = Math.abs(surfaceNormal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3().crossVectors(surfaceNormal, someVector).normalize();
    const right = new THREE.Vector3().crossVectors(forward, surfaceNormal).normalize();
    
    // Calculate the camera's offset based on mouse input angles
    const horizontalOffset = this.distance * Math.cos(this.verticalAngle) * Math.sin(this.horizontalAngle);
    const verticalOffset = this.distance * Math.sin(this.verticalAngle);
    const depthOffset = this.distance * Math.cos(this.verticalAngle) * Math.cos(this.horizontalAngle);

    // Combine offsets based on our stable coordinate system
    const offset = right.multiplyScalar(horizontalOffset)
                   .add(surfaceNormal.multiplyScalar(verticalOffset))
                   .add(forward.multiplyScalar(depthOffset));

    const idealCameraPos = characterWorldPos.clone().add(offset);
    
    // --- Enforce Ground Pinning ---
    // Ensure the final camera position is on the surface
    const cameraToPlanetCenter = idealCameraPos.clone().sub(planetWorldPos);
    const finalCamPos = planetWorldPos.clone().add(cameraToPlanetCenter.normalize().multiplyScalar(this.planetRadius + this.height));

    this.camera.position.copy(finalCamPos);
    
    // --- Enforce Upright Orientation ---
    // The "up" direction for the camera is always away from the planet's center
    const cameraUp = this.camera.position.clone().sub(planetWorldPos).normalize();
    this.camera.up.copy(cameraUp);

    this.camera.lookAt(characterWorldPos);
  }
}
