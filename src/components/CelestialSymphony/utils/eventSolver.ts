import * as THREE from 'three';
import { type CelestialEvent } from '@/types';
import { type AnyBodyData, type PlanetData } from '@/types';
import { getBodyData, type ProcessedBodyData } from '../hooks/useBodyData';
import { calculateBodyPositions } from './calculateBodyPositions';
import { HOURS_IN_SEBAKA_DAY, SEBAKA_YEAR_IN_DAYS } from '../constants/config';

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
    viewingLatitude: number;
    viewingLongitude: number;
}

interface BodyVectorInfo {
    name: string;
    vec: THREE.Vector3;
    pos: THREE.Vector3;
    data: ProcessedBodyData;
    apparentRadius: number;
    distance: number;
}

interface CandidateWindow {
    startHours: number;
    endHours: number;
}

const yieldToMain = () => new Promise(resolve => setTimeout(resolve, 0));

/**
 * Calculates the synodic period between two bodies based on their orbital periods.
 */
function synodicPeriod(p1: number, p2: number): number {
    if (p1 === p2 || p1 <= 0 || p2 <= 0) return Infinity;
    return Math.abs(1 / (1 / p1 - 1 / p2));
}

/**
 * Calculates the true recurrence period for an event based on orbital mechanics.
 * DOES NOT use event.approximatePeriodDays - calculates from actual orbital periods.
 */
function calculateTrueRecurrencePeriod(event: CelestialEvent, allPlanets: PlanetData[]): number | null {
    const relevantPeriods = event.primaryBodies
        .map((name: string) => {
            const planet = allPlanets.find((p: PlanetData) => p.name === name);
            return planet ? planet.orbitPeriodDays : null;
        })
        .filter((p): p is number => p !== null && p > 0);

    if (relevantPeriods.length < 2) {
        // For single-body events or insufficient data, return null for broad search
        return null;
    }

    // Calculate the maximum synodic period between all planet pairs
    let maxSynodic = 0;
    for (let i = 0; i < relevantPeriods.length; i++) {
        for (let j = i + 1; j < relevantPeriods.length; j++) {
            const synodic = synodicPeriod(relevantPeriods[i], relevantPeriods[j]);
            if (synodic > maxSynodic) {
                maxSynodic = synodic;
            }
        }
    }

    return maxSynodic > 0 && maxSynodic !== Infinity ? maxSynodic : null;
}

/**
 * Generates candidate time windows based on true orbital mechanics.
 */
function generateCandidateWindows(params: EventSearchParams): CandidateWindow[] {
    const { event, startHours, direction, SEBAKA_YEAR_IN_DAYS, HOURS_IN_SEBAKA_DAY } = params;
    const allPlanets = params.allBodiesData.filter((b): b is PlanetData => b.type === 'Planet');
    const timeMultiplier = direction === 'previous' ? -1 : 1;

    // Calculate TRUE recurrence period from orbital mechanics
    const trueRecurrence = calculateTrueRecurrencePeriod(event, allPlanets);

    if (!trueRecurrence) {
        console.warn(`[EventSolver] Cannot calculate orbital recurrence for "${event.name}". Using broad search.`);
        const searchDurationHours = 1000 * SEBAKA_YEAR_IN_DAYS * HOURS_IN_SEBAKA_DAY;
        return [{ startHours: startHours, endHours: startHours + timeMultiplier * searchDurationHours }];
    }

    // Window size scales with event tolerance and orbital period
    const baseWindowDays = 10; // Minimum window size
    const toleranceScaling = (event.longitudeTolerance / 360) * trueRecurrence * 0.5;
    const windowSizeDays = baseWindowDays + toleranceScaling;
    const windowSizeHours = windowSizeDays * HOURS_IN_SEBAKA_DAY;
    const recurrenceHours = trueRecurrence * HOURS_IN_SEBAKA_DAY;

    const candidates: CandidateWindow[] = [];
    let currentCandidateHour = Math.floor(startHours / recurrenceHours) * recurrenceHours;
    
    if (timeMultiplier > 0 && currentCandidateHour < startHours) {
        currentCandidateHour += recurrenceHours;
    } else if (timeMultiplier < 0 && currentCandidateHour > startHours) {
        currentCandidateHour -= recurrenceHours;
    }

    const maxSearchYears = event.type === 'occultation' ? 50000 : 5000;
    const endSearchHours = startHours + timeMultiplier * maxSearchYears * SEBAKA_YEAR_IN_DAYS * HOURS_IN_SEBAKA_DAY;

    while ((timeMultiplier > 0 && currentCandidateHour < endSearchHours) || 
           (timeMultiplier < 0 && currentCandidateHour > endSearchHours)) {
        const windowStart = currentCandidateHour - windowSizeHours / 2;
        const windowEnd = currentCandidateHour + windowSizeHours / 2;
        
        if ((timeMultiplier > 0 && windowEnd > startHours) || 
            (timeMultiplier < 0 && windowStart < startHours)) {
            candidates.push({ startHours: windowStart, endHours: windowEnd });
        }
        currentCandidateHour += recurrenceHours * timeMultiplier;
    }
    
    console.log(`[EventSolver] Generated ${candidates.length} candidate windows for "${event.name}" (true recurrence: ~${trueRecurrence.toFixed(2)} days).`);
    return candidates;
}

