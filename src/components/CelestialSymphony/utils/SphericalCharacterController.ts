
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

  constructor(planetMesh: THREE.Mesh) {
    this.planetMesh = planetMesh;
    
    if (planetMesh.geometry instanceof THREE.SphereGeometry) {
        this.planetRadius = planetMesh.geometry.parameters.radius;
    } else {
        const box = new THREE.Box3().setFromObject(planetMesh);
        this.planetRadius = box.getSize(new THREE.Vector3()).x / 2;
    }
    
    const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.02);
    
    const uniforms = THREE.UniformsUtils.clone(spiderStrandShader.uniforms);
    uniforms.baseColor.value = new THREE.Color(0x00ff00);
    uniforms.iridescenceStrength.value = 1.0;
    uniforms.opacity.value = 1.0;
    
    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: spiderStrandShader.vertexShader,
        fragmentShader: spiderStrandShader.fragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
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
    // It does not have its own orientation logic, making it a stable "rock" on the surface.
  }

  public dispose() {
    if (this.characterMesh && this.characterMesh.parent) {
      this.characterMesh.parent.remove(this.characterMesh);
    }
  }
}
