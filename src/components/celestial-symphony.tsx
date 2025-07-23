
"use client";

import { useState } from "react";
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
  initialMaterialProperties: MaterialProperties;
  usePlainOrbits: boolean;
  showOrbits: boolean;
  fov: number;
  selectedBody: PlanetData | StarData | { name: string } | null
}

const CelestialSymphony = (props: CelestialSymphonyProps) => {
  const bodyData = useBodyData(props.stars, props.planets);
  const [materialProperties, setMaterialProperties] = useState(props.initialMaterialProperties);

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
    materialProperties: materialProperties,
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
    materialProperties: materialProperties,
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

  return (
    <>
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />
      <div style={{ display: 'none' }}>
        {/* Hidden component to pass state to InfoPanel without causing re-renders of the main component */}
        <InfoPanelContext
          selectedBody={props.selectedBody}
          materialProperties={materialProperties}
          onPropertiesChange={setMaterialProperties}
          onReset={() => setMaterialProperties(props.initialMaterialProperties)}
        />
      </div>
    </>
  );
};

// A simple context provider to pass props to the InfoPanel
// This is a pattern to avoid passing state through a component that should not re-render
let InfoPanelContextComponent: React.FC<any> = () => null;
export const setInfoPanelContextComponent = (Component: React.FC<any>) => {
  InfoPanelContextComponent = Component;
}
const InfoPanelContext: React.FC<{
  selectedBody: any;
  materialProperties: MaterialProperties;
  onPropertiesChange: React.Dispatch<React.SetStateAction<MaterialProperties>>;
  onReset: () => void;
}> = ({ selectedBody, materialProperties, onPropertiesChange, onReset }) => {
  return (
    <InfoPanelContextComponent
      data={selectedBody}
      materialProperties={materialProperties}
      onPropertiesChange={onPropertiesChange}
      onReset={onReset}
    />
  );
};


export default CelestialSymphony;
