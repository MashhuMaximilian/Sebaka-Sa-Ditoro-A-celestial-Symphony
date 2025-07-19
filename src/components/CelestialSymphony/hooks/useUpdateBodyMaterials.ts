
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PlanetData, MaterialProperties } from "@/types";
import { HOURS_IN_SEBAKA_DAY } from "../constants/config";

interface UpdateBodyMaterialsProps {
    planets: PlanetData[];
    planetMeshesRef: React.MutableRefObject<THREE.Mesh[]>;
    viridisOriginalColorRef: React.MutableRefObject<THREE.Color>;
    isViridisAnimationActive: boolean;
    viewFromSebaka: boolean;
    materialProperties: MaterialProperties;
}

export const useUpdateBodyMaterials = ({
    planets,
    planetMeshesRef,
    viridisOriginalColorRef,
    isViridisAnimationActive,
    viewFromSebaka,
    materialProperties,
}: UpdateBodyMaterialsProps) => {

    const elapsedHoursRef = useRef(0);
    const animationFrameId = useRef<number>();
    const clockRef = useRef(new THREE.Clock());

    useEffect(() => {
        planetMeshesRef.current.forEach((mesh) => {
            const planetData = planets.find(p => p.name === mesh.name);
            // This effect is for color changes, which we are not currently doing with shaders.
            // If color needs to be a uniform, it would be set here.
        });
    }, [planets, planetMeshesRef]);

     useEffect(() => {
        planetMeshesRef.current.forEach((mesh) => {
            const props = materialProperties[mesh.name];
            if (props && mesh.material instanceof THREE.ShaderMaterial) {
                const uniforms = (mesh.material as THREE.ShaderMaterial).uniforms;

                if (props.normalScale !== undefined && uniforms.normalScale.value.x !== props.normalScale) {
                    uniforms.normalScale.value.set(props.normalScale, props.normalScale);
                }

                if (props.displacementScale !== undefined && uniforms.displacementScale.value !== props.displacementScale) {
                    uniforms.displacementScale.value = props.displacementScale;
                }
                
                // Note: emissiveIntensity is handled for stars in createBodyMesh
                // but could be controlled here if planets were to become emissive.
            }
        });
    }, [materialProperties, planetMeshesRef]);


    useEffect(() => {
        const viridisMesh = planetMeshesRef.current.find(p => p.name === 'Viridis');
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

        animateViridis();

        return () => {
            isCancelled = true;
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isViridisAnimationActive, planetMeshesRef]);

    // This effect handles toggling the grid view on Sebaka
    useEffect(() => {
        const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
        if (sebakaMesh && sebakaMesh.material instanceof THREE.ShaderMaterial) {
            const uniforms = (sebakaMesh.material as THREE.ShaderMaterial).uniforms;
            uniforms.useGrid.value = viewFromSebaka;
        }
    }, [viewFromSebaka, planetMeshesRef]);

};
