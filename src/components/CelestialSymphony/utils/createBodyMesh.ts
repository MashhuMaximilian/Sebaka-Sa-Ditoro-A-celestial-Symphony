
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';
import { MaterialProperties } from '@/types';

const textureLoader = new THREE.TextureLoader();

// Helper to create a grid texture
export const createGridTexture = (size = 512, lines = 12) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillRect(0, 0, size, size);
    context.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    context.lineWidth = 2;
    
    // Meridians (Longitude)
    for (let i = 0; i <= lines * 2; i++) {
        const x = (i / (lines * 2)) * size;
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, size);
        context.stroke();
    }
    
    // Parallels (Latitude)
    for (let i = 0; i <= lines; i++) {
        const y = (i / lines) * size;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(size, y);
        context.stroke();
    }

    return new THREE.CanvasTexture(canvas);
};

export const createBodyMesh = (
    body: BodyData,
    viridisOriginalColorRef: React.MutableRefObject<THREE.Color>,
    materialProperties: MaterialProperties,
    viewFromSebaka: boolean,
    sebakaGridTexture: THREE.CanvasTexture | null,
): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(body.size, 64, 64);
    let material: THREE.Material;
    
    const bodyProps = materialProperties[body.name];
    const materialOptions: THREE.MeshPhongMaterialParameters = { shininess: 10 };

    if (body.type === 'Star') {
        const starMaterialOptions: THREE.MeshPhongMaterialParameters = {
            emissive: body.color,
            emissiveIntensity: bodyProps?.emissiveIntensity === 0 ? 0 : bodyProps?.emissiveIntensity || 1,
            ...materialOptions,
        };

        if (body.name === 'Alpha') {
            Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/goldenGiverTexture.jpg'),
            });
            if (bodyProps?.specularMap) {
                starMaterialOptions.specularMap = textureLoader.load('/maps/goldenGiver_specular.png');
            }
            if (bodyProps.displacementScale > 0) {
                 starMaterialOptions.displacementMap = textureLoader.load('/maps/goldenGiver_displacement.png');
                 starMaterialOptions.displacementScale = bodyProps.displacementScale;
            }
        } else if (body.name === 'Twilight') {
            Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/TwilightTexture.jpg'),
            });
            if (bodyProps?.specularMap) {
                starMaterialOptions.specularMap = textureLoader.load('/maps/Twilight_specular.png');
            }
            if (bodyProps.normalScale > 0) {
                starMaterialOptions.normalMap = textureLoader.load('/maps/Twilight_normal.png');
                starMaterialOptions.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
            }
            if (bodyProps.displacementScale > 0) {
                starMaterialOptions.displacementMap = textureLoader.load('/maps/Twilight_displacement.png');
                starMaterialOptions.displacementScale = bodyProps.displacementScale;
            }
        } else if (body.name === 'Beacon') {
             Object.assign(starMaterialOptions, {
                map: textureLoader.load('/maps/BeaconTexture.png'),
             });
            if (bodyProps?.specularMap) {
                starMaterialOptions.specularMap = textureLoader.load('/maps/Beacon_specular.png');
            }
             if (bodyProps.normalScale > 0) {
                starMaterialOptions.normalMap = textureLoader.load('/maps/Beacon_normal.png');
                starMaterialOptions.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
             }
             if (bodyProps.displacementScale > 0) {
                starMaterialOptions.displacementMap = textureLoader.load('/maps/Beacon_displacement.png');
                starMaterialOptions.displacementScale = bodyProps.displacementScale;
             }
        }
        
        material = new THREE.MeshPhongMaterial(starMaterialOptions);

    } else { 
        const planetName = body.name;
        const textureParams: THREE.MeshPhongMaterialParameters = {};
        
        switch (planetName) {
            case 'Aetheris':
                textureParams.map = textureLoader.load('/maps/AetherisTexture.png');
                if (bodyProps?.specularMap) {
                    textureParams.specularMap = textureLoader.load('/maps/AetherisTexture_specular.png');
                }
                if (bodyProps.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/AetherisTexture_normal.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                break;
            case 'Gelidis':
                textureParams.map = textureLoader.load('/maps/GelidisTexture.png');
                if (bodyProps?.specularMap) {
                    textureParams.specularMap = textureLoader.load('/maps/GelidisTexture_specular.png');
                }
                if (bodyProps.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/GelidisTexture_normal.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps.displacementScale > 0) {
                    textureParams.displacementMap = textureLoader.load('/maps/GelidisTexture_displacement.png');
                    textureParams.displacementScale = bodyProps.displacementScale;
                }
                break;
            case 'Rutilus':
                textureParams.map = textureLoader.load('/maps/RutiliusTexture.png');
                if (bodyProps.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/RutiliusTexture_normal.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps.displacementScale > 0) {
                    textureParams.displacementMap = textureLoader.load('/maps/RutiliusTexture_displacement.png');
                    textureParams.displacementScale = bodyProps.displacementScale;
                }
                break;
            case 'Spectris':
                textureParams.map = textureLoader.load('/maps/SpectrisTexture.png');
                 if (bodyProps?.specularMap) {
                    textureParams.specularMap = textureLoader.load('/maps/SpectrisTexture_specular.png');
                }
                if (bodyProps.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/SpectrisTexture_normal.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps.displacementScale > 0) {
                    textureParams.displacementMap = textureLoader.load('/maps/SpectrisTexture_displacement.png');
                    textureParams.displacementScale = bodyProps.displacementScale;
                }
                break;
            case 'Viridis':
                textureParams.map = textureLoader.load('/maps/ViridisTexture.png');
                 if (bodyProps?.specularMap) {
                    textureParams.specularMap = textureLoader.load('/maps/ViridisTexture_specular.png');
                }
                 if (bodyProps.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/ViridisTexture_normal.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps.displacementScale > 0) {
                    textureParams.displacementMap = textureLoader.load('/maps/ViridisTexture_displacement.png');
                    textureParams.displacementScale = bodyProps.displacementScale;
                }
                if (body.color) {
                    viridisOriginalColorRef.current.set(body.color);
                }
                break;
            case 'Liminis':
                textureParams.map = textureLoader.load('/maps/LiminisTexture.png');
                 if (bodyProps?.specularMap) {
                    textureParams.specularMap = textureLoader.load('/maps/LiminisSpecularMap.png');
                }
                if (bodyProps.normalScale > 0) {
                    textureParams.normalMap = textureLoader.load('/maps/LiminisNormalMap.png');
                    textureParams.normalScale = new THREE.Vector2(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps.displacementScale > 0) {
                    textureParams.displacementMap = textureLoader.load('/maps/LiminisDisplacementMap.png');
                    textureParams.displacementScale = bodyProps.displacementScale;
                }
                break;
            case 'Sebaka':
                const sebakaDetailedMaterial = new THREE.MeshPhongMaterial({
                    map: textureLoader.load('/maps/SebakaTexture.png'),
                    specularMap: textureLoader.load('/maps/SebakaSpecularMap.png'),
                });
                if (bodyProps.normalScale > 0) {
                    sebakaDetailedMaterial.normalMap = textureLoader.load('/maps/SebakaNormalMap.png');
                    sebakaDetailedMaterial.normalScale.set(bodyProps.normalScale, bodyProps.normalScale);
                }
                if (bodyProps.displacementScale > 0) {
                    sebakaDetailedMaterial.displacementMap = textureLoader.load('/maps/SebakaDisplacementMap.png');
                    sebakaDetailedMaterial.displacementScale = bodyProps.displacementScale;
                }
                
                const sebakaSimpleMaterial = new THREE.MeshPhongMaterial({
                    color: '#0096C8',
                    map: sebakaGridTexture,
                    transparent: true,
                });
                
                material = viewFromSebaka ? sebakaSimpleMaterial : sebakaDetailedMaterial;
                break;
            default:
                materialOptions.color = body.color;
                material = new THREE.MeshPhongMaterial(materialOptions);
                break;
        }

        if (planetName !== 'Sebaka') {
            material = new THREE.MeshPhongMaterial({ ...materialOptions, ...textureParams });
        }
        if (textureParams.normalMap || textureParams.displacementMap ) {
            geometry.computeTangents();
        }
    }
    
    const mesh = new THREE.Mesh(geometry, material!);
    mesh.name = body.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (body.type === 'Planet' && body.name === "Spectris") {
        const ringCount = Math.floor(Math.random() * 70) + 80;
        const iridescentColors = [
            0x4dd0e1, // Cyan
            0x81c784, // Green
            0xb39ddb, // Lavender
            0xef9a9a, // Red
            0xffcc80, // Orange
            0xffee58, // Yellow
            0x90caf9, // Blue
            0xf48fb1  // Pink
        ];

        for (let i = 0; i < ringCount; i++) {
            const innerRadius = body.size * (1.5 + i * 0.02 + Math.random() * 0.01);
            const outerRadius = innerRadius + (Math.random() * 0.05 + 0.01) * body.size;

            const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128, 1);
            
            const ringMaterial = new THREE.MeshPhongMaterial({
                color: iridescentColors[Math.floor(Math.random() * iridescentColors.length)],
                transparent: true,
                opacity: Math.random() * 0.4 + 0.1,
                side: THREE.DoubleSide,
                shininess: Math.random() * 30,
            });

            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            ringMesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.1;
            ringMesh.rotation.y = (Math.random() - 0.5) * 0.05;
            mesh.add(ringMesh);
        }
    }
    
    return mesh;
};
