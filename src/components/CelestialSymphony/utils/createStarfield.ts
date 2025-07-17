import * as THREE from 'three';

export const createStarfield = (scene: THREE.Scene) => {
  const starCount = 20000;
  const positions = [];
  const colors = [];
  const sizes = [];

  const colorPalette = [
    new THREE.Color(0xdddddd), // dim gray
    new THREE.Color(0xeeeeee), // almost pure white
    new THREE.Color(0xffffff), // pure white
    new THREE.Color(0xfff5a5), // yellow
    new THREE.Color(0xffa0a0), // red
    new THREE.Color(0xa0a0ff), // blue
    new THREE.Color(0xa0ffa0), // green
    new THREE.Color(0xffd0a0), // orange
    new THREE.Color(0xFFFFFF),
    new THREE.Color(0xFFFEFF),
    new THREE.Color(0xFDFDFD),
    new THREE.Color(0xFCFCFC),
    new THREE.Color(0xFAFAFA),
  ];

  for (let i = 0; i < starCount; i++) {
    const x = THREE.MathUtils.randFloatSpread(300000);
    const y = THREE.MathUtils.randFloatSpread(300000);
    const z = THREE.MathUtils.randFloatSpread(300000);
    positions.push(x, y, z);

    const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    const brightness = THREE.MathUtils.randFloat(3.8, 115.5);
    colors.push(color.r * brightness, color.g * brightness, color.b * brightness);
    
    sizes.push(THREE.MathUtils.randFloat(6, 136));
  }

  const starsGeometry = new THREE.BufferGeometry();
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  starsGeometry.setAttribute('customSize', new THREE.Float32BufferAttribute(sizes, 1));

  const starsMaterial = new THREE.PointsMaterial({
    size: 1, // Base size, will be overridden by attribute
    vertexColors: true,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.8,
  });

  starsMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = `
      attribute float customSize;
      ${shader.vertexShader}
    `.replace(
      `gl_PointSize = size;`,
      `gl_PointSize = customSize * ( 300.0 / -mvPosition.z );`
    );
  };
  
  const starField = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starField);
};
