
import * as THREE from 'three';
import type { ProcessedBodyData } from './getBodyData';

export const calculateBodyPositions = (
    currentHours: number,
    bodyData: ProcessedBodyData[],
): { [key: string]: THREE.Vector3 } => {
    
    const positions: { [key: string]: THREE.Vector3 } = {};
    const beaconPosition = new THREE.Vector3();

    const beaconData = bodyData.find(d => d.name === 'Beacon');
    if (beaconData && beaconData.orbitRadius) {
        const beaconAngle = beaconData.initialPhaseRad + currentHours * beaconData.radsPerHour;
        const beaconX = beaconData.orbitRadius * Math.cos(beaconAngle);
        const beaconZ = beaconData.orbitRadius * Math.sin(beaconAngle);
        beaconPosition.set(beaconX, 0, beaconZ);
    }
    positions['Beacon'] = beaconPosition;

    bodyData.forEach(data => {
        if (data.name === 'Beacon') return;

        let orbitCenter = new THREE.Vector3(0, 0, 0);

        if (data.name === 'Gelidis' || data.name === 'Liminis') {
            orbitCenter.copy(beaconPosition);
        }

        const semiMajorAxis = data.orbitRadius || 0;
        let x, z;
        const angle = data.initialPhaseRad + currentHours * data.radsPerHour;

        if (data.type === 'Planet' && data.eccentric && data.eccentricity) {
            const eccentricity = data.eccentricity;
            const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
            
            // Note: In a proper ellipse with the sun at one focus, the calculation is more complex.
            // This is a simplified centered ellipse, but we use the focus offset for visual effect.
            const focusOffset = semiMajorAxis * eccentricity;

            x = orbitCenter.x + focusOffset + semiMajorAxis * Math.cos(angle);
            z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
        } else if (data.type === 'Star' && (data.name === 'Alpha' || data.name === 'Twilight')) {
            const r1 = 0.1 * 150; // AU_TO_UNITS, TODO: pass this in
            const binaryAngle = data.initialPhaseRad + currentHours * data.radsPerHour;
            x = (data.name === 'Alpha' ? -1 : 1) * r1 * Math.cos(binaryAngle);
            z = (data.name === 'Alpha' ? -1 : 1) * r1 * Math.sin(binaryAngle);
        } else {
            x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
            z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
        }

        const y = orbitCenter.y;
        positions[data.name] = new THREE.Vector3(x, y, z);
    });

    return positions;
};
