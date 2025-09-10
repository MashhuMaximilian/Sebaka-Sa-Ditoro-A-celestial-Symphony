
import * as THREE from 'three';
import { type CelestialEvent } from '../constants/events';
import { type AnyBodyData } from '@/types';
import { getBodyData, type ProcessedBodyData } from '../hooks/useBodyData';
import { calculateBodyPositions } from './calculateBodyPositions';

export interface EventSearchParams {
    startHours: number;
    event: CelestialEvent;
    allBodiesData: AnyBodyData[];
    direction: 'next' | 'previous' | 'first';
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
    distance: number;
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

    // First pass to calculate optimal latitude
    const primaryBodyInfoForLat = (event.primaryBodies.map(name => {
        const bodyData = processedBodyData.find(d => d.name === name);
        const bodyPos = bodyPositions[name];
        if (!bodyData || !bodyPos) return null;
        
        const viewpointOffset = new THREE.Vector3().setFromSphericalCoords(sebakaData.size, Math.PI / 2, THREE.MathUtils.degToRad(longitude));
        const tiltQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(sebakaTilt));
        viewpointOffset.applyQuaternion(tiltQuat);
        const viewpoint = new THREE.Vector3().addVectors(sebakaPos, viewpointOffset);
        
        const vec = new THREE.Vector3().subVectors(bodyPos, viewpoint);
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

    // Second pass with optimal latitude for final check
    const allBodyInfo = (allRelevantBodyNames.map(name => {
        const bodyData = processedBodyData.find(d => d.name === name);
        const bodyPos = bodyPositions[name];
        if (!bodyData || !bodyPos) return null;

        const lonRad = THREE.MathUtils.degToRad(longitude);
        const latRad = THREE.MathUtils.degToRad(optimalLatitude);
        const viewpointOffset = new THREE.Vector3().setFromSphericalCoords(sebakaData.size, Math.PI / 2 - latRad, lonRad);
        const tiltQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(sebakaTilt));
        viewpointOffset.applyQuaternion(tiltQuat);
        const observerPos = new THREE.Vector3().addVectors(sebakaPos, viewpointOffset);

        const vec = bodyPos.clone().sub(observerPos);
        const distance = vec.length();
        const apparentRadius = getApparentRadius(bodyData.size, distance);
        
        return { name, vec: vec.normalize(), pos: bodyPos, data: bodyData, apparentRadius, distance };
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
            
            const avgVector = new THREE.Vector3();
            primaryBodyInfo.forEach(({ vec }) => avgVector.add(vec));
            avgVector.normalize();

            for (const { vec } of primaryBodyInfo) {
                if (vec.angleTo(avgVector) > THREE.MathUtils.degToRad(event.longitudeTolerance)) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }

            if (event.minSeparation) {
                 for (let i = 0; i < primaryBodyInfo.length; i++) {
                    for (let j = i + 1; j < primaryBodyInfo.length; j++) {
                        if (primaryBodyInfo[i].vec.angleTo(primaryBodyInfo[j].vec) < THREE.MathUtils.degToRad(event.minSeparation)) {
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
                if (vec.angleTo(avgVector) > THREE.MathUtils.degToRad(event.longitudeTolerance)) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }
            if (event.secondaryBodies) {
                const secondaryBodyInfo = allBodyInfo.filter(info => event.secondaryBodies?.includes(info.name));
                for (const { vec } of secondaryBodyInfo) {
                     if (vec.angleTo(avgVector) > THREE.MathUtils.degToRad(event.longitudeTolerance * 3)) {
                         return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                     }
                }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'occultation': {
            if (primaryBodyInfo.length < 2) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            
            const sortedBodies = [...primaryBodyInfo].sort((a, b) => a.distance - b.distance);
            
            for (let i = 0; i < sortedBodies.length - 1; i++) {
                const foreground = sortedBodies[i];
                const background = sortedBodies[i + 1];
                
                const separationAngleDeg = THREE.MathUtils.radToDeg(foreground.vec.angleTo(background.vec));
                const overlapThreshold = event.overlapThreshold ?? 0.1;
                const maxSeparation = foreground.apparentRadius + background.apparentRadius * overlapThreshold;

                if (separationAngleDeg > maxSeparation) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }
            
            const avgVector = new THREE.Vector3();
            sortedBodies.forEach(({ vec }) => avgVector.add(vec));
            avgVector.normalize();

            for (const { vec } of sortedBodies) {
                if (vec.angleTo(avgVector) > THREE.MathUtils.degToRad(event.longitudeTolerance)) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }

            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'dominance': {
            if (!event.secondaryBodies || !event.minSeparation || primaryBodyInfo.length === 0) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            const dominantVec = primaryBodyInfo[0].vec;
            const secondaryInfo = allBodyInfo.filter(info => event.secondaryBodies?.includes(info.name));

            for (const secondary of secondaryInfo) {
                 if (dominantVec.angleTo(secondary.vec) < THREE.MathUtils.degToRad(event.minSeparation)) {
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
    
    const timeMultiplier = direction === 'previous' ? -1 : 1;
    let searchStartHours = direction === 'first' ? 0 : startHours;

    const positionCache: { [hours: number]: { [name: string]: THREE.Vector3 } } = {};
    const getCachedPositions = (hours: number) => {
        // Cache positions daily to improve performance
        const roundedHours = Math.round(hours / HOURS_IN_SEBAKA_DAY) * HOURS_IN_SEBAKA_DAY;
        if (!positionCache[roundedHours]) {
            positionCache[roundedHours] = calculateBodyPositions(roundedHours, processedBodyData);
        }
        return positionCache[roundedHours];
    };

    if (direction !== 'first') {
        let isStillInEvent = true;
        let escapeHours = startHours;
        const initialCheck = checkEventConditions(event, getCachedPositions(escapeHours), processedBodyData, sebakaTilt);

        if (initialCheck.met) {
            while (isStillInEvent) {
                escapeHours += HOURS_IN_SEBAKA_DAY * timeMultiplier;
                const currentCheck = checkEventConditions(event, getCachedPositions(escapeHours), processedBodyData, sebakaTilt);
                if (!currentCheck.met) {
                    isStillInEvent = false;
                    searchStartHours = escapeHours;
                }
                if (Math.abs(escapeHours - startHours) > (30 * HOURS_IN_SEBAKA_DAY)) {
                     console.warn("Event duration escape exceeded 30 days, breaking.");
                     break;
                }
            }
        }
    }
    
    let currentHours = searchStartHours + (HOURS_IN_SEBAKA_DAY * timeMultiplier);

    const coarseStepDays = Math.min(365, Math.max(1, Math.floor(event.approximatePeriodDays / 100)));
    let coarseStepHours = coarseStepDays * HOURS_IN_SEBAKA_DAY * timeMultiplier;
    
    const maxSearchYears = 10000000;
    const maxSearchIterations = Math.ceil(maxSearchYears * SEBAKA_YEAR_IN_DAYS / coarseStepDays);

    for (let i = 0; i < maxSearchIterations; i++) {
        const bodyPositions = getCachedPositions(currentHours);
        const { met } = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

        if (met) {
            let fineHoursStart = currentHours - coarseStepHours;
            const fineStepHours = HOURS_IN_SEBAKA_DAY * timeMultiplier;
            
            for (let j = 0; j < coarseStepDays * 2; j++) {
                const fineCheckHours = fineHoursStart + j * fineStepHours;
                if (timeMultiplier > 0 && fineCheckHours < searchStartHours) continue;
                if (timeMultiplier < 0 && fineCheckHours > searchStartHours) continue;

                const finePositions = getCachedPositions(fineCheckHours);
                const fineResult = checkEventConditions(event, finePositions, processedBodyData, sebakaTilt);

                if (fineResult.met) {
                    // Duration validation
                    let durationDays = 0;
                    let durationCheckHours = fineCheckHours;
                    while(checkEventConditions(event, getCachedPositions(durationCheckHours), processedBodyData, sebakaTilt).met) {
                        durationDays++;
                        durationCheckHours += HOURS_IN_SEBAKA_DAY * timeMultiplier;
                        if(durationDays > 5) break; // Check for max 5 days to confirm stability
                    }

                    if (durationDays >= 3) {
                         return {
                            foundHours: fineCheckHours,
                            viewingLongitude: fineResult.viewingLongitude,
                            viewingLatitude: fineResult.viewingLatitude,
                        };
                    }
                }
            }
        }

        currentHours += coarseStepHours;
        if (timeMultiplier < 0 && currentHours < 0) break;
    }

    console.warn(`Could not find event ${event.name} within ${maxSearchYears} years.`);
    return null;
}
