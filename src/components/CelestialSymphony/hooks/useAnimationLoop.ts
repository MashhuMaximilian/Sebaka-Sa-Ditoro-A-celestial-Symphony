
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
    bodyData: BodyData[];
    scene: THREE.Scene | undefined;
    camera: THREE.PerspectiveCamera | undefined;
    renderer: THREE.WebGLRenderer | undefined;
    controls: OrbitControls | undefined;
    allBodiesRef: React.MutableRefObject<THREE.Mesh[]>;
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
      if (allBodiesRef.current.length > 0) {
        updateAllBodyPositions(goToTime, bodyData, allBodiesRef.current, beaconPositionRef.current);
      }
      onTimeUpdate(goToTime);
    }
  }, [goToTime, bodyData, allBodiesRef, beaconPositionRef, onTimeUpdate]);

  useEffect(() => {
    if (!scene || !camera || !renderer || !controls || !isInitialized) return;

    let isCancelled = false;
    
    const animate = () => {
      if (isCancelled) return;
      
      animationFrameId.current = requestAnimationFrame(animate);
      
      const deltaTime = clockRef.current.getDelta();
      const hoursPassedThisFrame = deltaTime * speedMultiplierRef.current;
      elapsedHoursRef.current += hoursPassedThisFrame;
      
      onTimeUpdate(elapsedHoursRef.current);
      updateAllBodyPositions(elapsedHoursRef.current, bodyData, allBodiesRef.current, beaconPositionRef.current);

      const alphaStarMesh = allBodiesRef.current.find(b => b.name === 'Alpha');
      const twilightStarMesh = allBodiesRef.current.find(b => b.name === 'Twilight');
      const beaconStarMesh = allBodiesRef.current.find(b => b.name === 'Beacon');
      
      if (alphaStarMesh && twilightStarMesh && beaconStarMesh) {
          // Update shader uniforms for all planets
          planetMeshesRef.current.forEach(planetMesh => {
              if (planetMesh.material instanceof THREE.ShaderMaterial) {
                  planetMesh.material.uniforms.alphaStarPos.value.copy(alphaStarMesh.position);
                  planetMesh.material.uniforms.twilightStarPos.value.copy(twilightStarMesh.position);
                  planetMesh.material.uniforms.beaconStarPos.value.copy(beaconStarMesh.position);
              }
          });
          
          // Update spider strand shader uniforms (orbits and rings)
          const updateSpiderStrandMaterial = (material: THREE.Material) => {
              if (material instanceof THREE.ShaderMaterial && material.uniforms.hasOwnProperty('alphaStarPos')) {
                  const uniforms = material.uniforms;
                  uniforms.time.value = elapsedHoursRef.current * 0.001;
                  uniforms.alphaStarPos.value.copy(alphaStarMesh.position);
                  uniforms.twilightStarPos.value.copy(twilightStarMesh.position);
                  uniforms.beaconStarPos.value.copy(beaconStarMesh.position);
              }
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
        planetMeshesRef.current.forEach(planetMesh => {
            const planetData = bodyData.find(d => d.name === planetMesh.name) as PlanetData | undefined;
            if (planetData?.rotationPeriodHours) {
                if(shouldPauseRotation && planetMesh.name === cameraTargetRef.current) {
                    // Do nothing, rotation is paused
                } else {
                    const rotationPerHour = (2 * Math.PI) / planetData.rotationPeriodHours;
                    planetMesh.rotation.y += rotationPerHour * hoursPassedThisFrame;
                }
            }
        });
      }

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

      if (viewFromSebakaRef.current && sebakaMesh) {
        const lat = playerInputsRef.current.latitude;
        const lon = playerInputsRef.current.longitude;
        const pitch = playerInputsRef.current.pitch;
        const yaw = playerInputsRef.current.yaw;

        const latRad = THREE.MathUtils.degToRad(90 - lat);
        const lonRad = THREE.MathUtils.degToRad(lon);
        const pitchRad = THREE.MathUtils.degToRad(pitch);
        const yawRad = THREE.MathUtils.degToRad(yaw);
        
        const radius = sebakaRadiusRef.current + 0.1;
        
        const cameraLocalPosition = new THREE.Vector3();
        cameraLocalPosition.setFromSphericalCoords(radius, latRad, lonRad);
        
        cameraLocalPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), sebakaMesh.rotation.y);
        camera.position.copy(sebakaMesh.position).add(cameraLocalPosition);
        
        const up = cameraLocalPosition.clone().normalize();
        camera.up.copy(up);
        
        const tangent = new THREE.Vector3().crossVectors(up, new THREE.Vector3(0, 1, 0)).normalize();
        const forward = new THREE.Vector3().crossVectors(up, tangent).normalize();
        
        camera.lookAt(camera.position.clone().add(forward));

        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchRad);
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawRad);
        
        const rotationQuat = new THREE.Quaternion().multiplyQuaternions(yawQuat, pitchQuat);
        camera.quaternion.multiply(rotationQuat);

        const forwardVector = new THREE.Vector3();
        camera.getWorldDirection(forwardVector);
        controls.target.copy(camera.position).add(forwardVector);
        controls.update();
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
