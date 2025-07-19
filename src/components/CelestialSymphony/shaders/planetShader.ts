
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
    alphaIntensity: { value: 1.8 },
    twilightIntensity: { value: 1.0 },
    beaconIntensity: { value: 25.0 },
    
    // Planet properties
    planetTexture: { value: null },
    gridTexture: { value: null },
    useGrid: { value: false },
    ambientLevel: { value: 0.02 },

    // Normal and displacement maps
    normalMap: { value: null },
    normalScale: { value: new THREE.Vector2(1, 1) },
    displacementMap: { value: null },
    displacementScale: { value: 1.0 },
  },
  
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying mat3 vTBN;

    uniform sampler2D displacementMap;
    uniform float displacementScale;

    in vec4 tangent;

    void main() {
      vUv = uv;
      vNormal = normalize( normalMatrix * normal );

      vec3 T = normalize( normalMatrix * tangent.xyz );
      vec3 B = cross( vNormal, T );
      vTBN = mat3( T, B, vNormal );
      
      // Apply displacement mapping
      vec3 displacedPosition = position;
      if (displacementScale > 0.0 && texture2D(displacementMap, uv).r > 0.0) {
        displacedPosition += normal * texture2D(displacementMap, uv).r * displacementScale;
      }

      vWorldPosition = (modelMatrix * vec4(displacedPosition, 1.0)).xyz;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
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
    
    uniform sampler2D planetTexture;
    uniform sampler2D gridTexture;
    uniform bool useGrid;

    uniform float ambientLevel;

    uniform sampler2D normalMap;
    uniform vec2 normalScale;
    
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying mat3 vTBN;
    
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
      if (texture2D(normalMap, vUv).r > 0.0) { // Check if normal map exists
          vec3 mapN = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
          mapN.xy *= normalScale;
          normal = normalize(vTBN * mapN);
      }

      // Calculate directions to each star
      vec3 alphaDir = normalize(alphaStarPos - vWorldPosition);
      vec3 twilightDir = normalize(twilightStarPos - vWorldPosition);
      vec3 beaconDir = normalize(beaconStarPos - vWorldPosition);
      
      // Calculate dot products (how much each star illuminates this surface)
      float alphaDot = max(dot(normal, alphaDir), 0.0);
      float twilightDot = max(dot(normal, twilightDir), 0.0);
      float beaconDot = max(dot(normal, beaconDir), 0.0);
      
      // Calculate distance attenuation (simplified)
      float alphaDist = length(alphaStarPos - vWorldPosition);
      float twilightDist = length(twilightStarPos - vWorldPosition);
      float beaconDist = length(beaconStarPos - vWorldPosition);
      
      float alphaAttenuation = 1.0 / (1.0 + alphaDist * alphaDist * 0.000005);
      float twilightAttenuation = 1.0 / (1.0 + twilightDist * twilightDist * 0.000005);
      float beaconAttenuation = 1.0 / (1.0 + beaconDist * beaconDist * 0.000005);
      
      // Combine illumination from all stars
      vec3 lighting = vec3(0.0);
      lighting += alphaColor * alphaDot * alphaIntensity * alphaAttenuation;
      lighting += twilightColor * twilightDot * twilightIntensity * twilightAttenuation;
      lighting += beaconColor * beaconDot * beaconIntensity * beaconAttenuation;
      
      // Add minimal ambient lighting
      lighting += vec3(ambientLevel);
      
      // Apply lighting to base color
      vec3 finalColor = baseColor * lighting;
      
      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
};
