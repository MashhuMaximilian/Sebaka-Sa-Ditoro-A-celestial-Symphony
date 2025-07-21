
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * A specialized version of OrbitControls for a third-person view.
 * The camera is a child of the target object, ensuring stable follow behavior.
 */
export class ThirdPersonOrbitControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  public controls: OrbitControls;
  private target: THREE.Object3D;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, target: THREE.Object3D) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = target;
    
    // Add camera as a child of the target to ensure it follows perfectly
    this.target.add(this.camera);

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.init();
  }

  private init() {
    // Position the camera behind and slightly above the parent target (in local space)
    this.camera.position.set(0, 0.5, 1.5);

    // The controls should target the parent's origin
    this.controls.target.set(0, 0, 0);

    // Set distances to keep the camera close
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 5;
    
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;
  }

  public update() {
    // Only need to update the controls, as the camera's position
    // relative to the character is handled by the parent-child relationship.
    this.controls.update();
  }

  public dispose() {
    this.controls.dispose();
    // When disposing, remove camera from character so it can be re-added to scene
    if (this.camera.parent) {
      this.camera.parent.remove(this.camera);
    }
  }
}
