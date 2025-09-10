
import * as THREE from 'three';
import { type CelestialEvent } from '../constants/events';
import { type AnyBodyData, type PlanetData } from '@/types';
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

// Helper to yield control to the main thread
const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

function getApparentRadius(bodySize: number, distance: number): number {
    return THREE.MathUtils.radToDeg(Math.atan(bodySize / distance));
}

function checkEventConditions(
    event: CelestialEvent,
    bodyPositions: { [key: string]: THREE.Vector3 },
    processedBodyData: ProcessedBodyData[],
    sebakaTilt: number
): { met: boolean; viewingLatitude: number; viewingLongitude: number } {
    const sebakaData = processedBodyData.find(d => d.name === 'Sebaka') as PlanetData | undefined;
    if (!sebakaData) return { met: false, viewingLatitude: 0, viewingLongitude: event.viewingLongitude ?? 180 };
    
    const sebakaPos = bodyPositions['Sebaka'];
    if (!sebakaPos) return { met: false, viewingLatitude: 0, viewingLongitude: event.viewingLongitude ?? 180 };

    const longitude = event.viewingLongitude ?? 180;
    
    const allRelevantBodyNames = [...event.primaryBodies, ...(event.secondaryBodies || [])];

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
    
    return checkSpecificEventConditions(event, primaryBodyInfo, allBodyInfo, processedBodyData, bodyPositions, sebakaData, sebakaTilt, optimalLatitude, longitude);
}

function checkSunPlanetSeparation(
    primaryBodyInfo: BodyVectorInfo[],
    processedBodyData: ProcessedBodyData[],
    bodyPositions: { [key: string]: THREE.Vector3 },
    sebakaData: PlanetData,
    sebakaTilt: number,
    optimalLatitude: number,
    longitude: number,
    event: CelestialEvent
): { met: boolean; viewingLatitude: number; viewingLongitude: number } {
    
    const suns = processedBodyData.filter(d => d.type === 'Star');
    const sunSeparationMultiplier = event.sunSeparationMultiplier ?? 1.0;
    
    const sebakaPos = bodyPositions['Sebaka'];
    if (!sebakaPos) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };

    for (const sun of suns) {
        const sunPos = bodyPositions[sun.name];
        if (!sunPos) continue;

        const lonRad = THREE.MathUtils.degToRad(longitude);
        const latRad = THREE.MathUtils.degToRad(optimalLatitude);
        const viewpointOffset = new THREE.Vector3().setFromSphericalCoords(sebakaData.size, Math.PI / 2 - latRad, lonRad);
        const tiltQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), THREE.MathUtils.degToRad(sebakaTilt));
        viewpointOffset.applyQuaternion(tiltQuat);
        const observerPos = new THREE.Vector3().addVectors(sebakaPos, viewpointOffset);

        const sunVec = sunPos.clone().sub(observerPos);
        const sunDistance = sunVec.length();
        const sunApparentRadius = getApparentRadius(sun.size, sunDistance);
        sunVec.normalize();
        
        for (const planet of primaryBodyInfo) {
            const separationAngle = THREE.MathUtils.radToDeg(planet.vec.angleTo(sunVec));
            const minAllowedSeparation = (planet.apparentRadius + sunApparentRadius) * sunSeparationMultiplier;
            
            if (separationAngle < minAllowedSeparation) {
                return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            }
        }
    }
    
    return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
}


function checkSpecificEventConditions(
    event: CelestialEvent,
    primaryBodyInfo: BodyVectorInfo[],
    allBodyInfo: BodyVectorInfo[],
    processedBodyData: ProcessedBodyData[],
    bodyPositions: { [key: string]: THREE.Vector3 },
    sebakaData: PlanetData,
    sebakaTilt: number,
    optimalLatitude: number,
    longitude: number
): { met: boolean; viewingLatitude: number; viewingLongitude: number } {
    
    if (event.allowSunOverlap !== true) {
        const sunOverlapResult = checkSunPlanetSeparation(
            primaryBodyInfo, processedBodyData, bodyPositions, sebakaData, 
            sebakaTilt, optimalLatitude, longitude, event
        );
        if (!sunOverlapResult.met) {
            return sunOverlapResult;
        }
    }
    
    switch (event.name) {
        case "Great Conjunction":
            return checkGreatConjunction(event, primaryBodyInfo, optimalLatitude, longitude);
        case "Triple Cascade":
            return checkTripleCascade(event, primaryBodyInfo, optimalLatitude, longitude);
        case "Quadruple Cascade (Inner Conjunction)":
            return checkQuadrupleCascade(event, primaryBodyInfo, optimalLatitude, longitude);
        default:
            return checkGenericEvent(event, primaryBodyInfo, allBodyInfo, optimalLatitude, longitude);
    }
}

