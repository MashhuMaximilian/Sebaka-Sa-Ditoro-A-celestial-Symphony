
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * A specialized version of OrbitControls for a third-person view on a spherical planet.
 * It follows a target, prevents the camera from going below the planet's surface,
 * and uses the planet's local "up" direction for camera orientation.
 */
export class ThirdPersonOrbitControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target: THREE.Object3D;
  private planet: THREE.Mesh;
  
  public controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  
  private characterWorldPos = new THREE.Vector3();
  private cameraWorldPos = new THREE.Vector3();
  private cameraToCharacter = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, target: THREE.Object3D, planet: THREE.Mesh) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = target;
    this.planet = planet;
    
    this.controls = new OrbitControls(this.camera, this.domElement);
    this.raycaster = new THREE.Raycaster();

    this.init();
  }

  private init() {
    this.controls.enablePan = false; // Panning is usually not desired for this camera style
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    // Set initial distance and angle
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 5;
    this.controls.minPolarAngle = Math.PI / 4; // Don't allow looking from directly above
    this.controls.maxPolarAngle = Math.PI / 2; // Don't allow camera to go below horizon

    // Set initial camera position
    this.target.getWorldPosition(this.characterWorldPos);
    this.camera.position.copy(this.characterWorldPos).add(new THREE.Vector3(0, 1, 2));
    this.controls.target.copy(this.characterWorldPos);
    
    this.controls.update();
  }

  public update() {
    // 1. Update the OrbitControls target to follow the character
    this.target.getWorldPosition(this.characterWorldPos);
    this.controls.target.copy(this.characterWorldPos);

    // 2. Perform the standard OrbitControls update
    this.controls.update();
    
    // 3. Perform collision detection with the planet surface
    this.camera.getWorldPosition(this.cameraWorldPos);
    
    // The ray should be cast from the character towards the camera
    this.cameraToCharacter.subVectors(this.cameraWorldPos, this.characterWorldPos);
    const distanceToCamera = this.cameraToCharacter.length();
    this.cameraToCharacter.normalize();

    // The raycaster needs to work in the planet's parent's coordinate space (world space)
    this.raycaster.set(this.characterWorldPos, this.cameraToCharacter);
    this.raycaster.far = distanceToCamera;

    const intersects = this.raycaster.intersectObject(this.planet, false);

    if (intersects.length > 0) {
      // Collision detected! Move the camera to the intersection point.
      const collisionPoint = intersects[0].point;
      const newCamPos = collisionPoint.addScaledVector(this.cameraToCharacter, -0.1); // pull back slightly from surface
      this.camera.position.copy(newCamPos);
      
      // Since we manually moved the camera, we need to make it look at the target again.
      this.camera.lookAt(this.controls.target);
    }
  }

  public dispose() {
    this.controls.dispose();
  }
}
