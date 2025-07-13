
"use client";

import { useEffect, useRef } from "react";
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
}: CelestialSymphonyProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const planetMeshesRef = useRef<THREE.Mesh[]>([]);
  const binaryStarMeshesRef = useRef<THREE.Mesh[]>([]);
  const orbitMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameId = useRef<number>();
  const controlsRef = useRef<OrbitControls>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const sceneRef = useRef<THREE.Scene>();
  const clockRef = useRef(new THREE.Clock());
  const speedMultiplierRef = useRef(speedMultiplier);
  const originalCameraPos = useRef(new THREE.Vector3(0, 400, 800));
  const viridisOriginalColor = useRef(new THREE.Color("#9ACD32"));
  const viridisAnimationClock = useRef(new THREE.Clock());
  const sebakaRotationState = useRef({ y: 0 });


  useEffect(() => {
    speedMultiplierRef.current = speedMultiplier;
  }, [speedMultiplier]);
  
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
    let clickableObjects: THREE.Mesh[] = [];

    // Stars
    binaryStarMeshesRef.current = [];
    stars.forEach((starData) => {
      const geometry = new THREE.SphereGeometry(starData.size, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: starData.color });
      const star = new THREE.Mesh(geometry, material);
      star.position.set(...starData.position);
      star.name = starData.name;
      scene.add(star);
      clickableObjects.push(star);
      if (starData.name === "Alpha" || starData.name === "Twilight") {
        binaryStarMeshesRef.current.push(star);
      } else {
        const pointLightBeacon = new THREE.PointLight(starData.color, 5, 0, 1);
        pointLightBeacon.position.set(...starData.position);
        scene.add(pointLightBeacon);
      }
    });

    // Planets and Orbits
    planetMeshesRef.current = [];
    orbitMeshesRef.current = [];
    planets.forEach((planetData) => {
      const orbitCenter = planetData.orbitCenter || [0, 0, 0];
      const planetGeometry = new THREE.SphereGeometry(planetData.size, 32, 32);
      const planetMaterial = new THREE.MeshStandardMaterial({
        color: planetData.color,
        roughness: 0.8,
        metalness: 0.1,
        emissive: planetData.color,
        emissiveIntensity: 0.8,
      });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      planet.name = planetData.name;
      planet.userData = {
        orbitRadius: planetData.orbitRadius,
        orbitSpeed: planetData.orbitSpeed,
        angle: Math.random() * Math.PI * 2,
        orbitCenter: new THREE.Vector3(...orbitCenter),
        eccentric: planetData.eccentric || false,
        time: Math.random() * 1000, // For animation offset
      };
      scene.add(planet);
      planetMeshesRef.current.push(planet);
      clickableObjects.push(planet);

      if (planetData.name === "Spectris") {
        const ringGeometry = new THREE.RingGeometry(planetData.size * 1.5, planetData.size * 3, 64);
        
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
          extensions: {
            derivatives: true
          },
          defines: {
            STANDARD: '',
            PHYSICAL: ''
          },
           uniforms: {
            time: { value: 1.0 },
            resolution: { value: new THREE.Vector2() }
          },
        });

        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2 + 0.2; // Tilt the rings
        planet.add(rings); // Attach rings to the planet
      }

      const orbitGeometry = new THREE.TorusGeometry(planetData.orbitRadius, 0.5, 8, 100);
      const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.position.set(...orbitCenter);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
      orbitMeshesRef.current.push(orbit);
    });

    const binaryOrbitSpeed = 0.01 * (324 / 26);
    
    // Animation loop
    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      const deltaTime = clockRef.current.getDelta();
      const effectiveDelta = deltaTime * speedMultiplierRef.current;

      // Animate binary stars
      if (binaryStarMeshesRef.current.length === 2) {
          const star1 = binaryStarMeshesRef.current[0];
          const star2 = binaryStarMeshesRef.current[1];
          star1.userData.angle = (star1.userData.angle || 0) + binaryOrbitSpeed * effectiveDelta;
          star2.userData.angle = (star2.userData.angle || 0) + binaryOrbitSpeed * effectiveDelta;

          const r1 = 0.1 * 150; // 0.1 AU
          star1.position.x = -r1 * Math.cos(star1.userData.angle);
          star1.position.z = r1 * Math.sin(star1.userData.angle);
          star2.position.x = r1 * Math.cos(star2.userData.angle);
          star2.position.z = -r1 * Math.sin(star2.userData.angle);
      }

      let sebakaMesh: THREE.Mesh | undefined;
      // Animate planets
      planetMeshesRef.current.forEach((planet) => {
        planet.userData.angle += planet.userData.orbitSpeed * effectiveDelta;
        
        const semiMajorAxis = planet.userData.orbitRadius;
        let x, z;
        let semiMinorAxis;

        if (planet.userData.eccentric) {
            const eccentricity = planet.name === 'Spectris' ? 0.2 : 0.5; // Spectris: 0.2, Aetheris: 0.5
            semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
            x = planet.userData.orbitCenter.x + semiMajorAxis * Math.cos(planet.userData.angle);
            z = planet.userData.orbitCenter.z + semiMinorAxis * Math.sin(planet.userData.angle);
        } else {
            semiMinorAxis = semiMajorAxis; // For circular orbit
            x = planet.userData.orbitCenter.x + semiMajorAxis * Math.cos(planet.userData.angle);
            z = planet.userData.orbitCenter.z + semiMinorAxis * Math.sin(planet.userData.angle);
        }

        const y = planet.userData.orbitCenter.y;
        planet.position.set(x, y, z);

        if (planet.name === 'Sebaka') {
            sebakaMesh = planet;
            const dayLengthInSeconds = 24 * 60 * 60; // Sebaka's day length
            const rotationSpeed = (Math.PI * 2) / dayLengthInSeconds;
            // sebakaRotationState.current.y += rotationSpeed * effectiveDelta;
            planet.rotation.y += rotationSpeed * effectiveDelta;
        }
        
        if (planet.name === 'Viridis' && planet.material instanceof THREE.MeshStandardMaterial) {
            if (isViridisAnimationActive) {
                if (!viridisAnimationClock.current.running) {
                    viridisAnimationClock.current.start();
                }
                const realElapsedTime = viridisAnimationClock.current.getElapsedTime();
                const cycleDuration = 4.0; // 2 seconds to dim, 2 seconds to brighten
                const phase = (realElapsedTime % cycleDuration) / cycleDuration;
                
                const brightnessFactor = (Math.cos(phase * 2 * Math.PI) + 1) / 2; // Range 0.0 to 1.0

                const minIntensity = 0.1;
                const maxIntensity = 0.8;
                const targetIntensity = minIntensity + (maxIntensity - minIntensity) * brightnessFactor;

                const targetColor = viridisOriginalColor.current.clone().multiplyScalar(brightnessFactor);
                
                planet.material.color.lerp(targetColor, 0.1);
                planet.material.emissive.lerp(targetColor, 0.1);
                planet.material.emissiveIntensity = THREE.MathUtils.lerp(planet.material.emissiveIntensity, targetIntensity, 0.1);

            } else {
                if (viridisAnimationClock.current.running) {
                    viridisAnimationClock.current.stop();
                }
                 // Reset to default when animation is off
                 planet.material.color.lerp(viridisOriginalColor.current, 0.1);
                 planet.material.emissive.lerp(viridisOriginalColor.current, 0.1);
                 planet.material.emissiveIntensity = THREE.MathUtils.lerp(planet.material.emissiveIntensity, 0.8, 0.1);
            }
        }
      });
      
      if (viewFromSebaka && sebakaMesh && camera && controls) {
          const sebakaPosition = sebakaMesh.position.clone();
          const surfaceYOffset = (sebakaMesh.geometry as THREE.SphereGeometry).parameters.radius + 5;
          
          if (isSebakaRotating) {
            // Camera is fixed to the planet's surface and rotates with it
            const cameraOffset = new THREE.Vector3(0, surfaceYOffset, 0);
            cameraOffset.applyEuler(sebakaMesh.rotation);
            camera.position.copy(sebakaPosition).add(cameraOffset);
            
            const lookAtOffset = new THREE.Vector3(0, surfaceYOffset, -100); 
            lookAtOffset.applyEuler(sebakaMesh.rotation);
            controls.target.copy(sebakaPosition).add(lookAtOffset);

          } else {
            // Camera is on the planet but user controls rotation via slider
            const cameraOffset = new THREE.Vector3(0, surfaceYOffset, 0);
            const rotationY = THREE.MathUtils.degToRad(sebakaRotationAngle);
            const manualRotation = new THREE.Euler(0, rotationY, 0, 'YXZ');
            
            camera.position.copy(sebakaPosition).add(cameraOffset);

            const lookAtOffset = new THREE.Vector3(0, 0, -100); // Look "forward" from camera
            lookAtOffset.applyEuler(manualRotation);
            controls.target.copy(camera.position).add(lookAtOffset);
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
        mesh.material.emissive.set(planetData.color);
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
        controls.enableZoom = false; 
        controls.minDistance = 0;
        controls.maxDistance = 1;
        controls.screenSpacePanning = false;

        if (isSebakaRotating) {
            controls.enableRotate = false;
        } else {
             // Disable rotation controls when slider is active
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

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
};

export default CelestialSymphony;