function checkGreatConjunction(
    event: CelestialEvent,
    primaryBodyInfo: BodyVectorInfo[],
    optimalLatitude: number,
    longitude: number
): { met: boolean; viewingLatitude: number; viewingLongitude: number } {
    
    const searchTolerance = Math.max(event.longitudeTolerance, 15);
    
    const avgVector = new THREE.Vector3();
    primaryBodyInfo.forEach(({ vec }) => avgVector.add(vec));
    avgVector.normalize();

    for (const { vec } of primaryBodyInfo) {
        if (vec.angleTo(avgVector) > THREE.MathUtils.degToRad(searchTolerance)) {
            return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
    }

    const minSeparationDeg = event.minSeparation || 0.5;
    for (let i = 0; i < primaryBodyInfo.length; i++) {
        for (let j = i + 1; j < primaryBodyInfo.length; j++) {
            const separationAngle = THREE.MathUtils.radToDeg(primaryBodyInfo[i].vec.angleTo(primaryBodyInfo[j].vec));
            if (separationAngle < minSeparationDeg) {
                return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            }
        }
    }

    return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
}

function checkTripleCascade(
    event: CelestialEvent,
    primaryBodyInfo: BodyVectorInfo[],
    optimalLatitude: number,
    longitude: number
): { met: boolean; viewingLatitude: number; viewingLongitude: number } {
    
    if (primaryBodyInfo.length < 3) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
    
    const sortedBodies = [...primaryBodyInfo].sort((a, b) => a.distance - b.distance);
    
    const avgVector = new THREE.Vector3();
    sortedBodies.forEach(({ vec }) => avgVector.add(vec));
    avgVector.normalize();
    
    const alignmentTolerance = 1.0;
    for (const { vec } of sortedBodies) {
        if (vec.angleTo(avgVector) > THREE.MathUtils.degToRad(alignmentTolerance)) {
            return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
    }
    
    const overlapThreshold = event.overlapThreshold ?? 0.1;
    for (let i = 0; i < sortedBodies.length - 1; i++) {
        const foreground = sortedBodies[i];
        const background = sortedBodies[i + 1];
        
        const separationAngleDeg = THREE.MathUtils.radToDeg(foreground.vec.angleTo(background.vec));
        const maxAllowedSeparation = (foreground.apparentRadius + background.apparentRadius) * (1 - overlapThreshold);
        
        if (separationAngleDeg > maxAllowedSeparation) {
            return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
    }

    return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
}

function checkQuadrupleCascade(
    event: CelestialEvent,
    primaryBodyInfo: BodyVectorInfo[],
    optimalLatitude: number,
    longitude: number
): { met: boolean; viewingLatitude: number; viewingLongitude: number } {
    
    if (primaryBodyInfo.length < 4) return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
    
    const sortedBodies = [...primaryBodyInfo].sort((a, b) => a.distance - b.distance);
    const alignmentTolerance = 2.0;
    const avgVector = new THREE.Vector3();
    sortedBodies.forEach(({ vec }) => avgVector.add(vec));
    avgVector.normalize();
    
    for (const { vec } of sortedBodies) {
        if (vec.angleTo(avgVector) > THREE.MathUtils.degToRad(alignmentTolerance)) {
            return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
    }
    
    const overlapThreshold = event.overlapThreshold ?? 0.2;
    for (let i = 0; i < sortedBodies.length - 1; i++) {
        const foreground = sortedBodies[i];
        const background = sortedBodies[i + 1];
        
        const separationAngleDeg = THREE.MathUtils.radToDeg(foreground.vec.angleTo(background.vec));
        const maxAllowedSeparation = (foreground.apparentRadius + background.apparentRadius) * (1 - overlapThreshold);
        
        if (separationAngleDeg > maxAllowedSeparation) {
            return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
        }
    }

    return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
}

function checkGenericEvent(
    event: CelestialEvent,
    primaryBodyInfo: BodyVectorInfo[],
    allBodyInfo: BodyVectorInfo[],
    optimalLatitude: number,
    longitude: number
): { met: boolean; viewingLatitude: number; viewingLongitude: number } {
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
                const maxSeparation = foreground.apparentRadius + background.apparentRadius * (1 - overlapThreshold);

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

async function findFrequentEvent(params: EventSearchParams): Promise<EventSearchResult | null> {
    const { startHours, event, allBodiesData, direction, SEBAKA_YEAR_IN_DAYS, HOURS_IN_SEBAKA_DAY } = params;

    const processedBodyData = getBodyData(allBodiesData);
    const sebakaData = processedBodyData.find(b => b.name === 'Sebaka') as PlanetData | undefined;
    if (!sebakaData) return null;
    const sebakaTilt = sebakaData.axialTilt ? parseFloat(sebakaData.axialTilt) : 0;

    const timeMultiplier = direction === 'previous' ? -1 : 1;
    let currentHours = direction === 'first' ? 0 : startHours;

    const positionCache: { [hours: number]: { [name: string]: THREE.Vector3 } } = {};
    const getCachedPositions = (hours: number) => {
        const roundedHours = Math.round(hours / HOURS_IN_SEBAKA_DAY) * HOURS_IN_SEBAKA_DAY;
        if (!positionCache[roundedHours]) {
            positionCache[roundedHours] = calculateBodyPositions(roundedHours, processedBodyData);
        }
        return positionCache[roundedHours];
    };

    if (direction !== 'first' && checkEventConditions(event, getCachedPositions(startHours), processedBodyData, sebakaTilt).met) {
        currentHours += HOURS_IN_SEBAKA_DAY * 10 * timeMultiplier;
        let escapeCount = 0;
        const maxEscapeDays = 365 * 2;
        while (checkEventConditions(event, getCachedPositions(currentHours), processedBodyData, sebakaTilt).met && escapeCount < maxEscapeDays) {
            currentHours += HOURS_IN_SEBAKA_DAY * 10 * timeMultiplier;
            escapeCount += 10;
        }
    }

    const maxSearchYears = 100;
    const maxSearchHours = maxSearchYears * SEBAKA_YEAR_IN_DAYS * HOURS_IN_SEBAKA_DAY;
    const stepHours = HOURS_IN_SEBAKA_DAY * timeMultiplier;

    let foundHours = null;
    let viewingLatitude = 0;
    let viewingLongitude = event.viewingLongitude ?? 180;
    let iterationCount = 0;
    const maxIterations = 1e5;

    while (iterationCount < maxIterations && 
           ((timeMultiplier > 0 && currentHours < startHours + maxSearchHours) || 
            (timeMultiplier < 0 && currentHours > startHours - maxSearchHours))) {
        
        if (iterationCount % 500 === 0) {
            await yieldToMain();
        }

        const bodyPositions = getCachedPositions(currentHours);
        const result = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

        if (result.met) {
            let durationDays = 0;
            let durationCheckHours = currentHours;
            let isStable = true;
            const stabilityDays = 2;

            while (durationDays < stabilityDays && isStable) {
                const durationPositions = getCachedPositions(durationCheckHours);
                if (!checkEventConditions(event, durationPositions, processedBodyData, sebakaTilt).met) {
                    isStable = false;
                    break;
                }
                durationDays += 1;
                durationCheckHours += stepHours;
                iterationCount += 1;
                if (iterationCount >= maxIterations) break;
            }

            if (isStable) {
                foundHours = currentHours;
                viewingLatitude = result.viewingLatitude;
                viewingLongitude = result.viewingLongitude;
                break;
            }
        }

        currentHours += stepHours;
        iterationCount += 1;
    }

    if (foundHours === null) {
        console.warn(`Could not find frequent event ${event.name} within ${maxSearchYears} years.`);
        return null;
    }

    return { foundHours, viewingLongitude, viewingLatitude };
}

async function findRareEvent(params: EventSearchParams): Promise<EventSearchResult | null> {
    const { startHours, event, allBodiesData, direction, SEBAKA_YEAR_IN_DAYS, HOURS_IN_SEBAKA_DAY } = params;

    const processedBodyData = getBodyData(allBodiesData);
    const sebakaData = processedBodyData.find(b => b.name === 'Sebaka') as PlanetData | undefined;
    if (!sebakaData) return null;
    const sebakaTilt = sebakaData.axialTilt ? parseFloat(sebakaData.axialTilt) : 0;

    const timeMultiplier = direction === 'previous' ? -1 : 1;
    let currentHours = direction === 'first' ? 0 : startHours;

    const positionCache: { [hours: number]: { [name: string]: THREE.Vector3 } } = {};
    const getCachedPositions = (hours: number) => {
        const roundedHours = Math.round(hours / HOURS_IN_SEBAKA_DAY) * HOURS_IN_SEBAKA_DAY;
        if (!positionCache[roundedHours]) {
            positionCache[roundedHours] = calculateBodyPositions(roundedHours, processedBodyData);
            const cacheKeys = Object.keys(positionCache).map(Number).sort((a, b) => a - b);
            if (cacheKeys.length > 50) {
                const cutoff = cacheKeys[0];
                delete positionCache[cutoff];
            }
        }
        return positionCache[roundedHours];
    };

    if (direction !== 'first' && checkEventConditions(event, getCachedPositions(startHours), processedBodyData, sebakaTilt).met) {
        currentHours += HOURS_IN_SEBAKA_DAY * 30 * timeMultiplier;
        let escapeCount = 0;
        const maxEscapeDays = 365 * 10;
        while (checkEventConditions(event, getCachedPositions(currentHours), processedBodyData, sebakaTilt).met && escapeCount < maxEscapeDays) {
            currentHours += HOURS_IN_SEBAKA_DAY * 30 * timeMultiplier;
            escapeCount += 30;
        }
    }

    const maxSearchYears = 80000; 
    const maxSearchHours = maxSearchYears * SEBAKA_YEAR_IN_DAYS * HOURS_IN_SEBAKA_DAY;
    const stepHours = HOURS_IN_SEBAKA_DAY * timeMultiplier; 

    let foundHours = null;
    let viewingLatitude = 0;
    let viewingLongitude = event.viewingLongitude ?? 180;
    let iterationCount = 0;
    const maxIterations = 5e6; 

    while (iterationCount < maxIterations && 
           ((timeMultiplier > 0 && currentHours < startHours + maxSearchHours) || 
            (timeMultiplier < 0 && currentHours > startHours - maxSearchHours))) {

        if (iterationCount % 500 === 0) {
            await yieldToMain();
        }

        const bodyPositions = getCachedPositions(currentHours);
        const result = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

        if (result.met) {
            let durationDays = 0;
            let durationCheckHours = currentHours;
            let isStable = true;
            const stabilityDays = (event.type === 'occultation' || event.longitudeTolerance < 1.0) ? 1 : 2;

            while (durationDays < stabilityDays && isStable) {
                const durationPositions = getCachedPositions(durationCheckHours);
                if (!checkEventConditions(event, durationPositions, processedBodyData, sebakaTilt).met) {
                    isStable = false;
                    break;
                }
                durationDays += 1;
                durationCheckHours += stepHours;
                iterationCount += 1;
                if (iterationCount >= maxIterations) break;
            }

            if (isStable) {
                foundHours = currentHours;
                viewingLatitude = result.viewingLatitude;
                viewingLongitude = result.viewingLongitude;
                break;
            } else {
                currentHours = durationCheckHours;
            }
        }

        currentHours += stepHours;
        iterationCount += 1;
    }

    if (foundHours === null) {
        console.warn(`Could not find rare event ${event.name} within ${maxSearchYears} years.`);
        return null;
    }

    return { foundHours, viewingLongitude, viewingLatitude };
}


export async function findNextEvent(params: EventSearchParams): Promise<EventSearchResult | null> {
    const { event, SEBAKA_YEAR_IN_DAYS } = params;
    
    if (event.approximatePeriodDays > 100 * SEBAKA_YEAR_IN_DAYS || event.type === 'occultation') {
        return findRareEvent(params);
    } else {
        return findFrequentEvent(params);
    }
}
