
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PlanetData, StarData, MaterialProperties } from "@/types";
import { HOURS_IN_SEBAKA_DAY } from "../constants/config";

const updateMaterialProperties = (mesh: THREE.Mesh, props: MaterialProperties[string]) => {
  if (!mesh || !props || !(mesh.material instanceof THREE.ShaderMaterial)) return;
  
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
        uniforms.useAoMap.value = props.aoMapIntensity > 0;
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
  }
};

interface UpdateBodyMaterialsProps {
    stars: StarData[];
    planets: PlanetData[];
    allMeshes: React.MutableRefObject<THREE.Mesh[]>;
    allBodies: React.MutableRefObject<THREE.Object3D[]>;
    isViridisAnimationActive: boolean;
    viewFromSebaka: boolean;
    materialProperties: MaterialProperties;
}

export const useUpdateBodyMaterials = ({
    stars,
    planets,
    allMeshes,
    allBodies,
    isViridisAnimationActive,
    viewFromSebaka,
    materialProperties,
}: UpdateBodyMaterialsProps) => {

    const elapsedHoursRef = useRef(0);
    const animationFrameId = useRef<number>();
    const clockRef = useRef(new THREE.Clock());

    useEffect(() => {
        const planetMeshes = allMeshes.current.filter(m => planets.some(p => p.name === m.name));
        planetMeshes.forEach((mesh) => {
            const planetData = planets.find(p => p.name === mesh.name);
            if (!planetData) return;
        });
    }, [planets, allMeshes]);

    useEffect(() => {
        if (!allBodies.current.length) return;

        allMeshes.current.forEach((mesh) => {
            const props = materialProperties[mesh.name];
            if (props) {
                updateMaterialProperties(mesh, props);
            }
        });
    }, [materialProperties, allMeshes, allBodies]);


    useEffect(() => {
        const viridisMesh = allMeshes.current.find(p => p.name === 'Viridis');
        if (!viridisMesh || !(viridisMesh.material instanceof THREE.ShaderMaterial)) return;

        let isCancelled = false;

        const animateViridis = () => {
            if (isCancelled) return;
            animationFrameId.current = requestAnimationFrame(animateViridis);
            const deltaTime = clockRef.current.getDelta();
            elapsedHoursRef.current += deltaTime * 24; // Assuming 1 day/sec for this animation's timing
            const elapsedDays = elapsedHoursRef.current / HOURS_IN_SEBAKA_DAY;

            const material = viridisMesh.material as THREE.ShaderMaterial;
            
            if (isViridisAnimationActive) {
                const cycleDurationDays = 27;
                const currentDayInCycle = elapsedDays % cycleDurationDays;
                const phaseDuration = 9;
                let brightnessFactor = 1.0;

                // Waning phase
                if (currentDayInCycle >= 0 && currentDayInCycle < phaseDuration) {
                    brightnessFactor = 1.0 - (currentDayInCycle / phaseDuration) * 0.9;
                // Dim phase
                } else if (currentDayInCycle >= phaseDuration && currentDayInCycle < phaseDuration * 2) {
                    brightnessFactor = 0.1;
                // Waxing phase
                } else {
                    brightnessFactor = 0.1 + ((currentDayInCycle - phaseDuration * 2) / phaseDuration) * 0.9;
                }
                
                material.uniforms.alphaIntensity.value = THREE.MathUtils.lerp(material.uniforms.alphaIntensity.value, 1.8 * brightnessFactor, 0.1);
                material.uniforms.twilightIntensity.value = THREE.MathUtils.lerp(material.uniforms.twilightIntensity.value, 1.0 * brightnessFactor, 0.1);

            } else {
                 material.uniforms.alphaIntensity.value = THREE.MathUtils.lerp(material.uniforms.alphaIntensity.value, 1.8, 0.1);
                 material.uniforms.twilightIntensity.value = THREE.MathUtils.lerp(material.uniforms.twilightIntensity.value, 1.0, 0.1);
            }
        };

        if (isViridisAnimationActive) {
            clockRef.current.start();
        } else {
            clockRef.current.stop();
        }
        animateViridis();

        return () => {
            isCancelled = true;
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isViridisAnimationActive, allMeshes]);

    // This effect handles toggling the grid view on Sebaka
    useEffect(() => {
        const sebakaMesh = allMeshes.current.find(p => p.name === 'Sebaka');
        if (sebakaMesh && sebakaMesh.material instanceof THREE.ShaderMaterial) {
            const uniforms = (sebakaMesh.material as THREE.ShaderMaterial).uniforms;
            uniforms.useGrid.value = viewFromSebaka;
        }
    }, [viewFromSebaka, allMeshes]);
};
