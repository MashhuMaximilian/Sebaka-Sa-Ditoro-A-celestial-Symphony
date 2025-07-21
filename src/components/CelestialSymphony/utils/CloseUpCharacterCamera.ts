
import * as THREE from 'three';

export class CloseUpCharacterCamera {
  private camera: THREE.PerspectiveCamera;
  private character: THREE.Object3D;
  private planet: THREE.Mesh;
  private planetRadius: number;
  private domElement: HTMLElement;
  
  private distance = 0.15;
  private height = 0.05;
  private lookAhead = 0.1;
  
  private isMouseDown = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private horizontalAngle = 0;
  private verticalAngle = 0;

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
    const deltaY = event.clientY - this.lastMouseY;
    
    this.horizontalAngle -= deltaX * 0.01;
    this.verticalAngle = THREE.MathUtils.clamp(
      this.verticalAngle - deltaY * 0.01,
      -Math.PI / 3,
      Math.PI / 3
    );
    
    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }
  
  private _onWheel(event: WheelEvent) {
    this.distance = THREE.MathUtils.clamp(
      this.distance + event.deltaY * 0.001,
      0.05,
      0.5
    );
  }
  
  update() {
    const characterWorldPos = new THREE.Vector3();
    this.character.getWorldPosition(characterWorldPos);
    
    const characterWorldQuaternion = new THREE.Quaternion();
    this.character.getWorldQuaternion(characterWorldQuaternion);
    
    const planetWorldPos = new THREE.Vector3();
    this.planet.getWorldPosition(planetWorldPos);
    const surfaceNormal = characterWorldPos.clone().sub(planetWorldPos).normalize();
    
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(characterWorldQuaternion);
    
    const right = new THREE.Vector3().crossVectors(surfaceNormal, forward).normalize();
    const correctedForward = new THREE.Vector3().crossVectors(right, surfaceNormal).normalize();
    
    const horizontalRotation = new THREE.Quaternion().setFromAxisAngle(surfaceNormal, this.horizontalAngle);
    const rotatedForward = correctedForward.clone().applyQuaternion(horizontalRotation);
    const rotatedRight = right.clone().applyQuaternion(horizontalRotation);
    
    const behindOffset = rotatedForward.clone().multiplyScalar(-this.distance);
    const heightOffset = surfaceNormal.clone().multiplyScalar(this.height);
    const verticalOffset = rotatedRight.clone().multiplyScalar(Math.sin(this.verticalAngle) * this.distance);
    
    const idealCameraPos = characterWorldPos.clone()
      .add(behindOffset)
      .add(heightOffset)
      .add(verticalOffset);
    
    const cameraToCenter = idealCameraPos.clone().sub(planetWorldPos);
    const distanceToCenter = cameraToCenter.length();
    const minDistance = this.planetRadius + 0.01;
    
    if (distanceToCenter < minDistance) {
        cameraToCenter.setLength(minDistance);
        idealCameraPos.copy(planetWorldPos).add(cameraToCenter);
    }
    
    this.camera.position.copy(idealCameraPos);
    
    const lookAtTarget = characterWorldPos.clone().add(rotatedForward.multiplyScalar(this.lookAhead));
    this.camera.lookAt(lookAtTarget);
  }
}
