
import * as THREE from 'three';

export const planetShader = {
  uniforms: {
    // Star positions and colors
    alphaStarPos: { value: new THREE.Vector3() },
    twilightStarPos: { value: new THREE.Vector3() },
    alphaColor: { value: new THREE.Color(0xfff8e7) },
    twilightColor: { value: new THREE.Color(0xfff0d4) },
    alphaIntensity: { value: 1.8 },
    twilightIntensity: { value: 1.0 },
    
    // Planet properties
    planetTexture: { value: null },
    ambientLevel: { value: 0.02 }
  },
  
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform vec3 alphaStarPos;
    uniform vec3 twilightStarPos;
    uniform vec3 alphaColor;
    uniform vec3 twilightColor;
    uniform float alphaIntensity;
    uniform float twilightIntensity;
    uniform sampler2D planetTexture;
    uniform float ambientLevel;
    
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    void main() {
      // Get base texture color
      vec4 texColor = texture2D(planetTexture, vUv);
      vec3 baseColor = texColor.rgb;
      
      // Calculate directions to each star
      vec3 alphaDir = normalize(alphaStarPos - vWorldPosition);
      vec3 twilightDir = normalize(twilightStarPos - vWorldPosition);
      
      // Calculate dot products (how much each star illuminates this surface)
      float alphaDot = max(dot(vNormal, alphaDir), 0.0);
      float twilightDot = max(dot(vNormal, twilightDir), 0.0);
      
      // Calculate distance attenuation (simplified)
      float alphaDist = length(alphaStarPos - vWorldPosition);
      float twilightDist = length(twilightStarPos - vWorldPosition);
      float alphaAttenuation = 1.0 / (1.0 + alphaDist * alphaDist * 0.000005);
      float twilightAttenuation = 1.0 / (1.0 + twilightDist * twilightDist * 0.000005);
      
      // Combine illumination from both stars
      vec3 lighting = vec3(0.0);
      lighting += alphaColor * alphaDot * alphaIntensity * alphaAttenuation;
      lighting += twilightColor * twilightDot * twilightIntensity * twilightAttenuation;
      
      // Add minimal ambient lighting
      lighting += vec3(ambientLevel);
      
      // Apply lighting to base color
      vec3 finalColor = baseColor * lighting;
      
      gl_FragColor = vec4(finalColor, texColor.a);
    }
  `
};
