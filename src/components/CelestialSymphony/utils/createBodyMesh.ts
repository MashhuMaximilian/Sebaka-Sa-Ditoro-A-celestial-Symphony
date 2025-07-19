
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';
import { MaterialProperties } from '@/types';

const textureLoader = new THREE.TextureLoader();

export const createMaterials = () => {
    const sebakaDetailedMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('/maps/SebakaTexture.png'),
        specularMap: textureLoader.load('/maps/SebakaSpecularMap.png'),
        normalMap: textureLoader.load('/maps/SebakaNormalMap.png'),
        displacementMap: textureLoader.load('/maps/SebakaDisplacementMap.png'),
        aoMap: textureLoader.load('/maps/SebakaAmbientOcclusionMap.png'),
    });
    
    const sebakaSimpleMaterial = new THREE.MeshPhongMaterial({ color: '#0096C8' });

    return { sebakaDetailedMaterial, sebakaSimpleMaterial };
}

export const createBodyMesh = (
    body: BodyData,
    sebakaDetailedMaterial: THREE.MeshPhongMaterial,
    viridisOriginalColorRef: React.MutableRefObject<THREE.Color>,
    materialProperties: MaterialProperties,
): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(body.size, 64, 64);
    let material: THREE.Material;
    
    const bodyProps = materialProperties[body.name];
    const materialOptions: THREE.MeshPhongMaterialParameters = { shininess: bodyProps?.shininess || 10 };

    if (body.type === 'Star') {
        const starMaterialOptions: THREE.MeshPhongMaterialParameters = {
            emissive: body.color,
            emissiveIntensity: bodyProps?.emissiveIntensity || 1,
            ...materialOptions,
        };

        if (body.name === 'Alpha') {
            Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/goldenGiverTexture.jpg'),
                specularMap: textureLoader.load('/maps/goldenGiver_specular.png'),
                displacementMap: bodyProps?.displacementScale > 0 ? textureLoader.load('/maps/goldenGiver_displacement.png') : undefined,
                aoMap: bodyProps?.aoMapIntensity > 0 ? textureLoader.load('/maps/goldenGiver_ambient.png') : undefined,
                displacementScale: bodyProps?.displacementScale,
                aoMapIntensity: bodyProps?.aoMapIntensity,
            });
        } else if (body.name === 'Twilight') {
            Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/TwilightTexture.jpg'),
                specularMap: textureLoader.load('/maps/Twilight_specular.png'),
                normalMap: bodyProps?.normalScale > 0 ? textureLoader.load('/maps/Twilight_normal.png') : undefined,
                displacementMap: bodyProps?.displacementScale > 0 ? textureLoader.load('/maps/Twilight_displacement.png') : undefined,
                aoMap: bodyProps?.aoMapIntensity > 0 ? textureLoader.load('/maps/Twilight_ambient.png') : undefined,
                normalScale: new THREE.Vector2(bodyProps?.normalScale, bodyProps?.normalScale),
                displacementScale: bodyProps?.displacementScale,
                aoMapIntensity: bodyProps?.aoMapIntensity,
            });
        } else if (body.name === 'Beacon') {
             Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/BeaconTexture.png'),
                specularMap: textureLoader.load('/maps/Beacon_specular.png'),
                normalMap: bodyProps?.normalScale > 0 ? textureLoader.load('/maps/Beacon_normal.png') : undefined,
                displacementMap: bodyProps?.displacementScale > 0 ? textureLoader.load('/maps/Beacon_displacement.png') : undefined,
                aoMap: bodyProps?.aoMapIntensity > 0 ? textureLoader.load('/maps/Beacon_ambient.png') : undefined,
                normalScale: new THREE.Vector2(bodyProps?.normalScale, bodyProps?.normalScale),
                displacementScale: bodyProps?.displacementScale,
                aoMapIntensity: bodyProps?.aoMapIntensity,
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
        const textureParams: THREE.MeshPhongMaterialParameters = {
            shininess: bodyProps.shininess,
            aoMapIntensity: bodyProps.aoMapIntensity
        };
        
        switch (planetName) {
            case 'Aetheris':
                textureParams.map = textureLoader.load('/maps/AetherisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/AetherisTexture_specular.png');
                if (bodyProps?.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/AetherisTexture_normal.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                break;
            case 'Gelidis':
                textureParams.map = textureLoader.load('/maps/GelidisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/GelidisTexture_specular.png');
                if (bodyProps?.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/GelidisTexture_normal.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps?.displacementScale > 0) {
                    textureParams.displacementMap = textureLoader.load('/maps/GelidisTexture_displacement.png');
                    textureParams.displacementScale = bodyProps.displacementScale;
                }
                if (bodyProps?.aoMapIntensity > 0) {
                    textureParams.aoMap = textureLoader.load('/maps/GelidisTexture_ambient.png');
                }
                break;
            case 'Rutilus':
                textureParams.map = textureLoader.load('/maps/RutiliusTexture.png');
                if (bodyProps?.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/RutiliusTexture_normal.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps?.displacementScale > 0) {
                    textureParams.displacementMap = textureLoader.load('/maps/RutiliusTexture_displacement.png');
                    textureParams.displacementScale = bodyProps.displacementScale;
                }
                if (bodyProps?.aoMapIntensity > 0) {
                    textureParams.aoMap = textureLoader.load('/maps/RutiliusTexture_ambient.png');
                }
                break;
            case 'Spectris':
                textureParams.map = textureLoader.load('/maps/SpectrisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/SpectrisTexture_specular.png');
                if (bodyProps?.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/SpectrisTexture_normal.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps?.displacementScale > 0) {
                    textureParams.displacementMap = textureLoader.load('/maps/SpectrisTexture_displacement.png');
                    textureParams.displacementScale = bodyProps.displacementScale;
                }
                if (bodyProps?.aoMapIntensity > 0) {
                    textureParams.aoMap = textureLoader.load('/maps/SpectrisTexture_ambient.png');
                }
                break;
            case 'Viridis':
                textureParams.map = textureLoader.load('/maps/ViridisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/ViridisTexture_specular.png');
                 if (bodyProps?.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/ViridisTexture_normal.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps?.displacementScale > 0) {
                    textureParams.displacementMap = textureLoader.load('/maps/ViridisTexture_displacement.png');
                    textureParams.displacementScale = bodyProps.displacementScale;
                }
                if (bodyProps?.aoMapIntensity > 0) {
                    textureParams.aoMap = textureLoader.load('/maps/ViridisTexture_ambient.png');
                }
                if (body.color) {
                    viridisOriginalColorRef.current.set(body.color);
                }
                break;
            case 'Liminis':
                textureParams.map = textureLoader.load('/maps/LiminisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/LiminisSpecularMap.png');
                if (bodyProps?.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/LiminisNormalMap.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps?.displacementScale > 0) {
                    textureParams.displacementMap = textureLoader.load('/maps/LiminisDisplacementMap.png');
                    textureParams.displacementScale = bodyProps.displacementScale;
                }
                if (bodyProps?.aoMapIntensity > 0) {
                    textureParams.aoMap = textureLoader.load('/maps/LiminisAmbientOcclusionMap.png');
                }
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

        if (textureParams.aoMap || (planetName === 'Sebaka' && bodyProps?.aoMapIntensity > 0)) {
            geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
        }
        if(textureParams.normalMap || (planetName === 'Sebaka' && bodyProps?.normalScale > 0)) {
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
        const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 256, 1);
        
        const ringMaterial = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                time: { value: 0 },
                viewVector: { value: new THREE.Vector3() },
                ringCount: { value: 100.0 }
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
                uniform float ringCount;
                varying vec3 vNormal;
                varying vec3 vViewDir;
                varying vec2 vUv;

                float fresnel(vec3 normal, vec3 viewDir) {
                    return pow(1.0 - max(dot(normalize(normal), normalize(viewDir)), 0.0), 3.0);
                }

                float rand(float x) {
                    return fract(sin(x * 91.17) * 43758.5453123);
                }

                vec3 spectralColor(float hue) {
                    // Custom spectral theme: icy tones only
                    hue = mod(hue, 1.0);
                    float h = hue * 4.0;
                    if (h < 1.0) return mix(vec3(0.5,0.7,1.0), vec3(0.7,0.9,1.0), h);
                    else if (h < 2.0) return mix(vec3(0.7,0.9,1.0), vec3(0.9,1.0,0.9), h - 1.0);
                    else if (h < 3.0) return mix(vec3(0.9,1.0,0.9), vec3(0.7,0.8,1.0), h - 2.0);
                    else return mix(vec3(0.7,0.8,1.0), vec3(0.5,0.7,1.0), h - 3.0);
                }

                void main() {
                    // Ring segmentation
                    float ringIndex = floor(vUv.x * ringCount);
                    float ringSeed = rand(ringIndex);
                    float ringHue = mod(ringSeed + time * 0.05, 1.0);
                    float ringAlpha = smoothstep(0.2, 1.0, fract(ringSeed * 5.0)) * 0.8;

                    // Ring thickness
                    float ringLine = fract(vUv.x * ringCount);
                    float ringWidth = 0.03 + 0.1 * rand(ringIndex * 2.37);
                    float mask = smoothstep(0.5 - ringWidth, 0.5, 1.0 - abs(ringLine - 0.5));

                    float fres = fresnel(vNormal, vViewDir);
                    vec3 color = spectralColor(ringHue);

                    gl_FragColor = vec4(color, ringAlpha * mask * fres);
                }
            `
        });

        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2 + 0.2;
        rings.receiveShadow = true;
        mesh.add(rings);
    }
    
    return mesh;
};
