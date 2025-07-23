
import * as THREE from 'three';

const iridescentPalette = [
  new THREE.Color("#ff99ff"), // Soft Magenta
  new THREE.Color("#99ffff"), // Light Cyan
  new THREE.Color("#ffff99"), // Pale Yellow
  new THREE.Color("#ff9999"), // Light Coral
  new THREE.Color("#99ff99"), // Mint Green
  new THREE.Color("#9999ff"), // Periwinkle Blue
  new THREE.Color("#ffd699"), // Peach
  new THREE.Color("#d699ff"), // Lavender
  new THREE.Color("#99ffd6"), // Seafoam
  new THREE.Color("#ffc3e1")  // Blush Pink
];

// GLSL simplex noise function
const noise = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
`;


export const spiderStrandShader = {
  uniforms: {
    time: { value: 0 },
    displacementScale: { value: 0.01 },
    noiseFrequency: { value: 5.0 },
    noiseSpeed: { value: 0.5 },
    iridescenceStrength: { value: 12.0 },
    opacity: { value: 0.85 },
    colors: { value: iridescentPalette },
    numColors: { value: iridescentPalette.length },
    baseColor: { value: new THREE.Color(0xffffff) },
  },
  vertexShader: `
    uniform float time;
    uniform float displacementScale;
    uniform float noiseFrequency;
    uniform float noiseSpeed;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;

    ${noise}

    void main() {
      vNormal = normalize(mat3(modelMatrix) * normal);

      // Compute noise-based offset
      vec3 pos = position;
      float n = snoise(pos * noiseFrequency + time * noiseSpeed);
      vec3 displaced = pos + vNormal * n * displacementScale;

      vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
      vWorldPosition = worldPos.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
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
