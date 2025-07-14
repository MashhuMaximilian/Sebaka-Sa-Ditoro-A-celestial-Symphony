
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

        const angle = currentDays * data.radsPerDay;
        
        const semiMajorAxis = (data as PlanetData | StarData).orbitRadius || 0.1 * 150; // Default for binary stars
        let x, z;
        
        let orbitCenter = new THREE.Vector3(0,0,0);
        if (data.name === 'Gelidis' || data.name === 'Liminis') {
            orbitCenter = beaconPositionRef.current;
        }

        if (data.type === 'Star' && data.name === 'Beacon') {
            x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
            z = orbitCenter.z + semiMajorAxis * Math.sin(angle);
            beaconPositionRef.current.set(x, 0, z);
        } else if ((data as PlanetData).eccentric) {
            const eccentricity = data.name === 'Spectris' ? 0.2 : 0.5;
            const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
            x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
            z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
        } else if (data.type === 'Star' && (data.name === 'Golden Giver' || data.name === 'Twilight')) {
            const r1 = 0.1 * 150; // 0.1 AU
            x = (data.name === 'Golden Giver' ? -1 : 1) * r1 * Math.cos(angle);
            z = (data.name === 'Golden Giver' ? 1 : -1) * r1 * Math.sin(angle);
        } else {
            const semiMinorAxis = semiMajorAxis; // For circular orbit, semi-minor is same as semi-major
            x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
            z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
        }

        const y = orbitCenter.y;
        bodyMesh.position.set(x, y, z);

        if (bodyMesh.name === 'Sebaka') {
             // 1 Sebaka day rotation (2PI) per day.
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
    const pointLight = new THREE.PointLight(0xffffff, 2, 0, 1);
    scene.add(pointLight);

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
        materialOptions.emissive = body.color;
        materialOptions.emissiveIntensity = 2;
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
        starMeshesRef.current.push(mesh);
        const pointLightStar = new THREE.PointLight(body.color, 5, 0, 1);
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
            // Beacon orbits center, its planets orbit beacon.
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
      // A day is 1 second at speed 1.
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
            const brighteningDuration = 9;
            
            let brightnessFactor = 1.0;
            
            if (currentDayInCycle < darkeningDuration) {
              const progress = currentDayInCycle / darkeningDuration; // 0 to 1
              brightnessFactor = 1.0 - progress * 0.9; // from 1.0 down to 0.1
            } 
            else if (currentDayInCycle < darkeningDuration + darkDuration) {
              brightnessFactor = 0.1;
            } 
            else {
              const progress = (currentDayInCycle - (darkeningDuration + darkDuration)) / brighteningDuration; // 0 to 1
              brightnessFactor = 0.1 + progress * 0.9; // from 0.1 up to 1.0
            }

            const targetColor = viridisOriginalColor.current.clone().multiplyScalar(brightnessFactor);
            const targetIntensity = brightnessFactor;

            viridisMesh.material.color.lerp(targetColor, 0.1);
            viridisMesh.material.emissive.lerp(targetColor, 0.1);
            viridisMesh.material.emissiveIntensity = THREE.MathUtils.lerp(viridisMesh.material.emissiveIntensity, targetIntensity, 0.1);

          } else {
             // Reset to default when animation is off
             viridisMesh.material.color.lerp(viridisOriginalColor.current, 0.1);
             viridisMesh.material.emissive.lerp(new THREE.Color(0x000000), 0.1);
             viridisMesh.material.emissiveIntensity = THREE.MathUtils.lerp(viridisMesh.material.emissiveIntensity, 0, 0.1);
          }
      }
      
      const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
      if (viewFromSebaka && sebakaMesh && camera && controls) {
          const sebakaPosition = sebakaMesh.position.clone();
          const surfaceYOffset = (sebakaMesh.geometry as THREE.SphereGeometry).parameters.radius + 5;
          
          if (isSebakaRotating) {
            // Camera is on surface, looking out, rotating with planet
            const cameraOffset = new THREE.Vector3(0, surfaceYOffset, 0);
            cameraOffset.applyEuler(sebakaMesh.rotation);
            camera.position.copy(sebakaPosition).add(cameraOffset);
            
            // Look direction also rotates with planet
            const lookAtOffset = new THREE.Vector3(0, surfaceYOffset, -100); 
            lookAtOffset.applyEuler(sebakaMesh.rotation);
            controls.target.copy(sebakaPosition).add(lookAtOffset);

          } else {
            // Camera is on surface, but its rotation is controlled by the slider and mouse
            const cameraOffset = new THREE.Vector3(0, surfaceYOffset, 0);

            // Apply manual rotation first to get the correct 'up' vector
            const manualRotation = new THREE.Euler(0, THREE.MathUtils.degToRad(sebakaRotationAngle), 0, 'YXZ');
            cameraOffset.applyEuler(manualRotation);
            
            // Set camera position
            camera.position.copy(sebakaPosition).add(cameraOffset);
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
            // Traverse up to find the parent mesh with the name
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
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
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
        controls.enableRotate = true; 

        if (isSebakaRotating) {
            controls.enableRotate = false;
        }

    } else {
        controls.minDistance = 1;
        controls.maxDistance = 200000;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.enableRotate = true;
        controls.screenSpacePanning = true;
    }
    controls.update();
  }, [viewFromSebaka, isSebakaRotating]);
  
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls || viewFromSebaka) return;

    camera.position.copy(originalCameraPos.current);
    controls.target.set(0, 0, 0);
    controls.update();
  }, [resetViewToggle, viewFromSebaka]);

  // Handle manual rotation from slider
  useEffect(() => {
      const controls = controlsRef.current;
      const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
      if (!controls || !viewFromSebaka || isSebakaRotating || !sebakaMesh) return;

      const rotationY = THREE.MathUtils.degToRad(sebakaRotationAngle);
      
      const up = new THREE.Vector3(0,1,0); 

      // We only want to control the horizontal (yaw) rotation with the slider.
      // We keep the vertical (pitch) rotation from the mouse controls.
      // Let's just update the target based on the angle.
      const targetOffset = new THREE.Vector3(0, 0, -100).applyAxisAngle(up, rotationY);
      controls.target.copy(sebakaMesh.position.clone().add(targetOffset));
      controls.update();
  }, [sebakaRotationAngle, viewFromSebaka, isSebakaRotating]);
  
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!controls || !camera) return;
    
    if (isBeaconView) {
        // Set target to Beacon
        controls.target.copy(beaconPositionRef.current);
        
        // Move camera to a good viewing position relative to Beacon
        const beaconCamPos = beaconPositionRef.current.clone().add(new THREE.Vector3(0, 2000, 4000));
        camera.position.copy(beaconCamPos);
    } else if (!viewFromSebaka) { // Only reset if not in Sebaka view
        // Revert to original view
        controls.target.set(0, 0, 0);
        camera.position.copy(originalCameraPos.current);
    }
    controls.update();
  }, [isBeaconView]);


  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
};

export default CelestialSymphony;
