
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { updateAllBodyPositions } from "../utils/updateAllBodyPositions";
import { HOURS_IN_SEBAKA_DAY } from "../constants/config";
import type { BodyData } from "./useBodyData";
import type { CelestialSymphonyProps } from "../celestial-symphony";

type AnimationLoopParams = Omit<CelestialSymphonyProps, 'stars' | 'planets'> & {
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
};

export const useAnimationLoop = ({
  speedMultiplier = 24,
  viewFromSebaka,
  isSebakaRotating,
  longitude,
  latitude,
  cameraPitch,
  cameraYaw,
  isViridisAnimationActive,
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
}: AnimationLoopParams) => {
  const clockRef = useRef(new THREE.Clock());
  const elapsedHoursRef = useRef(0);
  const animationFrameId = useRef<number>();

  const speedMultiplierRef = useRef(speedMultiplier);
  const isViridisAnimationActiveRef = useRef(isViridisAnimationActive);
  const viewFromSebakaRef = useRef(viewFromSebaka);
  const isSebakaRotatingRef = useRef(isSebakaRotating);
  const playerInputsRef = useRef({ longitude, latitude, pitch: cameraPitch, yaw: cameraYaw });

  useEffect(() => { speedMultiplierRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { isViridisAnimationActiveRef.current = isViridisAnimationActive; }, [isViridisAnimationActive]);
  useEffect(() => { viewFromSebakaRef.current = viewFromSebaka; }, [viewFromSebaka]);
  useEffect(() => { isSebakaRotatingRef.current = isSebakaRotating; }, [isSebakaRotating]);
  useEffect(() => { playerInputsRef.current = { longitude, latitude, pitch: cameraPitch, yaw: cameraYaw }; }, [longitude, latitude, cameraPitch, cameraYaw]);

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

      const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
      if (sebakaMesh) {
         if (isSebakaRotatingRef.current) {
            const rotationPerHour = (2 * Math.PI) / HOURS_IN_SEBAKA_DAY;
            sebakaMesh.rotation.y += rotationPerHour * hoursPassedThisFrame;
         }
      }
      
      const gelidisOrbit = orbitMeshesRef.current.find(o => o.name === 'Gelidis_orbit');
      const liminisOrbit = orbitMeshesRef.current.find(o => o.name === 'Liminis_orbit');
      if(gelidisOrbit) gelidisOrbit.position.copy(beaconPositionRef.current);
      if(liminisOrbit) liminisOrbit.position.copy(beaconPositionRef.current);

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

        const cameraUp = cameraLocalPosition.clone().normalize();
        camera.up.copy(cameraUp);
        
        const lookAtTarget = new THREE.Vector3(0, 0, -1);
        
        const pitchQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitchRad);
        lookAtTarget.applyQuaternion(pitchQuat);
        
        const yawQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawRad);
        lookAtTarget.applyQuaternion(yawQuat);

        const orientationQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), camera.up);
        lookAtTarget.applyQuaternion(orientationQuat);
        
        const finalTarget = camera.position.clone().add(lookAtTarget);
        camera.lookAt(finalTarget);

        controls.target.copy(finalTarget);
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
