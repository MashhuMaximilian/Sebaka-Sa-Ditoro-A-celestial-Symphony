
import * as THREE from 'three';

export const planetShader = {
  uniforms: {
    // Star positions and colors
    alphaStarPos: { value: new THREE.Vector3() },
    twilightStarPos: { value: new THREE.Vector3() },
    beaconStarPos: { value: new THREE.Vector3() },
    alphaColor: { value: new THREE.Color(0xfff8e7) },
    twilightColor: { value: new THREE.Color(0xfff0d4) },
    beaconColor: { value: new THREE.Color(0xaaccff) },
    alphaIntensity: { value: 1.0 },
    twilightIntensity: { value: 0.7 },
    beaconIntensity: { value: 500.0 },
    emissiveIntensity: { value: 0.0 },
    
    // Planet properties
    albedo: { value: 1.0 },
    planetTexture: { value: null as THREE.Texture | null },
    gridTexture: { value: null as THREE.CanvasTexture | null },
    useGrid: { value: false },
    ambientLevel: { value: 0.02 },
    isBeaconPlanet: { value: false },

    // Normal and displacement maps
    useNormalMap: { value: false },
    normalMap: { value: null as THREE.Texture | null },
    normalScale: { value: new THREE.Vector2(1, 1) },
    useDisplacementMap: { value: false },
    displacementMap: { value: null as THREE.Texture | null },
    displacementScale: { value: 1.0 },
    
    // Specular and AO maps
    useSpecularMap: { value: false },
    specularMap: { value: null as THREE.Texture | null },
    specularIntensity: { value: 1.0 },
    shininess: { value: 30.0 },

    useAoMap: { value: false },
    aoMap: { value: null as THREE.Texture | null },
    aoMapIntensity: { value: 1.0 },
  },
  
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying mat3 vTBN;

    uniform bool useDisplacementMap;
    uniform sampler2D displacementMap;
    uniform float displacementScale;

    in vec4 tangent;

    void main() {
      vUv = uv;
      
      // Calculate TBN matrix in world space for normal mapping
      vec3 T = normalize( mat3(modelMatrix) * tangent.xyz );
      vec3 N = normalize( mat3(modelMatrix) * normal );
      vec3 B = cross( N, T );
      vTBN = mat3( T, B, N );
      
      // Apply displacement mapping
      vec3 displacedPosition = position;
      if (useDisplacementMap) {
        displacedPosition += normal * texture2D(displacementMap, uv).r * displacementScale;
      }

      // Calculate world position
      vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;
      
      vNormal = N;

      gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPosition, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform vec3 alphaStarPos;
    uniform vec3 twilightStarPos;
    uniform vec3 beaconStarPos;
    uniform vec3 alphaColor;
    uniform vec3 twilightColor;
    uniform vec3 beaconColor;
    uniform float alphaIntensity;
    uniform float twilightIntensity;
    uniform float beaconIntensity;
    uniform float emissiveIntensity;
    
    uniform float albedo;
    uniform sampler2D planetTexture;
    uniform sampler2D gridTexture;
    uniform bool useGrid;

    uniform float ambientLevel;
    uniform bool isBeaconPlanet;

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
    
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying mat3 vTBN;
    
    // Function to calculate lighting and specular contribution from a single star
    vec3 getStarContribution(vec3 starPos, vec3 starColor, float starIntensity, vec3 normal, vec3 viewDir, bool skipAttenuation) {
        vec3 lightDir = normalize(starPos - vWorldPosition);
        
        float attenuation = 1.0;
        if (!skipAttenuation) {
            float dist = length(starPos - vWorldPosition);
            attenuation = 1.0 / (1.0 + dist * dist * 0.000005);
        }
        
        // Diffuse
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = starColor * diff * starIntensity;
        
        // Specular
        vec3 specular = vec3(0.0);
        if (useSpecularMap) {
            vec3 halfwayDir = normalize(lightDir + viewDir);
            float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
            float specularMask = texture2D(specularMap, vUv).r;
            specular = starColor * spec * specularIntensity * specularMask;
        }
        
        return (diffuse * albedo + specular) * attenuation;
    }

    void main() {
      // Get base texture color
      vec4 texColor = texture2D(planetTexture, vUv);
      vec3 baseColor = texColor.rgb;

      if (useGrid) {
        vec4 gridColor = texture2D(gridTexture, vUv);
        baseColor = mix(baseColor, gridColor.rgb, gridColor.a); // Blend grid over texture
      }
      
      // Get normal from normal map
      vec3 normal = normalize(vNormal);
      if (useNormalMap) {
          vec3 mapN = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
          mapN.xy *= normalScale;
          normal = normalize(vTBN * mapN);
      }
      
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      
      // Combine illumination from all stars
      vec3 lighting = vec3(0.0);
      lighting += getStarContribution(alphaStarPos, alphaColor, alphaIntensity, normal, viewDir, false);
      lighting += getStarContribution(twilightStarPos, twilightColor, twilightIntensity, normal, viewDir, false);
      lighting += getStarContribution(beaconStarPos, beaconColor, beaconIntensity, normal, viewDir, isBeaconPlanet);
      
      // Ambient Occlusion
      float ao = 1.0;
      if (useAoMap) {
        ao = texture2D(aoMap, vUv).r;
        ao = mix(1.0, ao, aoMapIntensity);
      }

      vec3 emissive = baseColor * emissiveIntensity;
      
      // Add minimal ambient lighting, affected by AO
      vec3 ambient = vec3(ambientLevel) * albedo * ao;

      vec3 finalColor = baseColor * lighting + ambient + emissive;
      finalColor *= ao;

      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
};
