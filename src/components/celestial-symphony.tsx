
"use client";

import { useState, useEffect, useRef } from "react";
import type { PlanetData, StarData, MaterialProperties } from "@/types";
import { useAnimationLoop } from "./CelestialSymphony/hooks/useAnimationLoop";
import { useBodyClickHandler } from "./CelestialSymphony/hooks/useBodyClickHandler";
import { useCameraControl } from "./CelestialSymphony/hooks/useCameraControl";
import { useInitializeScene } from "./CelestialSymphony/hooks/useInitializeScene";
import { useUpdateBodyMaterials } from "./CelestialSymphony/hooks/useUpdateBodyMaterials";
import { useBodyData } from "./CelestialSymphony/hooks/useBodyData";
import InfoPanel from "./info-panel";
import { Sheet, SheetContent } from "./ui/sheet";
import * as THREE from 'three';


export interface CelestialSymphonyProps {
  stars: StarData[];
  planets: PlanetData[];
  speedMultiplier?: number;
  onBodyClick: (name: string) => void;
  viewFromSebaka: boolean;
  isSebakaRotating: boolean;
  isSebakaVisible: boolean;
  characterLongitude: number;
  characterLatitude: number;
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
  selectedBody: PlanetData | StarData | { name: string } | null;
  isInfoPanelOpen: boolean;
  setInfoPanelOpen: (isOpen: boolean) => void;
  elapsedHours: number;
  isFreeCamera: boolean;
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
    originalCameraPosRef,
    characterMeshRef,
    characterHitboxRef
  } = useInitializeScene({ 
    bodyData, 
    setIsInitialized: props.setIsInitialized,
    viewFromSebaka: props.viewFromSebaka,
    usePlainOrbits: props.usePlainOrbits,
    showOrbits: props.showOrbits,
    materialProperties,
  });

  useBodyClickHandler({
    renderer: rendererRef.current,
    camera: cameraRef.current,
    allBodies: allBodiesRef.current,
    characterHitboxRef,
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
    isInitialized: props.isInitialized,
  });

  useUpdateBodyMaterials({
    stars: props.stars,
    planets: props.planets,
    allMeshes: allMeshesRef,
    allBodies: allBodiesRef,
    characterMesh: characterMeshRef.current,
    isViridisAnimationActive: props.isViridisAnimationActive,
    viewFromSebaka: props.viewFromSebaka,
    isSebakaVisible: props.isSebakaVisible,
    materialProperties: materialProperties,
    elapsedHours: props.elapsedHours,
  });

  useAnimationLoop({
    ...props,
    materialProperties: materialProperties,
    bodyData,
    scene: sceneRef.current,
    camera: cameraRef.current,
    renderer: rendererRef.current,
    controls: controlsRef.current,
    allBodiesRef,
    planetMeshesRef: allMeshesRef,
    orbitMeshesRef,
    beaconPositionRef,
    isInitialized: props.isInitialized,
    characterMeshRef,
  });

  const handleCharacterPropChange = (prop: keyof MaterialProperties['Character'], value: number) => {
    // Update state for InfoPanel and material system
    setMaterialProperties(prev => ({
        ...prev,
        Character: {
            ...prev.Character,
            [prop]: value,
        }
    }));
  }

  return (
    <>
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />
      <Sheet open={props.isInfoPanelOpen} onOpenChange={props.setInfoPanelOpen}>
        <SheetContent side="left" className="w-[65vw] max-w-2xl p-0 bg-card/80 backdrop-blur-sm" withoutOverlay>
            {props.selectedBody && (
                <InfoPanel 
                  data={props.selectedBody}
                  materialProperties={materialProperties}
                  onCharacterPropChange={handleCharacterPropChange}
                  onMaterialPropertiesChange={setMaterialProperties}
                  onReset={() => setMaterialProperties(props.initialMaterialProperties)}
                  viewFromSebaka={props.viewFromSebaka}
                />
            )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CelestialSymphony;

    