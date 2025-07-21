
import * as THREE from 'three';

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
    // Assuming the planet's geometry is a SphereGeometry
    this.planetRadius = (planetMesh.geometry as THREE.SphereGeometry).parameters.radius;
    
    // The character is a simple Object3D to act as a transform node.
    // A visible mesh could be added as a child to this object if needed.
    const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
    this.characterMesh = new THREE.Mesh(geometry, material);
    this.characterMesh.name = "Character";

    // *** Crucial Step ***
    // Add the character as a child of the planet mesh. This ensures it
    // inherits the planet's rotation and orbital motion automatically.
    this.planetMesh.add(this.characterMesh);
  }

  /**
   * Updates the character's local position and orientation on the planet's surface.
   * @param longitude - The character's longitude in degrees (East/West).
   * @param latitude - The character's latitude in degrees (North/South).
   */
  public update(longitude: number, latitude: number) {
    // 1. Calculate character's local position on the sphere surface
    const latRad = THREE.MathUtils.degToRad(90 - latitude);
    const lonRad = THREE.MathUtils.degToRad(longitude);
    
    // We use a height slightly above the radius to avoid z-fighting.
    const localPosition = new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius + 0.1,
      latRad,
      lonRad
    );
    this.characterMesh.position.copy(localPosition);

    // 2. Orient character to stand upright on the surface
    const upVector = localPosition.clone().normalize();
    this.characterMesh.up.copy(upVector);

    // 3. Make the character face a consistent direction (e.g., "North")
    // before applying any other rotations. This provides a stable reference.
    const lookAtTarget = localPosition.clone().add(new THREE.Vector3(0, 1, 0)); // Look towards the planet's local North pole
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
