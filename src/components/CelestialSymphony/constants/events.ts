
export interface CelestialEvent {
    name: string;
    description: string;
    periodDays?: number; // Period in Sebakan days for simple periodic events
    type: 'periodic' | 'alignment' | 'occultation';
    // Longitude on Sebaka to best view the event
    viewingLongitude?: number;
}

// 1 Sebakan Year = 324 days
const SEBAKA_YEAR = 324;

export const celestialEvents: CelestialEvent[] = [
    {
        name: "Great Conjunction",
        description: "Rare near-alignment of Rutilus, Sebaka, Spectris, Viridis, and Aetheris in a “Celestial Crescent” (~20–30 nights), a prophetic event.",
        periodDays: 2454 * SEBAKA_YEAR,
        type: 'alignment',
        viewingLongitude: 180,
    },
    {
        name: "Gathering of Witnesses",
        description: "Annual visibility of Rutilus, Spectris, Viridis, Aetheris, and Beacon in a loose arc, a festive period with no work beyond essentials.",
        periodDays: SEBAKA_YEAR,
        type: 'periodic',
        viewingLongitude: 270,
    },
    {
        name: "Twin Conjunction",
        description: "Rutilus and Spectris appear close (~2–5°), creating a “Double Ember” effect, celebrated as the Ember Dance.",
        periodDays: 3 * SEBAKA_YEAR,
        type: 'alignment',
        viewingLongitude: 240,
    },
    {
        name: "Triad Alignment",
        description: "Rutilus, Spectris, and Viridis form a triangle (~10°), known as the “Triad Lantern” during the Lantern Festival.",
        periodDays: 5 * SEBAKA_YEAR,
        type: 'alignment',
        viewingLongitude: 210,
    },
    {
        name: "Quadrant Convergence",
        description: "Rutilus, Spectris, Viridis, and Aetheris align (~15°), with Beacon, called the “Quadrant Veil” for Veil Nights.",
        periodDays: 10 * SEBAKA_YEAR,
        type: 'alignment',
        viewingLongitude: 270,
    },
    {
        name: "Aetheris Dominance",
        description: "Aetheris at periapsis forms a “Blue Halo,” a time for Halo Ascendance and rune discoveries.",
        periodDays: 27 * SEBAKA_YEAR,
        type: 'periodic',
        viewingLongitude: 180,
    },
    {
        name: "Pre-Conjunction Prelude",
        description: "Near-alignment of inner planets, with a “Pre-Conjunction Blaze,” marking Blaze Vigil before the Great Conjunction.",
        periodDays: 100 * SEBAKA_YEAR,
        type: 'alignment',
        viewingLongitude: 90,
    },
    {
        name: "Spectris-Viridis Occultation",
        description: "Rare eclipse, a “Ringed Eclipse.”",
        periodDays: 1515,
        type: 'occultation',
        viewingLongitude: 170,
    },
    {
        name: "Spectris-Aetheris Occultation",
        description: "Rare “Giant’s Veil” eclipse.",
        periodDays: 4905,
        type: 'occultation',
        viewingLongitude: 185,
    },
    {
        name: "Viridis-Aetheris Occultation",
        description: "Rare “Storm Shroud” eclipse.",
        periodDays: 3600,
        type: 'occultation',
        viewingLongitude: 190,
    },
    {
        name: "Triple Cascade",
        description: "Extremely rare occultation of all three, a “Triple Cascade.”",
        periodDays: 49005,
        type: 'occultation',
        viewingLongitude: 188,
    },
];
