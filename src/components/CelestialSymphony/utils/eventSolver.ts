
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

interface BodyVectorInfo {
    name: string;
    vec: THREE.Vector3;
    pos: THREE.Vector3;
    data: ProcessedBodyData;
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

    const viewpointOffset = new THREE.Vector3().setFromSphericalCoords(
        sebakaRadius,
        Math.PI / 2 - latRad, // colatitude
        lonRad
    );
    
    const tiltQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(sebakaTilt));
    viewpointOffset.applyQuaternion(tiltQuat);
    
    const viewpoint = new THREE.Vector3().addVectors(sebakaPos, viewpointOffset);
    
    return new THREE.Vector3().subVectors(bodyPos, viewpoint);
}

// Calculate angular separation in degrees
function getAngularSeparation(v1: THREE.Vector3, v2: THREE.Vector3): number {
    return THREE.MathUtils.radToDeg(v1.angleTo(v2));
}

// Calculate apparent radius of a body in degrees
function getApparentRadius(bodySize: number, distance: number): number {
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
    
    const getBodyVectors = (lat: number): BodyVectorInfo[] | null => {
        const vectors = event.primaryBodies.map(name => {
            const bodyData = processedBodyData.find(d => d.name === name);
            const bodyPos = bodyPositions[name];
            if (!bodyData || !bodyPos) return null;
            const vec = getBodyVector(bodyPos, sebakaPos, sebakaData.size, sebakaTilt, longitude, lat);
            return { name, vec, pos: bodyPos, data: bodyData };
        }).filter(Boolean) as BodyVectorInfo[];
        if (vectors.length !== event.primaryBodies.length) return null;
        return vectors;
    };

    // Auto-calculate optimal latitude by aligning declination
    let optimalLatitude = event.viewingLatitude ?? 0;
    const initialVectorsForLat = getBodyVectors(optimalLatitude);
    if (!initialVectorsForLat) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

    // Calculate the average "up-down" angle (declination) of the bodies
    let totalDeclination = 0;
    initialVectorsForLat.forEach(body => {
        const bodyDir = body.vec.clone().normalize();
        const declinationRad = Math.asin(bodyDir.y);
        totalDeclination += THREE.MathUtils.radToDeg(declinationRad);
    });
    // Set the latitude to the average declination to center the event vertically
    optimalLatitude = totalDeclination / initialVectorsForLat.length;
    
    const finalBodyVectors = getBodyVectors(optimalLatitude);
    if (!finalBodyVectors) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

    const viewpoint = new THREE.Vector3().addVectors(sebakaPos, getBodyVector(new THREE.Vector3(), sebakaPos, sebakaData.size, sebakaTilt, longitude, optimalLatitude));
    
    finalBodyVectors.forEach(bv => bv.vec.normalize());

    switch (event.type) {
        case 'conjunction': {
            if (finalBodyVectors.length < 2) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            
            // Check for wide arc
            let maxAngle = 0;
            for (let i = 0; i < finalBodyVectors.length; i++) {
                for (let j = i + 1; j < finalBodyVectors.length; j++) {
                    const angle = getAngularSeparation(finalBodyVectors[i].vec, finalBodyVectors[j].vec);
                    if (angle > maxAngle) maxAngle = angle;
                }
            }
            if (maxAngle > event.longitudeTolerance) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

            // If a minimum separation is defined (for non-overlapping conjunctions)
            if (event.minSeparation) {
                for (let i = 0; i < finalBodyVectors.length; i++) {
                    for (let j = i + 1; j < finalBodyVectors.length; j++) {
                        const body1 = finalBodyVectors[i];
                        const body2 = finalBodyVectors[j];
                        const separation = getAngularSeparation(body1.vec, body2.vec);
                        const r1 = getApparentRadius(body1.data.size, body1.pos.distanceTo(viewpoint));
                        const r2 = getApparentRadius(body2.data.size, body2.pos.distanceTo(viewpoint));
                        if (separation < (r1 + r2 + event.minSeparation)) {
                             return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                        }
                    }
                }
            }
            
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'cluster':
        case 'triangle': {
            const avgVector = new THREE.Vector3();
            finalBodyVectors.forEach(({ vec }) => avgVector.add(vec));
            avgVector.normalize();
            for (const { vec } of finalBodyVectors) {
                if (getAngularSeparation(vec, avgVector) > event.longitudeTolerance) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'occultation': {
            if (finalBodyVectors.length < 2) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

            // For multi-body occultations, ensure they are all in a very tight group
            const avgVector = new THREE.Vector3();
            finalBodyVectors.forEach(({ vec }) => avgVector.add(vec));
            avgVector.normalize();

            for (const { vec } of finalBodyVectors) {
                if (getAngularSeparation(vec, avgVector) > event.longitudeTolerance) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }

            // Also check for pairwise overlap if a threshold is set
            if (event.overlapThreshold) {
                 for (let i = 0; i < finalBodyVectors.length; i++) {
                    for (let j = i + 1; j < finalBodyVectors.length; j++) {
                        const body1 = finalBodyVectors[i];
                        const body2 = finalBodyVectors[j];
                        const separation = getAngularSeparation(body1.vec, body2.vec);
                        const r1 = getApparentRadius(body1.data.size, body1.pos.distanceTo(viewpoint));
                        const r2 = getApparentRadius(body2.data.size, body2.pos.distanceTo(viewpoint));
                        if (separation > (r1 + r2)) {
                             return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                        }
                    }
                }
            }

            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'dominance': {
            if (!event.secondaryBodies || !event.minSeparation || finalBodyVectors.length === 0) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            const dominantVec = finalBodyVectors[0].vec;
            const secondaryData = event.secondaryBodies.map(name => processedBodyData.find(d => d.name === name)).filter(Boolean) as ProcessedBodyData[];

            for (const secondary of secondaryData) {
                 const secondaryPos = bodyPositions[secondary.name];
                 if (!secondaryPos) continue;
                 const secondaryVec = getBodyVector(secondaryPos, sebakaPos, sebakaData.size, sebakaTilt, longitude, optimalLatitude).normalize();
                 const separation = getAngularSeparation(dominantVec, secondaryVec);
                 if (separation < event.minSeparation) {
                     return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                 }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }

        default:
            return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
    }
}

// Main solver function
export function findNextEvent(params: EventSearchParams): EventSearchResult | null {
    const { startHours, event, allBodiesData, direction, HOURS_IN_SEBAKA_DAY } = params;
    
    // The Great Conjunction at year 0 is a fixed anchor point of the lore.
    if (event.name === "Great Conjunction" && startHours === 0 && direction !== 'next') {
        const processedBodyData = getBodyData(allBodiesData);
        const sebakaData = processedBodyData.find(b => b.name === 'Sebaka');
        const sebakaTilt = sebakaData && sebakaData.axialTilt ? parseFloat(sebakaData.axialTilt) : 0;
        const result = checkEventConditions(event, calculateBodyPositions(0, processedBodyData), processedBodyData, sebakaTilt);
        if (result.met) {
            return { foundHours: 0, viewingLongitude: result.viewingLongitude, viewingLatitude: result.viewingLatitude };
        }
    }

    const processedBodyData = getBodyData(allBodiesData);
    const sebakaData = processedBodyData.find(b => b.name === 'Sebaka');
    const sebakaTilt = sebakaData && sebakaData.axialTilt ? parseFloat(sebakaData.axialTilt) : 0;
    
    const stepDays = Math.max(1, Math.floor(event.approximatePeriodDays / 1440)); // Finer search for rare events
    const stepHours = stepDays * HOURS_IN_SEBAKA_DAY;
    
    const maxSearchYears = event.approximatePeriodDays / params.SEBAKA_YEAR_IN_DAYS * 1.5;
    const maxIterations = Math.max(2000, (maxSearchYears * params.SEBAKA_YEAR_IN_DAYS) / stepDays);
    
    let currentHours = Math.floor(startHours / stepHours) * stepHours;
    const timeStep = direction === 'next' ? stepHours : -stepHours;
    
    // Adjust start time for next/previous searches to avoid finding the current moment
    if (direction === 'next') {
        currentHours += timeStep;
    } else if (direction === 'previous' || direction === 'last') {
        currentHours -= timeStep;
        if (currentHours < 0) currentHours = startHours - HOURS_IN_SEBAKA_DAY;
    }

    for (let i = 0; i < maxIterations; i++) {
        currentHours += timeStep;
        if (currentHours < 0 && (direction === 'previous' || direction === 'last')) {
             if (i === 0 && direction === 'last') currentHours = startHours; // Check current day for 'last'
             else continue;
        };
        
        const bodyPositions = calculateBodyPositions(currentHours, processedBodyData);
        const { met, viewingLatitude, viewingLongitude } = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

        if (met) {
            // Found a coarse match, now fine-tune to the exact day
            let fineTuneHours = currentHours - (timeStep > 0 ? stepHours : 0);
            for (let j = 0; j < stepDays + 1; j++) {
                const fineHours = fineTuneHours + (j * HOURS_IN_SEBAKA_DAY * Math.sign(timeStep));
                 if (fineHours < 0 && timeStep < 0) continue;
                const finePositions = calculateBodyPositions(fineHours, processedBodyData);
                const fineResult = checkEventConditions(event, finePositions, processedBodyData, sebakaTilt);
                if (fineResult.met) {
                     return {
                        foundHours: fineHours,
                        viewingLongitude: fineResult.viewingLongitude,
                        viewingLatitude: fineResult.viewingLatitude,
                    };
                }
            }
            // If fine-tuning fails, return the coarse match
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
