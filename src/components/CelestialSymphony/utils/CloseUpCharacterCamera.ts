
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

  // Touch state
  private lastTouchX = 0;
  private lastTouchY = 0;
  private lastPinchDist = 0;


  // Bound event handlers
  private onMouseDown: (event: MouseEvent) => void;
  private onMouseUp: () => void;
  private onMouseMove: (event: MouseEvent) => void;
  private onWheel: (event: WheelEvent) => void;
  private onTouchStart: (event: TouchEvent) => void;
  private onTouchEnd: () => void;
  private onTouchMove: (event: TouchEvent) => void;
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
    this.onTouchStart = this._onTouchStart.bind(this);
    this.onTouchEnd = this._onTouchEnd.bind(this);
    this.onTouchMove = this._onTouchMove.bind(this);
    
    this.setupEventListeners();
  }
  
  private setupEventListeners() {
    // Mouse events
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mouseup', this.onMouseUp);
    document.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('wheel', this.onWheel);

    // Touch events
    this.domElement.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.domElement.addEventListener('touchend', this.onTouchEnd);
    this.domElement.addEventListener('touchmove', this.onTouchMove, { passive: false });
  }

  public dispose() {
    // Mouse events
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('wheel', this.onWheel);

    // Touch events
    this.domElement.removeEventListener('touchstart', this.onTouchStart);
    this.domElement.removeEventListener('touchend', this.onTouchEnd);
    this.domElement.removeEventListener('touchmove', this.onTouchMove);
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
      0.36 // Limit looking too high up
    );
    
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }
  
  private _onWheel(event: WheelEvent) {
    this.distance = THREE.MathUtils.clamp(
      this.distance + event.deltaY * 0.002, // Slightly faster zoom
      0.05,  // Very close
      this.planetRadius * 0.6  // Max zoom relative to planet size
    );
  }

  private _onTouchStart(event: TouchEvent) {
    if (event.target !== this.domElement) return;
    event.preventDefault(); // Prevent default browser actions like scrolling

    const touches = event.touches;
    if (touches.length === 1) { // Single finger drag
        this.lastTouchX = touches[0].clientX;
        this.lastTouchY = touches[0].clientY;
    } else if (touches.length === 2) { // Two finger pinch
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        this.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
    }
  }

  private _onTouchEnd() {
      this.lastPinchDist = 0; // Reset pinch distance
  }
  
  private _onTouchMove(event: TouchEvent) {
    if (event.target !== this.domElement) return;
    event.preventDefault();

    const touches = event.touches;
    if (touches.length === 1) { // Drag
        const deltaX = touches[0].clientX - this.lastTouchX;
        const deltaY = touches[0].clientY - this.lastTouchY;

        this.horizontalAngle -= deltaX * 0.005;
        this.verticalAngle = THREE.MathUtils.clamp(
            this.verticalAngle - deltaY * 0.005,
            0.05,
            0.36
        );

        this.lastTouchX = touches[0].clientX;
        this.lastTouchY = touches[0].clientY;

    } else if (touches.length === 2) { // Pinch
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        const currentPinchDist = Math.sqrt(dx * dx + dy * dy);
        
        if (this.lastPinchDist > 0) {
            const pinchDelta = this.lastPinchDist - currentPinchDist;
            this.distance = THREE.MathUtils.clamp(
                this.distance + pinchDelta * 0.001, // Adjust sensitivity
                0.05,
                this.planetRadius * 0.6
            );
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

    // 1. Surface normal (n)
    const n = new THREE.Vector3().subVectors(characterWorldPos, planetContainerWorldPos).normalize();

    // 2. Stable East vector
    let east = new THREE.Vector3(0, 1, 0).cross(n);
    if (east.lengthSq() < 1e-4) { // At the pole, fallback to X axis
        east = new THREE.Vector3(1, 0, 0).cross(n);
    }
    east.normalize();

    // 3. Stable North vector
    const north = n.clone().cross(east).normalize();

    // B. Derive the camera's 'back' vector from horizontal angle
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(n, this.horizontalAngle);
    const back = north.clone().applyQuaternion(yawQuat).multiplyScalar(-1);

    // C. Place the camera
    const arcAngle = this.distance / this.planetRadius;
    const axis = east.clone().cross(back).normalize();
    const rot = new THREE.Matrix4().makeRotationAxis(axis, arcAngle);
    
    const charSurface = n.clone().multiplyScalar(this.planetRadius);
    const camSurface = charSurface.clone().applyMatrix4(rot);

    // Elevate by eyeHeight
    const camLocal = camSurface.add(n.clone().multiplyScalar(this.height));

    // Transform from planet container's local space to world space
    const camWorld = camLocal.applyQuaternion(planetContainerWorldQuat)
                             .add(planetContainerWorldPos);

    this.camera.position.copy(camWorld);
    
    // The point the camera looks at, pitched by verticalAngle
    const lookAtPoint = characterWorldPos.clone();
    const pitchAxis = east.clone().applyQuaternion(yawQuat); // The axis to rotate around for pitch
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(pitchAxis, this.verticalAngle - (Math.PI / 2));
    const lookAtDirection = n.clone().applyQuaternion(pitchQuat);
    lookAtPoint.add(lookAtDirection);


    this.camera.up.copy(n); // Keep camera upright relative to the surface
    this.camera.lookAt(characterWorldPos);
  }
}
