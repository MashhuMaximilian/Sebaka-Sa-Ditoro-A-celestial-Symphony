
import * as THREE from 'three';
import { eyeHeight } from '../constants/config';

export class CloseUpCharacterCamera {
  public camera: THREE.PerspectiveCamera;
  public character: THREE.Object3D;
  public planet: THREE.Mesh;
  public planetContainer: THREE.Object3D; // Add reference to the tilt axis container
  
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
  
  constructor(
    camera: THREE.PerspectiveCamera, 
    character: THREE.Object3D, 
    planet: THREE.Mesh, 
    planetContainer: THREE.Object3D, // Pass the tilt axis container
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.character = character;
    this.planet = planet;
    this.planetContainer = planetContainer;
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
      this.distance + event.deltaY * 0.001,
      0.1,  // Min zoom (point blank)
      1    // Max zoom
    );
  }
  
  update() {
    const characterWorldPos = new THREE.Vector3();
    this.character.getWorldPosition(characterWorldPos);

    // Get the planet container's world position and rotation (includes tilt)
    const planetContainerWorldPos = new THREE.Vector3();
    const planetContainerWorldQuat = new THREE.Quaternion();
    this.planetContainer.getWorldPosition(planetContainerWorldPos);
    this.planetContainer.getWorldQuaternion(planetContainerWorldQuat);
    
    // Get the character's position relative to the planet container
    const characterLocalPos = characterWorldPos.clone().sub(planetContainerWorldPos);
    
    // Transform to planet container's local space to get "stable" coordinates
    const inverseQuat = planetContainerWorldQuat.clone().invert();
    characterLocalPos.applyQuaternion(inverseQuat);
    
    // Create stable coordinate system in planet container's local space
    const surfaceNormal = characterLocalPos.clone().normalize();
    
    // Create stable local coordinate system
    const arbitraryVec = Math.abs(surfaceNormal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3().crossVectors(surfaceNormal, arbitraryVec).normalize();
    const right = new THREE.Vector3().crossVectors(forward, surfaceNormal).normalize();
    
    // Calculate camera offset in local space
    const horizontalOffset = this.distance * Math.cos(this.verticalAngle) * Math.sin(this.horizontalAngle);
    const verticalOffset = this.distance * Math.sin(this.verticalAngle);
    const depthOffset = this.distance * Math.cos(this.verticalAngle) * Math.cos(this.horizontalAngle);

    const localOffset = right.clone().multiplyScalar(horizontalOffset)
                       .add(surfaceNormal.clone().multiplyScalar(verticalOffset))
                       .add(forward.clone().multiplyScalar(depthOffset));

    // Calculate camera position in local space
    const localCameraPos = characterLocalPos.clone().add(localOffset);
    
    // Ensure camera stays on surface in local space
    const localCameraToPlanetCenter = localCameraPos.clone();
    const distanceFromCenter = localCameraToPlanetCenter.length();
    const minDistance = this.planetRadius + this.height;
    
    if (distanceFromCenter < minDistance) {
        localCameraPos.setLength(minDistance);
    }
    
    // Transform camera position back to world space
    const finalCamPos = localCameraPos.clone().applyQuaternion(planetContainerWorldQuat).add(planetContainerWorldPos);

    this.camera.position.copy(finalCamPos);
    
    // --- Enforce Upright Orientation ---
    // The "up" direction for the camera is always away from the planet's center in world space
    const cameraUp = finalCamPos.clone().sub(planetContainerWorldPos).normalize();
    this.camera.up.copy(cameraUp);

    this.camera.lookAt(characterWorldPos);
  }
}
