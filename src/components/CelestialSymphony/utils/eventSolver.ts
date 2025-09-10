

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

    let optimalLatitude = event.viewingLatitude ?? 0;
    const initialVectors = getBodyVectors(optimalLatitude);
    if (!initialVectors) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

    if (event.viewingLatitude === undefined) {
        let totalDeclination = 0;
        initialVectors.forEach(body => {
            const declinationRad = Math.asin(body.vec.normalize().y);
            totalDeclination += THREE.MathUtils.radToDeg(declinationRad);
        });
        optimalLatitude = totalDeclination / initialVectors.length;
    }
    
    const finalBodyVectors = getBodyVectors(optimalLatitude);
    if (!finalBodyVectors) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

    const viewpoint = new THREE.Vector3().addVectors(sebakaPos, getBodyVector(new THREE.Vector3(), sebakaPos, sebakaData.size, sebakaTilt, longitude, optimalLatitude));
    
    finalBodyVectors.forEach(bv => bv.vec.normalize());

    switch (event.type) {
        case 'conjunction': {
            if (finalBodyVectors.length < 2) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            let maxAngle = 0;
            for (let i = 0; i < finalBodyVectors.length; i++) {
                for (let j = i + 1; j < finalBodyVectors.length; j++) {
                    const angle = getAngularSeparation(finalBodyVectors[i].vec, finalBodyVectors[j].vec);
                    if (angle > maxAngle) {
                        maxAngle = angle;
                    }
                }
            }
            return { met: maxAngle < event.maxSeparation && maxAngle > (event.minSeparation ?? 0), viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'cluster': {
            const avgVector = new THREE.Vector3();
            finalBodyVectors.forEach(({ vec }) => avgVector.add(vec));
            avgVector.normalize();
            for (const { vec } of finalBodyVectors) {
                if (getAngularSeparation(vec, avgVector) > event.maxSeparation) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'occultation': {
            if (finalBodyVectors.length < 2) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

            let totalApparentRadius = 0;
            finalBodyVectors.forEach(body => {
                const distance = body.pos.distanceTo(viewpoint);
                totalApparentRadius += getApparentRadius(body.data.size, distance);
            });

            // For multi-body occultations, ensure they are all in a line.
            const avgVector = new THREE.Vector3();
            finalBodyVectors.forEach(({ vec }) => avgVector.add(vec));
            avgVector.normalize();
            
            for (const { vec } of finalBodyVectors) {
                if (getAngularSeparation(vec, avgVector) > event.maxSeparation) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }

            // Check if pairwise separation is less than sum of radii
            for (let i = 0; i < finalBodyVectors.length; i++) {
                for (let j = i + 1; j < finalBodyVectors.length; j++) {
                    const body1 = finalBodyVectors[i];
                    const body2 = finalBodyVectors[j];
                    const separation = getAngularSeparation(body1.vec, body2.vec);
                    const r1 = getApparentRadius(body1.data.size, body1.pos.distanceTo(viewpoint));
                    const r2 = getApparentRadius(body2.data.size, body2.pos.distanceTo(viewpoint));
                    if (separation > r1 + r2) {
                         return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                    }
                }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'dominance': {
            if (!event.secondaryBodies || !event.minSeparation || finalBodyVectors.length === 0) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            const dominantVec = finalBodyVectors[0].vec;
            for (const secondaryName of event.secondaryBodies) {
                 const secondaryPos = bodyPositions[secondaryName];
                 if (!secondaryPos) continue;
                 const secondaryVec = getBodyVector(secondaryPos, sebakaPos, sebakaData.size, sebakaTilt, longitude, optimalLatitude).normalize();
                 const separation = getAngularSeparation(dominantVec, secondaryVec);
                 if (separation < event.minSeparation) {
                     return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                 }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }

        case 'triangle': {
            if (finalBodyVectors.length !== 3) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            const [v1, v2, v3] = finalBodyVectors.map(b => b.vec);
            const sep12 = getAngularSeparation(v1, v2);
            const sep13 = getAngularSeparation(v1, v3);
            const sep23 = getAngularSeparation(v2, v3);
            return { met: sep12 < event.maxSeparation && sep13 < event.maxSeparation && sep23 < event.maxSeparation, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
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
        const result = checkEventConditions(event, calculateBodyPositions(0, getBodyData(allBodiesData)), getBodyData(allBodiesData), 23.5);
        if (result.met) {
            return { foundHours: 0, viewingLongitude: result.viewingLongitude, viewingLatitude: result.viewingLatitude };
        }
    }

    const processedBodyData = getBodyData(allBodiesData);
    const sebakaData = processedBodyData.find(b => b.name === 'Sebaka');
    const sebakaTilt = sebakaData && sebakaData.axialTilt ? parseFloat(sebakaData.axialTilt) : 0;
    
    const stepDays = Math.max(1, Math.floor(event.approximatePeriodDays / 720)); // Finer search for rare events
    const stepHours = stepDays * HOURS_IN_SEBAKA_DAY;
    
    const maxSearchYears = event.approximatePeriodDays / params.SEBAKA_YEAR_IN_DAYS * 2;
    const maxIterations = Math.max(1000, (maxSearchYears * params.SEBAKA_YEAR_IN_DAYS) / stepDays);
    
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
             else break;
        };
        
        const bodyPositions = calculateBodyPositions(currentHours, processedBodyData);
        const { met, viewingLatitude, viewingLongitude } = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

        if (met) {
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
