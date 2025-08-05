
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { updateAllBodyPositions } from "../utils/updateAllBodyPositions";
import type { BodyData } from "./useBodyData";
import { SphericalCharacterController } from '../utils/SphericalCharacterController';
import { CloseUpCharacterCamera } from '../utils/CloseUpCharacterCamera';
import { MaterialProperties } from "@/types";

interface AnimationLoopParams {
    speedMultiplier?: number;
    viewFromSebaka: boolean;
    isSebakaRotating: boolean;
    characterStateRef: React.MutableRefObject<{ latitude: number, longitude: number, height: number }>;
    materialProperties: MaterialProperties;
    onTimeUpdate: (elapsedHours: number) => void;
    goToTime: number | null;
    onGoToTimeComplete: () => void;
    bodyData: BodyData[];
    scene: THREE.Scene | undefined;
    camera: THREE.PerspectiveCamera | undefined;
    renderer: THREE.WebGLRenderer | undefined;
    controls: OrbitControls | undefined;
    allBodiesRef: React.MutableRefObject<THREE.Object3D[]>;
    planetMeshesRef: React.MutableRefObject<THREE.Mesh[]>;
    orbitMeshesRef: React.MutableRefObject<THREE.Mesh[]>;
    beaconPositionRef: React.MutableRefObject<THREE.Vector3>;
    isInitialized: boolean;
    cameraTarget: string | null;
    characterMeshRef: React.MutableRefObject<THREE.Object3D | null>;
};

