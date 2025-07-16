
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
  longitude: number;
  latitude: number;
  cameraPitch: number;
  cameraYaw: number;
  resetViewToggle: boolean;
  isViridisAnimationActive: boolean;
  onTimeUpdate: (elapsedHours: number) => void;
  goToTime: number | null;
  isBeaconView: boolean;
}

const HOURS_IN_SEBAKA_DAY = 24;
const eyeHeight = 0.1;

const CelestialSymphony = ({
  stars,
  planets,
  speedMultiplier = 24, // hours per second
  onBodyClick,
  viewFromSebaka,
  isSebakaRotating,
  longitude,
  latitude,
  cameraPitch,
  cameraYaw,
  resetViewToggle,
  isViridisAnimationActive,
  onTimeUpdate,
  goToTime,
  isBeaconView,
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
  const isBeaconViewRef = useRef(isBeaconView);

  const originalCameraPos = useRef(new THREE.Vector3(0, 400, 800));
  const viridisOriginalColor = useRef(new THREE.Color("#9ACD32"));
  const beaconPositionRef = useRef(new THREE.Vector3());
  
  const elapsedHoursRef = useRef(0);
  const sebakaRadiusRef = useRef(0);
  const playerInputsRef = useRef({ longitude, latitude, pitch: cameraPitch, yaw: cameraYaw });
  
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
  useEffect(() => { playerInputsRef.current.longitude = longitude; }, [longitude]);
  useEffect(() => { playerInputsRef.current.latitude = latitude; }, [latitude]);
  useEffect(() => { playerInputsRef.current.pitch = cameraPitch; }, [cameraPitch]);
  useEffect(() => { playerInputsRef.current.yaw = cameraYaw; }, [cameraYaw]);
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

    // --- LIGHTING SETUP ---
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.1));

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let clickableObjects: THREE.Object3D[] = [];

    allBodiesRef.current = [];
    starMeshesRef.current = [];
    planetMeshesRef.current = [];
    orbitMeshesRef.current = [];
    
    const textureLoader = new THREE.TextureLoader();

    const createStripedTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const context = canvas.getContext('2d');
      if (!context) return null;

      const colors = ['#ADD8E6', '#FFFFFF'];
      const stripeWidth = canvas.width / 16;

      for (let i = 0; i < 16; i++) {
          context.fillStyle = colors[i % 2];
          context.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
      }
      
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(1, 1);
      return texture;
    };
    
    const sebakaTexture = createStripedTexture();
    const planetsWithTextures = ['Rutilus', 'Spectris', 'Viridis', 'Aetheris', 'Gelidis'];

    bodyData.forEach(body => {
      const geometry = new THREE.SphereGeometry(body.size, 32, 32);
      
      let material;
      if (body.name === 'Sebaka' && sebakaTexture) {
          material = new THREE.MeshStandardMaterial({ map: sebakaTexture });
          sebakaRadiusRef.current = body.size;
      } else if (planetsWithTextures.includes(body.name)) {
          const mapPath = `/maps/${body.name}/`;
          material = new THREE.MeshStandardMaterial({
              map: textureLoader.load(`${mapPath}diffuse.jpg`),
              normalMap: textureLoader.load(`${mapPath}normal.jpg`),
              roughnessMap: textureLoader.load(`${mapPath}roughness.jpg`),
              displacementMap: textureLoader.load(`${mapPath}displacement.jpg`),
              displacementScale: 0.1,
              roughness: 0.8,
              metalness: 0.1,
          });
      }
      else {
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
          material = new THREE.MeshStandardMaterial(materialOptions);
      }
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = body.name;
      scene.add(mesh);
      allBodiesRef.current.push(mesh);
      clickableObjects.push(mesh);
      
      if (body.type === 'Planet') {
        planetMeshesRef.current.push(mesh);
      } else {
        starMeshesRef.current.push(mesh);
        // Add specific lights for binary stars
        if (body.name === 'Golden Giver') {
            const light = new THREE.PointLight(0xFFD700, 3_000_000, 0, 1);
            mesh.add(light);
        }
        if (body.name === 'Twilight') {
            const light = new THREE.PointLight(0xFF6400, 2_100_000, 0, 1); // 70% of 3M
            mesh.add(light);
        }
        if (body.name === 'Beacon') {
            const light = new THREE.PointLight(body.color, 10_000_000, 0, 1);
            mesh.add(light);
        }
      }
      
      if (body.type === 'Planet' && body.name === "Spectris") {
        const ringGeometry = new THREE.RingGeometry(body.size * 1.5, body.size * 3, 64);
        const vertexShader = "varying vec3 vUv; void main() { vUv = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
        const fragmentShader = "varying vec3 vUv; vec3 hsv2rgb(vec3 c) { vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0); vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www); return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y); } void main() { float angle = atan(vUv.y, vUv.x); float hue = (angle + 3.14159) / (2.0 * 3.14159); gl_FragColor = vec4(hsv2rgb(vec3(hue, 0.7, 1.0)), 0.7); }";
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

      const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
      if (sebakaMesh) {
         if (isSebakaRotatingRef.current) {
            const rotationPerHour = (2 * Math.PI) / HOURS_IN_SEBAKA_DAY;
            sebakaMesh.rotation.y = elapsedHoursRef.current * rotationPerHour;
         }
      }
      
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
            if (viridisMesh.material.map) {
                const originalColor = new THREE.Color(0xffffff);
                const targetColor = originalColor.clone().multiplyScalar(brightnessFactor);
                viridisMesh.material.color.lerp(targetColor, 0.1);
            } else {
                 const targetColor = viridisOriginalColor.current.clone().multiplyScalar(brightnessFactor);
                 viridisMesh.material.color.lerp(targetColor, 0.1);
                 viridisMesh.material.emissive.lerp(targetColor, 0.1);
                 viridisMesh.material.emissiveIntensity = THREE.MathUtils.lerp(viridisMesh.material.emissiveIntensity, brightnessFactor, 0.1);
            }
          } else {
             if (viridisMesh.material.map) {
                viridisMesh.material.color.lerp(new THREE.Color(0xffffff), 0.1);
             } else {
                viridisMesh.material.color.lerp(viridisOriginalColor.current, 0.1);
                viridisMesh.material.emissive.lerp(new THREE.Color(0x000000), 0.1);
                viridisMesh.material.emissiveIntensity = THREE.MathUtils.lerp(viridisMesh.material.emissiveIntensity, 0, 0.1);
             }
          }
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
        
        const radius = sebakaRadiusRef.current + eyeHeight;
        
        const cameraPosition = new THREE.Vector3();
        cameraPosition.setFromSphericalCoords(radius, latRad, lonRad);
        
        // This makes the camera rotate with the planet
        cameraPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), sebakaMesh.rotation.y);

        camera.position.copy(sebakaMesh.position).add(cameraPosition);

        const cameraUp = cameraPosition.clone().normalize();
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
         if (sebakaMesh) sebakaMesh.visible = true;
         const goldenGiver = allBodiesRef.current.find(b => b.name === 'Golden Giver');
         if (!isBeaconViewRef.current && goldenGiver) {
            controls.target.lerp(goldenGiver.position, 0.01);
         }
         controls.update();
      }

      renderer.render(scene, camera);
    };

    clockRef.current.start();
    animate();

    const onClick = (event: MouseEvent | TouchEvent) => {
        if (viewFromSebakaRef.current) return;
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
        if (mesh.name === 'Sebaka' && mesh.material.map) {
            // Sebaka is procedural, no color change needed
             return;
        }
        
        // This handles color changes from the harmonizer panel
        if (!mesh.material.map) {
             mesh.material.color.set(planetData.color);
        }

        if (mesh.name === 'Viridis' && !mesh.material.map) {
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
        if (sebakaMesh) {
          sebakaMesh.visible = true;
        }
        camera.near = 0.001;
        controls.enabled = false;

    } else {
        camera.near = 0.001;
        controls.enabled = true;
        if(sebakaMesh) sebakaMesh.visible = true;
    }
    camera.updateProjectionMatrix();
  }, [viewFromSebaka, resetViewToggle]);
  
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
