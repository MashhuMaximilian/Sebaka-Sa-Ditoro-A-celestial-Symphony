
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * A specialized version of OrbitControls for a third-person view on a spherical planet.
 * It follows a target and is physically constrained by the planet's surface.
 */
export class ThirdPersonOrbitControls {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private target: THREE.Object3D;
  private planet: THREE.Mesh;
  private planetRadius: number;
  
  public controls: OrbitControls;
  
  private characterWorldPos = new THREE.Vector3();
  private planetWorldPos = new THREE.Vector3();

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, target: THREE.Object3D, planet: THREE.Mesh) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = target;
    this.planet = planet;
    this.planetRadius = (planet.geometry as THREE.SphereGeometry).parameters.radius;
    
    this.controls = new OrbitControls(this.camera, this.domElement);

    this.init();
  }

  private init() {
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    
    // Set initial distance and angle constraints
    this.controls.minDistance = 0.5;
    this.controls.maxDistance = 20;
    this.controls.minPolarAngle = 0;
    this.controls.maxPolarAngle = Math.PI; // Allow full orbit
  }

  public update() {
    // 1. Update the OrbitControls target to follow the character
    this.target.getWorldPosition(this.characterWorldPos);
    this.controls.target.copy(this.characterWorldPos);

    // 2. Perform the standard OrbitControls update
    this.controls.update();
    
    // 3. Enforce ground collision
    this.planet.getWorldPosition(this.planetWorldPos);
    
    const cameraToPlanetCenter = new THREE.Vector3().subVectors(this.camera.position, this.planetWorldPos);
    const distanceToCenter = cameraToPlanetCenter.length();
    const surfaceBuffer = 0.2; // A small buffer to prevent the camera from being exactly on the surface

    // If camera is inside the planet, push it out to the surface
    if (distanceToCenter < this.planetRadius + surfaceBuffer) {
      cameraToPlanetCenter.setLength(this.planetRadius + surfaceBuffer);
      this.camera.position.copy(this.planetWorldPos).add(cameraToPlanetCenter);
    }
  }

  public dispose() {
    this.controls.dispose();
  }
}
