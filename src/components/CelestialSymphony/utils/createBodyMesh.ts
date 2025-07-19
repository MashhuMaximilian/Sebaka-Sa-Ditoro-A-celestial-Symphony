
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';
import { MaterialProperties } from '@/types';
import { ThinFilmFresnelMap } from './ThinFilmFresnelMap';

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
            });
            if (bodyProps?.displacementScale > 0) {
                 starMaterialOptions.displacementMap = textureLoader.load('/maps/goldenGiver_displacement.png');
                 starMaterialOptions.displacementScale = bodyProps.displacementScale;
            }
        } else if (body.name === 'Twilight') {
            Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/TwilightTexture.jpg'),
                specularMap: textureLoader.load('/maps/Twilight_specular.png'),
            });
            if (bodyProps?.normalScale > 0) {
                starMaterialOptions.normalMap = textureLoader.load('/maps/Twilight_normal.png');
                starMaterialOptions.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
            }
            if (bodyProps?.displacementScale > 0) {
                starMaterialOptions.displacementMap = textureLoader.load('/maps/Twilight_displacement.png');
                starMaterialOptions.displacementScale = bodyProps.displacementScale;
            }
        } else if (body.name === 'Beacon') {
             Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/BeaconTexture.png'),
                specularMap: textureLoader.load('/maps/Beacon_specular.png'),
             });
             if (bodyProps?.normalScale > 0) {
                starMaterialOptions.normalMap = textureLoader.load('/maps/Beacon_normal.png');
                starMaterialOptions.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
             }
             if (bodyProps?.displacementScale > 0) {
                starMaterialOptions.displacementMap = textureLoader.load('/maps/Beacon_displacement.png');
                starMaterialOptions.displacementScale = bodyProps.displacementScale;
             }
        }
        
        material = new THREE.MeshPhongMaterial(starMaterialOptions);

    } else { 
        const planetName = body.name;
        const textureParams: THREE.MeshPhongMaterialParameters = {
            shininess: bodyProps.shininess
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
        if (textureParams.normalMap || textureParams.displacementMap || bodyProps.aoMapIntensity > 0) {
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
        
        const iridescenceMap = new ThinFilmFresnelMap(
            550,  // film thickness (nm)
            1.33, // film IOR
            1.0,  // substrate IOR
            512   // lookup resolution
        );
        
        const ringMaterial = new THREE.ShaderMaterial({
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                time: { value: 0 },
                viewVector: { value: new THREE.Vector3() },
                ringCount: { value: 80.0 }, // number of bands
                iridescenceMap: { value: iridescenceMap.texture }
            },
            vertexShader: `
                varying vec3 vNormal, vViewDir;
                varying vec2 vUv;
                void main(){
                    vUv = uv;
                    vNormal = normalize(normalMatrix * normal);
                    vec4 mv = modelViewMatrix * vec4(position,1.);
                    vViewDir = -mv.xyz;
                    gl_Position = projectionMatrix * mv;
                }
            `,
            fragmentShader: `
                uniform float time, ringCount;
                uniform sampler2D iridescenceMap;
                varying vec3 vNormal, vViewDir;
                varying vec2 vUv;

                float rand(float x){ return fract(sin(x*91.17)*43758.545); }

                void main(){
                  float dist = length(vUv - 0.5) * 2.0;

                  float idx = floor(dist*ringCount);
                  float seed = rand(idx);
                  float width = 0.005 + 0.03 * rand(idx*1.37);
                  float line = fract(dist*ringCount);
                  float mask = smoothstep(0.5-width, 0.5, 1.-abs(line-0.5));

                  vec3 N = normalize(vNormal);
                  vec3 V = normalize(vViewDir);
                  float NdotV = max(dot(N, V), 0.);
                  
                  vec3 filmCol = texture2D(iridescenceMap, vec2(NdotV, 0.)).rgb;
                  filmCol *= filmCol;

                  float fres = pow(1.-NdotV, 3.);

                  gl_FragColor = vec4(filmCol, mask * fres * 0.6);
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

