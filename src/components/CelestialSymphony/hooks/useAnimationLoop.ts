
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { updateAllBodyPositions } from "../utils/updateAllBodyPositions";
import { HOURS_IN_SEBAKA_DAY } from "../constants/config";
import type { BodyData } from "./useBodyData";
import { SphericalCharacterCube } from "../utils/SphericalCharacterCube";
import { ThirdPersonCameraController } from "../utils/ThirdPersonCameraController";

interface AnimationLoopParams {
    speedMultiplier?: number;
    viewFromSebaka: boolean;
    isSebakaRotating: boolean;
    longitude: number;
    latitude: number;
    cameraPitch: number;
    cameraYaw: number;
    cameraFov: number;
    isViridisAnimationActive: boolean;
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
    sebakaRadiusRef: React.MutableRefObject<number>;
    isInitialized: boolean;
    cameraTarget: string | null;
};

export const useAnimationLoop = ({
  speedMultiplier = 24,
  viewFromSebaka,
  isSebakaRotating,
  longitude,
  latitude,
  cameraPitch,
  cameraYaw,
  cameraFov,
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
  sebakaRadiusRef,
  isInitialized,
}: AnimationLoopParams) => {
  const clockRef = useRef(new THREE.Clock());
  const elapsedHoursRef = useRef(0);
  const animationFrameId = useRef<number>();

  const speedMultiplierRef = useRef(speedMultiplier);
  const isSebakaRotatingRef = useRef(isSebakaRotating);
  
  const characterRef = useRef<SphericalCharacterCube | null>(null);
  const cameraControllerRef = useRef<ThirdPersonCameraController | null>(null);

  useEffect(() => { speedMultiplierRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { isSebakaRotatingRef.current = isSebakaRotating; }, [isSebakaRotating]);
  
  useEffect(() => {
    if (!scene || !camera || !bodyData.length || !isInitialized) return;

    if (viewFromSebaka) {
        const sebakaMesh = planetMeshesRef.current.find(m => m.name === 'Sebaka');
        if (!sebakaMesh) return;
        
        const character = new SphericalCharacterCube(sebakaMesh, sebakaRadiusRef.current);
        characterRef.current = character;

        const cameraController = new ThirdPersonCameraController(camera, character);
        cameraControllerRef.current = cameraController;

    } else {
        if (characterRef.current) {
            characterRef.current.removeFromScene();
            characterRef.current = null;
        }
        cameraControllerRef.current = null;
    }

    return () => {
        if (characterRef.current) {
            characterRef.current.removeFromScene();
            characterRef.current = null;
        }
        cameraControllerRef.current = null;
    };
  }, [viewFromSebaka, scene, camera, bodyData, isInitialized, planetMeshesRef]);


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

      if (!viewFromSebaka) {
        onTimeUpdate(elapsedHoursRef.current);
      }

      const alphaStarBody = allBodiesRef.current.find(b => b.name === 'Alpha');
      const twilightStarBody = allBodiesRef.current.find(b => b.name === 'Twilight');
      const beaconStarBody = allBodiesRef.current.find(b => b.name === 'Beacon');
      
      if (alphaStarBody && twilightStarBody && beaconStarBody) {
          planetMeshesRef.current.forEach(planetMesh => {
              if (planetMesh.material instanceof THREE.ShaderMaterial) {
                  planetMesh.material.uniforms.alphaStarPos.value.copy(alphaStarBody.position);
                  planetMesh.material.uniforms.twilightStarPos.value.copy(twilightStarBody.position);
                  planetMesh.material.uniforms.beaconStarPos.value.copy(beaconStarBody.position);
              }
          });
          
          const updateSpiderStrandMaterial = (material: THREE.Material | THREE.Material[]) => {
            const materials = Array.isArray(material) ? material : [material];
            materials.forEach(mat => {
              if (mat instanceof THREE.ShaderMaterial && mat.uniforms.hasOwnProperty('alphaStarPos')) {
                  const uniforms = mat.uniforms;
                  uniforms.time.value = elapsedHoursRef.current * 0.001;
                  uniforms.alphaStarPos.value.copy(alphaStarBody.position);
                  uniforms.twilightStarPos.value.copy(twilightStarBody.position);
                  uniforms.beaconStarPos.value.copy(beaconStarBody.position);
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
      
      if (isSebakaRotatingRef.current) {
        allBodiesRef.current.forEach(bodyObject => {
          const currentBodyData = bodyData.find(d => d.name === bodyObject.name);
          if (currentBodyData?.type === 'Planet' && 'rotationPeriodHours' in currentBodyData && currentBodyData.rotationPeriodHours) {
            const mesh = bodyObject.children[0] as THREE.Mesh | undefined;
            if (mesh) {
                const rotationPerHour = (2 * Math.PI) / currentBodyData.rotationPeriodHours;
                mesh.rotation.y += rotationPerHour * hoursPassedThisFrame;
            }
          }
        });
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

      if (viewFromSebaka && characterRef.current && cameraControllerRef.current) {
          const character = characterRef.current;
          const cameraController = cameraControllerRef.current;
          
          character.longitude = longitude;
          character.latitude = latitude;
          character.yaw = cameraYaw;
          character.updateCharacterPosition(deltaTime);

          cameraController.pitch = cameraPitch;
          cameraController.distance = cameraFov;
          cameraController.updateCamera(deltaTime);
      } else {
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
    latitude, 
    longitude, 
    cameraPitch, 
    cameraYaw,
    cameraFov
  ]);
};
