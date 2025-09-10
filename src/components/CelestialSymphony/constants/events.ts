
export interface CelestialEvent {
    name: string;
    description: string;
    periodDays?: number; // Period in Sebakan days for simple periodic events
    planets?: string[]; // Planets involved for alignment/occultation events
    type: 'periodic' | 'alignment' | 'occultation';
}

// 1 Sebakan Year = 324 days
const SEBAKA_YEAR = 324;

export const celestialEvents: CelestialEvent[] = [
    {
        name: "Gathering of Witnesses",
        description: "Annual visibility of Rutilus, Spectris, Viridis, Aetheris, and Beacon in a loose arc, a festive period with no work beyond essentials.",
        periodDays: SEBAKA_YEAR,
        planets: ["Rutilis", "Spectris", "Viridis", "Aetheris", "Beacon"],
        type: 'periodic', // This is technically an alignment, but can be approximated as periodic for now
    },
    {
        name: "Twin Conjunction",
        description: "Rutilus and Spectris appear close (~2–5°), creating a “Double Ember” effect, celebrated as the Ember Dance.",
        periodDays: 3 * SEBAKA_YEAR,
        planets: ["Rutilis", "Spectris"],
        type: 'alignment',
    },
    {
        name: "Triad Alignment",
        description: "Rutilus, Spectris, and Viridis form a triangle (~10°), known as the “Triad Lantern” during the Lantern Festival.",
        periodDays: 5 * SEBAKA_YEAR,
        planets: ["Rutilis", "Spectris", "Viridis"],
        type: 'alignment',
    },
    {
        name: "Quadrant Convergence",
        description: "Rutilus, Spectris, Viridis, and Aetheris align (~15°), with Beacon, called the “Quadrant Veil” for Veil Nights.",
        periodDays: 10 * SEBAKA_YEAR,
        planets: ["Rutilis", "Spectris", "Viridis", "Aetheris", "Beacon"],
        type: 'alignment',
    },
    {
        name: "Aetheris Dominance",
        description: "Aetheris at periapsis forms a “Blue Halo,” a time for Halo Ascendance and rune discoveries.",
        periodDays: 27 * SEBAKA_YEAR,
        planets: ["Aetheris"],
        type: 'periodic', // This is based on Aetheris's orbit, not a multi-planet alignment
    },
    {
        name: "Pre-Conjunction Prelude",
        description: "Near-alignment of inner planets, with a “Pre-Conjunction Blaze,” marking Blaze Vigil before the Great Conjunction.",
        periodDays: 100 * SEBAKA_YEAR,
        planets: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        type: 'alignment',
    },
    {
        name: "Great Conjunction",
        description: "Rare near-alignment of Rutilus, Sebaka, Spectris, Viridis, and Aetheris in a “Celestial Crescent” (~20–30 nights), a prophetic event.",
        periodDays: 2454 * SEBAKA_YEAR,
        planets: ["Rutilis", "Sebaka", "Spectris", "Viridis", "Aetheris"],
        type: 'alignment',
    },
    {
        name: "Spectris-Viridis Occultation",
        description: "Rare eclipse, a “Ringed Eclipse.”",
        periodDays: 1515 * SEBAKA_YEAR, // Average of 1010-2020 for now
        planets: ["Spectris", "Viridis"],
        type: 'occultation',
    },
    {
        name: "Spectris-Aetheris Occultation",
        description: "Rare “Giant’s Veil” eclipse.",
        periodDays: 4905 * SEBAKA_YEAR, // Average of 3270-6540 for now
        planets: ["Spectris", "Aetheris"],
        type: 'occultation',
    },
    {
        name: "Viridis-Aetheris Occultation",
        description: "Rare “Storm Shroud” eclipse.",
        periodDays: 3600 * SEBAKA_YEAR, // Average of 2400-4800 for now
        planets: ["Viridis", "Aetheris"],
        type: 'occultation',
    },
    {
        name: "Triple Cascade",
        description: "Extremely rare occultation of all three, a “Triple Cascade.”",
        periodDays: 49005 * SEBAKA_YEAR, // Average of 32670-65340 for now
        planets: ["Spectris", "Viridis", "Aetheris"],
        type: 'occultation',
    },
];

    