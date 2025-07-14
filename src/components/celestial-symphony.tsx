
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
  onTimeUpdate: (elapsedDays: number) => void;
  goToTime: number | null;
  isBeaconView: boolean;
}

const CelestialSymphony = ({
  stars,
  planets,
  speedMultiplier = 1,
  onBodyClick,
  viewFromSebaka,
  isSebakaRotating,
  sebakaRotationAngle,
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
  const originalCameraPos = useRef(new THREE.Vector3(0, 400, 800));
  const viridisOriginalColor = useRef(new THREE.Color("#9ACD32"));
  const beaconPositionRef = useRef(new THREE.Vector3());
  
  const elapsedDaysRef = useRef(0);
  const viewFromSebakaRef = useRef(viewFromSebaka);

  // Memoize body data to avoid recalculations
  const bodyData = useMemo(() => {
    const all = [...stars, ...planets];
    return all.map(body => ({
      ...body,
      // Radian speed per day: (2 * PI) / period in days
      radsPerDay: (2 * Math.PI) / (body.orbitPeriodDays || Infinity)
    }));
  }, [stars, planets]);


  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);

  useEffect(() => {
    isViridisAnimationActiveRef.current = isViridisAnimationActive;
  }, [isViridisAnimationActive]);
  
  // This effect handles jumping to a specific time
  useEffect(() => {
    if (goToTime !== null) {
      elapsedDaysRef.current = goToTime;
      updateAllBodyPositions(goToTime);
      onTimeUpdate(goToTime);
    }
  }, [goToTime]);

  const updateAllBodyPositions = (currentDays: number) => {
     allBodiesRef.current.forEach(bodyMesh => {
        const data = bodyData.find(d => d.name === bodyMesh.name);
        if (!data) return;

        let orbitCenter = new THREE.Vector3(0,0,0);
        let angle = currentDays * data.radsPerDay;

        // Beacon orbits the central binary barycenter
        if (data.name === 'Beacon') {
            const beaconOrbitRadius = data.orbitRadius!;
            const beaconX = beaconOrbitRadius * Math.cos(angle);
            const beaconZ = beaconOrbitRadius * Math.sin(angle);
            beaconPositionRef.current.set(beaconX, 0, beaconZ);
            bodyMesh.position.set(beaconX, 0, beaconZ);
            return; // Beacon position is set, continue to next body
        }

        // Planets orbiting Beacon
        if (data.name === 'Gelidis' || data.name === 'Liminis') {
            orbitCenter = beaconPositionRef.current;
        }

        const semiMajorAxis = (data as PlanetData | StarData).orbitRadius || 0;
        let x, z;

        if ((data as PlanetData).eccentric) {
            const eccentricity = data.name === 'Spectris' ? 0.2 : data.name === 'Aetheris' ? 0.5 : 0.1;
            const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
            x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
            z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
        } else if (data.type === 'Star' && (data.name === 'Golden Giver' || data.name === 'Twilight')) {
            const r1 = 0.1 * 150; // 0.1 AU for binary separation
            x = (data.name === 'Golden Giver' ? -1 : 1) * r1 * Math.cos(angle);
            z = (data.name === 'Golden Giver' ? -1 : 1) * r1 * Math.sin(angle);
        } else {
            const semiMinorAxis = semiMajorAxis;
            x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
            z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
        }

        const y = orbitCenter.y;
        bodyMesh.position.set(x, y, z);

        if (bodyMesh.name === 'Sebaka') {
            const rotationPerDay = Math.PI * 2;
            bodyMesh.rotation.y = currentDays * rotationPerDay;
        }
    });
  }

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      200000 // Increased far plane for distant star
    );
    camera.position.copy(originalCameraPos.current);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true; 
    controls.minDistance = 1;
    controls.maxDistance = 200000;
    controls.target.set(0, 0, 0);
    controls.touches = {
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN
    };
    controlsRef.current = controls;

    // Lighting
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
      const materialOptions: THREE.MeshStandardMaterialParameters = {
          color: body.color,
          roughness: 0.8,
          metalness: 0.1,
      };
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
      
      if (body.type === 'Planet') {
         planetMeshesRef.current.push(mesh);
      } else {
        const starData = body as StarData;
        starMeshesRef.current.push(mesh);
        const lightIntensity = (starData.luminosity || 1) * 2;
        const pointLightStar = new THREE.PointLight(starData.color, lightIntensity, 0, 1);
        mesh.add(pointLightStar);
      }
      
      if (body.type === 'Planet' && body.name === "Spectris") {
        const ringGeometry = new THREE.RingGeometry(body.size * 1.5, body.size * 3, 64);
        const vertexShader = `
          varying vec3 vUv;
          void main() {
            vUv = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `;
        const fragmentShader = `
          varying vec3 vUv;
          vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
          }
          void main() {
            float angle = atan(vUv.y, vUv.x);
            float hue = (angle + 3.14159) / (2.0 * 3.14159);
            gl_FragColor = vec4(hsv2rgb(vec3(hue, 0.7, 1.0)), 0.7);
          }
        `;

        const ringMaterial = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          side: THREE.DoubleSide,
          transparent: true,
        });

        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2 + 0.2; // Tilt the rings
        mesh.add(rings); // Attach rings to the planet
      }
      
      if (body.type === 'Planet' || body.name === 'Beacon') {
          const orbitRadius = (body as PlanetData | StarData).orbitRadius;
          if (orbitRadius) {
            const orbitGeometry = new THREE.TorusGeometry(orbitRadius, body.name === 'Beacon' ? 5 : 0.5, 8, 200);
            const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            if(body.name !== 'Gelidis' && body.name !== 'Liminis') {
                orbit.position.set(0, 0, 0);
            }
            orbit.rotation.x = Math.PI / 2;
            scene.add(orbit);
            orbitMeshesRef.current.push(orbit);
          }
      }
    });

    updateAllBodyPositions(0); // Initial Year 0 alignment

    // Animation loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      if (!camera || !controls) return;
      
      const daysPassedThisFrame = clockRef.current.getDelta() * speedMultiplierRef.current;
      elapsedDaysRef.current += daysPassedThisFrame;
      
      onTimeUpdate(elapsedDaysRef.current);
      updateAllBodyPositions(elapsedDaysRef.current);
      
      const gelidisOrbit = orbitMeshesRef.current.find(o => o.geometry.parameters.radius === planets.find(p=>p.name === 'Gelidis')?.orbitRadius);
      const liminisOrbit = orbitMeshesRef.current.find(o => o.geometry.parameters.radius === planets.find(p=>p.name === 'Liminis')?.orbitRadius);
      if(gelidisOrbit) gelidisOrbit.position.copy(beaconPositionRef.current);
      if(liminisOrbit) liminisOrbit.position.copy(beaconPositionRef.current);

      const viridisMesh = planetMeshesRef.current.find(p => p.name === 'Viridis');
      if (viridisMesh && viridisMesh.material instanceof THREE.MeshStandardMaterial) {
          if (isViridisAnimationActiveRef.current) {
            const cycleDurationDays = 27;
            const currentDayInCycle = elapsedDaysRef.current % cycleDurationDays;
            
            const darkeningDuration = 9;
            const darkDuration = 9;
            
            let brightnessFactor = 1.0;
            
            if (currentDayInCycle < darkeningDuration) {
              const progress = currentDayInCycle / darkeningDuration; // 0 to 1
              brightnessFactor = 1.0 - progress * 0.9; // from 1.0 down to 0.1
            } 
            else if (currentDayInCycle < darkeningDuration + darkDuration) {
              brightnessFactor = 0.1;
            } 
            else {
              const brighteningDuration = 9;
              const progress = (currentDayInCycle - (darkeningDuration + darkDuration)) / brighteningDuration; // 0 to 1
              brightnessFactor = 0.1 + progress * 0.9; // from 0.1 up to 1.0
            }

            const targetColor = viridisOriginalColor.current.clone().multiplyScalar(brightnessFactor);
            const targetIntensity = brightnessFactor;

            viridisMesh.material.color.lerp(targetColor, 0.1);
            viridisMesh.material.emissive.lerp(targetColor, 0.1);
            viridisMesh.material.emissiveIntensity = THREE.MathUtils.lerp(viridisMesh.material.emissiveIntensity, targetIntensity, 0.1);

          } else {
             viridisMesh.material.color.lerp(viridisOriginalColor.current, 0.1);
             viridisMesh.material.emissive.lerp(new THREE.Color(0x000000), 0.1);
             viridisMesh.material.emissiveIntensity = THREE.MathUtils.lerp(viridisMesh.material.emissiveIntensity, 0, 0.1);
          }
      }
      
      const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
      if (viewFromSebakaRef.current && sebakaMesh) {
          const sebakaPosition = sebakaMesh.position;
          const surfaceYOffset = (sebakaMesh.geometry as THREE.SphereGeometry).parameters.radius + 5;

          if (isSebakaRotating) {
            const cameraOffset = new THREE.Vector3(0, surfaceYOffset, 0);
            cameraOffset.applyEuler(sebakaMesh.rotation);
            camera.position.copy(sebakaPosition).add(cameraOffset);
            
            const lookAtOffset = new THREE.Vector3(0, surfaceYOffset, -100); 
            lookAtOffset.applyEuler(sebakaMesh.rotation);
            controls.target.copy(sebakaPosition).add(lookAtOffset);
          } else {
            const lastCameraDistance = camera.position.distanceTo(controls.target);
            
            const rotationY = THREE.MathUtils.degToRad(sebakaRotationAngle);
            const euler = new THREE.Euler(0, rotationY, 0, 'YXZ');
            
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyEuler(euler);
            direction.applyQuaternion(camera.quaternion);

            const newTargetPosition = new THREE.Vector3().copy(sebakaPosition);
            const newCameraPosition = new THREE.Vector3().copy(newTargetPosition).add(new THREE.Vector3(0, surfaceYOffset, 0));

            controls.target.copy(newTargetPosition);
            camera.position.copy(newCameraPosition);
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

        if (event instanceof MouseEvent) {
            x = event.clientX;
            y = event.clientY;
        } else if (event.touches && event.touches.length > 0) {
            x = event.touches[0].clientX;
            y = event.touches[0].clientY;
        } else {
            return;
        }

        mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((y - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(clickableObjects, true);

        if (intersects.length > 0) {
            let currentObject = intersects[0].object;
            while(currentObject.parent && !currentObject.name) {
              currentObject = currentObject.parent;
            }

            if (currentObject.name) {
                onBodyClick(currentObject.name);
            }
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
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      clockRef.current.stop();
      window.removeEventListener("resize", handleResize);
      currentMount.removeEventListener('click', onClick);
      currentMount.removeEventListener('touchstart', onClick);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
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
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    viewFromSebakaRef.current = viewFromSebaka;
    
    orbitMeshesRef.current.forEach(orbit => {
        orbit.visible = !viewFromSebaka;
    });
    
    const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
    if (sebakaMesh) {
      sebakaMesh.visible = !viewFromSebaka;
    }

    if (viewFromSebaka) {
        controls.enablePan = false;
        controls.enableZoom = true;
        controls.minDistance = 5;
        controls.maxDistance = 1000;
        
        if (isSebakaRotating) {
            controls.enableRotate = false;
        } else {
            controls.enableRotate = true; 
        }

    } else {
        if (!isBeaconView) {
            controls.target.set(0, 0, 0);
        }
        controls.minDistance = 1;
        controls.maxDistance = 200000;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.enableRotate = true;
        controls.screenSpacePanning = true;
    }
    controls.update();
  }, [viewFromSebaka, isSebakaRotating, isBeaconView]);
  
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || viewFromSebaka) return;

    if (!isBeaconView) {
        camera.position.copy(originalCameraPos.current);
        controls.target.set(0, 0, 0);
    }
    controls.update();
  }, [resetViewToggle]);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!controls || !camera) return;
    
    if (isBeaconView) {
        controls.target.copy(beaconPositionRef.current);
        const beaconCamPos = beaconPositionRef.current.clone().add(new THREE.Vector3(0, 2000, 4000));
        camera.position.copy(beaconCamPos);
    } else if (!viewFromSebaka) { 
        controls.target.set(0, 0, 0);
        camera.position.copy(originalCameraPos.current);
    }
    controls.update();
  }, [isBeaconView, resetViewToggle]);


  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
};

export default CelestialSymphony;
