
import * as THREE from 'three';
import { eyeHeight } from '../constants/config';

export class CloseUpCharacterCamera {
  public camera: THREE.PerspectiveCamera;
  public character: THREE.Object3D;
  public planet: THREE.Mesh;
  public planetContainer: THREE.Object3D;
  public domElement: HTMLElement;
  
  // Public state controlled by input handlers
  public horizontalAngle = Math.PI; // Renamed from yaw for clarity
  public verticalAngle = 0.15;      // Renamed from pitch
  public distance = 0.1;

  private planetRadius: number;
  private height = eyeHeight;

  // Bound event handlers
  private onMouseDown: (event: MouseEvent) => void;
  private onMouseUp: (event: MouseEvent) => void;
  private onMouseMove: (event: MouseEvent) => void;
  private onWheel: (event: WheelEvent) => void;
  private onTouchStart: (event: TouchEvent) => void;
  private onTouchEnd: () => void;
  private onTouchMove: (event: TouchEvent) => void;
  
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private lastPinchDist = 0;
  
  constructor(
    camera: THREE.PerspectiveCamera, 
    character: THREE.Object3D, 
    planet: THREE.Mesh, 
    planetContainer: THREE.Object3D,
    domElement: HTMLElement
  ) {
    this.camera = camera;
    this.character = character;
    this.planet = planet;
    this.planetContainer = planetContainer;
    this.domElement = domElement;
    
    if (planet.geometry.boundingSphere === null) {
      planet.geometry.computeBoundingSphere();
    }
    this.planetRadius = planet.geometry.boundingSphere!.radius * planet.scale.x;

    // Bind event handlers
    this.onMouseDown = this._onMouseDown.bind(this);
    this.onMouseUp = this._onMouseUp.bind(this);
    this.onMouseMove = this._onMouseMove.bind(this);
    this.onWheel = this._onWheel.bind(this);
    this.onTouchStart = this._onTouchStart.bind(this);
    this.onTouchEnd = this._onTouchEnd.bind(this);
    this.onTouchMove = this._onTouchMove.bind(this);
    
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd);
    this.domElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
  }

  public dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('wheel', this.onWheel);
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
  }

  private applyDrag(dx: number, dy: number) {
    const yawSpeed = 0.005;
    const pitchSpeed = 0.005;
    this.horizontalAngle -= dx * yawSpeed;
    this.verticalAngle = THREE.MathUtils.clamp(
        this.verticalAngle - dy * pitchSpeed,
        0.05, // Prevent looking underground
        Math.PI / 2 - 0.05 // Allow looking up to see planet curvature when zoomed out
    );
  }

  private applyZoom(delta: number) {
    const zoomSpeed = 0.003; // Adjusted sensitivity
    this.distance = THREE.MathUtils.clamp(
      this.distance + delta * zoomSpeed,
      0.05,  // Very close to character
      2.0    // Far enough to see significant planet curvature
    );
  }

  private _onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isMouseDown = true;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }
  
  private _onMouseUp() {
    this.isMouseDown = false;
  }
  
  private _onMouseMove(event: MouseEvent) {
    if (!this.isMouseDown) return;
    event.preventDefault();
    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
    this.applyDrag(deltaX, deltaY);
  }
  
  private _onWheel(event: WheelEvent) {
    event.preventDefault();
    this.applyZoom(event.deltaY);
  }

  private _onTouchStart(event: TouchEvent) {
    event.preventDefault();
    const touches = event.touches;
    if (touches.length === 1) {
        this.lastTouchX = touches[0].clientX;
        this.lastTouchY = touches[0].clientY;
    } else if (touches.length === 2) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        this.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }

  private _onTouchEnd() {
    this.lastPinchDist = 0;
  }
  
  private _onTouchMove(event: TouchEvent) {
    event.preventDefault();
    const touches = event.touches;
    if (touches.length === 1) {
        const deltaX = touches[0].clientX - this.lastTouchX;
        const deltaY = touches[0].clientY - this.lastTouchY;
        this.lastTouchX = touches[0].clientX;
        this.lastTouchY = touches[0].clientY;
        this.applyDrag(deltaX, deltaY);
    } else if (touches.length === 2) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const currentPinchDist = Math.sqrt(dx * dx + dy * dy);
        if (this.lastPinchDist > 0) {
            const pinchDelta = this.lastPinchDist - currentPinchDist;
            this.applyZoom(pinchDelta * 0.5); // Adjust sensitivity for touch
        }
        this.lastPinchDist = currentPinchDist;
    }
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
    const right = new THREE.Vector3().crossVectors(surfaceNormal, arbitraryVec).normalize();
    const forward = new THREE.Vector3().crossVectors(right, surfaceNormal).normalize();
    
    // Calculate camera position following planet curvature
    const arcDistance = this.distance;
    const arcAngle = arcDistance / this.planetRadius;
    
    // Enhanced curvature calculation for better planet-relative zoom
    const cameraHeight = this.planetRadius * (1 - Math.cos(arcAngle)) + this.height;
    const horizontalDistance = this.planetRadius * Math.sin(arcAngle);
    
    // Apply both horizontal and vertical angles
    const horizontalOffset = horizontalDistance * Math.cos(this.verticalAngle) * Math.sin(this.horizontalAngle);
    const verticalOffset = cameraHeight + horizontalDistance * Math.sin(this.verticalAngle);
    const depthOffset = horizontalDistance * Math.cos(this.verticalAngle) * Math.cos(this.horizontalAngle);
    
    // Create the camera offset in local space (unaffected by planet rotation)
    const localOffset = right.clone().multiplyScalar(horizontalOffset)
                       .add(surfaceNormal.clone().multiplyScalar(verticalOffset))
                       .add(forward.clone().multiplyScalar(depthOffset));
  
    // Calculate camera position in local space
    const localCameraPos = characterLocalPos.clone().add(localOffset);
    
    // Ensure camera doesn't go below planet surface
    const distanceFromCenter = localCameraPos.length();
    const minDistance = this.planetRadius + 0.01; // Small buffer
    
    if (distanceFromCenter < minDistance) {
      localCameraPos.setLength(minDistance);
    }
    
    // Transform camera position back to world space
    const finalCamPos = localCameraPos.clone().applyQuaternion(planetContainerWorldQuat).add(planetContainerWorldPos);
  
    this.camera.position.copy(finalCamPos);
    
    // Calculate stable up vector in world space
    const cameraUp = localCameraPos.clone().normalize().applyQuaternion(planetContainerWorldQuat);
    this.camera.up.copy(cameraUp);
  
    this.camera.lookAt(characterWorldPos);
  }
}
