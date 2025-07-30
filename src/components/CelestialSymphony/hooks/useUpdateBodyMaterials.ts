
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PlanetData, StarData, MaterialProperties } from "@/types";
import { HOURS_IN_SEBAKA_DAY } from "../constants/config";

const updateMaterialProperties = (mesh: THREE.Mesh | THREE.Object3D, props: MaterialProperties[string]) => {
  if (!mesh || !props || !('material' in mesh) || !(mesh.material instanceof THREE.ShaderMaterial)) return;
  
  const uniforms = mesh.material.uniforms;
  
    if (uniforms.useNormalMap && props.normalScale !== undefined) {
        uniforms.useNormalMap.value = props.normalScale > 0;
    }
    if (uniforms.normalScale && props.normalScale !== undefined && uniforms.normalScale.value.x !== props.normalScale) {
        uniforms.normalScale.value.set(props.normalScale, props.normalScale);
    }

    if (uniforms.useDisplacementMap && props.displacementScale !== undefined) {
        uniforms.useDisplacementMap.value = props.displacementScale > 0;
    }
    if (uniforms.displacementScale && props.displacementScale !== undefined && uniforms.displacementScale.value !== props.displacementScale) {
        uniforms.displacementScale.value = props.displacementScale;
    }
    
    if (uniforms.albedo && props.albedo !== undefined && uniforms.albedo.value !== props.albedo) {
        uniforms.albedo.value = props.albedo;
    }

    if (uniforms.emissiveIntensity && props.emissiveIntensity !== undefined && uniforms.emissiveIntensity.value !== props.emissiveIntensity) {
        uniforms.emissiveIntensity.value = props.emissiveIntensity;
    }

    if (uniforms.useSpecularMap && uniforms.specularMap.value) {
        uniforms.useSpecularMap.value = true;
    }
    if (uniforms.specularIntensity && props.specularIntensity !== undefined && uniforms.specularIntensity.value !== props.specularIntensity) {
        uniforms.specularIntensity.value = props.specularIntensity;
    }

    if (uniforms.shininess && props.shininess !== undefined && uniforms.shininess.value !== props.shininess) {
        uniforms.shininess.value = props.shininess;
    }

    if (uniforms.useAoMap && uniforms.aoMap.value) {
        uniforms.useAoMap.value = (props.aoMapIntensity ?? 0) > 0;
    }
    if (uniforms.aoMapIntensity && props.aoMapIntensity !== undefined && uniforms.aoMapIntensity.value !== props.aoMapIntensity) {
        uniforms.aoMapIntensity.value = props.aoMapIntensity;
    }
  
  // Add blob-specific uniform updates
  if (mesh.name === 'Character') {
    if (uniforms.displacementScale && props.displacementScale !== undefined) {
      uniforms.displacementScale.value = props.displacementScale;
    }
    if (uniforms.noiseFrequency && props.noiseFrequency !== undefined) {
      uniforms.noiseFrequency.value = props.noiseFrequency;
    }
    if (uniforms.noiseSpeed && props.noiseSpeed !== undefined) {
      uniforms.noiseSpeed.value = props.noiseSpeed;
    }
    if (uniforms.blobComplexity && props.blobComplexity !== undefined) {
      uniforms.blobComplexity.value = props.blobComplexity;
    }
    if (uniforms.iridescenceStrength && props.iridescenceStrength !== undefined) {
      uniforms.iridescenceStrength.value = props.iridescenceStrength;
    }
    if (uniforms.rimPower && props.rimPower !== undefined) {
      uniforms.rimPower.value = props.rimPower;
    }
    if (uniforms.colorSpeed && props.colorSpeed !== undefined) {
      uniforms.colorSpeed.value = props.colorSpeed;
    }
    if (uniforms.opacity && props.opacity !== undefined) {
      uniforms.opacity.value = props.opacity;
    }
  }

  // Viridis Volcano uniform updates
  if (mesh.name === 'Viridis') {
    if (uniforms.u_noiseScale && props.noiseScale !== undefined) {
      uniforms.u_noiseScale.value = props.noiseScale;
    }
    if (uniforms.u_smokeDensity && props.smokeDensity !== undefined) {
      uniforms.u_smokeDensity.value = props.smokeDensity;
    }
    if (uniforms.u_lavaDensity && props.lavaDensity !== undefined) {
        uniforms.u_lavaDensity.value = props.lavaDensity;
    }
    if (uniforms.u_lavaDotSize && props.lavaDotSize !== undefined) {
        uniforms.u_lavaDotSize.value = props.lavaDotSize;
    }
    if (uniforms.u_lavaDotSizeVariance && props.lavaDotSizeVariance !== undefined) {
        uniforms.u_lavaDotSizeVariance.value = props.lavaDotSizeVariance;
    }
  }
};

