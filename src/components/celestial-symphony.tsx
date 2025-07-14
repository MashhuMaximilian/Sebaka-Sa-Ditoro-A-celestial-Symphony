
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
}: CelestialSymphonyProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const planetMeshesRef = useRef<THREE.Mesh[]>([]);
  const binaryStarMeshesRef = useRef<THREE.Mesh[]>([]);
  const allBodiesRef = useRef<THREE.Mesh[]>([]);
  const orbitMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameId = useRef<number>();
  const controlsRef = useRef<OrbitControls>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const sceneRef = useRef<THREE.Scene>();
  const clockRef = useRef(new THREE.Clock());
  const speedMultiplierRef = useRef(speedMultiplier);
  const originalCameraPos = useRef(new THREE.Vector3(0, 400, 800));
  const viridisOriginalColor = useRef(new THREE.Color("#9ACD32"));
  
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
        
        const semiMajorAxis = (data as PlanetData).orbitRadius || 0.1 * 150; // Star radius
        let x, z;
        
        const orbitCenter = (data as PlanetData).orbitCenter ? new THREE.Vector3(...(data as PlanetData).orbitCenter!) : new THREE.Vector3(0,0,0);

        if ((data as PlanetData).eccentric) {
            const eccentricity = data.name === 'Spectris' ? 0.2 : 0.5;
            const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
            x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
            z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
        } else if (data.type === 'Star' && (data.name === 'Alpha' || data.name === 'Twilight')) {
            const r1 = 0.1 * 150; // 0.1 AU
            x = (data.name === 'Alpha' ? -1 : 1) * r1 * Math.cos(angle);
            z = (data.name === 'Alpha' ? 1 : -1) * r1 * Math.sin(angle);
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
    controls.maxDistance = 20000;
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
    binaryStarMeshesRef.current = [];
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
      mesh.position.set(...(body.position || [0,0,0]));
      scene.add(mesh);
      allBodiesRef.current.push(mesh);
      clickableObjects.push(mesh);
      
      if (body.type === 'Planet') {
         planetMeshesRef.current.push(mesh);
      } else if (body.name === "Alpha" || body.name === "Twilight") {
        binaryStarMeshesRef.current.push(mesh);
      } else { // Beacon
        const pointLightBeacon = new THREE.PointLight(body.color, 5, 0, 1);
        pointLightBeacon.position.set(...body.position);
        scene.add(pointLightBeacon);
      }
      
      if (body.type === 'Planet' && body.name === "Spectris") {
        const ringGeometry = new THREE.RingGeometry(body.size * 1.5, body.size * 3, 64);
        const fragmentShader = `
          vec3 hsv2rgb(vec3 c) {
            vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
            vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
            return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
          }
          varying vec3 vUv;
          void main() {
            float angle = atan(vUv.y, vUv.x);
            float hue = (angle + 3.14159) / (2.0 * 3.14159);
            gl_FragColor = vec4(hsv2rgb(vec3(hue, 0.7, 1.0)), 0.7);
          }
        `;
        const vertexShader = `
          varying vec3 vUv;
          void main() {
            vUv = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
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
      
      if (body.type === 'Planet') {
          const orbitCenter = (body as PlanetData).orbitCenter || [0, 0, 0];
          const orbitGeometry = new THREE.TorusGeometry((body as PlanetData).orbitRadius, 0.5, 8, 100);
          const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
          const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
          orbit.position.set(...orbitCenter);
          orbit.rotation.x = Math.PI / 2;
          scene.add(orbit);
          orbitMeshesRef.current.push(orbit);
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
      
      const viridisMesh = planetMeshesRef.current.find(p => p.name === 'Viridis');
      if (viridisMesh && viridisMesh.material instanceof THREE.MeshStandardMaterial) {
          if (isViridisAnimationActive) {
            const cycleDurationDays = 27;
            const currentDayInCycle = elapsedDaysRef.current % cycleDurationDays;
            
            const darkeningDuration = 9;
            const darkDuration = 9;
            const brighteningDuration = 9;
            
            let brightnessFactor = 1.0;
            
            // Phase 1: Darkening (Days 0-9)
            if (currentDayInCycle < darkeningDuration) {
              const progress = currentDayInCycle / darkeningDuration; // 0 to 1
              brightnessFactor = 1.0 - progress * 0.9; // from 1.0 down to 0.1
            } 
            // Phase 2: Dark (Days 9-18)
            else if (currentDayInCycle < darkeningDuration + darkDuration) {
              brightnessFactor = 0.1;
            } 
            // Phase 3: Brightening (Days 18-27)
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

            // Then apply the planet's rotation to the offset
            cameraOffset.applyEuler(sebakaMesh.rotation);
            
            // Set camera position
            camera.position.copy(sebakaPosition).add(cameraOffset);

            // Let OrbitControls handle the target based on mouse movement.
            // When slider moves, we'll update the target in a separate useEffect.
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
    const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');

    if (!camera || !controls) return;
    
    orbitMeshesRef.current.forEach(orbit => {
        orbit.visible = !viewFromSebaka;
    });
    
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
        controls.target.set(0, 0, 0);
        controls.minDistance = 1;
        controls.maxDistance = 20000;
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
      const camera = cameraRef.current;
      const controls = controlsRef.current;
      const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');
      if (!camera || !controls || !viewFromSebaka || isSebakaRotating || !sebakaMesh) return;

      const currentCameraPosition = camera.position.clone();
      const rotationY = THREE.MathUtils.degToRad(sebakaRotationAngle);
      
      const lookAtVector = new THREE.Vector3(0, 0, -100); 
      lookAtVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);

      // We need to account for Sebaka's current orbital position
      const sebakaPosition = sebakaMesh.position;
      lookAtVector.add(sebakaPosition);

      controls.target.copy(lookAtVector);
  }, [sebakaRotationAngle, viewFromSebaka, isSebakaRotating]);


  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
};

export default CelestialSymphony;
