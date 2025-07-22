
import * as THREE from 'three';
import { eyeHeight } from '../constants/config';

const REFERENCE = new THREE.Vector3(0, 0, 1); // Any vector not parallel to Up

function buildStableAxes(up: THREE.Vector3) {
  // Ensure reference isn’t parallel to up (happens only at perfect poles)
  const ref = Math.abs(up.dot(REFERENCE)) > 0.99
              ? new THREE.Vector3(1, 0, 0)        // fallback
              : REFERENCE;

  const right   = new THREE.Vector3().crossVectors(ref, up).normalize();
  const forward = new THREE.Vector3().crossVectors(up, right).normalize();
  return { right, forward };
}


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
    
    this.horizontalAngle = (this.horizontalAngle - dx * yawSpeed) % (Math.PI * 2);
    if (this.horizontalAngle < 0) this.horizontalAngle += Math.PI * 2;

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
    this.planetContainer.getWorldPosition(planetContainerWorldPos);
  
    const up = characterWorldPos.clone().sub(planetContainerWorldPos).normalize();
    this.camera.up.copy(up);
  
    const { right, forward } = buildStableAxes(up);
  
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(up, this.horizontalAngle);
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, this.verticalAngle);
  
    const lookDir = forward.clone().applyQuaternion(yawQuat).applyQuaternion(pitchQuat).normalize();
    
    // Calculate ideal camera position
    const cameraOffset = lookDir.clone().multiplyScalar(-this.distance);
    let idealCamPos = characterWorldPos.clone().add(cameraOffset);
  
    // ** ENHANCED SURFACE COLLISION WITH SMOOTH SLIDING **
    
    const planetToCameraVector = idealCamPos.clone().sub(planetContainerWorldPos);
    const distanceFromPlanetCenter = planetToCameraVector.length();
    
    const surfaceRadius = this.planetRadius;
    const minHeight = 0.01;
    const maxHeight = 1.0;
    
    const minDistance = surfaceRadius + minHeight;
    const maxDistance = surfaceRadius + maxHeight;
    
    if (distanceFromPlanetCenter < minDistance) {
      // Too low - clamp to min height
      const minHeightPoint = planetToCameraVector.clone().setLength(minDistance);
      idealCamPos = planetContainerWorldPos.clone().add(minHeightPoint);
    } else if (distanceFromPlanetCenter > maxDistance) {
      // Too high - clamp to max height
      const maxHeightPoint = planetToCameraVector.clone().setLength(maxDistance);
      idealCamPos = planetContainerWorldPos.clone().add(maxHeightPoint);
    }
    
    // Additional check: ensure camera doesn't intersect with character
    const characterToCamera = idealCamPos.clone().sub(characterWorldPos);
    const minCameraDistance = 0.05; // Minimum distance from character
    
    if (characterToCamera.length() < minCameraDistance) {
      characterToCamera.setLength(minCameraDistance);
      idealCamPos = characterWorldPos.clone().add(characterToCamera);
      
      // Re-check surface constraints after character collision adjustment
      const finalPlanetDistance = idealCamPos.distanceTo(planetContainerWorldPos);
      if (finalPlanetDistance < minDistance) {
        const correctedPos = idealCamPos.clone().sub(planetContainerWorldPos);
        correctedPos.setLength(minDistance);
        idealCamPos = planetContainerWorldPos.clone().add(correctedPos);
      }
    }
  
    this.camera.position.copy(idealCamPos);
    this.camera.lookAt(characterWorldPos);
  }
}
