
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
    
    // Fallback material, not really used now but good to have
    const sebakaSimpleMaterial = new THREE.MeshPhongMaterial({ color: '#0096C8' });

    return { sebakaDetailedMaterial, sebakaSimpleMaterial };
}

export const createBodyMesh = (
    body: BodyData,
    sebakaDetailedMaterial: THREE.MeshPhongMaterial,
    viridisOriginalColorRef: React.MutableRefObject<THREE.Color>
): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(body.size, 64, 64)
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
            geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
        } else if (body.name === 'Twilight') {
            Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/TwilightTexture.jpg'),
                specularMap: textureLoader.load('/maps/Twilight_specular.png'),
                normalMap: textureLoader.load('/maps/Twilight_normal.png'),
                displacementMap: textureLoader.load('/maps/Twilight_displacement.png'),
                aoMap: textureLoader.load('/maps/Twilight_ambient.png'),
                displacementScale: 0.2,
            });
            geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
            geometry.computeTangents();
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
             geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
             geometry.computeTangents();
        }

        material = new THREE.MeshPhongMaterial(starMaterialOptions);
        
        const starMesh = new THREE.Mesh(geometry, material);
        starMesh.name = body.name;
        starMesh.castShadow = false;
        starMesh.receiveShadow = false;
        return starMesh;

    } else { 
        const planetName = body.name;
        
        const textureParams: THREE.MeshPhongMaterialParameters = {};
        
        switch (planetName) {
            case 'Aetheris':
                textureParams.map = textureLoader.load('/maps/AetherisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/AetherisTexture_specular.png');
                break;
            case 'Gelidis':
                textureParams.map = textureLoader.load('/maps/GelidisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/GelidisTexture_specular.png');
                textureParams.normalMap = textureLoader.load('/maps/GelidisTexture_normal.png');
                textureParams.normalScale = new THREE.Vector2(0.1, 0.1);
                textureParams.displacementMap = textureLoader.load('/maps/GelidisTexture_displacement.png');
                textureParams.aoMap = textureLoader.load('/maps/GelidisTexture_ambient.png');
                textureParams.displacementScale = 0.1;
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                geometry.computeTangents();
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
                textureParams.specularMap = textureLoader.load('/maps/SpectrisTexture_specular.png');
                textureParams.normalMap = textureLoader.load('/maps/SpectrisTexture_normal.png');
                textureParams.normalScale = new THREE.Vector2(0.1, 0.1);
                textureParams.displacementMap = textureLoader.load('/maps/SpectrisTexture_displacement.png');
                textureParams.aoMap = textureLoader.load('/maps/SpectrisTexture_ambient.png');
                textureParams.displacementScale = 0.1;
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                geometry.computeTangents();
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
                geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
                geometry.computeTangents();
                break;
            case 'Liminis':
                textureParams.map = textureLoader.load('/maps/LiminisTexture.png');
                textureParams.specularMap = textureLoader.load('/maps/LiminisSpecularMap.png');
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
                geometry.computeTangents();
                break;
            default:
                materialOptions.color = body.color;
                material = new THREE.MeshPhongMaterial(materialOptions);
                break;
        }

        if (planetName !== 'Sebaka') {
            material = new THREE.MeshPhongMaterial({ ...materialOptions, ...textureParams });
        }
    }
    
    const mesh = new THREE.Mesh(geometry, material!);
    mesh.name = body.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (body.type === 'Planet' && body.name === "Spectris") {
        const ringInnerRadius = body.size * 1.5;
        const ringOuterRadius = body.size * 2.5;
        const ringGeometry = new THREE.RingGeometry(ringInnerRadius, ringOuterRadius, 64);
        
        const ringMaterial = new THREE.MeshPhongMaterial({
            color: 0xaaaaaa,
            specular: 0xffffff,
            shininess: 100,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7,
        });

        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = Math.PI / 2 + 0.2; // Tilt the rings
        rings.receiveShadow = true;
        mesh.add(rings);
    }
    
    return mesh;
};
