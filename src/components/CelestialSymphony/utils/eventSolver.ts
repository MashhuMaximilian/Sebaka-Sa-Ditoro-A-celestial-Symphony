
import * as THREE from 'three';
import { type CelestialEvent } from '../constants/events';
import { type AnyBodyData } from '@/types';
import { getBodyData, type ProcessedBodyData } from '../hooks/useBodyData';
import { calculateBodyPositions } from './calculateBodyPositions';

export interface EventSearchParams {
    startHours: number;
    event: CelestialEvent;
    allBodiesData: AnyBodyData[];
    direction: 'next' | 'previous' | 'last';
    SEBAKA_YEAR_IN_DAYS: number;
    HOURS_IN_SEBAKA_DAY: number;
}

interface EventSearchResult {
    foundHours: number;
    viewingLongitude: number;
    viewingLatitude: number;
}

// Get the vector from the viewpoint on Sebaka's surface to a celestial body
function getBodyVector(
    bodyPos: THREE.Vector3,
    sebakaPos: THREE.Vector3,
    sebakaRadius: number,
    sebakaTilt: number,
    longitude: number,
    latitude: number
): THREE.Vector3 {
    const lonRad = THREE.MathUtils.degToRad(longitude);
    const latRad = THREE.MathUtils.degToRad(latitude);

    // Calculate viewpoint on a non-tilted sphere
    const viewpointOffset = new THREE.Vector3().setFromSphericalCoords(
        sebakaRadius,
        Math.PI / 2 - latRad, // colatitude
        lonRad
    );

    // Apply Sebaka's axial tilt
    const tiltRad = THREE.MathUtils.degToRad(sebakaTilt);
    viewpointOffset.applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltRad);
    
    const viewpoint = new THREE.Vector3().addVectors(sebakaPos, viewpointOffset);
    
    return new THREE.Vector3().subVectors(bodyPos, viewpoint).normalize();
}

// Calculate angular separation in degrees
function getAngularSeparation(v1: THREE.Vector3, v2: THREE.Vector3): number {
    return THREE.MathUtils.radToDeg(v1.angleTo(v2));
}

// Calculate apparent radius of a body
function getApparentRadius(bodySize: number, bodyPos: THREE.Vector3, viewpoint: THREE.Vector3): number {
    const distance = bodyPos.distanceTo(viewpoint);
    return THREE.MathUtils.radToDeg(Math.atan(bodySize / distance));
}

// Check if the event conditions are met
function checkEventConditions(
    event: CelestialEvent,
    bodyPositions: { [key: string]: THREE.Vector3 },
    processedBodyData: ProcessedBodyData[],
    sebakaTilt: number
): { met: boolean; viewingLatitude: number } {
    const sebakaData = processedBodyData.find(d => d.name === 'Sebaka');
    if (!sebakaData) return { met: false, viewingLatitude: 0 };
    const sebakaPos = bodyPositions['Sebaka'];
    const longitude = event.viewingLongitude ?? 180;

    const primaryBodyVectors = event.primaryBodies.map(name => {
        const bodyData = processedBodyData.find(d => d.name === name);
        const bodyPos = bodyPositions[name];
        if (!bodyData || !bodyPos) return null;
        
        // Temporarily use 0 latitude to find the celestial plane
        const vec = getBodyVector(bodyPos, sebakaPos, sebakaData.size, sebakaTilt, longitude, 0);
        return { name, vec, pos: bodyPos };
    }).filter(Boolean) as { name: string; vec: THREE.Vector3; pos: THREE.Vector3 }[];
    
    if (primaryBodyVectors.length !== event.primaryBodies.length) return { met: false, viewingLatitude: 0 };

    // Calculate average declination (latitude in the sky) of the primary bodies
    let totalDeclination = 0;
    primaryBodyVectors.forEach(body => {
        // Project vector onto the YZ plane to get declination angle
        const declinationRad = Math.atan2(body.vec.y, Math.sqrt(body.vec.x**2 + body.vec.z**2));
        totalDeclination += THREE.MathUtils.radToDeg(declinationRad);
    });
    const viewingLatitude = totalDeclination / primaryBodyVectors.length;

    // Recalculate vectors with the optimal latitude
    const finalBodyVectors = primaryBodyVectors.map(body => {
        const vec = getBodyVector(body.pos, sebakaPos, sebakaData.size, sebakaTilt, longitude, viewingLatitude);
        return { name: body.name, vec, pos: body.pos };
    });

    switch (event.type) {
        case 'conjunction':
        case 'cluster': {
             // For arcs, we check if all planets fall within a certain angular span.
            let maxAzimuth = -Infinity, minAzimuth = Infinity;
            finalBodyVectors.forEach(({ vec }) => {
                const azimuth = Math.atan2(vec.z, vec.x); // Angle in the XZ plane
                maxAzimuth = Math.max(maxAzimuth, azimuth);
                minAzimuth = Math.min(minAzimuth, azimuth);
            });
            let separation = THREE.MathUtils.radToDeg(maxAzimuth - minAzimuth);
            // Handle wrap-around at 360 degrees
            if (separation > 180) separation = 360 - separation;
            return { met: separation <= event.maxSeparation, viewingLatitude };
        }
        
        case 'occultation': {
            const viewpoint = sebakaPos.clone(); // Simplified viewpoint
            for (let i = 0; i < finalBodyVectors.length; i++) {
                for (let j = i + 1; j < finalBodyVectors.length; j++) {
                    const body1 = finalBodyVectors[i];
                    const body2 = finalBodyVectors[j];
                    const separation = getAngularSeparation(body1.vec, body2.vec);

                    const body1Data = processedBodyData.find(d => d.name === body1.name)!;
                    const body2Data = processedBodyData.find(d => d.name === body2.name)!;

                    const r1 = getApparentRadius(body1Data.size, body1.pos, viewpoint);
                    const r2 = getApparentRadius(body2Data.size, body2.pos, viewpoint);
                    
                    if (separation > r1 + r2) return { met: false, viewingLatitude }; // Not even touching

                    const overlap = (r1 + r2 - separation) / (2 * Math.min(r1, r2));
                    if (overlap < (event.minOverlap ?? 0.1)) return { met: false, viewingLatitude };
                }
            }
            return { met: true, viewingLatitude };
        }
        
        case 'dominance': {
            if (!event.secondaryBodies || !event.minSeparation) return { met: false, viewingLatitude: 0 };
            const dominantVec = finalBodyVectors[0].vec;
            
            const secondaryPositions = event.secondaryBodies.map(name => bodyPositions[name]).filter(Boolean);
            for (const secondaryPos of secondaryPositions) {
                const secondaryVec = getBodyVector(secondaryPos, sebakaPos, sebakaData.size, sebakaTilt, longitude, viewingLatitude);
                const separation = getAngularSeparation(dominantVec, secondaryVec);
                if (separation < event.minSeparation) {
                    return { met: false, viewingLatitude };
                }
            }
            return { met: true, viewingLatitude };
        }

        case 'triangle': {
            if (finalBodyVectors.length !== 3) return { met: false, viewingLatitude: 0 };
            const [v1, v2, v3] = finalBodyVectors.map(b => b.vec);
            const sep12 = getAngularSeparation(v1, v2);
            const sep13 = getAngularSeparation(v1, v3);
            const sep23 = getAngularSeparation(v2, v3);
            return { met: sep12 < event.maxSeparation && sep13 < event.maxSeparation && sep23 < event.maxSeparation, viewingLatitude };
        }

        default:
            return { met: false, viewingLatitude: 0 };
    }
}

