
import * as THREE from 'three';

// Re-using the simplex noise from blobShader for consistency
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

float noise3D(vec3 p) {
    return snoise(p);
}
`;

export const volcanoShader = {
  uniforms: {
    // Time and phase control
    u_time: { value: 0.0 },
    u_phaseSplit: { value: new THREE.Vector3(0.33, 0.66, 1.0) },

    // Lava and smoke properties
    u_lavaColor: { value: new THREE.Color(0xff4500) },
    u_noiseScale: { value: 3.5 },
    u_smokeDensity: { value: 1.5 },
    u_lavaSoftnessMin: { value: 0.4 },
    u_lavaSoftnessMax: { value: 0.8 },

    // Base texture
    planetTexture: { value: null as THREE.Texture | null },

    // Standard lighting uniforms
    alphaStarPos: { value: new THREE.Vector3() },
    twilightStarPos: { value: new THREE.Vector3() },
    beaconStarPos: { value: new THREE.Vector3() },
    alphaColor: { value: new THREE.Color(0xfff8e7) },
    twilightColor: { value: new THREE.Color(0xfff0d4) },
    beaconColor: { value: new THREE.Color(0xaaccff) },
    alphaIntensity: { value: 1.0 },
    twilightIntensity: { value: 0.7 },
    beaconIntensity: { value: 200.0 },
    ambientLevel: { value: 0.02 },
    albedo: { value: 1.0 },

    // Maps
    useNormalMap: { value: false },
    normalMap: { value: null as THREE.Texture | null },
    normalScale: { value: new THREE.Vector2(1, 1) },
    useDisplacementMap: { value: false },
    displacementMap: { value: null as THREE.Texture | null },
    displacementScale: { value: 1.0 },
    useSpecularMap: { value: false },
    specularMap: { value: null as THREE.Texture | null },
    specularIntensity: { value: 1.0 },
    shininess: { value: 30.0 },
    useAoMap: { value: false },
    aoMap: { value: null as THREE.Texture | null },
    aoMapIntensity: { value: 1.0 },
  },

  vertexShader: `
    ${noiseGLSL}

    uniform float u_time;
    uniform vec3 u_phaseSplit;
    uniform float u_noiseScale;

    uniform bool useDisplacementMap;
    uniform sampler2D displacementMap;
    uniform float displacementScale;

    varying vec2 vUv;
    varying float v_lavaMask;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying mat3 vTBN;
    
    in vec4 tangent;

    void main() {
      vUv = uv;
      
      // Calculate TBN matrix for normal mapping
      vec3 T = normalize( mat3(modelMatrix) * tangent.xyz );
      vec3 N = normalize( mat3(modelMatrix) * normal );
      vec3 B = cross( N, T );
      vTBN = mat3( T, B, N );

      // Apply standard displacement map first
      vec3 displacedPos = position;
      if (useDisplacementMap) {
        float displacementValue = texture2D(displacementMap, uv).r;
        displacedPos += normal * pow(displacementValue, 4.0) * displacementScale;
      }
      
      // Now, apply volcanic displacement on top of the already displaced position
      if(u_time < u_phaseSplit.x){
          float displacementStrength = smoothstep(0.0, u_phaseSplit.x, u_time) * (1.0 - smoothstep(u_phaseSplit.x - 0.1, u_phaseSplit.x, u_time));
          float noise = noise3D(displacedPos * u_noiseScale * 0.5 + u_time * 5.0);
          displacedPos += normal * noise * displacementStrength * 0.5;
      }
      
      // Calculate lava mask based on the original, non-displaced position so it's stable
      float base_noise = noise3D(position * 2.0);
      float slow_noise = noise3D(position * 0.5 + u_time * 0.2);
      v_lavaMask = pow(base_noise, 4.0) + pow(slow_noise, 2.0);
      
      vNormal = normalize(mat3(modelMatrix) * normal);
      vec4 worldPosition4 = modelMatrix * vec4(displacedPos, 1.0);
      vWorldPosition = worldPosition4.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition4;
    }
  `,

  fragmentShader: `
    ${noiseGLSL}

    uniform float u_time;
    uniform vec3 u_phaseSplit;
    uniform vec3 u_lavaColor;
    uniform float u_noiseScale;
    uniform float u_smokeDensity;
    uniform float u_lavaSoftnessMin;
    uniform float u_lavaSoftnessMax;
    uniform sampler2D planetTexture;

    // Standard lighting uniforms
    uniform vec3 alphaStarPos;
    uniform vec3 twilightStarPos;
    uniform vec3 beaconStarPos;
    uniform vec3 alphaColor;
    uniform vec3 twilightColor;
    uniform vec3 beaconColor;
    uniform float alphaIntensity;
    uniform float twilightIntensity;
    uniform float beaconIntensity;
    uniform float ambientLevel;
    uniform float albedo;
    
    // Maps
    uniform bool useNormalMap;
    uniform sampler2D normalMap;
    uniform vec2 normalScale;
    uniform bool useSpecularMap;
    uniform sampler2D specularMap;
    uniform float specularIntensity;
    uniform float shininess;
    uniform bool useAoMap;
    uniform sampler2D aoMap;
    uniform float aoMapIntensity;


    varying vec2 vUv;
    varying float v_lavaMask;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying mat3 vTBN;
    
    // Standard lighting function from planetShader
    vec3 getStarContribution(vec3 starPos, vec3 starColor, float starIntensity, vec3 normal, vec3 viewDir, bool isDistantSource) {
        vec3 lightDir = normalize(starPos - vWorldPosition);
        float attenuation = 1.0 / (1.0 + length(starPos - vWorldPosition) * length(starPos - vWorldPosition) * 0.00001);
        
        // Diffuse
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = starColor * diff * starIntensity;

        // Specular
        vec3 specular = vec3(0.0);
        if (useSpecularMap) {
            vec3 halfwayDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), max(shininess, 0.1));
            float specularMask = texture2D(specularMap, vUv).r;
            specular = starColor * spec * specularIntensity * specularMask;
        }

        return (diffuse * albedo + specular) * attenuation;
    }


    void main() {
      // Base surface color from texture
      vec3 surfaceColor = texture2D(planetTexture, vUv).rgb;
      
      // Get normal from normal map or use vertex normal
      vec3 normal = normalize(vNormal);
      if (useNormalMap) {
          vec3 mapN = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
          mapN.xy *= normalScale;
          normal = normalize(vTBN * mapN);
      }
      
      // --- Phase 1: Eruption ---
      float eruptionFactor = 1.0 - smoothstep(0.0, u_phaseSplit.x, u_time);
      // Soften the lava mask for smoother edges
      float softLavaMask = smoothstep(u_lavaSoftnessMin, u_lavaSoftnessMax, v_lavaMask);
      vec3 lavaEmission = u_lavaColor * softLavaMask * eruptionFactor;
      
      // Add lighting to base color
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 lighting = vec3(0.0);
      lighting += getStarContribution(alphaStarPos, alphaColor, alphaIntensity, normal, viewDir, false);
      lighting += getStarContribution(twilightStarPos, twilightColor, twilightIntensity, normal, viewDir, false);
      lighting += getStarContribution(beaconStarPos, beaconColor, beaconIntensity, normal, viewDir, false);

      // Ambient Occlusion
      float ao = 1.0;
      if (useAoMap) {
        ao = texture2D(aoMap, vUv).r;
        ao = mix(1.0, ao, aoMapIntensity);
      }

      vec3 litSurface = surfaceColor * (lighting + ambientLevel * albedo * ao);
      
      vec3 finalColor = litSurface + lavaEmission;
      finalColor *= ao;

      // --- Phase 2 & 3: Smoke and Haze ---
      float smokeMask = 0.0;
      if(u_time > u_phaseSplit.x && u_time < u_phaseSplit.y) {
          // Phase 2: Thickening Smoke
          float t = smoothstep(u_phaseSplit.x, u_phaseSplit.y, u_time);
          vec3 p = vec3(vUv * u_noiseScale, t * 5.0);
          smokeMask = pow(noise3D(p), 2.0) * t * u_smokeDensity;
      } else if (u_time >= u_phaseSplit.y) {
          // Phase 3: Easing Smoke
          float t = 1.0 - smoothstep(u_phaseSplit.y, u_phaseSplit.z, u_time);
          vec3 p = vec3(vUv * u_noiseScale, t * 5.0);
          smokeMask = pow(noise3D(p), 2.0) * t * u_smokeDensity;
      }

      vec3 fogColor = vec3(0.15); // Dark ash
      finalColor = mix(finalColor, fogColor, smokeMask);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};
