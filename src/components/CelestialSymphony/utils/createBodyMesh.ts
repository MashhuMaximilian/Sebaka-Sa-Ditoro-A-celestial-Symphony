
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';
import { planetShader } from '../shaders/planetShader';
import { fresnelShader } from '../shaders/fresnelShader';
import { ImprovedNoise } from './ImprovedNoise';
import type { MaterialProperties } from '@/types';
import { spiderStrandShader } from '../shaders/spiderStrandShader';

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
    Alpha: {
        base: '/maps/goldenGiverTexture.jpg',
        ambient: '/maps/goldenGiver_ambient.png',
        displacement: '/maps/goldenGiver_displacement.png',
        specular: '/maps/goldenGiver_specular.png',
        normal: '/maps/goldenGiver_normal.png',
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
    Liminis: {
        base: '/maps/LiminisTexture.png',
        ambient: '/maps/LiminisAmbientOcclusionMap.png',
        displacement: '/maps/LiminisDisplacementMap.png',
        normal: '/maps/LiminisNormalMap.png',
        specular: '/maps/LiminisSpecularMap.png',
    }
};

const createStar = (body: BodyData, initialProps: MaterialProperties[string]) => {
    const starGroup = new THREE.Group();
    starGroup.name = body.name;

    const starColor = new THREE.Color(body.color);
    const paths = texturePaths[body.name];

    // 1. Textured Core
    const coreGeometry = new THREE.SphereGeometry(body.size, 64, 64);
    coreGeometry.computeTangents();

    const coreMaterial = new THREE.ShaderMaterial({
        uniforms: {
            ...THREE.UniformsUtils.clone(planetShader.uniforms),
            planetTexture: { value: paths?.base ? textureLoader.load(paths.base) : null },
            normalMap: { value: paths?.normal ? textureLoader.load(paths.normal) : null },
            displacementMap: { value: paths?.displacement ? textureLoader.load(paths.displacement) : null },
            specularMap: { value: paths?.specular ? textureLoader.load(paths.specular) : null },
            aoMap: { value: paths?.ambient ? textureLoader.load(paths.ambient) : null },
            emissiveIntensity: { value: initialProps.emissiveIntensity },
            useNormalMap: { value: !!paths?.normal && initialProps.normalScale > 0 },
            normalScale: { value: new THREE.Vector2(initialProps.normalScale, initialProps.normalScale) },
            useDisplacementMap: { value: !!paths?.displacement && initialProps.displacementScale > 0 },
            displacementScale: { value: initialProps.displacementScale },
            useSpecularMap: { value: !!paths?.specular && initialProps.specularIntensity > 0 },
            specularIntensity: { value: initialProps.specularIntensity },
            shininess: { value: initialProps.shininess },
            useAoMap: { value: !!paths?.ambient && initialProps.aoMapIntensity > 0 },
            aoMapIntensity: { value: initialProps.aoMapIntensity },
        },
        vertexShader: planetShader.vertexShader,
        fragmentShader: planetShader.fragmentShader,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    coreMesh.name = body.name;
    starGroup.add(coreMesh);

    // 2. Pulsating Corona (Flare Animation)
    const coronaGeometry = new THREE.SphereGeometry(body.size - 0.1, 32, 32);
    const coronaMaterial = new THREE.MeshBasicMaterial({
        color: starColor,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.8
    });
    const coronaMesh = new THREE.Mesh(coronaGeometry, coronaMaterial);
    coronaMesh.name = `${body.name}_corona`;
    
    const coronaNoise = new ImprovedNoise();
    let v3 = new THREE.Vector3();
    let p = new THREE.Vector3();
    const pos = coronaGeometry.attributes.position as THREE.BufferAttribute;
    pos.usage = THREE.DynamicDrawUsage;
    const len = pos.count;
    
    coronaMesh.userData.update = (time: number) => {
        const t = time * 0.1;
        for (let i = 0; i < len; i++) {
            p.fromBufferAttribute(pos, i).normalize();
            v3.copy(p).multiplyScalar(body.size);
            let ns = coronaNoise.noise(
                v3.x + Math.cos(t),
                v3.y + Math.sin(t),
                v3.z + t
            );
            v3.copy(p)
              .setLength(body.size)
              .addScaledVector(p, ns * body.size * 0.05); // Way smaller corona
            pos.setXYZ(i, v3.x, v3.y, v3.z);
        }
        pos.needsUpdate = true;
    };
    starGroup.add(coronaMesh);

    // 3. Glow Layer (Corona Aura)
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color1: { value: new THREE.Color('black') },
            color2: { value: starColor },
            fresnelBias: { value: 0.2 },
            fresnelScale: { value: 1.5 },
            fresnelPower: { value: 4.0 },
        },
        vertexShader: fresnelShader.vertexShader,
        fragmentShader: fresnelShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
    });
    const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(body.size, 64, 64), glowMaterial);
    glowMesh.scale.setScalar(1.2); // Smaller corona
    glowMesh.name = `${body.name}_glow`;
    starGroup.add(glowMesh);

    // 4. Rim Layer
    const rimMaterial = new THREE.ShaderMaterial({
        uniforms: {
            color1: { value: starColor },
            color2: { value: new THREE.Color('black') },
            fresnelBias: { value: 0.2 },
            fresnelScale: { value: 1.5 },
            fresnelPower: { value: 4.0 },
        },
        vertexShader: fresnelShader.vertexShader,
        fragmentShader: fresnelShader.fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
    });
    const rimMesh = new THREE.Mesh(new THREE.SphereGeometry(body.size, 64, 64), rimMaterial);
    rimMesh.scale.setScalar(1.01);
    rimMesh.name = `${body.name}_rim`;
    starGroup.add(rimMesh);

    // 5. Point Light
    const pointLight = new THREE.PointLight(starColor, 2, 0, 0);
    starGroup.add(pointLight);

    // Attach master update function to the group's userData
    starGroup.userData.update = (time: number) => {
        coronaMesh.userData.update?.(time);
    };

    return starGroup;
}


