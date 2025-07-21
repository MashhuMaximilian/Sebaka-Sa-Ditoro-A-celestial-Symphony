
import * as THREE from 'three';
import { eyeHeight } from '../constants/config';

export class CloseUpCharacterCamera {
  public camera: THREE.PerspectiveCamera;
  public character: THREE.Object3D;
  public planet: THREE.Mesh;
  public planetRadius: number;
  public domElement: HTMLElement;
  
  public distance = 2.0;
  private height = eyeHeight;
  
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private horizontalAngle = 0;

  // Bound event handlers
  private onMouseDown: (event: MouseEvent) => void;
  private onMouseUp: () => void;
  private onMouseMove: (event: MouseEvent) => void;
  private onWheel: (event: WheelEvent) => void;
  
  constructor(camera: THREE.PerspectiveCamera, character: THREE.Object3D, planet: THREE.Mesh, domElement: HTMLElement) {
    this.camera = camera;
    this.character = character;
    this.planet = planet;
    this.domElement = domElement;
    this.planetRadius = (planet.geometry as THREE.SphereGeometry).parameters.radius;

    this.onMouseDown = this._onMouseDown.bind(this);
    this.onMouseUp = this._onMouseUp.bind(this);
    this.onMouseMove = this._onMouseMove.bind(this);
    this.onWheel = this._onWheel.bind(this);
    
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('wheel', this.onWheel);
  }

  public dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('wheel', this.onWheel);
  }

  private _onMouseDown(event: MouseEvent) {
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
    this.horizontalAngle -= deltaX * 0.01;
    
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }
  
  private _onWheel(event: WheelEvent) {
    this.distance = THREE.MathUtils.clamp(
      this.distance + event.deltaY * 0.01, // Slower zoom
      2,   // Minimum distance
      40   // Maximum distance
    );
  }
  
  update() {
    const characterWorldPos = new THREE.Vector3();
    this.character.getWorldPosition(characterWorldPos);

    const planetWorldPos = new THREE.Vector3();
    this.planet.getWorldPosition(planetWorldPos);

    // This is the "up" vector from the planet's center to the character.
    const upVector = characterWorldPos.clone().sub(planetWorldPos).normalize();

    // The forward direction is calculated based on the horizontal angle (mouse movement).
    // We start with a base forward vector (e.g., world Z axis) and rotate it around the character.
    const baseForward = new THREE.Vector3(0, 0, -1);
    const rotation = new THREE.Quaternion().setFromAxisAngle(upVector, this.horizontalAngle);
    const forwardVector = baseForward.clone().applyQuaternion(rotation);

    // The ideal camera position is behind the character.
    const idealOffset = forwardVector.multiplyScalar(-this.distance);
    const idealCameraPos = characterWorldPos.clone().add(idealOffset);

    // Now, we force the camera to be "on the ground".
    // We take the vector from the planet's center to the ideal camera position...
    const finalCameraDirection = idealCameraPos.clone().sub(planetWorldPos).normalize();
    // ...and set its length to be the planet's radius plus a fixed height.
    const finalCameraPos = planetWorldPos.clone().add(finalCameraDirection.multiplyScalar(this.planetRadius + this.height));
    
    this.camera.position.copy(finalCameraPos);
    
    // THIS IS THE FIX: Set the camera's UP vector to point away from the planet's center.
    const surfaceNormal = this.camera.position.clone().sub(planetWorldPos).normalize();
    this.camera.up.copy(surfaceNormal);

    this.camera.lookAt(characterWorldPos);
  }
}
