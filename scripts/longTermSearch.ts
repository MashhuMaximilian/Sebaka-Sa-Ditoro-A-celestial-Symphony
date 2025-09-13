
#!/usr/bin/env -S npx tsx

import { findNextEvent, type EventSearchParams } from '../src/components/CelestialSymphony/utils/eventSolver';
import { celestialEvents } from '../src/components/CelestialSymphony/constants/events';
import { SEBAKA_YEAR_IN_DAYS, HOURS_IN_SEBAKA_DAY } from '../src/components/CelestialSymphony/constants/config';
import { initialStars, initialPlanets } from '../src/lib/celestial-data';
import type { PrecomputedEvent, CelestialEvent } from '@/types';
import * as fs from 'fs';
import * as path from 'path';

const PRIORITY_EVENTS = [
    "The Great Eclipse",
    "Great Conjunction", 
    "Celestial Origin Alignment"
];

const allBodiesData = [...initialStars, ...initialPlanets];
const outputFilePath = path.join(__dirname, '../src/lib/precomputed-events.json');

async function searchLongTerm() {
    let existingResults: PrecomputedEvent[] = [];
    if (fs.existsSync(outputFilePath)) {
        existingResults = JSON.parse(fs.readFileSync(outputFilePath, 'utf-8'));
    }
    
    const results: PrecomputedEvent[] = [...existingResults];
    const maxYears = 100000;
    
    console.log(`🔍 Starting ${maxYears}-year search for ${PRIORITY_EVENTS.length} priority events...`);
    
    for (const eventName of PRIORITY_EVENTS) {
        const event = celestialEvents.find(e => e.name === eventName) as CelestialEvent | undefined;
        if (!event) {
            console.warn(`Event "${eventName}" not found in definitions.`);
            continue;
        }

        let currentHour = 0;
        const maxHours = maxYears * SEBAKA_YEAR_IN_DAYS * HOURS_IN_SEBAKA_DAY;
        
        console.log(`\nSearching for "${eventName}"...`);
        
        while(currentHour < maxHours) {
            const result = await findNextEvent({
                startHours: currentHour,
                event,
                allBodiesData: allBodiesData,
                direction: 'next',
                SEBAKA_YEAR_IN_DAYS,
                HOURS_IN_SEBAKA_DAY,
                signal: new AbortController().signal // A dummy signal for the script
            });

            if (result && result.foundHours < maxHours) {
                 const newEvent: PrecomputedEvent = {
                    name: eventName,
                    hours: result.foundHours,
                    year: Math.floor(result.foundHours / (SEBAKA_YEAR_IN_DAYS * HOURS_IN_SEBAKA_DAY)),
                    day: Math.floor((result.foundHours / HOURS_IN_SEBAKA_DAY) % SEBAKA_YEAR_IN_DAYS) + 1,
                    latitude: result.viewingLatitude,
                    longitude: result.viewingLongitude,
                };

                // Avoid duplicates
                if (!results.some(e => e.name === newEvent.name && e.hours === newEvent.hours)) {
                    results.push(newEvent);
                    console.log(`✨ Found ${eventName} at year ${newEvent.year}, day ${newEvent.day}`);
                }
                
                // Advance currentHour past the found event to continue searching
                currentHour = result.foundHours + (HOURS_IN_SEBAKA_DAY * 3); // Add a 3-day buffer
            } else {
                // If no more events found, break from this event's while loop
                console.log(`No more occurrences of "${eventName}" found after hour ${currentHour}.`);
                break;
            }
        }
    }
    
    // Sort results and write to file
    results.sort((a, b) => a.hours - b.hours);
    fs.writeFileSync(outputFilePath, JSON.stringify(results, null, 2));
    console.log(`\n🎉 Complete! Found a total of ${results.length} events. Results saved to ${outputFilePath}`);
}

searchLongTerm().catch(console.error);
