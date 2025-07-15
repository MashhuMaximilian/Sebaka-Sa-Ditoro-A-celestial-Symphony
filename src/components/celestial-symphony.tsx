
"use client";

import { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PlanetData, StarData } from "@/types";

interface CelestialSymphonyProps {
  stars: StarData[];
  planets: PlanetData[];
  speedMultiplier?: number;
  onBodyClick: (name: string) => void;
  viewFromSebaka: boolean;
  isSebakaRotating: boolean;
  sebakaRotationAngle: number;
  resetViewToggle: boolean;
  isViridisAnimationActive: boolean;
  onTimeUpdate: (elapsedHours: number) => void;
  goToTime: number | null;
  isBeaconView: boolean;
  onRotationAngleChange: (angle: number) => void;
  cameraYaw: number;
}

const HOURS_IN_SEBAKA_DAY = 24;

const CelestialSymphony = ({
  stars,
  planets,
  speedMultiplier = 24, // hours per second
  onBodyClick,
  viewFromSebaka,
  isSebakaRotating,
  sebakaRotationAngle,
  resetViewToggle,
  isViridisAnimationActive,
  onTimeUpdate,
  goToTime,
  isBeaconView,
  onRotationAngleChange,
  cameraYaw,
}: CelestialSymphonyProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const planetMeshesRef = useRef<THREE.Mesh[]>([]);
  const starMeshesRef = useRef<THREE.Mesh[]>([]);
  const allBodiesRef = useRef<THREE.Mesh[]>([]);
  const orbitMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameId = useRef<number>();
  const controlsRef = useRef<OrbitControls>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const sceneRef = useRef<THREE.Scene>();
  const clockRef = useRef(new THREE.Clock());
  
  const speedMultiplierRef = useRef(speedMultiplier);
  const isViridisAnimationActiveRef = useRef(isViridisAnimationActive);
  const viewFromSebakaRef = useRef(viewFromSebaka);
  const isSebakaRotatingRef = useRef(isSebakaRotating);
  const sebakaRotationAngleRef = useRef(sebakaRotationAngle);
  const cameraYawRef = useRef(cameraYaw);
  const isBeaconViewRef = useRef(isBeaconView);

  const originalCameraPos = useRef(new THREE.Vector3(0, 400, 800));
  const viridisOriginalColor = useRef(new THREE.Color("#9ACD32"));
  const beaconPositionRef = useRef(new THREE.Vector3());
  
  const elapsedHoursRef = useRef(0);
  const internalRotationAngleRef = useRef(sebakaRotationAngle);

  const bodyData = useMemo(() => {
    const all = [...stars, ...planets];
    return all.map(body => ({
      ...body,
      radsPerHour: (2 * Math.PI) / ((body.orbitPeriodDays || Infinity) * HOURS_IN_SEBAKA_DAY)
    }));
  }, [stars, planets]);

  useEffect(() => { speedMultiplierRef.current = speedMultiplier; }, [speedMultiplier]);
  useEffect(() => { isViridisAnimationActiveRef.current = isViridisAnimationActive; }, [isViridisAnimationActive]);
  useEffect(() => { viewFromSebakaRef.current = viewFromSebaka; }, [viewFromSebaka]);
  useEffect(() => { isSebakaRotatingRef.current = isSebakaRotating; }, [isSebakaRotating]);
  useEffect(() => { 
    if(!isSebakaRotating) {
        sebakaRotationAngleRef.current = sebakaRotationAngle; 
        internalRotationAngleRef.current = sebakaRotationAngle;
    }
  }, [sebakaRotationAngle, isSebakaRotating]);
  useEffect(() => { cameraYawRef.current = cameraYaw; }, [cameraYaw]);
  useEffect(() => { isBeaconViewRef.current = isBeaconView; }, [isBeaconView]);

  useEffect(() => {
    if (goToTime !== null) {
      elapsedHoursRef.current = goToTime;
      updateAllBodyPositions(goToTime);
      onTimeUpdate(goToTime);
    }
  }, [goToTime]);

  const updateAllBodyPositions = (currentHours: number) => {
     bodyData.forEach(data => {
        const bodyMesh = allBodiesRef.current.find(m => m.name === data.name);
        if (!bodyMesh) return;

        let orbitCenter = new THREE.Vector3(0,0,0);
        
        const beaconData = bodyData.find(d => d.name === 'Beacon');
        if (beaconData) {
            const beaconOrbitRadius = beaconData.orbitRadius!;
            const beaconAngle = currentHours * beaconData.radsPerHour;
            const beaconX = beaconOrbitRadius * Math.cos(beaconAngle);
            const beaconZ = beaconOrbitRadius * Math.sin(beaconAngle);
            beaconPositionRef.current.set(beaconX, 0, beaconZ);
        }

        if (data.name === 'Beacon') {
            bodyMesh.position.copy(beaconPositionRef.current);
            return;
        }

        if (data.name === 'Gelidis' || data.name === 'Liminis') {
            orbitCenter.copy(beaconPositionRef.current);
        }

        const semiMajorAxis = data.orbitRadius || 0;
        let x, z;
        let angle = currentHours * data.radsPerHour;

        if ((data as PlanetData).eccentric) {
            const eccentricity = data.name === 'Spectris' ? 0.2 : data.name === 'Aetheris' ? 0.5 : 0.1;
            const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
            x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
            z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
        } else if (data.type === 'Star' && (data.name === 'Golden Giver' || data.name === 'Twilight')) {
            const r1 = 0.1 * 150;
            const binaryAngle = currentHours * data.radsPerHour;
            x = (data.name === 'Golden Giver' ? -1 : 1) * r1 * Math.cos(binaryAngle);
            z = (data.name === 'Golden Giver' ? -1 : 1) * r1 * Math.sin(binaryAngle);
        } else {
            const semiMinorAxis = semiMajorAxis;
            x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
            z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
        }

        const y = orbitCenter.y;
        bodyMesh.position.set(x, y, z);

        if (bodyMesh.name === 'Sebaka') {
            const rotationPerHour = (2 * Math.PI) / HOURS_IN_SEBAKA_DAY;
            bodyMesh.rotation.y = currentHours * rotationPerHour;
        }
    });
  }

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.001, 200000);
    camera.position.copy(originalCameraPos.current);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true; 
    controls.minDistance = 1;
    controls.maxDistance = 200000;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let clickableObjects: THREE.Object3D[] = [];

    allBodiesRef.current = [];
    starMeshesRef.current = [];
    planetMeshesRef.current = [];
    orbitMeshesRef.current = [];

    bodyData.forEach(body => {
      const geometry = new THREE.SphereGeometry(body.size, 32, 32);
      const materialOptions: THREE.MeshStandardMaterialParameters = { color: body.color, roughness: 0.8, metalness: 0.1 };
      
      if (body.type === 'Star') {
        const starData = body as StarData;
        materialOptions.emissive = starData.color;
        materialOptions.emissiveIntensity = Math.log1p(starData.luminosity || 0) * 0.5 + 0.5;
      }
      if (body.name === 'Liminis') {
        materialOptions.emissive = body.color;
        materialOptions.emissiveIntensity = 0.2;
      }
      const material = new THREE.MeshStandardMaterial(materialOptions);
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = body.name;
      scene.add(mesh);
      allBodiesRef.current.push(mesh);
      clickableObjects.push(mesh);
      
      if (body.type === 'Planet') planetMeshesRef.current.push(mesh);
      else {
        const starData = body as StarData;
        starMeshesRef.current.push(mesh);
        const lightIntensity = (starData.luminosity || 1) * 2;
        const pointLightStar = new THREE.PointLight(starData.color, lightIntensity, 0, 1);
        mesh.add(pointLightStar);
      }
      
      if (body.type === 'Planet' && body.name === "Spectris") {
        const ringGeometry = new THREE.RingGeometry(body.size * 1.5, body.size * 3, 64);
        const vertexShader = `varying vec3 vUv; void main() { vUv = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
        const fragmentShader = `varying vec3 vUv; vec3 hsv2rgb(vec3 c) { vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0); vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www); return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y); } void main() { float angle = atan(vUv.y, vUv.x); float hue = (angle + 3.14159) / (2.0 * 3.14159); gl_FragColor = vec4(hsv2rgb(vec3(hue, 0.7, 1.0)), 0.7); }`;
        const ringMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader, side: THREE.DoubleSide, transparent: true });
        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2 + 0.2;
        mesh.add(rings);
      }
      
      if (body.type === 'Planet' || body.name === 'Beacon') {
          const orbitRadius = body.orbitRadius;
          if (orbitRadius) {
            const orbitGeometry = new THREE.TorusGeometry(orbitRadius, body.name === 'Beacon' ? 5 : 0.5, 8, 200);
            const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            scene.add(orbit);
            orbitMeshesRef.current.push(orbit);
          }
      }
    });

    updateAllBodyPositions(0);

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      
      const deltaTime = clockRef.current.getDelta();
      const hoursPassedThisFrame = deltaTime * speedMultiplierRef.current;
      elapsedHoursRef.current += hoursPassedThisFrame;
      
      onTimeUpdate(elapsedHoursRef.current);
      updateAllBodyPositions(elapsedHoursRef.current);
      
      const gelidisOrbit = orbitMeshesRef.current.find(o => o.geometry.parameters.radius === planets.find(p=>p.name === 'Gelidis')?.orbitRadius);
      const liminisOrbit = orbitMeshesRef.current.find(o => o.geometry.parameters.radius === planets.find(p=>p.name === 'Liminis')?.orbitRadius);
      if(gelidisOrbit) gelidisOrbit.position.copy(beaconPositionRef.current);
      if(liminisOrbit) liminisOrbit.position.copy(beaconPositionRef.current);

      const viridisMesh = planetMeshesRef.current.find(p => p.name === 'Viridis');
      if (viridisMesh && viridisMesh.material instanceof THREE.MeshStandardMaterial) {
          const elapsedDays = elapsedHoursRef.current / HOURS_IN_SEBAKA_DAY;
          if (isViridisAnimationActiveRef.current) {
            const cycleDurationDays = 27;
            const currentDayInCycle = elapsedDays % cycleDurationDays;
            const phaseDuration = 9;
            let brightnessFactor = 1.0;
            if (currentDayInCycle < phaseDuration) { // Darkening
                brightnessFactor = 1.0 - (currentDayInCycle / phaseDuration) * 0.9;
            } else if (currentDayInCycle < phaseDuration * 2) { // Dark
                brightnessFactor = 0.1;
            } else { // Brightening
                brightnessFactor = 0.1 + ((currentDayInCycle - phaseDuration * 2) / phaseDuration) * 0.9;
            }
            const targetColor = viridisOriginalColor.current.clone().multiplyScalar(brightnessFactor);
            viridisMesh.material.color.lerp(targetColor, 0.1);
            viridisMesh.material.emissive.lerp(targetColor, 0.1);
            viridisMesh.material.emissiveIntensity = THREE.MathUtils.lerp(viridisMesh.material.emissiveIntensity, brightnessFactor, 0.1);
          } else {
             viridisMesh.material.color.lerp(viridisOriginalColor.current, 0.1);
             viridisMesh.material.emissive.lerp(new THREE.Color(0x000000), 0.1);
             viridisMesh.material.emissiveIntensity = THREE.MathUtils.lerp(viridisMesh.material.emissiveIntensity, 0, 0.1);
          }
      }
      
      const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
      if (viewFromSebakaRef.current && sebakaMesh) {
          sebakaMesh.visible = true;
          const sebakaRadius = (sebakaMesh.geometry as THREE.SphereGeometry).parameters.radius;
          const surfaceOffset = sebakaRadius * 1.01; 

          camera.position.set(
              sebakaMesh.position.x,
              sebakaMesh.position.y + surfaceOffset,
              sebakaMesh.position.z
          );

          if (isSebakaRotatingRef.current) {
            const degreesPerHour = 360 / HOURS_IN_SEBAKA_DAY;
            const degreesPerSecond = degreesPerHour * speedMultiplierRef.current;
            internalRotationAngleRef.current += deltaTime * degreesPerSecond;
            internalRotationAngleRef.current %= 360;
            onRotationAngleChange(internalRotationAngleRef.current);
          }
          
          const planetRotationAngle = THREE.MathUtils.degToRad(
            isSebakaRotatingRef.current ? internalRotationAngleRef.current : sebakaRotationAngleRef.current
          );

          const lookAngle = planetRotationAngle + THREE.MathUtils.degToRad(cameraYawRef.current);

          const lookAtPosition = new THREE.Vector3(
              sebakaMesh.position.x + Math.sin(lookAngle) * 1000,
              sebakaMesh.position.y,
              sebakaMesh.position.z + Math.cos(lookAngle) * 1000
          );
          
          controls.target.lerp(lookAtPosition, 0.1);
          
      } else {
         if (sebakaMesh) sebakaMesh.visible = true;
         const goldenGiver = allBodiesRef.current.find(b => b.name === 'Golden Giver');
         if (!isBeaconViewRef.current && goldenGiver) {
            controls.target.lerp(goldenGiver.position, 0.01);
         }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    clockRef.current.start();
    animate();

    const onClick = (event: MouseEvent | TouchEvent) => {
        const rect = renderer.domElement.getBoundingClientRect();
        let x, y;
        if (event instanceof MouseEvent) { x = event.clientX; y = event.clientY; } 
        else if (event.touches && event.touches.length > 0) { x = event.touches[0].clientX; y = event.touches[0].clientY; } 
        else { return; }
        mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(clickableObjects, true);
        if (intersects.length > 0) {
            let currentObject = intersects[0].object;
            while(currentObject.parent && !currentObject.name) currentObject = currentObject.parent;
            if (currentObject.name) onBodyClick(currentObject.name);
        }
    }
    
    currentMount.addEventListener('click', onClick);
    currentMount.addEventListener('touchstart', onClick, { passive: true });

    const handleResize = () => {
      if(cameraRef.current) {
        cameraRef.current.aspect = currentMount.clientWidth / currentMount.clientHeight;
        cameraRef.current.updateProjectionMatrix();
      }
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      clockRef.current.stop();
      window.removeEventListener("resize", handleResize);
      currentMount.removeEventListener('click', onClick);
      currentMount.removeEventListener('touchstart', onClick);
      if (currentMount && renderer.domElement) currentMount.removeChild(renderer.domElement);
      renderer.dispose();
      controls.dispose();
    };
  }, []); 

  useEffect(() => {
    planetMeshesRef.current.forEach((mesh) => {
      const planetData = planets.find(p => p.name === mesh.name);
      if (planetData && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.color.set(planetData.color);
        if (mesh.name === 'Viridis') {
            viridisOriginalColor.current.set(planetData.color);
        }
      }
    });
  }, [planets]);

  useEffect(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    if (!controls || !camera) return;
    
    const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
    orbitMeshesRef.current.forEach(orbit => orbit.visible = !viewFromSebaka);
    
    if (viewFromSebaka) {
        camera.near = 0.001;
        controls.enablePan = false;
        controls.enableZoom = false;
        controls.enableRotate = false; // Disable orbit controls rotation to use our own logic
        
        const goldenGiver = allBodiesRef.current.find(b => b.name === 'Golden Giver');
        if (sebakaMesh && goldenGiver) {
            const angle = THREE.MathUtils.degToRad(sebakaRotationAngleRef.current);
            const lookAtPosition = new THREE.Vector3(
                sebakaMesh.position.x + Math.sin(angle) * 1000,
                sebakaMesh.position.y + 10,
                sebakaMesh.position.z + Math.cos(angle) * 1000
            );
            controls.target.copy(lookAtPosition);
        }

    } else {
        camera.near = 0.001; // Keep it small for smooth transitions
        controls.minDistance = 1;
        controls.maxDistance = 200000;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.enableRotate = true;
        controls.screenSpacePanning = true;
    }
    camera.updateProjectionMatrix();
  }, [viewFromSebaka]);
  
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (!viewFromSebaka) {
      if (isBeaconView) {
        const beaconCamPos = beaconPositionRef.current.clone().add(new THREE.Vector3(0, 2000, 4000));
        camera.position.set(beaconCamPos.x, beaconCamPos.y, beaconCamPos.z);
        controls.target.set(beaconPositionRef.current.x, beaconPositionRef.current.y, beaconPositionRef.current.z);
      } else {
        camera.position.set(originalCameraPos.current.x, originalCameraPos.current.y, originalCameraPos.current.z);
        controls.target.set(0, 0, 0);
      }
    }
    controls.update();
  }, [isBeaconView, resetViewToggle, viewFromSebaka]);


  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
};

export default CelestialSymphony;
