
import * as THREE from 'three';
import { blobShader } from '../shaders/blobShader';
import { MaterialProperties } from '@/types';

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
  public characterHitbox: THREE.Mesh;

  constructor(planetMesh: THREE.Mesh) {
    this.planetMesh = planetMesh;
    
    if (planetMesh.geometry instanceof THREE.SphereGeometry) {
        this.planetRadius = planetMesh.geometry.parameters.radius;
    } else {
        const box = new THREE.Box3().setFromObject(planetMesh);
        this.planetRadius = box.getSize(new THREE.Vector3()).x / 2;
    }
    
    const geometry = new THREE.SphereGeometry(0.015, 64, 64);
    geometry.computeTangents(); 

    const uniforms = THREE.UniformsUtils.clone(blobShader.uniforms);
    
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

    // Create the hitbox
    const hitboxGeometry = new THREE.SphereGeometry(0.05, 16, 16);
    const hitboxMaterial = new THREE.MeshBasicMaterial({ visible: false }); 
    this.characterHitbox = new THREE.Mesh(hitboxGeometry, hitboxMaterial);
    this.characterHitbox.name = "CharacterHitbox";
    this.characterMesh.add(this.characterHitbox); // Attach hitbox to character
  }

  public update(longitude: number, latitude: number, height: number, materialProps: MaterialProperties['Character']) {
    const latRad = THREE.MathUtils.degToRad(90 - latitude);
    const lonRad = THREE.MathUtils.degToRad(longitude);   
    
    const localPosition = new THREE.Vector3().setFromSphericalCoords(
      this.planetRadius + height,
      latRad,
      lonRad
    );
    this.characterMesh.position.copy(localPosition);

    // Update shader uniforms for animation and material properties
    if (this.characterMesh instanceof THREE.Mesh && this.characterMesh.material instanceof THREE.ShaderMaterial) {
      const uniforms = this.characterMesh.material.uniforms;
      uniforms.time.value = this.clock.getElapsedTime();
      
      // Update all material properties from the panel
      if (materialProps) {
        uniforms.displacementScale.value = materialProps.displacementScale ?? 0.05;
        uniforms.noiseFrequency.value = materialProps.noiseFrequency ?? 8.3;
        uniforms.noiseSpeed.value = materialProps.noiseSpeed ?? 0.5;
        uniforms.blobComplexity.value = materialProps.blobComplexity ?? 0.5;
        uniforms.iridescenceStrength.value = materialProps.iridescenceStrength ?? 14.3;
        uniforms.rimPower.value = materialProps.rimPower ?? 1.9;
        uniforms.colorSpeed.value = materialProps.colorSpeed ?? 2.2;
        uniforms.opacity.value = materialProps.opacity ?? 1.0;
        uniforms.specularIntensity.value = materialProps.specularIntensity ?? 1.0;
        uniforms.shininess.value = materialProps.shininess ?? 30.0;
      }
    }
  }

  public dispose() {
    if (this.characterMesh && this.characterMesh.parent) {
      this.characterMesh.parent.remove(this.characterMesh);
    }
  }
}
