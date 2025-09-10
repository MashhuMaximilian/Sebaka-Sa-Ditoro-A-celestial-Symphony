
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
    
    // Apply Sebaka's axial tilt
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
    
    // Get all primary and secondary body vectors from an initial latitude guess (0)
    const allRelevantBodyNames = [...event.primaryBodies, ...(event.secondaryBodies || [])];
    const initialVectorsForLat = (allRelevantBodyNames.map(name => {
        const bodyData = processedBodyData.find(d => d.name === name);
        const bodyPos = bodyPositions[name];
        if (!bodyData || !bodyPos) return null;
        const vec = getBodyVector(bodyPos, sebakaPos, sebakaData.size, sebakaTilt, longitude, 0);
        return { name, vec, pos: bodyPos, data: bodyData };
    }).filter(Boolean) as BodyVectorInfo[]);

    if (initialVectorsForLat.length !== allRelevantBodyNames.length) return { met: false, viewingLatitude: 0, viewingLongitude: longitude };

    // Auto-calculate optimal latitude by aligning declination of primary bodies
    let totalDeclination = 0;
    const primaryBodyInfoForLat = initialVectorsForLat.filter(info => event.primaryBodies.includes(info.name));
    primaryBodyInfoForLat.forEach(body => {
        const bodyDir = body.vec.clone().normalize();
        totalDeclination += THREE.MathUtils.radToDeg(Math.asin(bodyDir.y));
    });
    const optimalLatitude = primaryBodyInfoForLat.length > 0 ? totalDeclination / primaryBodyInfoForLat.length : 0;
    
    // Get final vectors using the optimal latitude
    const primaryBodyInfo = (event.primaryBodies.map(name => {
        const bodyData = processedBodyData.find(d => d.name === name);
        const bodyPos = bodyPositions[name];
        if (!bodyData || !bodyPos) return null;
        const vec = getBodyVector(bodyPos, sebakaPos, sebakaData.size, sebakaTilt, longitude, optimalLatitude).normalize();
        return { name, vec, pos: bodyPos, data: bodyData };
    }).filter(Boolean) as BodyVectorInfo[]);

    if (primaryBodyInfo.length !== event.primaryBodies.length) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
    
    const viewpoint = new THREE.Vector3().addVectors(sebakaPos, getBodyVector(new THREE.Vector3(), sebakaPos, sebakaData.size, sebakaTilt, longitude, optimalLatitude));
    
    // Check if secondary bodies are just present
    if (event.secondaryBodies) {
      for (const name of event.secondaryBodies) {
        if (!bodyPositions[name]) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
      }
    }

    switch (event.type) {
        case 'conjunction': {
            if (primaryBodyInfo.length < 2) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            
            let maxAngle = 0;
            for (let i = 0; i < primaryBodyInfo.length; i++) {
                for (let j = i + 1; j < primaryBodyInfo.length; j++) {
                    const angle = getAngularSeparation(primaryBodyInfo[i].vec, primaryBodyInfo[j].vec);
                    if (angle > maxAngle) maxAngle = angle;
                }
            }
            if (maxAngle > event.longitudeTolerance) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

            if (event.minSeparation) {
                for (let i = 0; i < primaryBodyInfo.length; i++) {
                    for (let j = i + 1; j < primaryBodyInfo.length; j++) {
                        const body1 = primaryBodyInfo[i];
                        const body2 = primaryBodyInfo[j];
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
            primaryBodyInfo.forEach(({ vec }) => avgVector.add(vec));
            avgVector.normalize();
            for (const { vec } of primaryBodyInfo) {
                if (getAngularSeparation(vec, avgVector) > event.longitudeTolerance) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'occultation': {
            if (primaryBodyInfo.length < 2) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

            const avgVector = new THREE.Vector3();
            primaryBodyInfo.forEach(({ vec }) => avgVector.add(vec));
            avgVector.normalize();

            for (const { vec, pos, data } of primaryBodyInfo) {
                if (getAngularSeparation(vec, avgVector) > event.longitudeTolerance) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }
            
            if (event.overlapThreshold) {
                let overlapMet = false;
                for (let i = 0; i < primaryBodyInfo.length; i++) {
                    for (let j = i + 1; j < primaryBodyInfo.length; j++) {
                        const body1 = primaryBodyInfo[i];
                        const body2 = primaryBodyInfo[j];
                        const separation = getAngularSeparation(body1.vec, body2.vec);
                        const r1 = getApparentRadius(body1.data.size, body1.pos.distanceTo(viewpoint));
                        const r2 = getApparentRadius(body2.data.size, body2.pos.distanceTo(viewpoint));
                        
                        const overlap = (r1 + r2) - separation;
                        const minOverlapSize = Math.min(r1, r2) * 2 * event.overlapThreshold;
                        if (overlap >= minOverlapSize) {
                            overlapMet = true;
                            break;
                        }
                    }
                    if (overlapMet) break;
                }
                 if (!overlapMet && primaryBodyInfo.length > 1) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            }

            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'dominance': {
            if (!event.secondaryBodies || !event.minSeparation || primaryBodyInfo.length === 0) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            const dominantVec = primaryBodyInfo[0].vec;
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

    const processedBodyData = getBodyData(allBodiesData);
    const sebakaData = processedBodyData.find(b => b.name === 'Sebaka');
    const sebakaTilt = sebakaData && sebakaData.axialTilt ? parseFloat(sebakaData.axialTilt) : 0;
    
    // -- OPTIMIZATION: Use a coarser step for very rare events --
    let coarseStepDays = 1;
    if (event.approximatePeriodDays > 365) { // Only use coarse stepping for long-period events
        coarseStepDays = Math.max(1, Math.floor(event.approximatePeriodDays / 365));
    }
    const coarseStepHours = coarseStepDays * HOURS_IN_SEBAKA_DAY;
    const fineStepHours = 1 * HOURS_IN_SEBAKA_DAY;
    
    const timeMultiplier = direction === 'next' ? 1 : -1;

    let currentHours = startHours + (timeMultiplier * coarseStepHours);
    
    const maxSearchYears = Math.max(5, (event.approximatePeriodDays / params.SEBAKA_YEAR_IN_DAYS) * 1.5);
    const maxIterations = Math.max(20000, (maxSearchYears * params.SEBAKA_YEAR_IN_DAYS) / coarseStepDays);
    
    let lastMetState = false;
    let coarseFoundHours: number | null = null;
    
    // 1. Coarse search to find a potential window
    for (let i = 0; i < maxIterations; i++) {
        currentHours += timeMultiplier * coarseStepHours;
        if (currentHours < 0 && direction !== 'next') continue;
        
        const bodyPositions = calculateBodyPositions(currentHours, processedBodyData);
        const { met } = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);
        
        // We've found a transition from "not met" to "met", indicating we've entered an event window
        if (met && !lastMetState) {
            coarseFoundHours = currentHours;
            break;
        }
        lastMetState = met;
    }

    if (coarseFoundHours === null) {
        console.warn(`Coarse search limit reached for ${event.name}`);
        return null; // No potential window found
    }
    
    // 2. Fine search to pinpoint the exact day
    let fineTuneStartHours = coarseFoundHours - (timeMultiplier * coarseStepHours);
    const fineTuneIterations = coarseStepDays * 2; 

    for (let j = 0; j < fineTuneIterations; j++) {
        const fineHours = fineTuneStartHours + (j * fineStepHours * timeMultiplier);
        if (fineHours < 0 && timeMultiplier < 0) continue;

        const finePositions = calculateBodyPositions(fineHours, processedBodyData);
        const fineResult = checkEventConditions(event, finePositions, processedBodydData, sebakaTilt);
        if (fineResult.met) {
             return {
                foundHours: fineHours,
                viewingLongitude: fineResult.viewingLongitude,
                viewingLatitude: fineResult.viewingLatitude,
            };
        }
    }

    console.warn(`Fine search failed for ${event.name} after finding coarse window.`);
    return null;
}
