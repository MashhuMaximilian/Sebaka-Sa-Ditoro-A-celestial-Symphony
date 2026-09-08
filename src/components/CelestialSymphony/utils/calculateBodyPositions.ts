
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

    // Calculate the close binary around its shared barycenter. The configured
    // separation is 0.2 AU; the two stars do not each orbit at 0.1 AU because
    // their masses are different.
    const alphaData = bodyData.find(d => d.name === 'Alpha');
    const twilightData = bodyData.find(d => d.name === 'Twilight');
    const binarySeparation = 0.2 * 150;
    const alphaMass = alphaData ? parseFloat(alphaData.mass || '1.0') : 1.0;
    const twilightMass = twilightData ? parseFloat(twilightData.mass || '0.6') : 0.6;
    const binaryMass = alphaMass + twilightMass;
    const alphaOrbitRadius = binarySeparation * twilightMass / binaryMass;
    const twilightOrbitRadius = binarySeparation * alphaMass / binaryMass;
    const binaryPhase = alphaData
        ? (alphaData.initialPhaseRad + currentHours * alphaData.radsPerHour) % (2 * Math.PI)
        : 0;

    if (alphaData) {
        const x = -alphaOrbitRadius * Math.cos(binaryPhase);
        const z = -alphaOrbitRadius * Math.sin(binaryPhase);
        positions['Alpha'] = new THREE.Vector3(x, 0, z);
    }

    if (twilightData) {
        const x = twilightOrbitRadius * Math.cos(binaryPhase);
        const z = twilightOrbitRadius * Math.sin(binaryPhase);
        positions['Twilight'] = new THREE.Vector3(x, 0, z);
    }

    // Calculate the dynamic barycenter of the binary system
    if (alphaData && twilightData && positions['Alpha'] && positions['Twilight']) {
        const m1 = alphaMass;
        const m2 = twilightMass;
        const totalMass = binaryMass;
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
            
            let orbitalX: number;
            let orbitalZ: number;

            if (data.eccentric && data.eccentricity && data.eccentricity > 0) {
                const e = data.eccentricity;
                const semiMajorAxis = data.orbitRadius || 0;
                
                const E = solveKepler(M, e);
                const v = 2 * Math.atan2(
                    Math.sqrt(1 + e) * Math.sin(E / 2),
                    Math.sqrt(1 - e) * Math.cos(E / 2)
                );

                const r = semiMajorAxis * (1 - e * Math.cos(E));
                
                orbitalX = r * Math.cos(v);
                orbitalZ = r * Math.sin(v);
            } else {
                // Default to circular orbit
                const r = data.orbitRadius || 0;
                orbitalX = r * Math.cos(M);
                orbitalZ = r * Math.sin(M);
            }

            // Inclination and node are observer-important even when the
            // renderer remains a simple Keplerian model. Keep the orbital
            // radius in the local plane, then rotate that plane into 3D.
            const inclination = THREE.MathUtils.degToRad(data.inclinationDeg ?? 0);
            const node = THREE.MathUtils.degToRad(data.longitudeOfAscendingNodeDeg ?? 0);
            const inclinedY = orbitalZ * Math.sin(inclination);
            const inclinedZ = orbitalZ * Math.cos(inclination);
            const x = orbitalX * Math.cos(node) - inclinedZ * Math.sin(node);
            const z = orbitalX * Math.sin(node) + inclinedZ * Math.cos(node);

            positions[data.name] = new THREE.Vector3(
                orbitCenter.x + x,
                orbitCenter.y + inclinedY,
                orbitCenter.z + z,
            );
        }
    });

    return positions;
};
