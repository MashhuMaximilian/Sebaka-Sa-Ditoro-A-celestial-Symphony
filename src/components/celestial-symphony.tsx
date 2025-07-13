
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
  resetViewToggle: boolean;
}

const CelestialSymphony = ({
  stars,
  planets,
  speedMultiplier = 1,
  onBodyClick,
  viewFromSebaka,
  resetViewToggle,
}: CelestialSymphonyProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const planetMeshesRef = useRef<THREE.Mesh[]>([]);
  const binaryStarMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameId = useRef<number>();
  const controlsRef = useRef<OrbitControls>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const sceneRef = useRef<THREE.Scene>();
  const clockRef = useRef(new THREE.Clock());
  const speedMultiplierRef = useRef(speedMultiplier);
  const originalCameraPos = useRef(new THREE.Vector3(0, 400, 800));

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
      };
      scene.add(planet);
      planetMeshesRef.current.push(planet);
      clickableObjects.push(planet);

      const orbitGeometry = new THREE.TorusGeometry(planetData.orbitRadius, 0.5, 8, 100);
      const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.position.set(...orbitCenter);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
    });

    const binaryOrbitSpeed = 0.01 * (333 / 26);
    
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
        let semiMinorAxis;
        let x, z;

        if (planet.userData.eccentric) {
            const eccentricity = planet.name === 'Spectris' ? 0.2 : 0.5; // Spectris: 0.2, Aetheris: 0.5
            semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
        } else {
            semiMinorAxis = semiMajorAxis; // For circular orbits, semi-minor is same as semi-major
        }
        x = planet.userData.orbitCenter.x + semiMajorAxis * Math.cos(planet.userData.angle);
        z = planet.userData.orbitCenter.z + semiMinorAxis * Math.sin(planet.userData.angle);

        const y = planet.userData.orbitCenter.y;
        planet.position.set(x, y, z);
        if (planet.name === 'Sebaka') {
            sebakaMesh = planet;
        }
      });
      
      if (viewFromSebaka && sebakaMesh && camera && controls) {
          const sebakaPosition = sebakaMesh.position.clone();
          const surfaceYOffset = (sebakaMesh.geometry as THREE.SphereGeometry).parameters.radius + 5;
          camera.position.set(sebakaPosition.x, sebakaPosition.y + surfaceYOffset, sebakaPosition.z);
          
          // Look outwards from the planet
          const lookDirection = camera.position.clone().sub(controls.target).normalize();
          const lookAtTarget = camera.position.clone().add(lookDirection);
          controls.target.copy(lookAtTarget);
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

        const intersects = raycaster.intersectObjects(clickableObjects);

        if (intersects.length > 0) {
            const firstIntersected = intersects[0].object;
            if (firstIntersected.name) {
                onBodyClick(firstIntersected.name);
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
      }
    });
  }, [planets]);

  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const sebakaMesh = planetMeshesRef.current.find(p => p.name === 'Sebaka');

    if (!camera || !controls) return;
    
    if (sebakaMesh) {
      sebakaMesh.visible = !viewFromSebaka;
    }

    if (viewFromSebaka) {
        if (sebakaMesh) {
            const sebakaPosition = sebakaMesh.position.clone();
            const surfaceYOffset = (sebakaMesh.geometry as THREE.SphereGeometry).parameters.radius + 5;
            camera.position.set(sebakaPosition.x, sebakaPosition.y + surfaceYOffset, sebakaPosition.z);
            controls.target.copy(sebakaPosition.clone().add(new THREE.Vector3(0,0,1))); // Look forward initially
        }
        controls.enablePan = false;
        controls.enableZoom = false; 
        controls.minDistance = 0;
        controls.maxDistance = 1; 
        controls.screenSpacePanning = false;

    } else {
        // Reset to default orbital view
        controls.target.set(0, 0, 0);
        controls.minDistance = 1;
        controls.maxDistance = 20000;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.screenSpacePanning = true;
    }
    controls.update();
  }, [viewFromSebaka]);
  
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