function getApparentRadius(bodySize: number, distance: number): number {
    return THREE.MathUtils.radToDeg(Math.atan(bodySize / distance));
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

function checkEventConditions(
    event: CelestialEvent,
    bodyPositions: { [key: string]: THREE.Vector3 },
    processedBodyData: ProcessedBodyData[],
    sebakaTilt: number
): { met: boolean; viewingLatitude: number; viewingLongitude: number } {
    const sebakaData = processedBodyData.find(d => d.name === 'Sebaka') as PlanetData | undefined;
    if (!sebakaData) return { met: false, viewingLatitude: 0, viewingLongitude: event.viewingLongitude ?? 180 };
    
    if (!bodyPositions) {
        console.error("[EventSolver] checkEventConditions received undefined bodyPositions.");
        return { met: false, viewingLatitude: 0, viewingLongitude: event.viewingLongitude ?? 180 };
    }
    
    const sebakaPos = bodyPositions['Sebaka'];
    if (!sebakaPos) {
        console.error("[EventSolver] Sebaka position not found in bodyPositions.");
        return { met: false, viewingLatitude: 0, viewingLongitude: event.viewingLongitude ?? 180 };
    }

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
    
    // For the Great Conjunction, use a looser check
    if (event.name === "Great Conjunction") {
        const searchTolerance = Math.max(event.longitudeTolerance, 15);
        const avgVector = new THREE.Vector3();
        primaryBodyInfo.forEach(({ vec }) => avgVector.add(vec));
        avgVector.normalize();

        for (const { vec } of primaryBodyInfo) {
            if (vec.angleTo(avgVector) > THREE.MathUtils.degToRad(searchTolerance)) {
                return { met: false, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
            }
        }
        return { met: true, viewingLatitude: optimalLatitude, viewingLongitude: longitude };
    }

    return checkGenericEvent(event, primaryBodyInfo, allBodyInfo, optimalLatitude, longitude);
}

async function findEventWithCandidates(params: EventSearchParams): Promise<EventSearchResult | null> {
    const { startHours, event, allBodiesData, direction, SEBAKA_YEAR_IN_DAYS, HOURS_IN_SEBAKA_DAY } = params;
    const processedBodyData = getBodyData(allBodiesData);
    const sebakaData = processedBodyData.find(b => b.name === 'Sebaka') as PlanetData | undefined;
    if (!sebakaData) return null;
    const sebakaTilt = sebakaData.axialTilt ? parseFloat(sebakaData.axialTilt) : 0;

    const timeMultiplier = direction === 'previous' ? -1 : 1;
    let currentSearchStart = startHours;

    const positionCache: { [hours: number]: { [name: string]: THREE.Vector3 } } = {};
    const getCachedPositions = (hours: number): { [name: string]: THREE.Vector3 } => {
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
        const escapeDistance = event.type === 'occultation' ? 30 : 10;
        currentSearchStart += HOURS_IN_SEBAKA_DAY * escapeDistance * timeMultiplier;
        let escapeCount = 0;
        const maxEscapeDays = 365 * (event.type === 'occultation' ? 10 : 2);
        while (checkEventConditions(event, getCachedPositions(currentSearchStart), processedBodyData, sebakaTilt).met && escapeCount < maxEscapeDays) {
            currentSearchStart += HOURS_IN_SEBAKA_DAY * escapeDistance * timeMultiplier;
            escapeCount += escapeDistance;
        }
    }

    const candidateParams = { ...params, startHours: currentSearchStart };
    const candidateWindows = generateCandidateWindows(candidateParams);

    for (const window of candidateWindows) {
        const windowStart = timeMultiplier > 0 ? Math.max(currentSearchStart, window.startHours) : Math.min(currentSearchStart, window.startHours);
        const windowEnd = timeMultiplier > 0 ? window.endHours : window.endHours;
        let currentHours = windowStart;
        const stepHours = HOURS_IN_SEBAKA_DAY * timeMultiplier;

        let iterationCount = 0;
        const maxIterations = 10000;

        while (iterationCount < maxIterations && 
               ((timeMultiplier > 0 && currentHours < windowEnd) || 
                (timeMultiplier < 0 && currentHours > windowEnd))) {
            
            if (iterationCount % 500 === 0) await yieldToMain();

            const bodyPositions = getCachedPositions(currentHours);
            const result = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

            if (result.met) {
                let durationDays = 0;
                let durationCheckHours = currentHours;
                let isStable = true;
                
                const stabilityDays = event.longitudeTolerance < 1.0 ? 1 : 
                                    event.type === 'occultation' ? 1 : 2;

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
                    console.log(`[EventSolver] Found "${event.name}" at hour ${currentHours} (stable for ${stabilityDays} days).`);
                    return { 
                        foundHours: currentHours, 
                        viewingLongitude: result.viewingLongitude, 
                        viewingLatitude: result.viewingLatitude 
                    };
                } else {
                    currentHours = durationCheckHours;
                    continue;
                }
            }

            currentHours += stepHours;
            iterationCount += 1;
        }
    }

    console.warn(`[EventSolver] Falling back to broad search for "${event.name}".`);
    
    const maxSearchYears = event.type === 'occultation' ? 80000 : 100;
    const maxSearchHours = maxSearchYears * SEBAKA_YEAR_IN_DAYS * HOURS_IN_SEBAKA_DAY;
    const stepHours = HOURS_IN_SEBAKA_DAY * timeMultiplier;
    let currentHours = currentSearchStart;
    let iterationCount = 0;
    const maxIterations = event.type === 'occultation' ? 5e6 : 1e5;

    while (iterationCount < maxIterations && 
           ((timeMultiplier > 0 && currentHours < currentSearchStart + maxSearchHours) || 
            (timeMultiplier < 0 && currentHours > currentSearchStart - maxSearchHours))) {
        
        if (iterationCount % 500 === 0) await yieldToMain();

        const bodyPositions = getCachedPositions(currentHours);
        const result = checkEventConditions(event, bodyPositions, processedBodyData, sebakaTilt);

        if (result.met) {
            let durationDays = 0;
            let durationCheckHours = currentHours;
            let isStable = true;
            const stabilityDays = event.longitudeTolerance < 1.0 ? 1 : 
                                event.type === 'occultation' ? 1 : 2;

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
                console.log(`[EventSolver] Found "${event.name}" via broad search at hour ${currentHours}.`);
                return { 
                    foundHours: currentHours, 
                    viewingLongitude: result.viewingLongitude, 
                    viewingLatitude: result.viewingLatitude 
                };
            } else {
                currentHours = durationCheckHours;
                continue;
            }
        }

        currentHours += stepHours;
        iterationCount += 1;
    }

    console.warn(`[EventSolver] Could not find "${event.name}".`);
    return null;
}

export async function findNextEvent(params: EventSearchParams): Promise<EventSearchResult | null> {
    return findEventWithCandidates(params);
}
