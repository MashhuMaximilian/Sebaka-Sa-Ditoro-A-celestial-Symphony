
import * as THREE from 'three';
import { eyeHeight } from '../constants/config';
import { blobShader } from '../shaders/blobShader';

/**
 * A controller to manage a character object that is "stuck" to the surface
 * of a parent planet mesh. It calculates the character's local position and
 * orientation on the sphere based on latitude and longitude inputs.
 */
export class SphericalCharacterController {
  public characterMesh: THREE.Object3D;
  private planetMesh: THREE.Mesh;
  private planetRadius: number;
  private clock = new THREE.Clock();

  constructor(planetMesh: THREE.Mesh) {
    this.planetMesh = planetMesh;
    
    if (planetMesh.geometry instanceof THREE.SphereGeometry) {
        this.planetRadius = planetMesh.geometry.parameters.radius;
    } else {
        const box = new THREE.Box3().setFromObject(planetMesh);
        this.planetRadius = box.getSize(new THREE.Vector3()).x / 2;
    }
    
    // Change from BoxGeometry to SphereGeometry with high detail
    const geometry = new THREE.SphereGeometry(0.015, 64, 64);
    geometry.computeTangents(); // Required for proper normal calculations

    const uniforms = THREE.UniformsUtils.clone(blobShader.uniforms);
    uniforms.baseColor.value = new THREE.Color(0x8c52ff);
    uniforms.opacity.value = 1.0;
    uniforms.iridescenceStrength.value = 8.0;
    
    // Set blob-specific properties
    uniforms.displacementScale.value = 0.3;
    uniforms.noiseFrequency.value = 4.0;
    uniforms.noiseSpeed.value = 0.8;

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: blobShader.vertexShader,
        fragmentShader: blobShader.fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
    });
    
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

    // Update shader time for blob animation
    if (this.characterMesh instanceof THREE.Mesh && this.characterMesh.material instanceof THREE.ShaderMaterial) {
      this.characterMesh.material.uniforms.time.value = this.clock.getElapsedTime();
    }
  }

  public dispose() {
    if (this.characterMesh && this.characterMesh.parent) {
      this.characterMesh.parent.remove(this.characterMesh);
    }
  }
}
