import * as THREE from 'three';

const iridescentPalette = [
    new THREE.Color("#ff00ff"), // Magenta
    new THREE.Color("#00ffff"), // Cyan
    new THREE.Color("#ffff00"), // Yellow
    new THREE.Color("#ff0000"), // Red
    new THREE.Color("#00ff00"), // Green
    new THREE.Color("#0000ff"), // Blue
    new THREE.Color("#ff9900"), // Orange
    new THREE.Color("#9900ff"), // Purple
    new THREE.Color("#00ff99"), // Teal
    new THREE.Color("#ff69b4")  // Hot Pink
];


export const spiderStrandShader = {
  uniforms: {
    time: { value: 0 },
    iridescenceStrength: { value: 1.0 },
    opacity: { value: 0.85 },
    colors: { value: iridescentPalette },
    numColors: { value: iridescentPalette.length },
    baseColor: { value: new THREE.Color(0xffffff) }, // Add baseColor uniform
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    void main() {
      vNormal = normal;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform float iridescenceStrength;
    uniform float opacity;
    uniform vec3 colors[10]; 
    uniform int numColors;
    uniform vec3 baseColor; // Use the baseColor uniform
    varying vec3 vWorldPosition;
    
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 normal = normalize(cross(dFdx(vWorldPosition), dFdy(vWorldPosition)));
      float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 2.0);
      
      // Use position and time to cycle through the color palette
      float colorIndexFloat = mod((vWorldPosition.x + vWorldPosition.y) * 0.05 + time * 0.5, float(numColors));
      int colorIndex1 = int(colorIndexFloat);
      int colorIndex2 = (colorIndex1 + 1) % numColors;
      
      // Interpolate between two adjacent colors in the palette for a smooth transition
      vec3 color1 = colors[colorIndex1];
      vec3 color2 = colors[colorIndex2];
      vec3 iridescentColor = mix(color1, color2, fract(colorIndexFloat));
      
      // Mix the iridescent color with the base color
      vec3 finalColor = mix(baseColor, iridescentColor, fresnel * iridescenceStrength);

      // Reduce the fresnel delta and increase base opacity
      float finalAlpha = opacity * (0.35 + fresnel * 0.65);

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `,
};
