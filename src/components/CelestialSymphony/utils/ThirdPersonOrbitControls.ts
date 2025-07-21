
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { SphericalCharacterController } from './SphericalCharacterController';

/**
 * A specialized version of OrbitControls for a third-person view.
 * It follows a character, orbits around it, and collides with a designated planet mesh.
 */
export class ThirdPersonOrbitControls {
    public controls: OrbitControls;
    private camera: THREE.PerspectiveCamera;
    private character: SphericalCharacterController;
    private planet: THREE.Mesh;
    private planetRadius: number;

    constructor(
        camera: THREE.PerspectiveCamera,
        domElement: HTMLElement,
        character: SphericalCharacterController,
        planet: THREE.Mesh
    ) {
        this.camera = camera;
        this.character = character;
        this.planet = planet;

        if (planet.geometry instanceof THREE.SphereGeometry) {
            this.planetRadius = planet.geometry.parameters.radius;
        } else {
            this.planetRadius = 1; // Fallback
        }

        this.controls = new OrbitControls(camera, domElement);
        this.init();
    }

    private init() {
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;

        // Set distances to keep the camera reasonably close
        this.controls.minDistance = 0.2;
        this.controls.maxDistance = 5;
    }

    public update() {
        // Always update the controls' target to the character's current world position
        const characterPosition = this.character.characterMesh.getWorldPosition(new THREE.Vector3());
        this.controls.target.copy(characterPosition);
        this.controls.update();

        // After controls update, check for ground collision
        const planetPosition = this.planet.getWorldPosition(new THREE.Vector3());
        const cameraToPlanetCenter = this.camera.position.clone().sub(planetPosition);
        const distanceToCenter = cameraToPlanetCenter.length();

        const minimumDistance = this.planetRadius + 0.1; // Add a small buffer

        if (distanceToCenter < minimumDistance) {
            // Push the camera out to the surface
            cameraToPlanetCenter.setLength(minimumDistance);
            this.camera.position.copy(planetPosition).add(cameraToPlanetCenter);
        }
    }

    public dispose() {
        this.controls.dispose();
    }
}
