
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
            if (planetData && mesh.material instanceof THREE.MeshPhongMaterial) {
                if (mesh.name === 'Sebaka') return;
                
                if (!mesh.material.map) {
                     mesh.material.color.set(planetData.color);
                }
        
                if (mesh.name === 'Viridis' && !mesh.material.map) {
                    viridisOriginalColorRef.current.set(planetData.color);
                }
            }
        });
    }, [planets, planetMeshesRef, viridisOriginalColorRef]);

     useEffect(() => {
        planetMeshesRef.current.forEach((mesh) => {
            const props = materialProperties[mesh.name];
            if (props && mesh.material instanceof THREE.MeshPhongMaterial) {
                
                if (props.normalScale !== undefined && mesh.material.normalScale?.x !== props.normalScale) {
                    mesh.material.normalScale.set(props.normalScale, props.normalScale);
                }

                if (props.displacementScale !== undefined && mesh.material.displacementScale !== props.displacementScale) {
                    mesh.material.displacementScale = props.displacementScale;
                }

                if (props.emissiveIntensity !== undefined && mesh.material.emissiveIntensity !== props.emissiveIntensity) {
                    mesh.material.emissiveIntensity = props.emissiveIntensity;
                }

                mesh.material.needsUpdate = true;
            }
        });
    }, [materialProperties, planetMeshesRef]);


    useEffect(() => {
        const viridisMesh = planetMeshesRef.current.find(p => p.name === 'Viridis');
        if (!viridisMesh || !(viridisMesh.material instanceof THREE.MeshPhongMaterial)) return;

        let isCancelled = false;

        const animateViridis = () => {
            if (isCancelled) return;
            animationFrameId.current = requestAnimationFrame(animateViridis);
            const deltaTime = clockRef.current.getDelta();
            elapsedHoursRef.current += deltaTime * 24; // Assuming 1 day/sec for this animation's timing
            const elapsedDays = elapsedHoursRef.current / HOURS_IN_SEBAKA_DAY;

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
                
                const material = viridisMesh.material as THREE.MeshPhongMaterial;
                if (material.map) {
                    const originalColor = new THREE.Color(0xffffff);
                    const targetColor = originalColor.clone().multiplyScalar(brightnessFactor);
                    material.color.lerp(targetColor, 0.1);
                } else {
                     const targetColor = viridisOriginalColorRef.current.clone().multiplyScalar(brightnessFactor);
                     material.color.lerp(targetColor, 0.1);
                     material.emissive.lerp(targetColor, 0.1);
                     material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, brightnessFactor, 0.1);
                }
            } else {
                const material = viridisMesh.material as THREE.MeshPhongMaterial;
                if (material.map) {
                    material.color.lerp(new THREE.Color(0xffffff), 0.1);
                } else {
                    material.color.lerp(viridisOriginalColorRef.current, 0.1);
                    material.emissive.lerp(new THREE.Color(0x000000), 0.1);
                    material.emissiveIntensity = THREE.MathUtils.lerp(material.emissiveIntensity, 0, 0.1);
                }
            }
        };

        animateViridis();

        return () => {
            isCancelled = true;
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isViridisAnimationActive, planetMeshesRef, viridisOriginalColorRef]);

};