export const createBodyMesh = (
    body: BodyData,
    viewFromSebaka: boolean,
    sebakaGridTexture: THREE.CanvasTexture | null,
    initialProps: MaterialProperties[string]
): THREE.Object3D => {
    
    // This is the main container for the body, including any tilt.
    const tiltAxis = new THREE.Object3D();
    tiltAxis.name = body.name; 

    if (body.type === 'Star') {
        const starGroup = createStar(body, initialProps);
        tiltAxis.add(starGroup);
        // The main animation loop will find and call starGroup.userData.update
        return tiltAxis;
    }
    
    const geometry = new THREE.SphereGeometry(body.size, 64, 64);
    geometry.computeTangents();
    let material: THREE.Material;
    
    let mesh: THREE.Mesh;
    const paths = texturePaths[body.name];

    const baseTexture = paths?.base ? textureLoader.load(paths.base) : null;
    const normalMap = paths?.normal ? textureLoader.load(paths.normal) : null;
    const displacementMap = paths?.displacement ? textureLoader.load(paths.displacement) : null;
    const specularMap = paths?.specular ? textureLoader.load(paths.specular) : null;
    const aoMap = paths?.ambient ? textureLoader.load(paths.ambient) : null;
    
    material = new THREE.ShaderMaterial({
        uniforms: {
            ...THREE.UniformsUtils.clone(planetShader.uniforms),
            planetTexture: { value: baseTexture },
            gridTexture: { value: null as THREE.CanvasTexture | null },
            useGrid: { value: false },
            isBeaconPlanet: { value: body.name === 'Gelidis' || body.name === 'Liminis' },

            normalMap: { value: normalMap },
            displacementMap: { value: displacementMap },
            specularMap: { value: specularMap },
            aoMap: { value: aoMap },

            emissiveIntensity: { value: initialProps.emissiveIntensity },
            albedo: { value: initialProps.albedo },
            useNormalMap: { value: !!normalMap && initialProps.normalScale > 0 },
            normalScale: { value: new THREE.Vector2(initialProps.normalScale, initialProps.normalScale) },
            useDisplacementMap: { value: !!displacementMap && initialProps.displacementScale > 0 },
            displacementScale: { value: initialProps.displacementScale },
            useSpecularMap: { value: !!specularMap && initialProps.specularIntensity > 0 },
            specularIntensity: { value: initialProps.specularIntensity },
            shininess: { value: initialProps.shininess },
            useAoMap: { value: !!aoMap && initialProps.aoMapIntensity > 0 },
            aoMapIntensity: { value: initialProps.aoMapIntensity },
        },
        vertexShader: planetShader.vertexShader,
        fragmentShader: planetShader.fragmentShader,
        transparent: body.name === 'Spectris' || body.name === 'Aetheris',
    });
    
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







