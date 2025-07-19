import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';

const textureLoader = new THREE.TextureLoader();

export const createMaterials = () => {
    const sebakaDetailedMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('/maps/SebakaTexture.png'),
        specularMap: textureLoader.load('/maps/SebakaSpecularMap.png'),
        normalMap: textureLoader.load('/maps/SebakaNormalMap.png'),
        normalScale: new THREE.Vector2(0.1, 0.1),
        displacementMap: textureLoader.load('/maps/SebakaDisplacementMap.png'),
        aoMap: textureLoader.load('/maps/SebakaAmbientOcclusionMap.png'),
        displacementScale: 0.1,
    });
    
    const sebakaSimpleMaterial = new THREE.MeshPhongMaterial({ color: '#0096C8' });

    return { sebakaDetailedMaterial, sebakaSimpleMaterial };
}

export const createBodyMesh = (
    body: BodyData,
    sebakaDetailedMaterial: THREE.MeshPhongMaterial,
    viridisOriginalColorRef: React.MutableRefObject<THREE.Color>
): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(body.size, 64, 64);
    let material: THREE.Material;
    
    const materialOptions: THREE.MeshPhongMaterialParameters = { shininess: 10 };

    if (body.type === 'Star') {
        const starMaterialOptions: THREE.MeshPhongMaterialParameters = {
            emissive: body.color,
            emissiveIntensity: 2,
        };

        if (body.name === 'Alpha') {
            Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/goldenGiverTexture.jpg'),
                specularMap: textureLoader.load('/maps/goldenGiver_specular.png'),
                displacementMap: textureLoader.load('/maps/goldenGiver_displacement.png'),
                aoMap: textureLoader.load('/maps/goldenGiver_ambient.png'),
                emissiveIntensity: 1.2,
                displacementScale: 0.6,
            });
        } else if (body.name === 'Twilight') {
            Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/TwilightTexture.jpg'),
                specularMap: textureLoader.load('/maps/Twilight_specular.png'),
                normalMap: textureLoader.load('/maps/Twilight_normal.png'),
                displacementMap: textureLoader.load('/maps/Twilight_displacement.png'),
                aoMap: textureLoader.load('/maps/Twilight_ambient.png'),
                displacementScale: 0.2,
            });
        } else if (body.name === 'Beacon') {
             Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/BeaconTexture.png'),
                specularMap: textureLoader.load('/maps/Beacon_specular.png'),
                normalMap: textureLoader.load('/maps/Beacon_normal.png'),
                displacementMap: textureLoader.load('/maps/Beacon_displacement.png'),
                aoMap: textureLoader.load('/maps/Beacon_ambient.png'),
                emissiveIntensity: 10,
                displacementScale: 2.95,
             });
        }

        material = new THREE.MeshPhongMaterial(starMaterialOptions);
        
        const starMesh = new THREE.Mesh(geometry, material);
        starMesh.name = body.name;
        starMesh.castShadow = false;
        starMesh.receiveShadow = false;
        
        if(starMaterialOptions.normalMap) geometry.computeTangents();
        if(starMaterialOptions.aoMap) geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));

        return starMesh;

    } else { 
        const planetName = body.name;
        
        const textureParams: THREE.MeshPhongMaterialParameters = {};
        
        switch (planetName) {
            case 'Aetheris':
                textureParams.map = textureLoader.load('/maps/AetherisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/AetherisTexture_specular.png');
                textureParams.normalMap = textureLoader.load('/maps/AetherisTexture_normal.png');
                textureParams.normalScale = new THREE.Vector2(0.15, 0.15);
                break;
            case 'Gelidis':
                textureParams.map = textureLoader.load('/maps/GelidisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/GelidisTexture_specular.png');
                textureParams.normalMap = textureLoader.load('/maps/GelidisTexture_normal.png');
                textureParams.normalScale = new THREE.Vector2(0.03, 0.03);
                textureParams.displacementMap = textureLoader.load('/maps/GelidisTexture_displacement.png');
                textureParams.aoMap = textureLoader.load('/maps/GelidisTexture_ambient.png');
                textureParams.displacementScale = 20.1;
                break;
            case 'Rutilus':
                textureParams.map = textureLoader.load('/maps/RutiliusTexture.png');
                textureParams.normalMap = textureLoader.load('/maps/RutiliusTexture_normal.png');
                textureParams.displacementMap = textureLoader.load('/maps/RutiliusTexture_displacement.png');
                textureParams.aoMap = textureLoader.load('/maps/RutiliusTexture_ambient.png');
                textureParams.displacementScale = 0.1;
                break;
            case 'Spectris':
                textureParams.map = textureLoader.load('/maps/SpectrisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/SpectrisTexture_specular.png');
                textureParams.normalMap = textureLoader.load('/maps/SpectrisTexture_normal.png');
                textureParams.normalScale = new THREE.Vector2(0.1, 0.1);
                textureParams.displacementMap = textureLoader.load('/maps/SpectrisTexture_displacement.png');
                textureParams.aoMap = textureLoader.load('/maps/SpectrisTexture_ambient.png');
                textureParams.displacementScale = 0.05;
                break;
            case 'Viridis':
                textureParams.map = textureLoader.load('/maps/ViridisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/ViridisTexture_specular.png');
                textureParams.normalMap = textureLoader.load('/maps/ViridisTexture_normal.png');
                textureParams.normalScale = new THREE.Vector2(2, 2);
                textureParams.displacementMap = textureLoader.load('/maps/ViridisTexture_displacement.png');
                textureParams.aoMap = textureLoader.load('/maps/ViridisTexture_ambient.png');
                textureParams.displacementScale = 0.1;
                 if (body.color) {
                    viridisOriginalColorRef.current.set(body.color);
                }
                break;
            case 'Liminis':
                textureParams.map = textureLoader.load('/maps/LiminisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/LiminisSpecularMap.png');
                textureParams.normalMap = textureLoader.load('/maps/LiminisNormalMap.png');
                textureParams.displacementMap = textureLoader.load('/maps/LiminisDisplacementMap.png');
                textureParams.aoMap = textureLoader.load('/maps/LiminisAmbientOcclusionMap.png');
                textureParams.displacementScale = 0.1;
                break;
            case 'Sebaka':
                material = sebakaDetailedMaterial;
                break;
            default:
                materialOptions.color = body.color;
                material = new THREE.MeshPhongMaterial(materialOptions);
                break;
        }

        if (planetName !== 'Sebaka') {
            material = new THREE.MeshPhongMaterial({ ...materialOptions, ...textureParams });
        }

        if (textureParams.aoMap || (planetName === 'Sebaka')) {
            geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
        }
        if(textureParams.normalMap || (planetName === 'Sebaka')) {
            geometry.computeTangents();
        }
    }
    
    const mesh = new THREE.Mesh(geometry, material!);
    mesh.name = body.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (body.type === 'Planet' && body.name === "Spectris") {
        const ringInnerRadius = body.size * 1.5;
        const ringOuterRadius = body.size * 2.5;
        const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 128, 1);
        
        const ringMaterial = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            uniforms: {
                time: { value: 0 },
                viewVector: { value: new THREE.Vector3() },
            },
            vertexShader: `
              varying vec3 vNormal;
              varying vec3 vViewDir;
              varying vec2 vUv;
              void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewDir = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
              }
            `,
            fragmentShader: `
              uniform float time;
              varying vec3 vNormal;
              varying vec3 vViewDir;
              varying vec2 vUv;

              float fresnel(vec3 normal, vec3 viewDir) {
                return pow(1.0 - max(dot(normalize(normal), normalize(viewDir)), 0.0), 2.0);
              }

              float rand(vec2 co) {
                return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
              }

              float noise(vec2 uv) {
                vec2 i = floor(uv);
                vec2 f = fract(uv);
                float a = rand(i);
                float b = rand(i + vec2(1.0, 0.0));
                float c = rand(i + vec2(0.0, 1.0));
                float d = rand(i + vec2(1.0, 1.0));
                vec2 u = f*f*(3.0-2.0*f);
                return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
              }

              vec3 iridescentColor(float hue) {
                return vec3(
                  0.5 + 0.5 * cos(6.2831 * (hue + 0.0)),
                  0.5 + 0.5 * cos(6.2831 * (hue + 0.33)),
                  0.5 + 0.5 * cos(6.2831 * (hue + 0.66))
                );
              }

              void main() {
                vec2 uv = vUv * 50.0; // Scale UV space
                vec2 gridUV = floor(uv);           // Grid-based pseudo fragments

                float fragmentRand = rand(gridUV);
                float sparkle = noise(uv * 10.0 + time * 0.5); // Flicker

                float localFresnel = fresnel(vNormal + fragmentRand * 0.2, vViewDir);

                float hue = mod(fragmentRand + time * 0.05 + localFresnel * 0.8, 1.0);
                vec3 color = iridescentColor(hue);

                float alpha = localFresnel * 0.8 * sparkle;

                gl_FragColor = vec4(color, alpha);
              }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2 + 0.2;
        rings.receiveShadow = true;
        mesh.add(rings);
    }
    
    return mesh;
};
