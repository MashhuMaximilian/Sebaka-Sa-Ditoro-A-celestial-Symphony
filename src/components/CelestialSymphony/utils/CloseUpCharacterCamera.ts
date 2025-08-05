
import * as THREE from 'three';
import { eyeHeight } from '../constants/config';

export class CloseUpCharacterCamera {
  public camera: THREE.PerspectiveCamera;
  public character: THREE.Object3D;
  public planet: THREE.Mesh;
  public planetContainer: THREE.Object3D;
  public domElement: HTMLElement;
  public isFreeCamera: boolean = false;
  
  public horizontalAngle = Math.PI;
  public verticalAngle = 0.15;
  public distance = 0.1;

  private planetRadius: number;
  private height = eyeHeight;

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
    
    this.horizontalAngle = (this.horizontalAngle - dx * yawSpeed);
    
    const pitchLimit = this.isFreeCamera ? Math.PI / 2 - 0.01 : 0.2;
    this.verticalAngle = THREE.MathUtils.clamp(
      this.verticalAngle - dy * pitchSpeed,
      -pitchLimit,
      pitchLimit
    );
  }

  private applyZoom(delta: number) {
    const zoomSpeed = 0.003;
    const minZoom = this.isFreeCamera ? 0.01 : 0.05;
    const maxZoom = this.isFreeCamera ? this.planetRadius * 2 : this.planetRadius * 0.2;
    
    this.distance = THREE.MathUtils.clamp(
      this.distance + delta * zoomSpeed,
      minZoom,
      maxZoom
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
            this.applyZoom(pinchDelta * 0.5);
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
    
    // Position camera at character's eyes
    const eyePosition = characterWorldPos.clone().add(new THREE.Vector3(0, eyeHeight, 0).applyQuaternion(this.character.quaternion));
    
    const charUp = characterWorldPos.clone().sub(planetContainerWorldPos).normalize();
    const orientationQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), charUp);

    if (this.isFreeCamera) {
      // Free camera: look around freely from the character's position
      const lookDirection = new THREE.Vector3(0, 0, 1);
      lookDirection.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.verticalAngle);
      lookDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.horizontalAngle);
      lookDirection.applyQuaternion(orientationQuat);

      const cameraOffset = lookDirection.clone().multiplyScalar(this.distance);
      this.camera.position.copy(eyePosition).sub(cameraOffset);
      
      const lookAtPoint = eyePosition.clone().add(lookDirection);
      this.camera.lookAt(lookAtPoint);
      this.camera.up.copy(charUp);

    } else {
      // Locked camera: look at the character from a third-person perspective
      const characterLocalPos = characterWorldPos.clone().sub(planetContainerWorldPos);
      characterLocalPos.applyQuaternion(planetContainerWorldQuat.clone().invert());
      
      const surfaceNormal = characterLocalPos.clone().normalize();
      
      const arbitraryVec = Math.abs(surfaceNormal.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const forward = new THREE.Vector3().crossVectors(surfaceNormal, arbitraryVec).normalize();
      const right = new THREE.Vector3().crossVectors(forward, surfaceNormal).normalize();
      
      const totalHeight = this.height + this.distance * 0.1;
      const horizontalDistance = this.distance * 0.9;
      
      const horizontalOffset = horizontalDistance * Math.sin(this.horizontalAngle);
      const depthOffset = horizontalDistance * Math.cos(this.horizontalAngle);

      const localOffset = right.clone().multiplyScalar(horizontalOffset)
                         .add(surfaceNormal.clone().multiplyScalar(totalHeight))
                         .add(forward.clone().multiplyScalar(depthOffset));

      const localCameraPos = characterLocalPos.clone().add(localOffset);
      
      const finalCamPos = localCameraPos.clone()
        .applyQuaternion(planetContainerWorldQuat)
        .add(planetContainerWorldPos);

      this.camera.position.copy(finalCamPos);
      
      // Ensure the 'up' vector is correct for the planet's curvature
      const cameraUp = finalCamPos.clone().sub(planetContainerWorldPos).normalize();
      this.camera.up.copy(cameraUp);

      const lookAtTarget = characterWorldPos.clone().add(cameraUp.multiplyScalar(0.01));
      this.camera.lookAt(lookAtTarget);
    }
  }
}
