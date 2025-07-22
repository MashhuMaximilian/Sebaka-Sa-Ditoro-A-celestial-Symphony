
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
      0.05// Limit looking too high up
    );
    
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }
  
  private _onWheel(event: WheelEvent) {
    this.distance = THREE.MathUtils.clamp(
      this.distance + event.deltaY * 0.002, // Slightly faster zoom
      0.1,  // Very close
      1.0    // Much wider range for circumference viewing
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
    
    // ** NEW: Calculate camera position to follow planet curvature **
    
    // Calculate the "arc distance" the camera should be from character along surface
    const arcDistance = this.distance;
    
    // Calculate the angle this arc distance represents on the planet
    const arcAngle = arcDistance / this.planetRadius;
    
    // Calculate how high above the surface the camera should be for this arc
    // This creates the curved zoom effect
    const cameraHeight = this.planetRadius * (1 - Math.cos(arcAngle)) + this.height;
    const horizontalDistance = this.planetRadius * Math.sin(arcAngle);
    
    // Apply horizontal angle rotation
    const horizontalOffset = horizontalDistance * Math.sin(this.horizontalAngle);
    const depthOffset = horizontalDistance * Math.cos(this.horizontalAngle);
    
    // Create the camera offset following planet curvature
    const localOffset = right.clone().multiplyScalar(horizontalOffset)
                       .add(surfaceNormal.clone().multiplyScalar(cameraHeight))
                       .add(forward.clone().multiplyScalar(depthOffset));
  
    // Calculate camera position in local space
    const localCameraPos = characterLocalPos.clone().add(localOffset);
    
    // Transform camera position back to world space
    const finalCamPos = localCameraPos.clone().applyQuaternion(planetContainerWorldQuat).add(planetContainerWorldPos);
  
    this.camera.position.copy(finalCamPos);
    
    // The "up" direction for the camera is always away from the planet's center
    const cameraUp = finalCamPos.clone().sub(planetContainerWorldPos).normalize();
    this.camera.up.copy(cameraUp);
  
    this.camera.lookAt(characterWorldPos);
  }
  

}
