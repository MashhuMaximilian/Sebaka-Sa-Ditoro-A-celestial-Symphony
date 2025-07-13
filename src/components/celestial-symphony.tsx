
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PlanetData, StarData } from "@/types";

interface CelestialSymphonyProps {
  stars: StarData[];
  planets: PlanetData[];
  speedMultiplier?: number;
}

const CelestialSymphony = ({ stars, planets, speedMultiplier = 1 }: CelestialSymphonyProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const planetMeshesRef = useRef<THREE.Mesh[]>([]);
  const binaryStarMeshesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameId = useRef<number>();
  const controlsRef = useRef<OrbitControls>();
  const timeRef = useRef(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      currentMount.clientWidth / currentMount.clientHeight,
      0.1,
      200000 // Increased far plane for distant star
    );
    camera.position.set(0, 400, 800);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true; // Enable panning
    controls.minDistance = 1;
    controls.maxDistance = 20000;
    controls.target.set(0, 0, 0);
    controls.touches.ONE = THREE.TOUCH.PAN;
    controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
    controlsRef.current = controls;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const pointLight = new THREE.PointLight(0xffffff, 2, 0, 1);
    scene.add(pointLight);

    // Stars
    binaryStarMeshesRef.current = [];
    stars.forEach((starData) => {
      const geometry = new THREE.SphereGeometry(starData.size, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: starData.color });
      const star = new THREE.Mesh(geometry, material);
      star.position.set(...starData.position);
      scene.add(star);
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
        emissiveIntensity: 0.6,
      });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      planet.userData = {
        orbitRadius: planetData.orbitRadius,
        orbitSpeed: planetData.orbitSpeed,
        angle: Math.random() * Math.PI * 2,
        orbitCenter: new THREE.Vector3(...orbitCenter),
      };
      scene.add(planet);
      planetMeshesRef.current.push(planet);

      const orbitGeometry = new THREE.TorusGeometry(planetData.orbitRadius, 0.5, 8, 100);
      const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.position.set(...orbitCenter);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
    });

    const binaryOrbitSpeed = 0.01 / (26/333); // 26 day period
    
    // Animation loop
    const animate = (now: number) => {
      const deltaTime = (now - timeRef.current) * 0.001; // convert ms to s
      timeRef.current = now;
      
      const effectiveDelta = deltaTime * speedMultiplier;

      // Animate binary stars
      if (binaryStarMeshesRef.current.length === 2) {
          const star1 = binaryStarMeshesRef.current[0];
          const star2 = binaryStarMeshesRef.current[1];
          star1.userData.angle = (star1.userData.angle || 0) + binaryOrbitSpeed * speedMultiplier;
          star2.userData.angle = (star2.userData.angle || 0) + binaryOrbitSpeed * speedMultiplier;

          const r1 = 0.1 * 150; // 0.1 AU
          star1.position.x = -r1 * Math.cos(star1.userData.angle);
          star1.position.z = r1 * Math.sin(star1.userData.angle);
          star2.position.x = r1 * Math.cos(star2.userData.angle);
          star2.position.z = -r1 * Math.sin(star2.userData.angle);
      }

      // Animate planets
      planetMeshesRef.current.forEach((planet) => {
        planet.userData.angle += planet.userData.orbitSpeed * speedMultiplier;
        const x = planet.userData.orbitCenter.x + planet.userData.orbitRadius * Math.cos(planet.userData.angle);
        const z = planet.userData.orbitCenter.z + planet.userData.orbitRadius * Math.sin(planet.userData.angle);
        const y = planet.userData.orbitCenter.y;
        planet.position.set(x, y, z);
      });

      controls.update();
      renderer.render(scene, camera);
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    // Handle resize
    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
      window.removeEventListener("resize", handleResize);
      if (currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []); // Run effect only once on mount

  useEffect(() => {
    planetMeshesRef.current.forEach((mesh, index) => {
      const planetData = planets[index];
      if (planetData && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.color.set(planetData.color);
        mesh.material.emissive.set(planetData.color);
      }
    });
  }, [planets]);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full" />;
};

export default CelestialSymphony;
