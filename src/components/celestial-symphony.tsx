
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import * as THREE from 'three';


export interface CelestialSymphonyProps {
  stars: StarData[];
  planets: PlanetData[];
  speedMultiplier?: number;
  onBodyClick: (name: string) => void;
  viewFromSebaka: boolean;
  isSebakaRotating: boolean;
  characterLongitude: number;
  characterLatitude: number;
  onCharacterLatLongChange: (lat: number, long: number) => void;
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
}

const CelestialSymphony = (props: CelestialSymphonyProps) => {
  const bodyData = useBodyData(props.stars, props.planets);
  const [materialProperties, setMaterialProperties] = useState(props.initialMaterialProperties);
  
  // Isolate character-specific state to prevent top-level re-renders
  const [characterLatitude, setCharacterLatitude] = useState(props.initialMaterialProperties.Character.height ?? 0);
  const [characterLongitude, setCharacterLongitude] = useState(props.initialMaterialProperties.Character.height ?? 0);
  const [characterOpacity, setCharacterOpacity] = useState(props.initialMaterialProperties.Character.opacity ?? 1.0);
  const [characterHeight, setCharacterHeight] = useState(props.initialMaterialProperties.Character.height ?? 0.01);
  
  useEffect(() => {
    // When entering Sebaka view, sync the external props to the internal state
    if (props.viewFromSebaka) {
        setCharacterLatitude(props.characterLatitude);
        setCharacterLongitude(props.characterLongitude);
    }
  }, [props.viewFromSebaka, props.characterLatitude, props.characterLongitude]);


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
    characterMeshRef
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
    materialProperties: materialProperties,
  });

  useAnimationLoop({
    ...props,
    characterHeight,
    characterOpacity,
    characterLatitude: props.viewFromSebaka ? props.characterLatitude : characterLatitude,
    characterLongitude: props.viewFromSebaka ? props.characterLongitude : characterLongitude,
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

  const handleCharacterPropChange = (prop: 'latitude' | 'longitude' | 'height' | 'opacity', value: number) => {
    if (prop === 'latitude') setCharacterLatitude(value);
    if (prop === 'longitude') setCharacterLongitude(value);
    if (prop === 'height') setCharacterHeight(value);
    if (prop === 'opacity') setCharacterOpacity(value);
  }

  return (
    <>
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />
      <Sheet open={props.isInfoPanelOpen} onOpenChange={props.setInfoPanelOpen}>
        <SheetContent side="left" className="w-[65vw] max-w-2xl p-0 bg-card/80 backdrop-blur-sm" withoutOverlay>
            <SheetHeader className="sr-only">
              <SheetTitle>Celestial Body Information</SheetTitle>
              <SheetDescription>
                Detailed information and material properties for the selected celestial body.
              </SheetDescription>
            </SheetHeader>
            {props.selectedBody && (
                <InfoPanel 
                  data={props.selectedBody}
                  materialProperties={materialProperties}
                  onPropertiesChange={setMaterialProperties}
                  onReset={() => setMaterialProperties(props.initialMaterialProperties)}
                  characterLatitude={characterLatitude}
                  onCharacterLatitudeChange={(v) => handleCharacterPropChange('latitude', v)}
                  characterLongitude={characterLongitude}
                  onCharacterLongitudeChange={(v) => handleCharacterPropChange('longitude', v)}
                  characterHeight={characterHeight}
                  onCharacterHeightChange={(v) => handleCharacterPropChange('height', v)}
                  characterOpacity={characterOpacity}
                  onCharacterOpacityChange={(v) => handleCharacterPropChange('opacity', v)}
                  viewFromSebaka={props.viewFromSebaka}
                />
            )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default CelestialSymphony;
