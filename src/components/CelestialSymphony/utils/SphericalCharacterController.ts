
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
    this.planetRadius = (planetMesh.geometry as THREE.SphereGeometry).parameters.radius;
    
    const geometry = new THREE.BoxGeometry(0.02, eyeHeight * 2, 0.02);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
    this.characterMesh = new THREE.Mesh(geometry, material);
    this.characterMesh.name = "Character";

    this.planetMesh.add(this.characterMesh);
  }

  /**
   * Updates the character's local position and orientation on the planet's surface.
   * @param longitude - The character's longitude in degrees (East/West).
   * @param latitude - The character's latitude in degrees (North/South).
   */
  public update(longitude: number, latitude: number) {
    const latRad = THREE.MathUtils.degToRad(90 - latitude);
    const lonRad = THREE.MathUtils.degToRad(longitude);
    
    const localPosition = new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius + eyeHeight,
      latRad,
      lonRad
    );
    this.characterMesh.position.copy(localPosition);

    const upVector = localPosition.clone().normalize();
    this.characterMesh.up.copy(upVector);

    const lookAtTarget = localPosition.clone().add(new THREE.Vector3(0, 1, 0));
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
