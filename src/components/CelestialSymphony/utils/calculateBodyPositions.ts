
import * as THREE from 'three';
import type { ProcessedBodyData } from '../hooks/useBodyData';

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
    let barycenter = new THREE.Vector3(0, 0, 0);

    // Calculate binary star positions first to establish the barycenter
    const alphaData = bodyData.find(d => d.name === 'Alpha');
    const twilightData = bodyData.find(d => d.name === 'Twilight');

    if (alphaData) {
        const M = (alphaData.initialPhaseRad + currentHours * alphaData.radsPerHour) % (2 * Math.PI);
        const r1 = 0.1 * 150; // 0.1 AU in simulation units
        const x = -r1 * Math.cos(M);
        const z = -r1 * Math.sin(M);
        positions['Alpha'] = new THREE.Vector3(x, 0, z);
    }

    if (twilightData) {
        const M = (twilightData.initialPhaseRad + currentHours * twilightData.radsPerHour) % (2 * Math.PI);
        const r1 = 0.1 * 150;
        const x = r1 * Math.cos(M);
        const z = r1 * Math.sin(M);
        positions['Twilight'] = new THREE.Vector3(x, 0, z);
    }
    
    // Calculate the dynamic barycenter of the binary system
    if (alphaData && twilightData && positions['Alpha'] && positions['Twilight']) {
        const m1 = parseFloat(alphaData.mass || '1.0');
        const m2 = parseFloat(twilightData.mass || '0.6');
        const totalMass = m1 + m2;
        barycenter = positions['Alpha'].clone().multiplyScalar(m1)
            .add(positions['Twilight'].clone().multiplyScalar(m2))
            .divideScalar(totalMass);
    }


    bodyData.forEach(data => {
        // Skip binary stars as they are already calculated
        if (data.name === 'Alpha' || data.name === 'Twilight') return;

        let orbitCenter = barycenter; // Default orbit center is the binary barycenter

        // Beacon orbits the main barycenter.
        if (data.name === 'Beacon') {
            const M = (data.initialPhaseRad + currentHours * data.radsPerHour) % (2 * Math.PI);
            const r = data.orbitRadius || 0;
            const x = orbitCenter.x + r * Math.cos(M);
            const z = orbitCenter.z + r * Math.sin(M);
            positions[data.name] = new THREE.Vector3(x, orbitCenter.y, z);
        }
        
        // Planets orbiting Beacon are relative to its new position.
        // This must run after Beacon's position is calculated.
        if ((data.name === 'Gelidis' || data.name === 'Liminis')) {
             if (positions['Beacon']) {
                orbitCenter = positions['Beacon'];
             }
        }

        if (data.type === 'Planet') {
             // Calculate Mean Anomaly (M) using pre-calculated values
            const M = (data.initialPhaseRad + currentHours * data.radsPerHour) % (2 * Math.PI);
            
            let x: number;
            let z: number;

            if (data.eccentric && data.eccentricity && data.eccentricity > 0) {
                const e = data.eccentricity;
                const semiMajorAxis = data.orbitRadius || 0;
                
                const E = solveKepler(M, e);
                const v = 2 * Math.atan2(
                    Math.sqrt(1 + e) * Math.sin(E / 2),
                    Math.sqrt(1 - e) * Math.cos(E / 2)
                );

                const r = semiMajorAxis * (1 - e * Math.cos(E));
                
                x = orbitCenter.x + r * Math.cos(v);
                z = orbitCenter.z + r * Math.sin(v);
            } else {
                // Default to circular orbit
                const r = data.orbitRadius || 0;
                x = orbitCenter.x + r * Math.cos(M);
                z = orbitCenter.z + r * Math.sin(M);
            }

            positions[data.name] = new THREE.Vector3(x, orbitCenter.y, z);
        }
    });

    return positions;
};

    