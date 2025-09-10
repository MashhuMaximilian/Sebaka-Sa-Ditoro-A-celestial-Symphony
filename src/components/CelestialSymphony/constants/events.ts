

export type EventAlignmentType = 
    | 'conjunction' // All bodies within a tight arc
    | 'occultation' // Two or more bodies overlap
    | 'cluster'     // Bodies within a wider arc
    | 'dominance'   // One body is prominent, others are far away
    | 'triangle';   // Three bodies form a triangle

export interface CelestialEvent {
    name: string;
    description: string;
    type: EventAlignmentType;
    // The main planets involved in the alignment
    primaryBodies: string[];
    // Other bodies that might be part of the scene
    secondaryBodies?: string[];
    // The maximum angular separation (in degrees) for the primary bodies
    maxSeparation: number; 
    // The minimum angular separation for a "dominance" event
    minSeparation?: number;
    // Longitude on Sebaka to best view the event
    viewingLongitude?: number;
    // An estimation of how often the event might occur, for solver optimization
    approximatePeriodDays: number; 
}

export const celestialEvents: CelestialEvent[] = [
    {
        name: "Great Conjunction",
        description: "Rare near-alignment of Rutilus, Sebaka, Spectris, Viridis, and Aetheris in a “Celestial Crescent” (~20–30 nights), a prophetic event.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        maxSeparation: 10,
        viewingLongitude: 180,
        approximatePeriodDays: 795060, // ~2454 Sebakan years
    },
    {
        name: "Gathering of Witnesses",
        description: "Annual visibility of Rutilus, Spectris, Viridis, Aetheris, and Beacon in a loose arc, a festive period with no work beyond essentials.",
        type: 'cluster',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        maxSeparation: 15,
        viewingLongitude: 270,
        approximatePeriodDays: 324, // 1 Sebakan year
    },
    {
        name: "Twin Conjunction",
        description: "Rutilus and Spectris appear close (~2–5°), creating a “Double Ember” effect, celebrated as the Ember Dance.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris"],
        maxSeparation: 5,
        viewingLongitude: 240,
        approximatePeriodDays: 972, // ~3 Sebakan years
    },
    {
        name: "Triad Alignment",
        description: "Rutilus, Spectris, and Viridis form a triangle (~10°), known as the “Triad Lantern” during the Lantern Festival.",
        type: 'triangle',
        primaryBodies: ["Rutilis", "Spectris", "Viridis"],
        maxSeparation: 10,
        viewingLongitude: 210,
        approximatePeriodDays: 1620, // ~5 Sebakan years
    },
    {
        name: "Quadrant Convergence",
        description: "Rutilus, Spectris, Viridis, and Aetheris align (~15°), with Beacon, called the “Quadrant Veil” for Veil Nights.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        maxSeparation: 15,
        viewingLongitude: 270,
        approximatePeriodDays: 3240, // ~10 Sebakan years
    },
    {
        name: "Aetheris Dominance",
        description: "Aetheris at periapsis forms a “Blue Halo,” a time for Halo Ascendance and rune discoveries.",
        type: 'dominance',
        primaryBodies: ["Aetheris"],
        secondaryBodies: ["Spectris", "Viridis"],
        maxSeparation: 0.5, // Not really used, but needed
        minSeparation: 20, // The other planets must be at least this far away
        viewingLongitude: 180,
        approximatePeriodDays: 8748, // ~27 Sebakan years
    },
    {
        name: "Pre-Conjunction Prelude",
        description: "Near-alignment of inner planets, with a “Pre-Conjunction Blaze,” marking Blaze Vigil before the Great Conjunction.",
        type: 'cluster',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        maxSeparation: 20,
        viewingLongitude: 90,
        approximatePeriodDays: 32400, // ~100 Sebakan years
    },
    {
        name: "Spectris-Viridis Occultation",
        description: "Rare eclipse, a “Ringed Eclipse.”",
        type: 'occultation',
        primaryBodies: ["Spectris", "Viridis"],
        maxSeparation: 0.35, // Sum of their apparent radii
        viewingLongitude: 170,
        approximatePeriodDays: 489_870, // ~1515 Sebakan years
    },
    {
        name: "Spectris-Aetheris Occultation",
        description: "Rare “Giant’s Veil” eclipse.",
        type: 'occultation',
        primaryBodies: ["Spectris", "Aetheris"],
        maxSeparation: 0.7, // Sum of their apparent radii
        viewingLongitude: 185,
        approximatePeriodDays: 1_589_220, // ~4905 Sebakan years
    },
    {
        name: "Viridis-Aetheris Occultation",
        description: "Rare “Storm Shroud” eclipse.",
        type: 'occultation',
        primaryBodies: ["Viridis", "Aetheris"],
        maxSeparation: 0.65, // Sum of their apparent radii
        viewingLongitude: 190,
        approximatePeriodDays: 1_166_400, // ~3600 Sebakan years
    },
    {
        name: "Triple Cascade",
        description: "Extremely rare occultation of all three, a “Triple Cascade.”",
        type: 'occultation',
        primaryBodies: ["Viridis", "Spectris", "Aetheris"],
        maxSeparation: 1, // Wider tolerance for this rare event
        viewingLongitude: 188,
        approximatePeriodDays: 15_877_620, // ~49005 Sebakan years
    },
    {
        name: "Inner Conjunction",
        description: "A rare alignment where all inner planets eclipse each other.",
        type: 'occultation',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        maxSeparation: 1.0, // Aetheris is ~0.5 deg, so this is tight
        viewingLongitude: 180,
        approximatePeriodDays: 25_000_000, // Extremely rare
    },
];
