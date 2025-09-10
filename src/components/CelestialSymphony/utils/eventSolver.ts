
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

// Calculate apparent radius of a body in degrees
function getApparentRadius(bodySize: number, bodyPos: THREE.Vector3, viewpointPos: THREE.Vector3): number {
    const distance = bodyPos.distanceTo(viewpointPos);
    return THREE.MathUtils.radToDeg(Math.atan(bodySize / distance));
}

// Check if the event conditions are met
function checkEventConditions(
    event: CelestialEvent,
    bodyPositions: { [key: string]: THREE.Vector3 },
    processedBodyData: ProcessedBodyData[],
    sebakaTilt: number
): { met: boolean; viewingLatitude: number; viewingLongitude: number } {
    const sebakaData = processedBodyData.find(d => d.name === 'Sebaka');
    if (!sebakaData) return { met: false, viewingLatitude: 0, viewingLongitude: event.viewingLongitude ?? 180 };
    const sebakaPos = bodyPositions['Sebaka'];
    const longitude = event.viewingLongitude ?? 180;
    
    const viewpointPos = (lat: number) => {
        const viewpointOffset = new THREE.Vector3().setFromSphericalCoords(
            sebakaData.size,
            Math.PI / 2 - THREE.MathUtils.degToRad(lat),
            THREE.MathUtils.degToRad(longitude)
        );
        const tiltRad = THREE.MathUtils.degToRad(sebakaTilt);
        viewpointOffset.applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltRad);
        return new THREE.Vector3().addVectors(sebakaPos, viewpointOffset);
    };


    const primaryBodyVectors = event.primaryBodies.map(name => {
        const bodyData = processedBodyData.find(d => d.name === name);
        const bodyPos = bodyPositions[name];
        if (!bodyData || !bodyPos) return null;
        
        // Use a temporary latitude of 0 to establish the celestial plane
        const tempViewpoint = viewpointPos(0);
        const vec = new THREE.Vector3().subVectors(bodyPos, tempViewpoint).normalize();
        return { name, vec, pos: bodyPos, data: bodyData };
    }).filter(Boolean) as { name: string; vec: THREE.Vector3; pos: THREE.Vector3; data: ProcessedBodyData }[];
    
    if (primaryBodyVectors.length !== event.primaryBodies.length) return { met: false, viewingLatitude: 0, viewingLongitude: longitude };

    // Calculate optimal viewing latitude by averaging the declination of primary bodies
    let totalDeclination = 0;
    primaryBodyVectors.forEach(body => {
        const declinationRad = Math.asin(body.vec.y); // Simplified declination
        totalDeclination += THREE.MathUtils.radToDeg(declinationRad);
    });
    const optimalLatitude = totalDeclination / primaryBodyVectors.length;

    // Recalculate vectors with the optimal latitude
    const finalViewpoint = viewpointPos(optimalLatitude);
    const finalBodyVectors = primaryBodyVectors.map(body => {
        const vec = new THREE.Vector3().subVectors(body.pos, finalViewpoint).normalize();
        return { ...body, vec };
    });

    switch (event.type) {
        case 'conjunction':
        case 'cluster': {
             let minAzimuth = Infinity, maxAzimuth = -Infinity;
             finalBodyVectors.forEach(({ vec }) => {
                // Azimuth is the angle on the XZ plane (like a compass)
                const azimuth = Math.atan2(vec.z, vec.x);
                minAzimuth = Math.min(minAzimuth, azimuth);
                maxAzimuth = Math.max(maxAzimuth, azimuth);
             });
             let separation = THREE.MathUtils.radToDeg(maxAzimuth - minAzimuth);
             if (separation > 180) separation = 360 - separation; // Handle wrap-around
             return { met: separation <= event.maxSeparation, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'occultation': {
            if (finalBodyVectors.length < 2) return { met: false, viewingLatitude: 0, viewingLongitude: longitude };
            // Check all pairs for overlap
            for (let i = 0; i < finalBodyVectors.length; i++) {
                for (let j = i + 1; j < finalBodyVectors.length; j++) {
                    const body1 = finalBodyVectors[i];
                    const body2 = finalBodyVectors[j];
                    
                    const separation = getAngularSeparation(body1.vec, body2.vec);
                    
                    const r1 = getApparentRadius(body1.data.size, body1.pos, finalViewpoint);
                    const r2 = getApparentRadius(body2.data.size, body2.pos, finalViewpoint);
                    
                    // Check if they are close enough to potentially overlap
                    if (separation > r1 + r2) {
                        return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude }; // Too far apart
                    }

                    // Check for minimum overlap if specified
                    if (event.minOverlap) {
                        const overlapAmount = (r1 + r2 - separation) / (2 * Math.min(r1, r2));
                        if (overlapAmount < event.minOverlap) {
                            return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude }; // Not enough overlap
                        }
                    }
                }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'dominance': {
            if (!event.secondaryBodies || !event.minSeparation || finalBodyVectors.length === 0) return { met: false, viewingLatitude: 0, viewingLongitude: longitude };
            
            const dominantVec = finalBodyVectors[0].vec;
            
            for (const secondaryName of event.secondaryBodies) {
                 const secondaryPos = bodyPositions[secondaryName];
                 if (!secondaryPos) continue;
                 const secondaryVec = new THREE.Vector3().subVectors(secondaryPos, finalViewpoint).normalize();
                 const separation = getAngularSeparation(dominantVec, secondaryVec);
                 if (separation < event.minSeparation) {
                     return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                 }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }

        case 'triangle': {
            if (finalBodyVectors.length !== 3) return { met: false, viewingLatitude: 0, viewingLongitude: longitude };
            const [v1, v2, v3] = finalBodyVectors.map(b => b.vec);
            const sep12 = getAngularSeparation(v1, v2);
            const sep13 = getAngularSeparation(v1, v3);
            const sep23 = getAngularSeparation(v2, v3);
            // Check if all sides of the triangle are smaller than the max separation
            return { met: sep12 < event.maxSeparation && sep13 < event.maxSeparation && sep23 < event.maxSeparation, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }

        default:
            return { met: false, viewingLatitude: 0, viewingLongitude: longitude };
    }
}

// Main solver function
export function findNextEvent(params: EventSearchParams): EventSearchResult | null {
    const { startHours, event, allBodiesData, direction, HOURS_IN_SEBAKA_DAY } = params;
    
    // The Great Conjunction at year 0 is a fixed anchor point of the lore.
    if (event.name === "Great Conjunction" && startHours === 0 && direction !== 'next') {
        return { foundHours: 0, viewingLongitude: event.viewingLongitude ?? 180, viewingLatitude: 0 };
    }

    const processedBodyData = getBodyData(allBodiesData);
    const sebakaData = processedBodyData.find(b => b.name === 'Sebaka');
    const sebakaTilt = sebakaData && sebakaData.axialTilt ? parseFloat(sebakaData.axialTilt) : 0;
    
    // Use a coarser step for performance, especially for rare events
    const stepDays = Math.max(1, Math.floor(event.approximatePeriodDays / 360));
    const stepHours = stepDays * HOURS_IN_SEBAKA_DAY;
    
    const maxSearchYears = 10000; // Increased search range
    const maxIterations = (maxSearchYears * params.SEBAKA_YEAR_IN_DAYS) / stepDays;
    
    let currentHours = Math.floor(startHours / stepHours) * stepHours;
    const timeStep = direction === 'next' ? stepHours : -stepHours;
    
    // Adjust start time for next/previous searches to avoid finding the current moment
    if (direction === 'next') {
        currentHours += timeStep;
    } else if (direction === 'previous' || direction === 'last') {
        currentHours -= timeStep;
        if (currentHours < 0) currentHours = startHours - HOURS_IN_SEBAKA_DAY; // Handle start of sim
    }


    for (let i = 0; i < maxIterations; i++) {
        currentHours += timeStep;
        if (currentHours < 0 && direction !== 'next') {
            break;
        };
        
        const bodyPositions = calculateBodyPositions(currentHours, processedBodyData);
        const { met, viewingLatitude, viewingLongitude } = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

        if (met) {
            // Found a coarse match, now refine it to the exact day
            let fineTuneHours = currentHours - (timeStep > 0 ? stepHours : 0);
            for (let j = 0; j < stepDays; j++) {
                fineTuneHours += HOURS_IN_SEBAKA_DAY * Math.sign(timeStep);
                 if (fineTuneHours < 0) continue;
                const finePositions = calculateBodyPositions(fineTuneHours, processedBodyData);
                const fineResult = checkEventConditions(event, finePositions, processedBodyData, sebakaTilt);
                if (fineResult.met) {
                     return {
                        foundHours: fineTuneHours,
                        viewingLongitude: fineResult.viewingLongitude,
                        viewingLatitude: fineResult.viewingLatitude,
                    };
                }
            }
            // If fine-tuning fails (unlikely), return the coarse result
            return {
                foundHours: currentHours,
                viewingLongitude: viewingLongitude,
                viewingLatitude: viewingLatitude,
            };
        }
    }

    console.warn(`Event search limit reached for ${event.name}`);
    return null;
}
