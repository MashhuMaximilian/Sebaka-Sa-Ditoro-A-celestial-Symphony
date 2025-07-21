
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
    
    if (planetMesh.geometry instanceof THREE.SphereGeometry) {
        this.planetRadius = planetMesh.geometry.parameters.radius;
    } else {
        const box = new THREE.Box3().setFromObject(planetMesh);
        this.planetRadius = box.getSize(new THREE.Vector3()).x / 2;
    }
    
    const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
    this.characterMesh = new THREE.Mesh(geometry, material);
    this.characterMesh.name = "Character";

    this.planetMesh.add(this.characterMesh);
  }

  public update(longitude: number, latitude: number) {
    const latRad = THREE.MathUtils.degToRad(90 - latitude);
    const lonRad = THREE.MathUtils.degToRad(longitude);   
    
    const localPosition = new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius + eyeHeight,
      latRad,
      lonRad
    );
    this.characterMesh.position.copy(localPosition);
    
    // The character's "up" is always pointing away from the planet center.
    // The rest of its orientation is inherited from the parent planet's rotation.
    // We no longer call lookAt() here, which was causing the wiggle.
    const upVector = localPosition.clone().normalize();
    // this.characterMesh.up.copy(upVector); // REMOVED: This was causing instability.
  }

  public dispose() {
    if (this.characterMesh && this.characterMesh.parent) {
      this.characterMesh.parent.remove(this.characterMesh);
    }
  }
}
