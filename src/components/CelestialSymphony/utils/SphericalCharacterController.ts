
import * as THREE from 'three';
import { eyeHeight } from '../constants/config';

/**
 * A controller to manage a character object that is "stuck" to the surface
 * of a parent planet mesh. It calculates the character's local position and
 * orientation on the sphere based on latitude and longitude inputs.
 */
export class SphericalCharacterController {
  public characterMesh: THREE.Object3D;
  private planetMesh: THREE.Mesh;
  private planetRadius: number;

  constructor(planetMesh: THREE.Mesh) {
    this.planetMesh = planetMesh;
    // Get radius from the geometry of the provided mesh
    if (planetMesh.geometry instanceof THREE.SphereGeometry) {
        this.planetRadius = planetMesh.geometry.parameters.radius;
    } else {
        // Fallback or error handling if geometry is not a sphere
        console.warn("Planet mesh is not a SphereGeometry. Using a default radius.");
        this.planetRadius = 1;
    }
    
    // Create a simple cube for the character representation
    const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
    this.characterMesh = new THREE.Mesh(geometry, material);
    this.characterMesh.name = "Character";

    // IMPORTANT: Add character as a child of the planet mesh
    this.planetMesh.add(this.characterMesh);
  }

  /**
   * Updates the character's LOCAL position and orientation on the planet's surface.
   * @param longitude - The character's longitude in degrees (East/West).
   * @param latitude - The character's latitude in degrees (North/South).
   */
  public update(longitude: number, latitude: number) {
    // Convert lat/lon to radians for spherical coordinates
    // Lat: 90 (north) to -90 (south). Lon: 0 to 360.
    // Three.js spherical coords: radius, phi (polar, 0 at top), theta (azimuthal)
    const latRad = THREE.MathUtils.degToRad(90 - latitude); // phi
    const lonRad = THREE.MathUtils.degToRad(longitude);   // theta
    
    // Calculate position in LOCAL space of the planet
    const localPosition = new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius + eyeHeight, // Place it just on the surface
      latRad,
      lonRad
    );
    this.characterMesh.position.copy(localPosition);

    // Make the character "stand up" on the surface
    // The 'up' vector is the direction from the planet's center to the character
    const upVector = localPosition.clone().normalize();
    this.characterMesh.up.copy(upVector);

    // Point the character "forward" (e.g., towards the north pole initially)
    // We create a look-at target that is also on the sphere's surface
    const lookAtTarget = new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius,
      THREE.MathUtils.degToRad(89 - latitude), // a point slightly north
      lonRad
    );
    this.characterMesh.lookAt(lookAtTarget);
  }

  /**
   * Removes the character mesh from the scene for cleanup.
   */
  public dispose() {
    if (this.characterMesh && this.characterMesh.parent) {
      this.characterMesh.parent.remove(this.characterMesh);
    }
  }
}
