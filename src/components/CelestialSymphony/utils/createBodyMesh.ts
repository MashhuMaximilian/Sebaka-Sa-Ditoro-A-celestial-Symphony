
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';
import { planetShader } from '../shaders/planetShader';
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

export const createBodyMesh = (
    body: BodyData,
    viewFromSebaka: boolean,
    sebakaGridTexture: THREE.CanvasTexture | null,
): THREE.Mesh => {
    const geometry = new THREE.SphereGeometry(body.size, 64, 64);
    geometry.computeTangents();
    let material: THREE.Material;
    

    if (body.type === 'Star') {
        const starMaterialOptions: THREE.MeshPhongMaterialParameters = {
            emissive: body.color,
            emissiveIntensity: 1,
            shininess: 10,
        };

        if (body.name === 'Alpha') {
            Object.assign(starMaterialOptions, { map: textureLoader.load('/maps/goldenGiverTexture.jpg') });
        } else if (body.name === 'Twilight') {
            Object.assign(starMaterialOptions, { map: textureLoader.load('/maps/TwilightTexture.jpg') });
        } else if (body.name === 'Beacon') {
             Object.assign(starMaterialOptions, { map: textureLoader.load('/maps/BeaconTexture.png') });
        }
        material = new THREE.MeshPhongMaterial(starMaterialOptions);

    } else { // It's a planet
        const uniforms = THREE.UniformsUtils.clone(planetShader.uniforms);
        let textureUrl = '';
        
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
                uniforms.normalMap.value = textureLoader.load('/maps/SebakaNormalMap.png');
                uniforms.displacementMap.value = textureLoader.load('/maps/SebakaDisplacementMap.png');
                break;
        }

        if(textureUrl) uniforms.planetTexture.value = textureLoader.load(textureUrl);

        if(body.name === 'Sebaka'){
            uniforms.gridTexture.value = sebakaGridTexture;
            uniforms.useGrid.value = viewFromSebaka;
        }
        
        uniforms.normalScale.value.set(1, 1);
        uniforms.displacementScale.value = 1;

        material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: planetShader.vertexShader,
            fragmentShader: planetShader.fragmentShader,
            transparent: body.name === 'Spectris' || body.name === 'Aetheris',
        });
    }
    
    const mesh = new THREE.Mesh(geometry, material!);
    mesh.name = body.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Set initial rotation to match tilt, so spin starts from tilted axis
    const tiltQuaternion = new THREE.Quaternion();
    if (body.type === 'Planet' && body.axialTilt) {
        const tiltDegrees = parseFloat(body.axialTilt.replace('°', ''));
        if (!isNaN(tiltDegrees)) {
            const tiltRadians = THREE.MathUtils.degToRad(tiltDegrees);
            tiltQuaternion.setFromAxisAngle(
                new THREE.Vector3(0, 0, 1), // Tilt around Z-axis
                tiltRadians
            );
            mesh.quaternion.copy(tiltQuaternion);
        }
    }
    // Store the base tilt for animation loop
    mesh.userData.tiltQuaternion = tiltQuaternion.clone();

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
    
    return mesh;
};

    