
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';
import { MaterialProperties } from '@/types';
import { planetShader } from '../shaders/planetShader';

const textureLoader = new THREE.TextureLoader();

// Helper to create a grid texture
export const createGridTexture = (size = 512, lines = 12) => {
    if (typeof document === 'undefined') return null;
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

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    return texture;
};

export const createBodyMesh = (
    body: BodyData,
    viridisOriginalColorRef: React.MutableRefObject<THREE.Color>,
    materialProperties: MaterialProperties,
    viewFromSebaka: boolean,
    sebakaGridTexture: THREE.CanvasTexture | null,
): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(body.size, 64, 64);
    geometry.computeTangents();
    let material: THREE.Material;
    
    const bodyProps = materialProperties[body.name];

    if (body.type === 'Star') {
        const starMaterialOptions: THREE.MeshPhongMaterialParameters = {
            emissive: body.color,
            emissiveIntensity: bodyProps?.emissiveIntensity === 0 ? 0 : bodyProps?.emissiveIntensity || 1,
            shininess: bodyProps.shininess || 10,
        };

        if (body.name === 'Alpha') {
            Object.assign(starMaterialOptions, { map: textureLoader.load('/maps/goldenGiverTexture.jpg') });
            if (bodyProps.displacementScale > 0) starMaterialOptions.displacementMap = textureLoader.load('/maps/goldenGiver_displacement.png');
        } else if (body.name === 'Twilight') {
            Object.assign(starMaterialOptions, { map: textureLoader.load('/maps/TwilightTexture.jpg') });
            if (bodyProps.normalScale > 0) starMaterialOptions.normalMap = textureLoader.load('/maps/Twilight_normal.png');
            if (bodyProps.displacementScale > 0) starMaterialOptions.displacementMap = textureLoader.load('/maps/Twilight_displacement.png');
        } else if (body.name === 'Beacon') {
             Object.assign(starMaterialOptions, { map: textureLoader.load('/maps/BeaconTexture.png') });
             if (bodyProps.normalScale > 0) starMaterialOptions.normalMap = textureLoader.load('/maps/Beacon_normal.png');
             if (bodyProps.displacementScale > 0) starMaterialOptions.displacementMap = textureLoader.load('/maps/Beacon_displacement.png');
        }
        material = new THREE.MeshPhongMaterial(starMaterialOptions);

    } else { // It's a planet
        const uniforms = THREE.UniformsUtils.clone(planetShader.uniforms);
        let textureUrl = '';
        let normalMapUrl: string | null = null;
        let displacementMapUrl: string | null = null;


        switch (body.name) {
            case 'Aetheris': 
                textureUrl = '/maps/AetherisTexture.png';
                break;
            case 'Gelidis': 
                textureUrl = '/maps/GelidisTexture.png'; 
                break;
            case 'Rutilus': 
                textureUrl = '/maps/RutiliusTexture.png';
                break;
            case 'Spectris': 
                textureUrl = '/maps/SpectrisTexture.png'; 
                break;
            case 'Viridis': 
                textureUrl = '/maps/ViridisTexture.png';
                break;
            case 'Liminis': 
                textureUrl = '/maps/LiminisTexture.png';
                break;
            case 'Sebaka': 
                textureUrl = '/maps/SebakaTexture.png';
                break;
        }

        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: planetShader.vertexShader,
            fragmentShader: planetShader.fragmentShader,
            transparent: body.name === 'Spectris', // For rings
        });

        if(textureUrl) uniforms.planetTexture.value = textureLoader.load(textureUrl);

        if(body.name === 'Sebaka'){
            uniforms.gridTexture.value = sebakaGridTexture;
            uniforms.useGrid.value = viewFromSebaka;
        }
        
        // Pass initial slider values to shader
        if (bodyProps) {
            uniforms.normalScale.value.set(bodyProps.normalScale, bodyProps.normalScale);
            uniforms.displacementScale.value = bodyProps.displacementScale;

            // Load maps if they exist
            // Example: if (body.name === 'Sebaka') { uniforms.normalMap.value = textureLoader.load(...); }
        }
    }
    
    const mesh = new THREE.Mesh(geometry, material!);
    mesh.name = body.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (body.type === 'Planet' && body.name === "Spectris") {
        const ringCount = Math.floor(Math.random() * 70) + 80;
        const iridescentColors = [
            0x4dd0e1, 0x81c784, 0xb39ddb, 0xef9a9a, 0xffcc80,
            0xffee58, 0x90caf9, 0xf48fb1, 0x00bcd4, 0x80deea,
            0x4db6ac, 0xce93d8
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
