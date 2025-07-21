
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


export const spiderStrandShader = {
  uniforms: {
    // Iridescence & Time
    time: { value: 0 },
    iridescenceStrength: { value: 0.5 },
    opacity: { value: 0.85 },
    colors: { value: iridescentPalette },
    numColors: { value: iridescentPalette.length },
    baseColor: { value: new THREE.Color(0xffffff) },
    
    // Lighting
    alphaStarPos: { value: new THREE.Vector3() },
    twilightStarPos: { value: new THREE.Vector3() },
    beaconStarPos: { value: new THREE.Vector3() },
    alphaColor: { value: new THREE.Color(0xfff8e7) },
    twilightColor: { value: new THREE.Color(0xfff0d4) },
    beaconColor: { value: new THREE.Color(0xaaccff) },
    alphaIntensity: { value: 1.8 },
    twilightIntensity: { value: 1.0 },
    beaconIntensity: { value: 25.0 },
    
    // Material Properties
    shininess: { value: 40.0 },
    specularIntensity: { value: 0.8 },
    ambientLevel: { value: 0.05 },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    void main() {
      // Transform normal to world space
      vWorldNormal = normalize( normalMatrix * normal );
      // Transform vertex position to world space
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    // Iridescence
    uniform float time;
    uniform float iridescenceStrength;
    uniform float opacity;
    uniform vec3 colors[10]; 
    uniform int numColors;
    uniform vec3 baseColor;
    
    // Lighting
    uniform vec3 alphaStarPos;
    uniform vec3 twilightStarPos;
    uniform vec3 beaconStarPos;
    uniform vec3 alphaColor;
    uniform vec3 twilightColor;
    uniform vec3 beaconColor;
    uniform float alphaIntensity;
    uniform float twilightIntensity;
    uniform float beaconIntensity;

    // Material Properties
    uniform float shininess;
    uniform float specularIntensity;
    uniform float ambientLevel;

    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;

    vec3 calculateLight(vec3 lightPos, vec3 lightColor, float lightIntensity, vec3 normal, vec3 viewDir) {
        vec3 lightDir = normalize(lightPos - vWorldPosition);
        
        // Attenuation
        float dist = length(lightPos - vWorldPosition);
        float attenuation = 1.0 / (1.0 + dist * dist * 0.000005);

        // Diffuse
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = diff * lightColor;

        // Specular (Blinn-Phong)
        vec3 halfwayDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
        vec3 specular = specularIntensity * spec * lightColor;

        return (diffuse + specular) * lightIntensity * attenuation;
    }
    
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 normal = normalize(vWorldNormal);
      float fresnel = pow(1.0 - max(0.0, dot(normal, viewDir)), 5.0);
      
      // Iridescence color calculation based on world position for a smooth gradient
      float colorIndexFloat = mod((vWorldPosition.x + vWorldPosition.y) * 0.01 + time * 0.5, float(numColors));
      int colorIndex1 = int(colorIndexFloat);
      int colorIndex2 = (colorIndex1 + 1) % numColors;
      vec3 color1 = colors[colorIndex1];
      vec3 color2 = colors[colorIndex2];
      vec3 iridescentColor = mix(color1, color2, fract(colorIndexFloat));
      
      // Calculate lighting from all three suns
      vec3 totalLight = vec3(0.0);
      totalLight += calculateLight(alphaStarPos, alphaColor, alphaIntensity, normal, viewDir);
      totalLight += calculateLight(twilightStarPos, twilightColor, twilightIntensity, normal, viewDir);
      totalLight += calculateLight(beaconStarPos, beaconColor, beaconIntensity, normal, viewDir);
      totalLight += vec3(ambientLevel);

      // Combine base color, lighting, and iridescence
      vec3 litBaseColor = baseColor * totalLight;
      vec3 finalColor = mix(litBaseColor, iridescentColor, fresnel * iridescenceStrength);

      float finalAlpha = opacity * (0.35 + fresnel * 0.65);

      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `,
};
