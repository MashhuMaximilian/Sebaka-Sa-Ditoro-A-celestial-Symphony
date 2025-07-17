
import * as THREE from 'three';

export const createStarfield = (scene: THREE.Scene) => {
  const stars: number[] = [];
  for (let i = 0; i < 10000; i++) {
    const x = THREE.MathUtils.randFloatSpread(300000);
    const y = THREE.MathUtils.randFloatSpread(300000);
    const z = THREE.MathUtils.randFloatSpread(300000);
    stars.push(x, y, z);
  }

  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(stars, 3)
  );

  const starsMaterial = new THREE.PointsMaterial({ color: 0x888888 });
  const starField = new THREE.Points(starsGeometry, starsMaterial);
  
  scene.add(starField);
};
