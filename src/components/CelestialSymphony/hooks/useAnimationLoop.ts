
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { updateAllBodyPositions } from "../utils/updateAllBodyPositions";
import { HOURS_IN_SEBAKA_DAY } from "../constants/config";
import type { BodyData } from "./useBodyData";
import type { PlanetData } from "@/types";
import { spiderStrandShader } from "../shaders/spiderStrandShader";

// Define props directly to avoid circular dependency
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
  const viewFromSebakaRef = useRef(viewFromSebaka);
  const isSebakaRotatingRef = useRef(isSebakaRotating);
  const playerInputsRef = useRef({ longitude, latitude, pitch: cameraPitch, yaw: cameraYaw });
  const cameraTargetRef = useRef(cameraTarget);

  useEffect(() => { speedMultiplierRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { viewFromSebakaRef.current = viewFromSebaka; }, [viewFromSebaka]);
  useEffect(() => { isSebakaRotatingRef.current = isSebakaRotating; }, [isSebakaRotating]);
  useEffect(() => { playerInputsRef.current = { longitude, latitude, pitch: cameraPitch, yaw: cameraYaw }; }, [longitude, latitude, cameraPitch, cameraYaw]);
  useEffect(() => { cameraTargetRef.current = cameraTarget; }, [cameraTarget]);

  useEffect(() => {
    if (goToTime !== null) {
      elapsedHoursRef.current = goToTime;
      if (allBodiesRef.current.length > 0 && isInitialized) {
        updateAllBodyPositions(goToTime, bodyData, allBodiesRef.current, beaconPositionRef.current);
      }
      onTimeUpdate(goToTime);
      onGoToTimeComplete(); // Signal that the time jump is complete
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
      
      onTimeUpdate(elapsedHoursRef.current);
      updateAllBodyPositions(elapsedHoursRef.current, bodyData, allBodiesRef.current, beaconPositionRef.current);

      const alphaStarBody = allBodiesRef.current.find(b => b.name === 'Alpha');
      const twilightStarBody = allBodiesRef.current.find(b => b.name === 'Twilight');
      const beaconStarBody = allBodiesRef.current.find(b => b.name === 'Beacon');
      
      if (alphaStarBody && twilightStarBody && beaconStarBody) {
          // Update shader uniforms for all planets
          planetMeshesRef.current.forEach(planetMesh => {
              if (planetMesh.material instanceof THREE.ShaderMaterial) {
                  planetMesh.material.uniforms.alphaStarPos.value.copy(alphaStarBody.position);
                  planetMesh.material.uniforms.twilightStarPos.value.copy(twilightStarBody.position);
                  planetMesh.material.uniforms.beaconStarPos.value.copy(beaconStarBody.position);
              }
          });
          
          // Update spider strand shader uniforms (orbits and rings)
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
      
      // Auto-pause rotation when speed is 0 and focused on a planet
      const isFocusedOnPlanet = cameraTargetRef.current && !cameraTargetRef.current.endsWith('System') && cameraTargetRef.current !== 'Binary Stars';
      const shouldPauseRotation = speedMultiplierRef.current === 0 && isFocusedOnPlanet;

      if (isSebakaRotatingRef.current) {
        allBodiesRef.current.forEach(bodyObject => {
          const currentBodyData = bodyData.find(d => d.name === bodyObject.name) as PlanetData | undefined;
          if (currentBodyData?.type === 'Planet' && currentBodyData?.rotationPeriodHours) {
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

      const sebakaBody = allBodiesRef.current.find(p => p.name === 'Sebaka');
      const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');

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

      if (viewFromSebakaRef.current && sebakaMesh && sebakaBody) {
          const lat = playerInputsRef.current.latitude;
          const lon = playerInputsRef.current.longitude;
          const pitch = playerInputsRef.current.pitch;
          const yaw = playerInputsRef.current.yaw;
  
          // 1. Calculate camera position on the sphere's surface (in local space)
          const latRad = THREE.MathUtils.degToRad(90 - lat);
          const lonRad = THREE.MathUtils.degToRad(lon);
          const radius = sebakaRadiusRef.current + 0.1;
          
          const cameraLocalPosition = new THREE.Vector3();
          cameraLocalPosition.setFromSphericalCoords(radius, latRad, lonRad);
  
          // 2. Get world position of the camera by transforming local position by planet's matrix
          // This ensures the camera moves WITH the planet's rotation
          const cameraWorldPosition = sebakaMesh.localToWorld(cameraLocalPosition.clone());
          camera.position.copy(cameraWorldPosition);
          
          // 3. Establish a stable "up" vector pointing from planet center to camera
          const planetUp = cameraWorldPosition.clone().sub(sebakaMesh.position).normalize();
          camera.up.copy(planetUp);
          
          // 4. Create a stable reference frame on the planet's surface
          // A "forward" vector pointing towards the planet's north pole along the surface
          const worldNorthPole = sebakaMesh.localToWorld(new THREE.Vector3(0, radius, 0));
          let planetForward = worldNorthPole.sub(cameraWorldPosition).normalize();
          
          const planetRight = new THREE.Vector3().crossVectors(planetUp, planetForward).normalize();
          // Re-calculate forward to ensure it's orthogonal to up and right
          const correctedForward = new THREE.Vector3().crossVectors(planetRight, planetUp).normalize();

          // 5. Apply player look controls relative to the stable frame
          const yawRad = THREE.MathUtils.degToRad(-yaw); // Negative to match user expectation (drag right -> look right)
          const pitchRad = THREE.MathUtils.degToRad(pitch);
  
          // Create quaternions for pitch and yaw rotations
          const yawQuat = new THREE.Quaternion().setFromAxisAngle(planetUp, yawRad);
          const pitchQuat = new THREE.Quaternion().setFromAxisAngle(planetRight, pitchRad);
          
          // Combine rotations and apply to the stable forward vector
          const finalLookDirection = correctedForward.clone().applyQuaternion(yawQuat).applyQuaternion(pitchQuat);
            
          // Set the camera to look at a point in the calculated direction
          const lookAtTarget = camera.position.clone().add(finalLookDirection);
          camera.lookAt(lookAtTarget);

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
    sebakaRadiusRef, 
    onTimeUpdate,
    isInitialized,
  ]);
};
