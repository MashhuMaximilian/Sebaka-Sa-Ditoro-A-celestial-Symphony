
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';

const textureLoader = new THREE.TextureLoader();

const createStripedTexture = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.imageSmoothingEnabled = false;

    const colors = ['#ADD8E6', '#FFFFFF'];
    const stripeWidth = canvas.width / 16;

    for (let i = 0; i < 16; i++) {
        context.fillStyle = colors[i % 2];
        context.fillRect(i * stripeWidth, 0, stripeWidth, canvas.height);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    return texture;
};

export const createMaterials = () => {
    const sebakaSimpleTexture = createStripedTexture();
    const sebakaSimpleMaterial = new THREE.MeshStandardMaterial({ map: sebakaSimpleTexture });
    
    const sebakaDetailedMaterial = new THREE.MeshStandardMaterial({
        map: textureLoader.load('/maps/SebakaTexture.png'),
        specularMap: textureLoader.load('/maps/SebakaSpecularMap.png'),
        normalMap: textureLoader.load('/maps/SebakaNormalMap.png'),
        displacementMap: textureLoader.load('/maps/SebakaDisplacementMap.png'),
        aoMap: textureLoader.load('/maps/SebakaAmbientOcclusionMap.png'),
        displacementScale: 0.1,
    });

    return { sebakaDetailedMaterial, sebakaSimpleMaterial };
}

export const createBodyMesh = (
    body: BodyData,
    sebakaDetailedMaterial: THREE.MeshStandardMaterial,
    viridisOriginalColorRef: React.MutableRefObject<THREE.Color>
): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(body.size, 64, 64);
    let material: THREE.Material;
    const materialOptions: THREE.MeshStandardMaterialParameters = { roughness: 0.8, metalness: 0.1 };

    if (body.type === 'Star') {
        materialOptions.color = body.color;
        materialOptions.emissive = body.color;
        materialOptions.emissiveIntensity = 2;
        material = new THREE.MeshStandardMaterial(materialOptions);
    } else { 
        const planetName = body.name;
        
        let textureParams: THREE.MeshStandardMaterialParameters = {};
        
        switch (planetName) {
            case 'Aetheris':
                textureParams = {
                    map: textureLoader.load('/maps/AetherisTexture.png'),
                };
                break;
            case 'Gelidis':
                textureParams = {
                    map: textureLoader.load('/maps/GelidisTexture.png'),
                    normalMap: textureLoader.load('/maps/GelidisTexture_normal.png'),
                    displacementMap: textureLoader.load('/maps/GelidisTexture_displacement.png'),
                    displacementScale: 0.1,
                    aoMap: textureLoader.load('/maps/GelidisTexture_ambient.png'),
                };
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                break;
            case 'Rutilus':
                 textureParams = {
                    map: textureLoader.load('/maps/RutiliusTexture.png'),
                    normalMap: textureLoader.load('/maps/RutiliusTexture_normal.png'),
                    displacementMap: textureLoader.load('/maps/RutiliusTexture_displacement.png'),
                    aoMap: textureLoader.load('/maps/RutiliusTexture_ambient.png'),
                    displacementScale: 0.1,
                };
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                break;
            case 'Spectris':
                 textureParams = {
                    map: textureLoader.load('/maps/SpectrisTexture.png'),
                    normalMap: textureLoader.load('/maps/SpectrisTexture_normal.png'),
                    displacementMap: textureLoader.load('/maps/SpectrisTexture_displacement.png'),
                    aoMap: textureLoader.load('/maps/SpectrisTexture_ambient.png'),
                    displacementScale: 0.1,
                };
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                break;
            case 'Viridis':
                textureParams = {
                    map: textureLoader.load('/maps/ViridisTexture.png'),
                    aoMap: textureLoader.load('/maps/ViridisTexture_ambient.png'),
                    normalMap: textureLoader.load('/maps/ViridisTexture_normal.png'),
                    displacementMap: textureLoader.load('/maps/ViridisTexture_displacement.png'),
                    displacementScale: 0.1,
                };
                 if (body.color) {
                    viridisOriginalColorRef.current.set(body.color);
                }
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                break;
            case 'Liminis':
                textureParams = {
                    map: textureLoader.load('/maps/LiminisTexture.png'),
                    normalMap: textureLoader.load('/maps/LiminisNormalMap.png'),
                    displacementMap: textureLoader.load('/maps/LiminisDisplacementMap.png'),
                    aoMap: textureLoader.load('/maps/LiminisAmbientOcclusionMap.png'),
                    displacementScale: 0.1,
                };
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                break;
            case 'Sebaka':
                material = sebakaDetailedMaterial;
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                break;
            default:
                materialOptions.color = body.color;
                material = new THREE.MeshStandardMaterial(materialOptions);
                break;
        }

        if (!material) {
             material = new THREE.MeshStandardMaterial({ ...materialOptions, ...textureParams });
        }
    }
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = body.name;

    if (body.type === 'Planet' && body.name === "Spectris") {
      const ringGeometry = new THREE.RingGeometry(body.size * 1.5, body.size * 3, 64);
      const vertexShader = "varying vec3 vUv; void main() { vUv = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }";
      const fragmentShader = "varying vec3 vUv; vec3 hsv2rgb(vec3 c) { vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0); vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www); return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y); } void main() { float angle = atan(vUv.y, vUv.x); float hue = (angle + 3.14159) / (2.0 * 3.14159); gl_FragColor = vec4(hsv2rgb(vec3(hue, 0.7, 1.0)), 0.7); }";
      const ringMaterial = new THREE.ShaderMaterial({ vertexShader, fragmentShader, side: THREE.DoubleSide, transparent: true });
      const rings = new THREE.Mesh(ringGeometry, ringMaterial);
      rings.rotation.x = Math.PI / 2 + 0.2;
      mesh.add(rings);
    }
    
    return mesh;
};

