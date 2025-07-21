
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
  cameraTarget,
}: AnimationLoopParams) => {
  const clockRef = useRef(new THREE.Clock());
  const elapsedHoursRef = useRef(0);
  const animationFrameId = useRef<number>();

  const speedMultiplierRef = useRef(speedMultiplier);
  const isSebakaRotatingRef = useRef(isSebakaRotating);
  const cameraTargetRef = useRef(cameraTarget);
  
  const characterCubeRef = useRef<SphericalCharacterCube | null>(null);
  const thirdPersonCameraRef = useRef<ThirdPersonCameraController | null>(null);

  useEffect(() => { speedMultiplierRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { isSebakaRotatingRef.current = isSebakaRotating; }, [isSebakaRotating]);
  useEffect(() => { cameraTargetRef.current = cameraTarget; }, [cameraTarget]);

  useEffect(() => {
    if (!scene || !camera || !bodyData.length || !isInitialized) return;

    if (viewFromSebaka) {
        const sebakaMesh = planetMeshesRef.current.find(m => m.name === 'Sebaka');
        if (!sebakaMesh) return;

        // Create character cube
        const character = new SphericalCharacterCube(
            scene,
            sebakaRadiusRef.current,
            sebakaMesh
        );
        characterCubeRef.current = character;

        // Create third-person camera controller
        const thirdPersonCam = new ThirdPersonCameraController(camera, character);
        thirdPersonCameraRef.current = thirdPersonCam;

        // Initialize position
        character.setLatitude(latitude);
        character.setLongitude(longitude);
        character.setYaw(cameraYaw);
        thirdPersonCam.setPitch(cameraPitch); // Use pitch for camera angle
        thirdPersonCam.updateCamera();

    } else {
        // Cleanup when exiting view
        if (characterCubeRef.current) {
            scene.remove(characterCubeRef.current.characterMesh);
            characterCubeRef.current = null;
        }
        thirdPersonCameraRef.current = null;
    }

    return () => {
        if (characterCubeRef.current && scene) {
            scene.remove(characterCubeRef.current.characterMesh);
        }
    };
  }, [viewFromSebaka, scene, camera, bodyData, isInitialized, planetMeshesRef, sebakaRadiusRef]);


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
      
      if (!viewFromSebaka) {
        onTimeUpdate(elapsedHoursRef.current);
        updateAllBodyPositions(elapsedHoursRef.current, bodyData, allBodiesRef.current, beaconPositionRef.current);
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
      
      const isFocusedOnPlanet = cameraTargetRef.current && !cameraTargetRef.current.endsWith('System') && cameraTargetRef.current !== 'Binary Stars';
      const shouldPauseRotation = speedMultiplierRef.current === 0 && isFocusedOnPlanet;

      if (isSebakaRotatingRef.current) {
        allBodiesRef.current.forEach(bodyObject => {
          const currentBodyData = bodyData.find(d => d.name === bodyObject.name);
          if (currentBodyData?.type === 'Planet' && 'rotationPeriodHours' in currentBodyData && currentBodyData.rotationPeriodHours) {
            const mesh = bodyObject.children[0] as THREE.Mesh | undefined;
            if (mesh) {
                if(shouldPauseRotation && mesh.name === cameraTargetRef.current) {
                    // Do nothing, rotation is paused
                } else {
                    const rotationPerHour = (2 * Math.PI) / currentBodyData.rotationPeriodHours;
                    mesh.rotation.y += rotationPerHour * hoursPassedThisFrame;
                }
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

      if (viewFromSebaka && characterCubeRef.current && thirdPersonCameraRef.current) {
          characterCubeRef.current.setLatitude(latitude);
          characterCubeRef.current.setLongitude(longitude);
          characterCubeRef.current.setYaw(cameraYaw);
          thirdPersonCameraRef.current.setPitch(cameraPitch);

          const character = characterCubeRef.current;
          character.planetMesh.getWorldPosition(character.characterMesh.position);
          character.planetMesh.getWorldQuaternion(character.characterMesh.quaternion);
          
          character.updateCharacterPosition(deltaTime);

          thirdPersonCameraRef.current.updateCamera(deltaTime);
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
    cameraYaw
  ]);
};
