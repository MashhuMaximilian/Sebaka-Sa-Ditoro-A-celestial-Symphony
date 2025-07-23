
import * as THREE from 'three';

// Simplex noise implementation from Ashima Arts
const noiseGLSL = `
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

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

// Fractal noise for more complex deformation
float fbm(vec3 x, int octaves) {
  float v = 0.0;
  float a = 0.5;
  vec3 shift = vec3(100);
  for (int i = 0; i < 8; ++i) {
    if (i >= octaves) break;
    v += a * snoise(x);
    x = x * 2.0 + shift;
    a *= 0.5;
  }
  return v;
}
`;

export const blobShader = {
  uniforms: {
    // Blob deformation
    time: { value: 0 },
    displacementScale: { value: 0.05 },
    noiseFrequency: { value: 8.3 },
    noiseSpeed: { value: 0.5 },
    blobComplexity: { value: 4.0 }, 

    // Color & Material
    colorTexture: { value: null as THREE.Texture | null },
    opacity: { value: 1.0 },
    
    // Lighting
    alphaStarPos: { value: new THREE.Vector3() },
    twilightStarPos: { value: new THREE.Vector3() },
    beaconStarPos: { value: new THREE.Vector3() },
    albedo: { value: 0.3 },
    specularIntensity: { value: 0.5 },
    shininess: { value: 80.0 },
  },
  vertexShader: `
    ${noiseGLSL}

    uniform float time;
    uniform float displacementScale;
    uniform float noiseFrequency;
    uniform float noiseSpeed;
    uniform float blobComplexity; // Changed to float

    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec3 vViewDirection;
    varying vec2 vUv;

    // Function to compute displaced position
    vec3 getDisplacedPosition(vec3 p, out vec3 displacedNormal) {
      // Remap noise from [-1, 1] to [0, 1] to only push vertices outwards
      float noise = (fbm(p * noiseFrequency + time * noiseSpeed, int(blobComplexity)) + 1.0) * 0.5;
      vec3 displacedPosition = p + normal * noise * displacementScale;
      
      // Recalculate normals for correct lighting by sampling nearby points
      float eps = 0.001;
      vec3 tangent = normalize(cross(normal, vec3(0.0, 1.0, 0.0)));
      if (length(tangent) < eps) {
        tangent = normalize(cross(normal, vec3(1.0, 0.0, 0.0)));
      }
      vec3 bitangent = normalize(cross(normal, tangent));
      
      vec3 neighbor1 = p + tangent * eps;
      vec3 neighbor2 = p + bitangent * eps;

      float noise1 = (fbm(neighbor1 * noiseFrequency + time * noiseSpeed, int(blobComplexity)) + 1.0) * 0.5;
      float noise2 = (fbm(neighbor2 * noiseFrequency + time * noiseSpeed, int(blobComplexity)) + 1.0) * 0.5;
      
      vec3 displacedNeighbor1 = neighbor1 + normal * noise1 * displacementScale;
      vec3 displacedNeighbor2 = neighbor2 + normal * noise2 * displacementScale;

      vec3 d1 = displacedNeighbor1 - displacedPosition;
      vec3 d2 = displacedNeighbor2 - displacedPosition;

      displacedNormal = normalize(cross(d2, d1));
      
      return displacedPosition;
    }

    void main() {
      vUv = uv;
      vec3 displacedNormal;
      vec3 displacedPosition = getDisplacedPosition(position, displacedNormal);

      vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
      vWorldPosition = worldPosition.xyz;
      
      vNormal = normalize(normalMatrix * displacedNormal);
      vViewDirection = normalize(cameraPosition - vWorldPosition);

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform float opacity;
    uniform sampler2D colorTexture;

    uniform vec3 alphaStarPos;
    uniform vec3 twilightStarPos;
    uniform vec3 beaconStarPos;
    uniform float albedo;
    uniform float specularIntensity;
    uniform float shininess;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec3 vViewDirection;
    varying vec2 vUv;
    
    // Function to calculate lighting contribution from a single star
    vec3 getStarContribution(vec3 starPos, vec3 normal, vec3 viewDir) {
        vec3 lightDir = normalize(starPos - vWorldPosition);
        float dist = length(starPos - vWorldPosition);
        float attenuation = 1.0 / (1.0 + dist * dist * 0.0001); // Simplified attenuation
        
        // Diffuse
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = vec3(diff); // Use white light for simplicity
        
        // Specular
        vec3 halfwayDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfwayDir), 0.0), max(shininess, 0.1));
        vec3 specular = vec3(spec * specularIntensity);
        
        return (diffuse + specular) * attenuation;
    }

    void main() {
      vec3 normal = normalize(vNormal);

      // --- Base Color from Texture ---
      vec4 texColor = texture2D(colorTexture, vUv);
      vec3 baseColor = texColor.rgb;

      // --- Lighting Calculation ---
      vec3 lighting = vec3(0.0);
      lighting += getStarContribution(alphaStarPos, normal, vViewDirection);
      lighting += getStarContribution(twilightStarPos, normal, vViewDirection);
      lighting += getStarContribution(beaconStarPos, normal, vViewDirection);
      
      vec3 litColor = baseColor * albedo * lighting;

      // --- Final Combination ---
      vec3 finalColor = litColor;

      gl_FragColor = vec4(finalColor, texColor.a * opacity);
    }
  `,
};
