
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { updateAllBodyPositions } from "../utils/updateAllBodyPositions";
import { HOURS_IN_SEBAKA_DAY } from "../constants/config";
import type { BodyData } from "./useBodyData";
import { SphericalCharacterController } from '../utils/SphericalCharacterController';
import { ThirdPersonOrbitControls } from '../utils/ThirdPersonOrbitControls';

interface AnimationLoopParams {
    speedMultiplier?: number;
    viewFromSebaka: boolean;
    isSebakaRotating: boolean;
    longitude: number;
    latitude: number;
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
    isInitialized: boolean;
    cameraTarget: string | null;
};

export const useAnimationLoop = ({
  speedMultiplier = 24,
  viewFromSebaka,
  isSebakaRotating,
  longitude,
  latitude,
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
}: AnimationLoopParams) => {
  const clockRef = useRef(new THREE.Clock());
  const elapsedHoursRef = useRef(0);
  const animationFrameId = useRef<number>();

  const speedMultiplierRef = useRef(speedMultiplier);
  const isSebakaRotatingRef = useRef(isSebakaRotating);
  
  const characterControllerRef = useRef<SphericalCharacterController | null>(null);
  const thirdPersonControlsRef = useRef<ThirdPersonOrbitControls | null>(null);

  useEffect(() => { speedMultiplierRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { isSebakaRotatingRef.current = isSebakaRotating; }, [isSebakaRotating]);
  
  useEffect(() => {
    if (!scene || !camera || !renderer || !controls || !bodyData.length || !isInitialized) return;

    const sebakaBody = allBodiesRef.current.find(b => b.name === 'Sebaka');
    const sebakaMesh = sebakaBody?.children[0] as THREE.Mesh | undefined;
    
    // Clean up previous controllers first
    if (thirdPersonControlsRef.current) {
        thirdPersonControlsRef.current.dispose();
        thirdPersonControlsRef.current = null;
    }
    if (characterControllerRef.current) {
        characterControllerRef.current.dispose();
        characterControllerRef.current = null;
    }

    if (viewFromSebaka && sebakaMesh) {
      characterControllerRef.current = new SphericalCharacterController(sebakaMesh);
      thirdPersonControlsRef.current = new ThirdPersonOrbitControls(camera, renderer.domElement, characterControllerRef.current.characterMesh, sebakaMesh);
      
      const startDistance = 2;
      thirdPersonControlsRef.current.controls.minDistance = 0.5;
      thirdPersonControlsRef.current.controls.maxDistance = 20;

      // Manually set the initial camera position
      const charPos = new THREE.Vector3();
      characterControllerRef.current.characterMesh.getWorldPosition(charPos);
      
      const upVec = new THREE.Vector3().subVectors(charPos, sebakaMesh.getWorldPosition(new THREE.Vector3())).normalize();
      
      // Get a "forward" vector relative to the character
      const forward = new THREE.Vector3();
      characterControllerRef.current.characterMesh.getWorldDirection(forward);
      
      const cameraPos = charPos.clone()
        .add(upVec.clone().multiplyScalar(startDistance * 0.5)) // Go up a bit
        .add(forward.clone().multiplyScalar(-startDistance)); // Go back
        
      camera.position.copy(cameraPos);
      thirdPersonControlsRef.current.controls.target.copy(charPos);
      thirdPersonControlsRef.current.controls.update();

    } else {
        controls.enabled = true;
    }

    return () => {
       if (thirdPersonControlsRef.current) {
        thirdPersonControlsRef.current.dispose();
        thirdPersonControlsRef.current = null;
      }
       if (characterControllerRef.current) {
        characterControllerRef.current.dispose();
        characterControllerRef.current = null;
      }
    };
  }, [viewFromSebaka, scene, camera, renderer, bodyData, isInitialized, planetMeshesRef, controls, allBodiesRef]);


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

      if (viewFromSebaka && characterControllerRef.current && thirdPersonControlsRef.current) {
          characterControllerRef.current.update(longitude, latitude);
          thirdPersonControlsRef.current.update();
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
    latitude, 
    longitude, 
  ]);
};
