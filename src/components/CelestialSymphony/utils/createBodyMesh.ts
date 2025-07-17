
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

    const colors = ['#A7C7E7', '#FFFFFF'];
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

const createRingTexture = () => {
    const canvas = document.createElement("canvas");
    const width = 256;
    const height = 1; // A 1px tall texture is sufficient and efficient for a gradient
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
  
    if (!context) return null;
  
    // Create a smooth, colorful gradient
    const gradient = context.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgba(255, 0, 0, 0.7)");
    gradient.addColorStop(1 / 6, "rgba(255, 165, 0, 0.7)");
    gradient.addColorStop(2 / 6, "rgba(255, 255, 0, 0.7)");
    gradient.addColorStop(3 / 6, "rgba(0, 255, 0, 0.7)");
    gradient.addColorStop(4 / 6, "rgba(0, 0, 255, 0.7)");
    gradient.addColorStop(5 / 6, "rgba(75, 0, 130, 0.7)");
    gradient.addColorStop(1, "rgba(238, 130, 238, 0.7)");
  
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    // High tiling factor for a detailed, non-stretched look
    texture.repeat.set(16, 1); 
    // Default filtering (LinearFilter) will create a smooth look
    return texture;
  };

export const createMaterials = () => {
    const sebakaSimpleTexture = createStripedTexture();
    const sebakaSimpleMaterial = new THREE.MeshStandardMaterial({ map: sebakaSimpleTexture });
    
    const sebakaDetailedMaterial = new THREE.MeshStandardMaterial({
        map: textureLoader.load('/maps/SebakaTexture.png'),
        specularMap: textureLoader.load('/maps/SebakaSpecularMap.png'),
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
        const starMaterialOptions: THREE.MeshStandardMaterialParameters = {
            emissive: body.color,
        };

        if (body.name === 'Alpha') {
            Object.assign(starMaterialOptions, {
                emissiveIntensity: 1.2,
                map: textureLoader.load('/maps/goldenGiverTexture.jpg'),
                normalMap: textureLoader.load('/maps/goldenGiver_normal.png'),
                displacementMap: textureLoader.load('/maps/goldenGiver_displacement.png'),
                aoMap: textureLoader.load('/maps/goldenGiver_ambient.png'),
                specularMap: textureLoader.load('/maps/goldenGiver_specular.png'),
                displacementScale: 0.6,
            });
            geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
            geometry.computeTangents();
        } else if (body.name === 'Twilight') {
            Object.assign(starMaterialOptions, {
                emissiveIntensity: 2,
                map: textureLoader.load('/maps/TwilightTexture.jpg'),
                normalMap: textureLoader.load('/maps/Twilight_normal.png'),
                displacementMap: textureLoader.load('/maps/Twilight_displacement.png'),
                aoMap: textureLoader.load('/maps/Twilight_ambient.png'),
                specularMap: textureLoader.load('/maps/Twilight_specular.png'),
                displacementScale: 0.2,
            });
            geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
            geometry.computeTangents();
        } else if (body.name === 'Beacon') {
             Object.assign(starMaterialOptions, {
                emissiveIntensity: 10,
                map: textureLoader.load('/maps/BeaconTexture.png'),
                normalMap: textureLoader.load('/maps/Beacon_normal.png'),
                displacementMap: textureLoader.load('/maps/Beacon_displacement.png'),
                aoMap: textureLoader.load('/maps/Beacon_ambient.png'),
                specularMap: textureLoader.load('/maps/Beacon_specular.png'),
                displacementScale: 2.95,
             });
             geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
             geometry.computeTangents();
        }

        material = new THREE.MeshStandardMaterial(starMaterialOptions);
        
        const starMesh = new THREE.Mesh(geometry, material);
        starMesh.name = body.name;
        starMesh.castShadow = false;
        starMesh.receiveShadow = false;
        return starMesh;

    } else { 
        const planetName = body.name;
        
        const textureParams: THREE.MeshStandardMaterialParameters = {};
        
        switch (planetName) {
            case 'Aetheris':
                textureParams.map = textureLoader.load('/maps/AetherisTexture.png');
                break;
            case 'Gelidis':
                textureParams.map = textureLoader.load('/maps/GelidisTexture.png');
                textureParams.displacementMap = textureLoader.load('/maps/GelidisTexture_displacement.png');
                textureParams.aoMap = textureLoader.load('/maps/GelidisTexture_ambient.png');
                textureParams.displacementScale = 0.1;
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                break;
            case 'Rutilus':
                textureParams.map = textureLoader.load('/maps/RutiliusTexture.png');
                textureParams.normalMap = textureLoader.load('/maps/RutiliusTexture_normal.png');
                textureParams.displacementMap = textureLoader.load('/maps/RutiliusTexture_displacement.png');
                textureParams.aoMap = textureLoader.load('/maps/RutiliusTexture_ambient.png');
                textureParams.displacementScale = 0.1;
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                geometry.computeTangents();
                break;
            case 'Spectris':
                textureParams.map = textureLoader.load('/maps/SpectrisTexture.png');
                textureParams.displacementMap = textureLoader.load('/maps/SpectrisTexture_displacement.png');
                textureParams.aoMap = textureLoader.load('/maps/SpectrisTexture_ambient.png');
                textureParams.displacementScale = 0.1;
                textureParams.metalness = 0.5;
                textureParams.roughness = 0.5;
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                break;
            case 'Viridis':
                textureParams.map = textureLoader.load('/maps/ViridisTexture.png');
                textureParams.aoMap = textureLoader.load('/maps/ViridisTexture_ambient.png');
                textureParams.normalMap = textureLoader.load('/maps/ViridisTexture_normal.png');
                textureParams.displacementMap = textureLoader.load('/maps/ViridisTexture_displacement.png');
                textureParams.displacementScale = 0.1;
                 if (body.color) {
                    viridisOriginalColorRef.current.set(body.color);
                }
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                geometry.computeTangents();
                break;
            case 'Liminis':
                textureParams.map = textureLoader.load('/maps/LiminisTexture.png');
                textureParams.normalMap = textureLoader.load('/maps/LiminisNormalMap.png');
                textureParams.displacementMap = textureLoader.load('/maps/LiminisDisplacementMap.png');
                textureParams.aoMap = textureLoader.load('/maps/LiminisAmbientOcclusionMap.png');
                textureParams.displacementScale = 0.1;
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                geometry.computeTangents();
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

        if (planetName !== 'Sebaka') {
            material = new THREE.MeshStandardMaterial({ ...materialOptions, ...textureParams });
        }
    }
    
    const mesh = new THREE.Mesh(geometry, material!);
    mesh.name = body.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (body.type === 'Planet' && body.name === "Spectris") {
        const ringGeometry = new THREE.RingGeometry(body.size * 1.5, body.size * 3, 64);
        const ringTexture = createRingTexture();
        const ringMaterial = new THREE.MeshBasicMaterial({
            map: ringTexture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
        });
        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2 + 0.2;
        rings.receiveShadow = true;
        mesh.add(rings);
      }
    
    return mesh;
};
