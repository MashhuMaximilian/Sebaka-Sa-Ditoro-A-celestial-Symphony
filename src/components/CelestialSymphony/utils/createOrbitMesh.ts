
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';
import type { PlanetData } from '@/types';

export const createOrbitMesh = (body: BodyData): THREE.Mesh | null => {
    if ((body.type === 'Planet' || body.name === 'Beacon') && body.orbitRadius) {
        const tubeRadius = body.name === 'Beacon' ? 5 : 0.5;
        const radialSegments = 12; // Increased for smoother tubes
        const tubularSegments = 512; // Increased significantly for a smoother ring
        const orbitGeometry = new THREE.TorusGeometry(body.orbitRadius, tubeRadius, radialSegments, tubularSegments);
        const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbit.rotation.x = Math.PI / 2;
        orbit.name = `${body.name}_orbit`;

        if ((body as PlanetData).eccentric) {
            const eccentricity = body.name === 'Spectris' ? 0.2 : body.name === 'Aetheris' ? 0.5 : 0.1;
            const semiMinorAxis = body.orbitRadius * Math.sqrt(1 - eccentricity * eccentricity);
            orbit.scale.y = semiMinorAxis / body.orbitRadius;
        }

        return orbit;
    }
    return null;
};
