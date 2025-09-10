
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
    apparentRadius: number;
}

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
        Math.PI / 2 - latRad,
        lonRad
    );
    
    const tiltQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(sebakaTilt));
    viewpointOffset.applyQuaternion(tiltQuat);
    
    const viewpoint = new THREE.Vector3().addVectors(sebakaPos, viewpointOffset);
    
    return new THREE.Vector3().subVectors(bodyPos, viewpoint);
}

function getAngularSeparation(v1: THREE.Vector3, v2: THREE.Vector3): number {
    return THREE.MathUtils.radToDeg(v1.angleTo(v2));
}

function getApparentRadius(bodySize: number, distance: number): number {
    return THREE.MathUtils.radToDeg(Math.atan(bodySize / distance));
}

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
    
    const allRelevantBodyNames = [...event.primaryBodies, ...(event.secondaryBodies || [])];

    const primaryBodyInfoForLat = (event.primaryBodies.map(name => {
        const bodyData = processedBodyData.find(d => d.name === name);
        const bodyPos = bodyPositions[name];
        if (!bodyData || !bodyPos) return null;
        const vec = getBodyVector(bodyPos, sebakaPos, sebakaData.size, sebakaTilt, longitude, 0);
        return { vec };
    }).filter(Boolean) as { vec: THREE.Vector3 }[]);

    if (primaryBodyInfoForLat.length !== event.primaryBodies.length) return { met: false, viewingLatitude: 0, viewingLongitude: longitude };
    
    let totalY = 0;
    primaryBodyInfoForLat.forEach(body => {
        const bodyDir = body.vec.clone().normalize();
        totalY += bodyDir.y;
    });
    const avgY = totalY / primaryBodyInfoForLat.length;
    const optimalLatitude = -THREE.MathUtils.radToDeg(Math.asin(avgY));

    const allBodyInfo = (allRelevantBodyNames.map(name => {
        const bodyData = processedBodyData.find(d => d.name === name);
        const bodyPos = bodyPositions[name];
        if (!bodyData || !bodyPos) return null;
        const vec = getBodyVector(bodyPos, sebakaPos, sebakaData.size, sebakaTilt, longitude, optimalLatitude).normalize();
        const distance = bodyPos.distanceTo(sebakaPos);
        const apparentRadius = getApparentRadius(bodyData.size, distance);
        return { name, vec, pos: bodyPos, data: bodyData, apparentRadius };
    }).filter(Boolean) as BodyVectorInfo[]);

    const primaryBodyInfo = allBodyInfo.filter(info => event.primaryBodies.includes(info.name));

    if (primaryBodyInfo.length !== event.primaryBodies.length) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
    
    if (event.secondaryBodies) {
        const secondaryBodyInfo = allBodyInfo.filter(info => event.secondaryBodies?.includes(info.name));
        if (secondaryBodyInfo.length !== event.secondaryBodies.length) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
    }

    switch (event.type) {
        case 'conjunction': {
            if (primaryBodyInfo.length < 2) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            
            let maxAngle = 0;
            for (let i = 0; i < primaryBodyInfo.length; i++) {
                for (let j = i + 1; j < primaryBodyInfo.length; j++) {
                    const angle = getAngularSeparation(primaryBodyInfo[i].vec, primaryBodyInfo[j].vec);
                    if (angle > maxAngle) {
                        maxAngle = angle;
                    }
                }
            }

            if (maxAngle > event.longitudeTolerance) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

            if (event.minSeparation) {
                 for (let i = 0; i < primaryBodyInfo.length; i++) {
                    for (let j = i + 1; j < primaryBodyInfo.length; j++) {
                        const separation = getAngularSeparation(primaryBodyInfo[i].vec, primaryBodyInfo[j].vec);
                        if (separation < event.minSeparation) {
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
            if (event.secondaryBodies) {
                const secondaryBodyInfo = allBodyInfo.filter(info => event.secondaryBodies?.includes(info.name));
                for (const { vec } of secondaryBodyInfo) {
                     const separation = getAngularSeparation(vec, avgVector);
                     // Allow secondary bodies to be further away
                     if (separation > event.longitudeTolerance * 3) {
                         return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                     }
                }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'occultation': {
            if (primaryBodyInfo.length < 2) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

            let maxSeparationInGroup = 0;
            for (let i = 0; i < primaryBodyInfo.length; i++) {
                for (let j = i + 1; j < primaryBodyInfo.length; j++) {
                     maxSeparationInGroup = Math.max(maxSeparationInGroup, getAngularSeparation(primaryBodyInfo[i].vec, primaryBodyInfo[j].vec));
                }
            }

            const largestBody = primaryBodyInfo.reduce((a,b) => a.apparentRadius > b.apparentRadius ? a : b);
            
            if (maxSeparationInGroup > (largestBody.apparentRadius + event.longitudeTolerance)) {
                return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            }
            
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'dominance': {
            if (!event.secondaryBodies || !event.minSeparation || primaryBodyInfo.length === 0) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            const dominantVec = primaryBodyInfo[0].vec;
            const secondaryInfo = allBodyInfo.filter(info => event.secondaryBodies?.includes(info.name));

            for (const secondary of secondaryInfo) {
                 const separation = getAngularSeparation(dominantVec, secondary.vec);
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

export function findNextEvent(params: EventSearchParams): EventSearchResult | null {
    const { startHours, event, allBodiesData, direction, SEBAKA_YEAR_IN_DAYS, HOURS_IN_SEBAKA_DAY } = params;

    const processedBodyData = getBodyData(allBodiesData);
    const sebakaData = processedBodyData.find(b => b.name === 'Sebaka');
    if (!sebakaData) return null;
    const sebakaTilt = sebakaData.axialTilt ? parseFloat(sebakaData.axialTilt) : 0;
    
    const timeMultiplier = direction === 'next' ? 1 : -1;
    // Start search one day after/before the current time to avoid finding the same event
    let currentHours = startHours + (HOURS_IN_SEBAKA_DAY * timeMultiplier);

    const positionCache: { [hours: number]: { [name: string]: THREE.Vector3 } } = {};
    const getCachedPositions = (hours: number) => {
        // Cache positions daily to improve performance
        const roundedHours = Math.floor(hours / HOURS_IN_SEBAKA_DAY) * HOURS_IN_SEBAKA_DAY;
        if (!positionCache[roundedHours]) {
            positionCache[roundedHours] = calculateBodyPositions(roundedHours, processedBodyData);
        }
        return positionCache[roundedHours];
    };
    
    // Define search steps - scale with event rarity for performance
    let coarseStepDays = 100;
    if (event.approximatePeriodDays > 10000) coarseStepDays = 365; // ~1 year
    if (event.approximatePeriodDays > 1000000) coarseStepDays = 365 * 10; // ~10 years
    let coarseStepHours = coarseStepDays * HOURS_IN_SEBAKA_DAY * timeMultiplier;

    // Safety break to prevent infinite loops on extremely rare events
    const maxSearchIterations = 10000;

    for (let i = 0; i < maxSearchIterations; i++) {
        const bodyPositions = getCachedPositions(currentHours);
        const { met } = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

        if (met) {
            // Coarse step found a match. Now scan the previous interval finely to find the *first* day.
            let fineHoursStart = currentHours - coarseStepHours;
            const fineStepHours = HOURS_IN_SEBAKA_DAY * timeMultiplier;
            
            for (let j = 0; j < coarseStepDays; j++) {
                const fineCheckHours = fineHoursStart + j * fineStepHours;
                const finePositions = getCachedPositions(fineCheckHours);
                const fineResult = checkEventConditions(event, finePositions, processedBodyData, sebakaTilt);

                if (fineResult.met) {
                    // This is the first day the event is met in this window.
                    return {
                        foundHours: fineCheckHours,
                        viewingLongitude: fineResult.viewingLongitude,
                        viewingLatitude: fineResult.viewingLatitude,
                    };
                }
            }
            // If the fine scan didn't find it, it means the event started exactly on the coarse step day.
            const finalResult = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);
            return {
                foundHours: currentHours,
                viewingLongitude: finalResult.viewingLongitude,
                viewingLatitude: finalResult.viewingLatitude,
            };
        }

        currentHours += coarseStepHours;
        if (timeMultiplier < 0 && currentHours < 0) break; // Don't search before year 0
    }

    console.warn(`Could not find event ${event.name} within the search limit.`);
    return null;
}
