
"use client";

import type { PlanetData, StarData, MaterialProperties } from "@/types";
import { useAnimationLoop } from "./CelestialSymphony/hooks/useAnimationLoop";
import { useBodyClickHandler } from "./CelestialSymphony/hooks/useBodyClickHandler";
import { useCameraControl } from "./CelestialSymphony/hooks/useCameraControl";
import { useInitializeScene } from "./CelestialSymphony/hooks/useInitializeScene";
import { useUpdateBodyMaterials } from "./CelestialSymphony/hooks/useUpdateBodyMaterials";
import { useBodyData } from "./CelestialSymphony/hooks/useBodyData";
import type * as THREE from 'three';

export interface CelestialSymphonyProps {
  stars: StarData[];
  planets: PlanetData[];
  speedMultiplier?: number;
  onBodyClick: (name: string) => void;
  viewFromSebaka: boolean;
  isSebakaRotating: boolean;
  longitude: number;
  latitude: number;
  cameraPitch: number;
  cameraYaw: number;
  cameraFov: number;
  resetViewToggle: boolean;
  isViridisAnimationActive: boolean;
  onTimeUpdate: (elapsedHours: number) => void;
  goToTime: number | null;
  cameraTarget: string | null;
  isInitialized: boolean;
  setIsInitialized: (isInitialized: boolean) => void;
  materialProperties: MaterialProperties;
}

const CelestialSymphony = (props: CelestialSymphonyProps) => {
  const bodyData = useBodyData(props.stars, props.planets);

  const {
    mountRef,
    sceneRef,
    cameraRef,
    rendererRef,
    controlsRef,
    allBodiesRef,
    planetMeshesRef,
    orbitMeshesRef,
    sebakaDetailedMaterialRef,
    sebakaSimpleMaterialRef,
    viridisOriginalColorRef,
    beaconPositionRef,
    sebakaRadiusRef,
    originalCameraPosRef,
    goldenGiverLightRef,
    twilightLightRef
  } = useInitializeScene({ bodyData, setIsInitialized: props.setIsInitialized });

  useBodyClickHandler({
    renderer: rendererRef.current,
    camera: cameraRef.current,
    allBodies: allBodiesRef.current,
    onBodyClick: props.onBodyClick,
    viewFromSebaka: props.viewFromSebaka,
  });

  useCameraControl({
    camera: cameraRef.current,
    controls: controlsRef.current,
    cameraTarget: props.cameraTarget,
    viewFromSebaka: props.viewFromSebaka,
    cameraFov: props.cameraFov,
    resetViewToggle: props.resetViewToggle,
    allBodiesRef,
    bodyData,
    beaconPositionRef,
    originalCameraPosRef,
    orbitMeshesRef,
  });

  useUpdateBodyMaterials({
    planets: props.planets,
    planetMeshesRef,
    viridisOriginalColorRef,
    isViridisAnimationActive: props.isViridisAnimationActive,
    sebakaDetailedMaterialRef,
    sebakaSimpleMaterialRef,
    viewFromSebaka: props.viewFromSebaka,
    materialProperties: props.materialProperties,
  });

  useAnimationLoop({
    ...props,
    bodyData,
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    controls: controlsRef.current,
    allBodiesRef,
    planetMeshesRef,
    orbitMeshesRef,
    beaconPositionRef,
    sebakaRadiusRef,
    goldenGiverLightRef: goldenGiverLightRef as React.MutableRefObject<THREE.PointLight | undefined>,
    twilightLightRef: twilightLightRef as React.MutableRefObject<THREE.PointLight | undefined>,
  });

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
};

export default CelestialSymphony;