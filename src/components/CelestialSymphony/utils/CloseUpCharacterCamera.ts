
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

  const planetContainerWorldPos = new THREE.Vector3();
  const planetContainerWorldQuat = new THREE.Quaternion();
  this.planetContainer.getWorldPosition(planetContainerWorldPos);
  this.planetContainer.getWorldQuaternion(planetContainerWorldQuat);
  
  // Get character position in planet's local space
  const characterLocalPos = characterWorldPos.clone().sub(planetContainerWorldPos);
  const inverseQuat = planetContainerWorldQuat.clone().invert();
  characterLocalPos.applyQuaternion(inverseQuat);
  
  // Normalize to get position on unit sphere, then scale to planet surface
  const characterSurfacePos = characterLocalPos.clone().normalize().multiplyScalar(this.planetRadius);
  
  // Create local coordinate system at character's surface position
  const surfaceNormal = characterSurfacePos.clone().normalize();
  const arbitraryVec = Math.abs(surfaceNormal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const tangent1 = new THREE.Vector3().crossVectors(surfaceNormal, arbitraryVec).normalize();
  const tangent2 = new THREE.Vector3().crossVectors(surfaceNormal, tangent1).normalize();
  
  // Calculate arc angle from distance
  const arcAngle = this.distance / this.planetRadius;
  
  // Calculate direction for camera offset (behind character)
  const offsetDirection = tangent1.clone().multiplyScalar(Math.cos(this.horizontalAngle))
                           .add(tangent2.clone().multiplyScalar(Math.sin(this.horizontalAngle)));
  
  // Rotate the character's surface position around planet center by arc angle
  // Create rotation axis perpendicular to both surface normal and offset direction
  const rotationAxis = new THREE.Vector3().crossVectors(surfaceNormal, offsetDirection).normalize();
  
  // Create rotation matrix for the arc movement
  const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, arcAngle);
  
  // Apply rotation to get new surface position
  const cameraSurfacePos = characterSurfacePos.clone().applyMatrix4(rotationMatrix);
  
  // Add minimal height offset (just enough to avoid z-fighting)
  const cameraLocalPos = cameraSurfacePos.clone().add(
    cameraSurfacePos.clone().normalize().multiplyScalar(this.height)
  );
  
  // Transform back to world space
  const finalCamPos = cameraLocalPos.clone()
    .applyQuaternion(planetContainerWorldQuat)
    .add(planetContainerWorldPos);

  this.camera.position.copy(finalCamPos);
  
  // Camera up vector points away from planet center
  const cameraUp = finalCamPos.clone().sub(planetContainerWorldPos).normalize();
  this.camera.up.copy(cameraUp);
  
  this.camera.lookAt(characterWorldPos);
}
}
