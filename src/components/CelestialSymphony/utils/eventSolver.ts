
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
    distance: number;
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
        const viewpoint = new THREE.Vector3().setFromSphericalCoords(sebakaData.size, Math.PI / 2 - THREE.MathUtils.degToRad(optimalLatitude), THREE.MathUtils.degToRad(longitude));
        const tiltedViewpoint = viewpoint.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(sebakaTilt));
        const observerPos = sebakaPos.clone().add(tiltedViewpoint);

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
            
            let minAngle = Infinity, maxAngle = -Infinity;
            const vectors = primaryBodyInfo.map(info => info.vec);
            const avgVector = vectors.reduce((acc, v) => acc.add(v), new THREE.Vector3()).normalize();
            
            vectors.forEach(v => {
                const angle = v.angleTo(avgVector);
                minAngle = Math.min(minAngle, angle);
                maxAngle = Math.max(maxAngle, angle);
            });
            const totalSpread = getAngularSeparation(vectors[0], vectors[vectors.length - 1]); // This is simplistic, better to find min/max
            
            if (maxAngle * 2 > THREE.MathUtils.degToRad(event.longitudeTolerance)) {
                 return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            }

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
                     if (separation > event.longitudeTolerance * 3) {
                         return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                     }
                }
            }
            return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
        
        case 'occultation': {
            if (primaryBodyInfo.length < 2) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
             // Sort bodies by distance from viewer (closest first)
            const sortedBodies = [...primaryBodyInfo].sort((a, b) => a.distance - b.distance);
            
            // Check for alignment
            const avgVector = new THREE.Vector3();
            sortedBodies.forEach(({ vec }) => avgVector.add(vec));
            avgVector.normalize();
            for (const { vec } of sortedBodies) {
                if (getAngularSeparation(vec, avgVector) > event.longitudeTolerance) {
                    return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
                }
            }

            // Check for stacking overlap
            for (let i = 0; i < sortedBodies.length - 1; i++) {
                const foreground = sortedBodies[i];
                const background = sortedBodies[i+1];
                const separation = getAngularSeparation(foreground.vec, background.vec);
                const requiredOverlapSeparation = background.apparentRadius + foreground.apparentRadius;
                if(separation > requiredOverlapSeparation) {
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
    let currentHours = startHours + (HOURS_IN_SEBAKA_DAY * timeMultiplier);

    const positionCache: { [hours: number]: { [name: string]: THREE.Vector3 } } = {};
    const getCachedPositions = (hours: number) => {
        const roundedHours = Math.floor(hours / HOURS_IN_SEBAKA_DAY) * HOURS_IN_SEBAKA_DAY;
        if (!positionCache[roundedHours]) {
            positionCache[roundedHours] = calculateBodyPositions(roundedHours, processedBodyData);
        }
        return positionCache[roundedHours];
    };
    
    // Make coarse step adaptive
    let coarseStepDays = 100;
    if (event.approximatePeriodDays > 10000) coarseStepDays = 365;
    if (event.approximatePeriodDays > 1000000) coarseStepDays = 365 * 10;
    let coarseStepHours = coarseStepDays * HOURS_IN_SEBAKA_DAY * timeMultiplier;

    const maxSearchIterations = 10000;

    for (let i = 0; i < maxSearchIterations; i++) {
        const bodyPositions = getCachedPositions(currentHours);
        const { met } = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

        if (met) {
            // Coarse step found a match. Now scan the previous interval finely to find the *first* day.
            let fineSearchStart = currentHours - coarseStepHours;
            const fineStepHours = HOURS_IN_SEBAKA_DAY * timeMultiplier;

            for (let j = 0; j < coarseStepDays; j++) {
                const fineCheckHours = fineSearchStart + (j * fineStepHours);
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
        if (direction === 'previous' && currentHours < 0) break;
    }

    console.warn(`Could not find event ${event.name} within the search limit.`);
    return null;
}

    