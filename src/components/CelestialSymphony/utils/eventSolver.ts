
import * as THREE from 'three';
import { type CelestialEvent } from '../constants/events';
import { type AnyBodyData } from '@/types';
import { getBodyData } from '../hooks/useBodyData';
import { calculateBodyPositions } from './calculateBodyPositions';

export interface EventSearchParams {
    startHours: number;
    event: CelestialEvent;
    allBodiesData: AnyBodyData[];
    direction: 'next' | 'previous' | 'last';
    SEBAKA_YEAR_IN_DAYS: number;
    HOURS_IN_SEBAKA_DAY: number;
}

// Utility to calculate the apparent angular separation between two bodies from a viewpoint
function getAngularSeparation(body1Pos: THREE.Vector3, body2Pos: THREE.Vector3, viewpoint: THREE.Vector3): number {
    const v1 = new THREE.Vector3().subVectors(body1Pos, viewpoint).normalize();
    const v2 = new THREE.Vector3().subVectors(body2Pos, viewpoint).normalize();
    const angleRad = v1.angleTo(v2);
    return THREE.MathUtils.radToDeg(angleRad);
}


// Check if the event conditions are met at a specific time
function checkEventConditions(event: CelestialEvent, bodyPositions: { [key: string]: THREE.Vector3 }, allBodiesData: AnyBodyData[]): boolean {
    const sebakaPos = bodyPositions['Sebaka'];
    if (!sebakaPos) return false;

    const primaryBodyPositions = event.primaryBodies.map(name => bodyPositions[name]).filter(Boolean);
    if (primaryBodyPositions.length !== event.primaryBodies.length) return false;

    switch (event.type) {
        case 'conjunction':
        case 'cluster':
        case 'triangle':
        case 'occultation': {
            let maxSeparation = 0;
            for (let i = 0; i < primaryBodyPositions.length; i++) {
                for (let j = i + 1; j < primaryBodyPositions.length; j++) {
                    const separation = getAngularSeparation(primaryBodyPositions[i], primaryBodyPositions[j], sebakaPos);
                    if (separation > maxSeparation) {
                        maxSeparation = separation;
                    }
                }
            }
            return maxSeparation <= event.maxSeparation;
        }
        
        case 'dominance': {
            if (!event.secondaryBodies || !event.minSeparation) return false;
            const dominantPos = primaryBodyPositions[0];
            const secondaryPositions = event.secondaryBodies.map(name => bodyPositions[name]).filter(Boolean);

            for (const secondaryPos of secondaryPositions) {
                const separation = getAngularSeparation(dominantPos, secondaryPos, sebakaPos);
                if (separation < event.minSeparation) {
                    return false; // Secondary planet is too close
                }
            }
            return true;
        }

        default:
            return false;
    }
}


// The main solver function
export function findNextEvent(params: EventSearchParams): number | null {
    const { startHours, event, allBodiesData, direction, HOURS_IN_SEBAKA_DAY } = params;
    
    // The Great Conjunction is the anchor of our timeline
    if (event.name === "Great Conjunction" && direction !== 'next' && startHours < event.approximatePeriodDays * HOURS_IN_SEBAKA_DAY) {
        return 0;
    }

    const processedBodyData = getBodyData(allBodiesData);
    
    const stepHours = 24; // Check once per day (at midnight) for performance
    const maxSearchYears = 1000; // To prevent infinite loops for very rare events
    const maxIterations = maxSearchYears * params.SEBAKA_YEAR_IN_DAYS;
    
    let currentHours = Math.floor(startHours / stepHours) * stepHours;
    
    const timeStep = direction === 'next' ? stepHours : -stepHours;
    
    // Adjust start time to avoid finding the same event again
    if (direction === 'next') {
        currentHours += stepHours;
    } else if (direction === 'last') {
        // For 'last', we don't adjust, we search from the current moment backwards
    } else { // 'previous'
        currentHours -= stepHours;
    }


    for (let i = 0; i < maxIterations; i++) {
        currentHours += timeStep;
        if (currentHours < 0 && direction !== 'next') {
             // For simplicity, stop search at Year 0 for backwards searches
            if (i === 0 && event.name === 'Great Conjunction') return 0;
            break;
        };
        
        const bodyPositions = calculateBodyPositions(currentHours, processedBodyData);

        if (checkEventConditions(event, bodyPositions, allBodiesData)) {
            // Found a match. For simplicity, we return this time.
            // A more complex solver would find the *center* of the event window.
            return currentHours;
        }
    }

    console.warn(`Event search limit reached for ${event.name}`);
    return null;
}
