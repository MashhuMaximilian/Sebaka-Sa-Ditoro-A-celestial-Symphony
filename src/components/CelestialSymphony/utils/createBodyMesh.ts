
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';
import { planetShader } from '../shaders/planetShader';
import { spiderStrandShader } from '../shaders/spiderStrandShader';
import type { PlanetData } from '@/types';

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

export const createBodyMesh = (
    body: BodyData,
    viewFromSebaka: boolean,
    sebakaGridTexture: THREE.CanvasTexture | null,
): THREE.Object3D => {
    const geometry = new THREE.SphereGeometry(body.size, 64, 64);
    geometry.computeTangents();
    let material: THREE.Material;
    
    // This Object3D will handle the orbital position and axial tilt
    const tiltAxis = new THREE.Object3D();
    tiltAxis.name = body.name;

    let mesh: THREE.Mesh;

    if (body.type === 'Star') {
        const starMaterialOptions: THREE.MeshPhongMaterialParameters = {
            emissive: body.color,
            emissiveIntensity: 1,
            shininess: 10,
        };
        // Simplified star texture loading
        const starTextures: { [key: string]: {map: string} } = {
            Alpha: { map: '/maps/goldenGiverTexture.jpg' },
            Twilight: { map: '/maps/TwilightTexture.jpg' },
            Beacon: { map: '/maps/BeaconTexture.png' },
        };
        if (starTextures[body.name]) {
            starMaterialOptions.map = textureLoader.load(starTextures[body.name].map);
        }

        material = new THREE.MeshPhongMaterial(starMaterialOptions);
        mesh = new THREE.Mesh(geometry, material);
        mesh.name = body.name; // Keep name on mesh for raycasting
    } else { // It's a planet
        const uniforms = THREE.UniformsUtils.clone(planetShader.uniforms);

        const texturePaths: { [key: string]: { [key: string]: string } } = {
            Aetheris: { base: '/maps/AetherisTexture.png', specular: '/maps/AetherisTexture_specular.png' },
            Gelidis: { base: '/maps/GelidisTexture.png', ambient: '/maps/GelidisTexture_ambient.png', displacement: '/maps/GelidisTexture_displacement.png', normal: '/maps/GelidisTexture_normal.png', specular: '/maps/GelidisTexture_specular.png' },
            Rutilus: { base: '/maps/RutiliusTexture.png', ambient: '/maps/RutiliusTexture_ambient.png', displacement: '/maps/RutiliusTexture_displacement.png', normal: '/maps/RutiliusTexture_normal.png' },
            Spectris: { base: '/maps/SpectrisTexture.png', ambient: '/maps/SpectrisTexture_ambient.png', displacement: '/maps/SpectrisTexture_displacement.png', normal: '/maps/SpectrisTexture_normal.png', specular: '/maps/SpectrisTexture_specular.png' },
            Viridis: { base: '/maps/ViridisTexture.png', ambient: '/maps/ViridisTexture_ambient.png', displacement: '/maps/ViridisTexture_displacement.png', normal: '/maps/ViridisTexture_normal.png', specular: '/maps/ViridisTexture_specular.png' },
            Liminis: { base: '/maps/LiminisTexture.png', ambient: '/maps/LiminiAmbientOcclusionMap.png', displacement: '/maps/LiminiDisplacementMap.png', normal: '/maps/LiminiNormalMap.png', specular: '/maps/LiminiSpecularMap.png' },
            Sebaka: { base: '/maps/SebakaTexture.png', ambient: '/maps/SebakaAmbientOcclusionMap.png', displacement: '/maps/SebakaDisplacementMap.png', normal: '/maps/SebakaNormalMap.png', specular: '/maps/SebakaSpecularMap.png' },
        };
        
        const paths = texturePaths[body.name];
        if (paths) {
            if(paths.base) uniforms.planetTexture.value = textureLoader.load(paths.base);
            if(paths.normal) uniforms.normalMap.value = textureLoader.load(paths.normal);
            if(paths.displacement) uniforms.displacementMap.value = textureLoader.load(paths.displacement);
            if(paths.specular) uniforms.specularMap.value = textureLoader.load(paths.specular);
            if(paths.ambient) uniforms.aoMap.value = textureLoader.load(paths.ambient);
        }

        if(body.name === 'Sebaka'){
            uniforms.gridTexture.value = sebakaGridTexture;
            uniforms.useGrid.value = viewFromSebaka;
        }
        
        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: planetShader.vertexShader,
            fragmentShader: planetShader.fragmentShader,
            transparent: body.name === 'Spectris' || body.name === 'Aetheris',
        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.name = body.name;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (body.name === "Spectris") {
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
    }
    
    // Apply axial tilt to the container object. The mesh inside will then rotate on this tilted axis.
    if (body.type === 'Planet' && body.axialTilt) {
        const planetBody = body as PlanetData;
        const tiltDegrees = parseFloat(planetBody.axialTilt.replace('°', ''));
        if (!isNaN(tiltDegrees)) {
            const tiltRadians = THREE.MathUtils.degToRad(tiltDegrees);
            tiltAxis.rotation.set(0, 0, tiltRadians, 'XYZ');
        }
    }

    tiltAxis.add(mesh);
    return tiltAxis;
};
