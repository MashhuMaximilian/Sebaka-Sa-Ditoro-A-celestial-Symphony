
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
    u_noiseScale: { value: 5.9 },
    u_smokeDensity: { value: 5.0 },
    u_lavaDensity: { value: 0.7 },
    u_lavaBrightness: { value: 10.0 },
    u_lavaDotSize: { value: 25.0 },
    u_lavaDotSizeVariance: { value: 15.0 },

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
    albedo: { value: 3.04 }, // Base albedo

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
    uniform bool useDisplacementMap;
    uniform sampler2D displacementMap;
    uniform float displacementScale;

    varying vec2 vUv;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying mat3 vTBN;
    
    in vec4 tangent;

    void main() {
      vUv = uv;
      
      vec3 pos = position;

      // Apply standard displacement map first
      if (useDisplacementMap) {
        float displacementValue = texture2D(displacementMap, uv).r;
        pos += normal * pow(displacementValue, 4.0) * displacementScale;
      }
      
      // Calculate TBN matrix for normal mapping
      vec3 t = normalize( mat3(modelMatrix) * tangent.xyz );
      vec3 n = normalize( mat3(modelMatrix) * normal );
      vec3 b = cross( n, t );
      vTBN = mat3( t, b, n );
      
      vNormal = n; // Pass world-space normal to fragment shader
      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,

  fragmentShader: `
    ${noiseGLSL}

    uniform float u_time;
    uniform vec3 u_phaseSplit;
    uniform float u_noiseScale;
    uniform float u_smokeDensity;
    uniform float u_lavaDensity;
    uniform float u_lavaBrightness;
    uniform float u_lavaDotSize;
    uniform float u_lavaDotSizeVariance;
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
    uniform float albedo; // Base albedo (3.04)
    
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
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying mat3 vTBN;
    
    // Standard lighting function from planetShader
    vec3 getStarContribution(vec3 starPos, vec3 starColor, float starIntensity, vec3 normal, vec3 viewDir, float currentAlbedo) {
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

        return (diffuse * currentAlbedo + specular) * attenuation;
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

      // --- Albedo Animation ---
      float animatedAlbedo = albedo; // Start with default albedo
      float phase1Midpoint = u_phaseSplit.x / 2.0;

      if (u_time < u_phaseSplit.x) { // Phase 1: Eruption and cool down
          if (u_time < phase1Midpoint) {
              animatedAlbedo = mix(albedo, 4.2, u_time / phase1Midpoint);
          } else {
              animatedAlbedo = mix(4.2, 1.8, (u_time - phase1Midpoint) / phase1Midpoint);
          }
      } else if (u_time < u_phaseSplit.y) { // Phase 2: Smoke Thickening
        float phase_time = (u_time - u_phaseSplit.x) / (u_phaseSplit.y - u_phaseSplit.x);
        animatedAlbedo = mix(1.8, 0.9, phase_time);
      } else { // Phase 3: Smoke Clearing
        float phase_time = (u_time - u_phaseSplit.y) / (u_phaseSplit.z - u_phaseSplit.y);
        animatedAlbedo = mix(0.9, albedo, phase_time);
      }
      
      // --- Eruption Effect (Flashing Dots) ---
      vec3 lavaEmission = vec3(0.0);
      if (u_time < u_phaseSplit.x) {
        float phase_progress = u_time / u_phaseSplit.x;
        float eruptionFactor = sin(phase_progress * 3.14159); // Simple sine fade in/out for the whole phase

        // Generate multiple layers of noise for complexity and variance
        float noise1 = noise3D(vWorldPosition * u_lavaDotSize + u_time * 15.0);
        float noise2 = noise3D(vWorldPosition * u_lavaDotSizeVariance + u_time * 5.0);
        
        // Combine noise to create varied dots
        float combined_noise = (noise1 + 1.0) * 0.5 * ((noise2 + 1.0) * 0.5);

        // Use density to set a sharp threshold for points to appear
        float threshold = 1.0 - u_lavaDensity;
        float flashing_points = smoothstep(threshold, threshold + 0.01, combined_noise);
        
        // Make the points flash over time
        float flash_speed = sin(u_time * 50.0 + vWorldPosition.x * 2.0) * 0.5 + 0.5;
        flashing_points *= flash_speed;
        
        // Create a color gradient based on intensity
        vec3 red = vec3(1.0, 0.1, 0.0);
        vec3 yellow = vec3(1.0, 0.8, 0.2);
        vec3 white = vec3(1.0, 1.0, 1.0);
        
        vec3 point_color = mix(red, yellow, smoothstep(0.0, 0.5, flashing_points));
        point_color = mix(point_color, white, smoothstep(0.5, 1.0, flashing_points));

        lavaEmission = point_color * flashing_points * eruptionFactor * u_lavaBrightness;
      }
      
      // --- Smoke & Haze ---
      float transitionWidth = 0.1;
      float smokeFadeIn = smoothstep(u_phaseSplit.x - transitionWidth, u_phaseSplit.x, u_time);
      float smokeFadeOut = 1.0 - smoothstep(u_phaseSplit.y - transitionWidth, u_phaseSplit.y, u_time);
      float smokeIntensity = smokeFadeIn * smokeFadeOut;

      float hazeFadeIn = smoothstep(u_phaseSplit.y - transitionWidth, u_phaseSplit.y, u_time);
      float hazeFadeOut = 1.0 - smoothstep(u_phaseSplit.z - transitionWidth, u_phaseSplit.z, u_time);
      float hazeIntensity = hazeFadeIn * hazeFadeOut;
      
      // --- Lighting & Final Color ---
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 lighting = vec3(0.0);
      lighting += getStarContribution(alphaStarPos, alphaColor, alphaIntensity, normal, viewDir, animatedAlbedo);
      lighting += getStarContribution(twilightStarPos, twilightColor, twilightIntensity, normal, viewDir, animatedAlbedo);
      lighting += getStarContribution(beaconStarPos, beaconColor, beaconIntensity, normal, viewDir, animatedAlbedo);

      // Ambient Occlusion
      float ao = 1.0;
      if (useAoMap) {
        ao = texture2D(aoMap, vUv).r;
        ao = mix(1.0, ao, aoMapIntensity);
      }

      vec3 litSurface = surfaceColor * (lighting + ambientLevel * animatedAlbedo * ao);
      
      vec3 finalColor = litSurface + lavaEmission;
      finalColor *= ao;

      // Mix Smoke and Haze
      vec3 smokeNoiseP = vec3(vUv * u_noiseScale, u_time * 5.0);
      float smokeMask = pow(noise3D(smokeNoiseP), 2.0) * smokeIntensity * u_smokeDensity;
      
      vec3 hazeNoiseP = vec3(vUv * u_noiseScale * 0.5, u_time * 2.0);
      float hazeMask = pow(noise3D(hazeNoiseP), 2.0) * hazeIntensity * u_smokeDensity * 0.5;

      vec3 smokeColor = vec3(0.15);
      vec3 hazeColor = vec3(0.3);

      finalColor = mix(finalColor, smokeColor, smokeMask);
      finalColor = mix(finalColor, hazeColor, hazeMask);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};
