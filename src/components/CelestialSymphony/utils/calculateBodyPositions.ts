
import * as THREE from 'three';
import type { ProcessedBodyData } from './getBodyData';

/**
 * Solves Kepler's equation M = E - e * sin(E) for E (eccentric anomaly)
 * using the Newton-Raphson method.
 * @param M Mean anomaly (in radians).
 * @param e Eccentricity.
 * @param maxIter Maximum number of iterations.
 * @param tolerance Desired precision.
 * @returns Eccentric anomaly E (in radians).
 */
function solveKepler(M: number, e: number, maxIter = 100, tolerance = 1e-9): number {
    // Initial guess for E
    let E = (e < 0.8) ? M : Math.PI;
    let dE = 0;

    for (let i = 0; i < maxIter; i++) {
        const f = E - e * Math.sin(E) - M;
        const f_prime = 1 - e * Math.cos(E);
        
        dE = -f / f_prime;
        E += dE;

        if (Math.abs(dE) < tolerance) {
            return E;
        }
    }
    // If it fails to converge, return the last estimate.
    // console.warn(`Kepler's equation did not converge for M=${M}, e=${e}`);
    return E;
}


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

        // Planets orbiting Beacon are relative to its position
        if (data.name === 'Gelidis' || data.name === 'Liminis') {
            orbitCenter.copy(beaconPosition);
        }

        const semiMajorAxis = data.orbitRadius || 0;
        let x: number;
        let z: number;

        // Calculate Mean Anomaly (M)
        const M = (data.initialPhaseRad + currentHours * data.radsPerHour) % (2 * Math.PI);

        if (data.type === 'Planet' && data.eccentric && data.eccentricity && data.eccentricity > 0) {
            const e = data.eccentricity;
            
            // Solve for Eccentric Anomaly (E)
            const E = solveKepler(M, e);

            // Calculate True Anomaly (v)
            const v = 2 * Math.atan2(
                Math.sqrt(1 + e) * Math.sin(E / 2),
                Math.sqrt(1 - e) * Math.cos(E / 2)
            );

            // Calculate distance to star (r)
            const r = semiMajorAxis * (1 - e * Math.cos(E));
            
            // Calculate heliocentric coordinates. The star is at the focus of the ellipse.
            x = orbitCenter.x + r * Math.cos(v);
            z = orbitCenter.z + r * Math.sin(v);

        } else if (data.type === 'Star' && (data.name === 'Alpha' || data.name === 'Twilight')) {
            // Special case for binary stars orbiting a common barycenter
            const r1 = 0.1 * 150; // 0.1 AU
            const binaryAngle = data.initialPhaseRad + currentHours * data.radsPerHour;
            x = (data.name === 'Alpha' ? -1 : 1) * r1 * Math.cos(binaryAngle);
            z = (data.name === 'Alpha' ? -1 : 1) * r1 * Math.sin(binaryAngle);
        } else {
            // Default to circular orbit if not eccentric
            const r = semiMajorAxis;
            x = orbitCenter.x + r * Math.cos(M);
            z = orbitCenter.z + r * Math.sin(M);
        }
        
        // All orbits are co-planar on the XZ plane
        const y = orbitCenter.y; 
        positions[data.name] = new THREE.Vector3(x, y, z);
    });

    return positions;
};
