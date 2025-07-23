
"use client";

import type { PlanetData, StarData, MaterialProperties } from "@/types";
import { useAnimationLoop } from "./CelestialSymphony/hooks/useAnimationLoop";
import { useBodyClickHandler } from "./CelestialSymphony/hooks/useBodyClickHandler";
import { useCameraControl } from "./CelestialSymphony/hooks/useCameraControl";
import { useInitializeScene } from "./CelestialSymphony/hooks/useInitializeScene";
import { useUpdateBodyMaterials } from "./CelestialSymphony/hooks/useUpdateBodyMaterials";
import { useBodyData } from "./CelestialSymphony/hooks/useBodyData";

export interface CelestialSymphonyProps {
  stars: StarData[];
  planets: PlanetData[];
  speedMultiplier?: number;
  onBodyClick: (name: string) => void;
  viewFromSebaka: boolean;
  isSebakaRotating: boolean;
  longitude: number;
  latitude: number;
  isViridisAnimationActive: boolean;
  onTimeUpdate: (elapsedHours: number) => void;
  goToTime: number | null;
  onGoToTimeComplete: () => void;
  cameraTarget: string | null;
  isInitialized: boolean;
  setIsInitialized: (isInitialized: boolean) => void;
  materialProperties: MaterialProperties;
  usePlainOrbits: boolean;
  showOrbits: boolean;
  fov: number;
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
    allMeshesRef,
    orbitMeshesRef,
    beaconPositionRef,
    sebakaRadiusRef,
    originalCameraPosRef,
    characterMeshRef
  } = useInitializeScene({ 
    bodyData, 
    setIsInitialized: props.setIsInitialized,
    viewFromSebaka: props.viewFromSebaka,
    usePlainOrbits: props.usePlainOrbits,
    showOrbits: props.showOrbits,
    materialProperties: props.materialProperties,
  });

  useBodyClickHandler({
    renderer: rendererRef.current,
    camera: cameraRef.current,
    allBodies: allBodiesRef.current,
    characterMesh: characterMeshRef.current,
    onBodyClick: props.onBodyClick,
    viewFromSebaka: props.viewFromSebaka,
  });

  useCameraControl({
    camera: cameraRef.current,
    controls: controlsRef.current,
    cameraTarget: props.cameraTarget,
    viewFromSebaka: props.viewFromSebaka,
    allBodiesRef,
    planetMeshesRef: allMeshesRef,
    bodyData,
    beaconPositionRef,
    originalCameraPosRef,
    orbitMeshesRef,
    fov: props.fov,
  });

  useUpdateBodyMaterials({
    stars: props.stars,
    planets: props.planets,
    allMeshes: allMeshesRef,
    allBodies: allBodiesRef,
    characterMesh: characterMeshRef.current,
    isViridisAnimationActive: props.isViridisAnimationActive,
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
    planetMeshesRef: allMeshesRef,
    orbitMeshesRef,
    beaconPositionRef,
    characterMeshRef
  });

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
};

export default CelestialSymphony;