// Main solver function
export function findNextEvent(params: EventSearchParams): EventSearchResult | null {
    const { startHours, event, allBodiesData, direction, HOURS_IN_SEBAKA_DAY } = params;
    
    if (event.name === "Great Conjunction" && startHours === 0 && direction !== 'next') {
        return { foundHours: 0, viewingLongitude: event.viewingLongitude ?? 180, viewingLatitude: 0 };
    }

    const processedBodyData = getBodyData(allBodiesData);
    const sebakaData = processedBodyData.find(b => b.name === 'Sebaka');
    const sebakaTilt = sebakaData && sebakaData.axialTilt ? parseFloat(sebakaData.axialTilt) : 0;
    
    // Use a coarser step for performance, especially for rare events
    const stepDays = Math.max(1, Math.floor(event.approximatePeriodDays / 360));
    const stepHours = stepDays * HOURS_IN_SEBAKA_DAY;
    
    const maxSearchYears = 1000;
    const maxIterations = (maxSearchYears * params.SEBAKA_YEAR_IN_DAYS) / stepDays;
    
    let currentHours = Math.floor(startHours / stepHours) * stepHours;
    const timeStep = direction === 'next' ? stepHours : -stepHours;
    
    if (direction === 'next') currentHours += timeStep;
    else if (direction === 'previous') currentHours -= timeStep;

    for (let i = 0; i < maxIterations; i++) {
        currentHours += timeStep;
        if (currentHours < 0 && direction !== 'next') {
            break;
        };
        
        const bodyPositions = calculateBodyPositions(currentHours, processedBodyData);
        const { met, viewingLatitude } = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

        if (met) {
            // Found a coarse match, now refine it
            let fineTuneHours = currentHours - stepHours;
            for (let j = 0; j < stepDays; j++) {
                fineTuneHours += HOURS_IN_SEBAKA_DAY;
                const finePositions = calculateBodyPositions(fineTuneHours, processedBodyData);
                const fineResult = checkEventConditions(event, finePositions, processedBodyData, sebakaTilt);
                if (fineResult.met) {
                     return {
                        foundHours: fineTuneHours,
                        viewingLongitude: event.viewingLongitude ?? 180,
                        viewingLatitude: fineResult.viewingLatitude
                    };
                }
            }
            // If fine-tuning fails, return coarse result
            return {
                foundHours: currentHours,
                viewingLongitude: event.viewingLongitude ?? 180,
                viewingLatitude: viewingLatitude
            };
        }
    }

    console.warn(`Event search limit reached for ${event.name}`);
    return null;
}