export const useAnimationLoop = ({
  speedMultiplier = 24,
  viewFromSebaka,
  isSebakaRotating,
  characterStateRef,
  materialProperties,
  onTimeUpdate,
  goToTime,
  onGoToTimeComplete,
  bodyData,
  scene,
  camera,
  renderer,
  controls,
  allBodiesRef,
  planetMeshesRef,
  orbitMeshesRef,
  beaconPositionRef,
  isInitialized,
  characterMeshRef,
}: AnimationLoopParams) => {
  const clockRef = useRef(new THREE.Clock());
  const elapsedHoursRef = useRef(0);
  const animationFrameId = useRef<number>();

  const speedMultiplierRef = useRef(speedMultiplier);
  const isSebakaRotatingRef = useRef(isSebakaRotating);
  
  const characterControllerRef = useRef<SphericalCharacterController | null>(null);
  const thirdPersonCameraRef = useRef<CloseUpCharacterCamera | null>(null);

  useEffect(() => { speedMultiplierRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { isSebakaRotatingRef.current = isSebakaRotating; }, [isSebakaRotating]);
  
  useEffect(() => {
    if (!scene || !camera || !renderer || !controls || !bodyData.length || !isInitialized) return;

    const sebakaContainer = allBodiesRef.current.find(b => b.name === 'Sebaka');
    const sebakaMesh = planetMeshesRef.current.find(b => b.name === 'Sebaka') as THREE.Mesh | undefined;
    
    if (thirdPersonCameraRef.current) {
        thirdPersonCameraRef.current.dispose();
        thirdPersonCameraRef.current = null;
    }
    if (characterControllerRef.current) {
        characterControllerRef.current.dispose();
        characterControllerRef.current = null;
    }

    if (viewFromSebaka && sebakaMesh && sebakaContainer) {
      characterControllerRef.current = new SphericalCharacterController(sebakaMesh);
      characterMeshRef.current = characterControllerRef.current.characterMesh; // Store character mesh
      thirdPersonCameraRef.current = new CloseUpCharacterCamera(
        camera, 
        characterControllerRef.current.characterMesh, 
        sebakaMesh,
        sebakaContainer,
        renderer.domElement
      );
      controls.enabled = false;
    } else {
        controls.enabled = true;
        if(characterMeshRef.current) {
            characterMeshRef.current.parent?.remove(characterMeshRef.current);
            characterMeshRef.current = null;
        }
    }

    return () => {
       if (thirdPersonCameraRef.current) {
        thirdPersonCameraRef.current.dispose();
        thirdPersonCameraRef.current = null;
      }
       if (characterControllerRef.current) {
        characterControllerRef.current.dispose();
        characterControllerRef.current = null;
      }
    };
  }, [viewFromSebaka, scene, camera, renderer, bodyData, isInitialized, planetMeshesRef, controls, allBodiesRef, characterMeshRef]);


  useEffect(() => {
    if (goToTime !== null) {
      elapsedHoursRef.current = goToTime;
      if (allBodiesRef.current.length > 0 && isInitialized) {
        updateAllBodyPositions(goToTime, bodyData, allBodiesRef.current, beaconPositionRef.current);
      }
      onTimeUpdate(goToTime);
      onGoToTimeComplete();
    }
  }, [goToTime, bodyData, allBodiesRef, beaconPositionRef, onTimeUpdate, isInitialized, onGoToTimeComplete]);

  useEffect(() => {
    if (!scene || !camera || !renderer || !controls || !isInitialized) return;

    let isCancelled = false;
    
    const animate = () => {
      if (isCancelled || !isInitialized) return;
      
      animationFrameId.current = requestAnimationFrame(animate);
      
      const deltaTime = clockRef.current.getDelta();
      const hoursPassedThisFrame = deltaTime * speedMultiplierRef.current;
      elapsedHoursRef.current += hoursPassedThisFrame;
      
      updateAllBodyPositions(elapsedHoursRef.current, bodyData, allBodiesRef.current, beaconPositionRef.current);

      onTimeUpdate(elapsedHoursRef.current);
      
      allBodiesRef.current.forEach(bodyObject => {
          const currentBodyData = bodyData.find(d => d.name === bodyObject.name);
          if (currentBodyData?.type === 'Planet' && 'rotationPeriodHours' in currentBodyData && currentBodyData.rotationPeriodHours && isSebakaRotatingRef.current) {
              const mesh = bodyObject.children[0] as THREE.Mesh | undefined;
              if (mesh) {
                  const rotationPerHour = (2 * Math.PI) / currentBodyData.rotationPeriodHours;
                  mesh.rotation.y += rotationPerHour * hoursPassedThisFrame;
              }
          }
          if (currentBodyData?.type === 'Star') {
            const starGroup = bodyObject.children[0] as THREE.Group | undefined;
            starGroup?.userData?.update?.(elapsedHoursRef.current);
          }
      });
      

      const alphaStarBody = allBodiesRef.current.find(b => b.name === 'Alpha');
      const twilightStarBody = allBodiesRef.current.find(b => b.name === 'Twilight');
      const beaconStarBody = allBodiesRef.current.find(b => b.name === 'Beacon');
      
      if (alphaStarBody && twilightStarBody && beaconStarBody) {
          const allPlanetAndCharacterMeshes = [...planetMeshesRef.current];
          if (characterMeshRef.current) {
              allPlanetAndCharacterMeshes.push(characterMeshRef.current as THREE.Mesh);
          }

          allPlanetAndCharacterMeshes.forEach(mesh => {
              if (mesh.material instanceof THREE.ShaderMaterial) {
                  const uniforms = mesh.material.uniforms;
                  if (uniforms.alphaStarPos) uniforms.alphaStarPos.value.copy(alphaStarBody.position);
                  if (uniforms.twilightStarPos) uniforms.twilightStarPos.value.copy(twilightStarBody.position);
                  if (uniforms.beaconStarPos) uniforms.beaconStarPos.value.copy(beaconStarBody.position);
              }
          });
          
          const updateSpiderStrandMaterial = (material: THREE.Material | THREE.Material[]) => {
            const materials = Array.isArray(material) ? material : [material];
            materials.forEach(mat => {
              if (mat instanceof THREE.ShaderMaterial && mat.uniforms.hasOwnProperty('time')) {
                  const uniforms = mat.uniforms;
                  uniforms.time.value = elapsedHoursRef.current * 0.001;
              }
            });
          };

          orbitMeshesRef.current.forEach(orbitMesh => {
              updateSpiderStrandMaterial(orbitMesh.material);
          });
          
          const spectrisMesh = planetMeshesRef.current.find(p => p.name === 'Spectris');
          if (spectrisMesh) {
              spectrisMesh.children.forEach(child => {
                  if (child instanceof THREE.Mesh) {
                     updateSpiderStrandMaterial(child.material);
                  }
              });
          }
      }
      
      const gelidisOrbit = orbitMeshesRef.current.find(o => o.name === 'Gelidis_orbit');
      const liminisOrbit = orbitMeshesRef.current.find(o => o.name === 'Liminis_orbit');
      if(gelidisOrbit) gelidisOrbit.position.copy(beaconPositionRef.current);
      if(liminisOrbit) liminisOrbit.position.copy(beaconPositionRef.current);

      const spectrisMesh = planetMeshesRef.current.find(p => p.name === 'Spectris');
      if (spectrisMesh) {
          spectrisMesh.children.forEach(child => {
              if (child instanceof THREE.Mesh) {
                  const speed = (Math.random() - 0.5) * 0.001;
                  child.rotation.z += speed;
              }
          });
      }

      if (viewFromSebaka && characterControllerRef.current && thirdPersonCameraRef.current && alphaStarBody && twilightStarBody && beaconStarBody) {
          const { latitude, longitude, height } = characterStateRef.current;
          characterControllerRef.current.update(
            longitude, 
            latitude, 
            height, 
            materialProperties.Character,
            alphaStarBody.position,
            twilightStarBody.position,
            beaconStarBody.position
          );
          thirdPersonCameraRef.current.update();
          controls.enabled = false;
      } else {
        controls.enabled = true;
        controls.update();
      }

      renderer.render(scene, camera);
    };

    clockRef.current.start();
    animate();

    return () => {
      isCancelled = true;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      clockRef.current.stop();
    };
  }, [
    scene, 
    camera, 
    renderer, 
    controls, 
    bodyData, 
    allBodiesRef, 
    planetMeshesRef, 
    orbitMeshesRef, 
    beaconPositionRef, 
    onTimeUpdate,
    isInitialized,
    viewFromSebaka,
    characterStateRef,
    materialProperties,
  ]);
};
