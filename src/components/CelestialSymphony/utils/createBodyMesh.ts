
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';
import { planetShader } from '../shaders/planetShader';
import { spiderStrandShader } from '../shaders/spiderStrandShader';
import type { MaterialProperties } from '@/types';

const textureLoader = new THREE.TextureLoader();

// Helper to create a grid texture
export const createGridTexture = (size = 1024, lines = 24) => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;

    context.fillStyle = 'rgba(0,0,0,0)';
    context.fillRect(0, 0, size, size);
    context.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    context.lineWidth = 1;
    
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

export const texturePaths: { [key: string]: { [key: string]: string | undefined } } = {
    Alpha: { // GoldenGiver
        base: '/maps/goldenGiverTexture.jpg',
        ambient: '/maps/goldenGiver_ambient.png',
        displacement: '/maps/goldenGiver_displacement.png',
        specular: '/maps/goldenGiver_specular.png',
        normal: undefined, // No normal map for Alpha/GoldenGiver
    },
    Twilight: {
        base: '/maps/TwilightTexture.jpg',
        ambient: '/maps/Twilight_ambient.png',
        displacement: '/maps/Twilight_displacement.png',
        normal: '/maps/Twilight_normal.png',
        specular: '/maps/Twilight_specular.png',
    },
    Beacon: {
        base: '/maps/BeaconTexture.png',
        ambient: '/maps/Beacon_ambient.png',
        displacement: '/maps/Beacon_displacement.png',
        normal: '/maps/Beacon_normal.png',
        specular: '/maps/Beacon_specular.png',
    },
    Rutilus: {
        base: '/maps/RutiliusTexture.png',
        ambient: '/maps/RutiliusTexture_ambient.png',
        displacement: '/maps/RutiliusTexture_displacement.png',
        normal: '/maps/RutiliusTexture_normal.png',
        specular: '/maps/RutiliusTexture_specular.png',
    },
    Sebaka: {
        base: '/maps/SebakaTexture.png',
        ambient: '/maps/SebakaAmbientOcclusionMap.png',
        displacement: '/maps/SebakaDisplacementMap.png',
        normal: '/maps/SebakaNormalMap.png',
        specular: '/maps/SebakaSpecularMap.png',
    },
    Spectris: {
        base: '/maps/SpectrisTexture.png',
        ambient: '/maps/SpectrisTexture_ambient.png',
        displacement: '/maps/SpectrisTexture_displacement.png',
        normal: '/maps/SpectrisTexture_normal.png',
        specular: '/maps/SpectrisTexture_specular.png',
    },
    Viridis: {
        base: '/maps/ViridisTexture.png',
        ambient: '/maps/ViridisTexture_ambient.png',
        displacement: '/maps/ViridisTexture_displacement.png',
        normal: '/maps/ViridisTexture_normal.png',
        specular: '/maps/ViridisTexture_specular.png',
    },
    Aetheris: {
        base: '/maps/AetherisTexture.png',
        ambient: '/maps/AetherisTexture_ambient.png',
        displacement: '/maps/AetherisTexture_displacement.png',
        normal: '/maps/AetherisTexture_normal.png',
        specular: '/maps/AetherisTexture_specular.png',
    },
    Gelidis: {
        base: '/maps/GelidisTexture.png',
        ambient: '/maps/GelidisTexture_ambient.png',
        displacement: '/maps/GelidisTexture_displacement.png',
        normal: '/maps/GelidisTexture_normal.png',
        specular: '/maps/GelidisTexture_specular.png',
    },
    Liminis: { // Limni
        base: '/maps/LimnisTexture.png',
        ambient: '/maps/LimnisAmbientOcclusionMap.png',
        displacement: '/maps/LimnisDisplacementMap.png',
        normal: '/maps/LimnisNormalMap.png',
        specular: '/maps/LimnisSpecularMap.png',
    }
};

