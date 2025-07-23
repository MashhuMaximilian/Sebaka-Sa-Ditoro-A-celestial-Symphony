
import * as THREE from 'three';
import { eyeHeight } from '../constants/config';
import { spiderStrandShader } from '../shaders/spiderStrandShader';

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
    
    const geometry = new THREE.SphereGeometry(0.015, 64, 64);
    
    const uniforms = THREE.UniformsUtils.clone(spiderStrandShader.uniforms);
    uniforms.baseColor.value = new THREE.Color(0x8c52ff);
    uniforms.opacity.value = 1.0;
    uniforms.iridescenceStrength.value = 8.0;

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: spiderStrandShader.vertexShader,
        fragmentShader: spiderStrandShader.fragmentShader,
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
    
    // The character's orientation is inherited from the parent planet's rotation.
    // To counteract this, we get the parent's world quaternion and apply its inverse.
    if (this.characterMesh.parent) {
      const parentWorldQuaternion = new THREE.Quaternion();
      this.characterMesh.parent.getWorldQuaternion(parentWorldQuaternion);
      this.characterMesh.quaternion.copy(parentWorldQuaternion).invert();
    }

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
