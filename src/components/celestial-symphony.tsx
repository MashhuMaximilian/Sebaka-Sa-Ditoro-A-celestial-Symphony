"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { PlanetData, StarData } from "@/types";

interface CelestialSymphonyProps {
  stars: StarData[];
  planets: PlanetData[];
}

const CelestialSymphony = ({ stars, planets }: CelestialSymphonyProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const planetMeshesRef = useRef<THREE.Mesh[]>([]);

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
      2000
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
    controls.screenSpacePanning = false;
    controls.minDistance = 100;
    controls.maxDistance = 1500;
    controls.target.set(0, 0, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const pointLight = new THREE.PointLight(0xffffff, 2, 0, 1);
    scene.add(pointLight);

    // Stars
    stars.forEach((starData) => {
      const geometry = new THREE.SphereGeometry(starData.size, 32, 32);
      const material = new THREE.MeshBasicMaterial({ color: starData.color });
      const star = new THREE.Mesh(geometry, material);
      star.position.set(...starData.position);
      scene.add(star);
    });

    // Planets and Orbits
    planetMeshesRef.current = [];
    planets.forEach((planetData) => {
      // Planet
      const planetGeometry = new THREE.SphereGeometry(planetData.size, 32, 32);
      const planetMaterial = new THREE.MeshStandardMaterial({
        color: planetData.color,
        roughness: 0.8,
        metalness: 0.1,
      });
      const planet = new THREE.Mesh(planetGeometry, planetMaterial);
      planet.userData = {
        orbitRadius: planetData.orbitRadius,
        orbitSpeed: planetData.orbitSpeed,
        angle: Math.random() * Math.PI * 2,
      };
      scene.add(planet);
      planetMeshesRef.current.push(planet);

      // Orbit Path
      const orbitGeometry = new THREE.TorusGeometry(planetData.orbitRadius, 0.5, 8, 100);
      const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
      const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
      orbit.rotation.x = Math.PI / 2;
      scene.add(orbit);
    });

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      planetMeshesRef.current.forEach((planet) => {
        planet.userData.angle += planet.userData.orbitSpeed;
        const x = planet.userData.orbitRadius * Math.cos(planet.userData.angle);
        const z = planet.userData.orbitRadius * Math.sin(planet.userData.angle);
        planet.position.set(x, 0, z);
      });

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (currentMount) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Dispose geometries and materials if necessary
    };
  }, []); // Run effect only once on mount

  useEffect(() => {
    planetMeshesRef.current.forEach((mesh, index) => {
      const planetData = planets[index];
      if (planetData && mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.color.set(planetData.color);
      }
    });
  }, [planets]);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full -z-10" />;
};

export default CelestialSymphony;