export const createBodyMesh = (
    body: BodyData,
    viewFromSebaka: boolean,
    sebakaGridTexture: THREE.CanvasTexture | null,
    initialProps: MaterialProperties[string]
): THREE.Object3D => {
    const geometry = new THREE.SphereGeometry(body.size, 64, 64);
    geometry.computeTangents();
    let material: THREE.Material;
    
    const tiltAxis = new THREE.Object3D();
    tiltAxis.name = body.name;

    let mesh: THREE.Mesh;
    const paths = texturePaths[body.name];

    const baseTexture = paths?.base ? textureLoader.load(paths.base) : null;
    const normalMap = paths?.normal ? textureLoader.load(paths.normal) : null;
    const displacementMap = paths?.displacement ? textureLoader.load(paths.displacement) : null;
    const specularMap = paths?.specular ? textureLoader.load(paths.specular) : null;
    const aoMap = paths?.ambient ? textureLoader.load(paths.ambient) : null;

    if (body.type === 'Star') {
        material = new THREE.MeshPhongMaterial({
            map: baseTexture,
            color: body.color,
            emissive: body.color,
            emissiveIntensity: initialProps.emissiveIntensity,
            shininess: 0
        });
    } else {
        material = new THREE.ShaderMaterial({
            uniforms: {
                alphaStarPos: { value: new THREE.Vector3() },
                twilightStarPos: { value: new THREE.Vector3() },
                beaconStarPos: { value: new THREE.Vector3() },
                alphaColor: { value: new THREE.Color(0xFFF4D4) },
                twilightColor: { value: new THREE.Color(0xFFC8A2) },
                beaconColor: { value: new THREE.Color(0xD4E5FF) },
                alphaIntensity: { value: 1.0 },
                twilightIntensity: { value: 0.7 },
                beaconIntensity: { value: 1000.0 },
                emissiveIntensity: { value: initialProps.emissiveIntensity },

                albedo: { value: initialProps.albedo },
                planetTexture: { value: baseTexture },
                gridTexture: { value: null as THREE.CanvasTexture | null },
                useGrid: { value: false },
                ambientLevel: { value: 0.02 },

                useNormalMap: { value: !!normalMap && initialProps.normalScale > 0 },
                normalMap: { value: normalMap },
                normalScale: { value: new THREE.Vector2(initialProps.normalScale, initialProps.normalScale) },

                useDisplacementMap: { value: !!displacementMap && initialProps.displacementScale > 0 },
                displacementMap: { value: displacementMap },
                displacementScale: { value: initialProps.displacementScale },

                useSpecularMap: { value: !!specularMap },
                specularMap: { value: specularMap },
                specularIntensity: { value: initialProps.specularIntensity },
                shininess: { value: initialProps.shininess },

                useAoMap: { value: !!aoMap && initialProps.aoMapIntensity > 0 },
                aoMap: { value: aoMap },
                aoMapIntensity: { value: initialProps.aoMapIntensity },
            },
            vertexShader: planetShader.vertexShader,
            fragmentShader: planetShader.fragmentShader,
            transparent: body.name === 'Spectris' || body.name === 'Aetheris',
        });
    }
    
    if(body.name === 'Sebaka' && (material instanceof THREE.ShaderMaterial)){
        material.uniforms.gridTexture.value = sebakaGridTexture;
        material.uniforms.useGrid.value = viewFromSebaka;
    }
    
    mesh = new THREE.Mesh(geometry, material);
    mesh.name = body.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (body.type === 'Planet' && body.name === "Spectris") {
        const ringCount = Math.floor(Math.random() * 70) + 80;
        const ringBaseColors = [
            new THREE.Color("#eeeaea"), new THREE.Color("#efc5f4"), new THREE.Color("#a0f9af"),
            new THREE.Color("#b9a2e5"), new THREE.Color("#8c88fb"), new THREE.Color("#ff9ab8"),
            new THREE.Color("#f3ffb2"), new THREE.Color("#8ff6fe"), new THREE.Color("#b9b1dc"),
            new THREE.Color("#dbc1dc"), new THREE.Color("#ff0000"), new THREE.Color("#ffff00"),
            new THREE.Color("#ff00ff")
        ];

        for (let i = 0; i < ringCount; i++) {
            const innerRadius = body.size * (1.5 + i * 0.02 + Math.random() * 0.01);
            const outerRadius = innerRadius + (Math.random() * 0.05 + 0.01) * body.size;

            const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 128, 1);
            
            let ringMaterial: THREE.Material;
            
            if (Math.random() < 0.3) {
                 const uniforms = THREE.UniformsUtils.clone(spiderStrandShader.uniforms);
                 uniforms.baseColor.value = ringBaseColors[Math.floor(Math.random() * ringBaseColors.length)];

                 ringMaterial = new THREE.ShaderMaterial({
                    uniforms: uniforms,
                    vertexShader: spiderStrandShader.vertexShader,
                    fragmentShader: spiderStrandShader.fragmentShader,
                    transparent: true,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending,
                });
            } else {
                ringMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.1 + Math.random() * 0.2,
                    side: THREE.DoubleSide,
                    blending: THREE.AdditiveBlending,
                });
            }

            const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
            ringMesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.1;
            ringMesh.rotation.y = (Math.random() - 0.5) * 0.05;
            mesh.add(ringMesh);
        }
    }
    
    if (body.axialTilt) {
        const tiltDegrees = parseFloat(body.axialTilt.replace('°', ''));
        if (!isNaN(tiltDegrees)) {
            const tiltRadians = THREE.MathUtils.degToRad(tiltDegrees);
            tiltAxis.rotation.set(0, 0, tiltRadians, 'XYZ');
        }
    }

    tiltAxis.add(mesh);
    return tiltAxis;
};