interface UpdateBodyMaterialsProps {
    stars: StarData[];
    planets: PlanetData[];
    allMeshes: React.MutableRefObject<THREE.Mesh[]>;
    allBodies: React.MutableRefObject<THREE.Object3D[]>;
    characterMesh: THREE.Object3D | null;
    isViridisAnimationActive: boolean;
    viewFromSebaka: boolean;
    materialProperties: MaterialProperties;
    elapsedHours: number;
}

export const useUpdateBodyMaterials = ({
    stars,
    planets,
    allMeshes,
    allBodies,
    characterMesh,
    isViridisAnimationActive,
    viewFromSebaka,
    materialProperties,
    elapsedHours,
}: UpdateBodyMaterialsProps) => {

    useEffect(() => {
        const planetMeshes = allMeshes.current.filter(m => planets.some(p => p.name === m.name));
        planetMeshes.forEach((mesh) => {
            const planetData = planets.find(p => p.name === mesh.name);
            if (!planetData || !(mesh.material instanceof THREE.ShaderMaterial)) return;

            const color = new THREE.Color(planetData.color);
            const uniforms = mesh.material.uniforms;

            if (uniforms.planetTexture && uniforms.planetTexture.value) {
                // If there's a texture, we assume color comes from it.
                // You could tint it here if desired:
                // uniforms.albedo.value.set(color); // Or some other tinting logic
            } else if (uniforms.albedo) {
                // If no texture, set the albedo color directly
                // Note: This assumes planetShader has an albedo uniform of type Color
                // and you might need to adjust the shader if it expects a float.
                // A simple approach is to use the color to modulate brightness (albedo).
            }
        });
    }, [planets, allMeshes]);

    useEffect(() => {
        if (!allBodies.current.length && !characterMesh) return;

        allMeshes.current.forEach((mesh) => {
            const props = materialProperties[mesh.name];
            if (props) {
                updateMaterialProperties(mesh, props);
            }
        });
        if (characterMesh) {
            const props = materialProperties['Character'];
            if (props) {
                updateMaterialProperties(characterMesh, props);
            }
        }
    }, [materialProperties, allMeshes, allBodies, characterMesh]);


    useEffect(() => {
        const viridisMesh = allMeshes.current.find(p => p.name === 'Viridis');
        if (!viridisMesh || !(viridisMesh.material instanceof THREE.ShaderMaterial)) return;

        const material = viridisMesh.material as THREE.ShaderMaterial;
        
        if (isViridisAnimationActive) {
            const cycleDurationDays = 27;
            const cycleDurationHours = cycleDurationDays * HOURS_IN_SEBAKA_DAY;
            const currentCycleTime = elapsedHours % cycleDurationHours;
            const u_time = currentCycleTime / cycleDurationHours; // Normalized 0-1
            
            if (material.uniforms.u_time) {
                material.uniforms.u_time.value = u_time;
            }

        } else {
             // When animation is stopped, reset to the beginning of the cycle
             if (material.uniforms.u_time) {
                material.uniforms.u_time.value = 0;
            }
        }
    }, [isViridisAnimationActive, allMeshes, elapsedHours]);

    // This effect handles toggling the grid view on Sebaka
    useEffect(() => {
        const sebakaMesh = allMeshes.current.find(p => p.name === 'Sebaka');
        if (sebakaMesh && sebakaMesh.material instanceof THREE.ShaderMaterial) {
            const uniforms = (sebakaMesh.material as THREE.ShaderMaterial).uniforms;
            uniforms.useGrid.value = viewFromSebaka;
        }
    }, [viewFromSebaka, allMeshes]);
};
