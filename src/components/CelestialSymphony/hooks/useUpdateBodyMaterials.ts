
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PlanetData } from "@/types";

interface UpdateBodyMaterialsProps {
    planets: PlanetData[];
    planetMeshesRef: React.MutableRefObject<THREE.Mesh[]>;
    viridisOriginalColorRef: React.MutableRefObject<THREE.Color>;
    isViridisAnimationActive: boolean;
    sebakaDetailedMaterialRef: React.MutableRefObject<THREE.MeshStandardMaterial | undefined>;
    sebakaSimpleMaterialRef: React.MutableRefObject<THREE.MeshStandardMaterial | undefined>;
    viewFromSebaka: boolean;
}

export const useUpdateBodyMaterials = ({
    planets,
    planetMeshesRef,
    viridisOriginalColorRef,
    isViridisAnimationActive,
    sebakaDetailedMaterialRef,
    sebakaSimpleMaterialRef,
    viewFromSebaka,
}: UpdateBodyMaterialsProps) => {

    const elapsedHoursRef = useRef(0);
    const animationFrameId = useRef<number>();

    useEffect(() => {
        planetMeshesRef.current.forEach((mesh) => {
            const planetData = planets.find(p => p.name === mesh.name);
            if (planetData && mesh.material instanceof THREE.MeshStandardMaterial) {
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
        const viridisMesh = planetMeshesRef.current.find(p => p.name === 'Viridis');
        if (!viridisMesh || !(viridisMesh.material instanceof THREE.MeshStandardMaterial)) return;

        const animateViridis = () => {
            animationFrameId.current = requestAnimationFrame(animateViridis);
            const elapsedDays = elapsedHoursRef.current / 24;
            
            if (isViridisAnimationActive) {
                const cycleDurationDays = 27;
                const currentDayInCycle = elapsedDays % cycleDurationDays;
                const phaseDuration = 9;
                let brightnessFactor = 1.0;
                if (currentDayInCycle < phaseDuration) {
                    brightnessFactor = 1.0 - (currentDayInCycle / phaseDuration) * 0.9;
                } else if (currentDayInCycle < phaseDuration * 2) {
                    brightnessFactor = 0.1;
                } else {
                    brightnessFactor = 0.1 + ((currentDayInCycle - phaseDuration * 2) / phaseDuration) * 0.9;
                }
                
                const material = viridisMesh.material as THREE.MeshStandardMaterial;
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
                const material = viridisMesh.material as THREE.MeshStandardMaterial;
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
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [isViridisAnimationActive, planetMeshesRef, viridisOriginalColorRef]);

    useEffect(() => {
        const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
        if (sebakaMesh && sebakaDetailedMaterialRef.current && sebakaSimpleMaterialRef.current) {
            sebakaMesh.material = viewFromSebaka ? sebakaSimpleMaterialRef.current : sebakaDetailedMaterialRef.current;
        }
    }, [viewFromSebaka, planetMeshesRef, sebakaDetailedMaterialRef, sebakaSimpleMaterialRef]);
};
