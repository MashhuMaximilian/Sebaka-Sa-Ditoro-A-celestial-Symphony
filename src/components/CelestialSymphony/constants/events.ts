

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
    primaryBodies: string[];
    secondaryBodies?: string[];
    maxSeparation: number; // Maximum angular separation in degrees
    minSeparation?: number; // Minimum separation for dominance events
    minOverlap?: number; // Minimum overlap fraction for occultations (0–1)
    alignmentTolerance?: number; // Dynamic tolerance for alignment precision
    viewingLongitude?: number; // Optimal longitude on Sebaka (degrees)
    viewingLatitude?: number; // Optimal latitude on Sebaka (degrees)
    visibilityCondition?: 'night' | 'twilight' | 'day'; // Time of day
    approximatePeriodDays: number; // Rough estimate for solver optimization
}

export const celestialEvents: CelestialEvent[] = [
    {
        name: "Great Conjunction",
        description: "Rare near-alignment of Rutilus, Sebaka, Spectris, Viridis, and Aetheris in a 'Celestial Crescent,' a prophetic event.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        maxSeparation: 20, // Looser for a wide arc
        alignmentTolerance: 5, // Allow some deviation for the arc
        viewingLongitude: 180,
        visibilityCondition: 'night',
        approximatePeriodDays: 795060, // ~2454 Sebakan years
    },
    {
        name: "Gathering of Witnesses",
        description: "Annual visibility of Rutilus, Spectris, Viridis, Aetheris, and Beacon in a loose arc, a festive period.",
        type: 'cluster',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        secondaryBodies: ["Beacon"],
        maxSeparation: 15,
        viewingLongitude: 270,
        visibilityCondition: 'night',
        approximatePeriodDays: 324, // 1 Sebakan year
    },
    {
        name: "Twin Conjunction",
        description: "Rutilus and Spectris appear close (~2–5°), creating a 'Double Ember' effect, celebrated as the Ember Dance.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris"],
        maxSeparation: 5,
        alignmentTolerance: 2,
        viewingLongitude: 240,
        visibilityCondition: 'twilight',
        approximatePeriodDays: 972, // ~3 Sebakan years
    },
    {
        name: "Triad Alignment",
        description: "Rutilus, Spectris, and Viridis form a triangle (~10°), known as the 'Triad Lantern' during the Lantern Festival.",
        type: 'triangle',
        primaryBodies: ["Rutilis", "Spectris", "Viridis"],
        maxSeparation: 10,
        alignmentTolerance: 3,
        viewingLongitude: 210,
        visibilityCondition: 'night',
        approximatePeriodDays: 1620, // ~5 Sebakan years
    },
    {
        name: "Quadrant Convergence",
        description: "Rutilus, Spectris, Viridis, and Aetheris align (~15°), with Beacon, called the 'Quadrant Veil' for Veil Nights.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        secondaryBodies: ["Beacon"],
        maxSeparation: 15,
        alignmentTolerance: 5,
        viewingLongitude: 270,
        visibilityCondition: 'night',
        approximatePeriodDays: 3240, // ~10 Sebakan years
    },
    {
        name: "Aetheris Dominance",
        description: "Aetheris at periapsis forms a 'Blue Halo,' a time for Halo Ascendance and rune discoveries.",
        type: 'dominance',
        primaryBodies: ["Aetheris"],
        secondaryBodies: ["Spectris", "Viridis"],
        maxSeparation: 180, // Not relevant, set high
        minSeparation: 20,
        viewingLongitude: 180,
        visibilityCondition: 'night',
        approximatePeriodDays: 8748, // ~27 Sebakan years
    },
    {
        name: "Pre-Conjunction Prelude",
        description: "Near-alignment of inner planets, with a 'Pre-Conjunction Blaze,' marking Blaze Vigil before the Great Conjunction.",
        type: 'cluster',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        maxSeparation: 20,
        alignmentTolerance: 5,
        viewingLongitude: 90,
        visibilityCondition: 'twilight',
        approximatePeriodDays: 32400, // ~100 Sebakan years
    },
    {
        name: "Spectris-Viridis Occultation",
        description: "Rare eclipse, a 'Ringed Eclipse.'",
        type: 'occultation',
        primaryBodies: ["Spectris", "Viridis"],
        maxSeparation: 0.35, // 0.2° + 0.15°
        minOverlap: 0.1,
        viewingLongitude: 170,
        visibilityCondition: 'night',
        approximatePeriodDays: 489870, // ~1515 Sebakan years
    },
    {
        name: "Spectris-Aetheris Occultation",
        description: "Rare 'Giant’s Veil' eclipse.",
        type: 'occultation',
        primaryBodies: ["Spectris", "Aetheris"],
        maxSeparation: 0.7, // 0.5° + 0.2°
        minOverlap: 0.1,
        viewingLongitude: 185,
        visibilityCondition: 'night',
        approximatePeriodDays: 1589220, // ~4905 Sebakan years
    },
    {
        name: "Viridis-Aetheris Occultation",
        description: "Rare 'Storm Shroud' eclipse.",
        type: 'occultation',
        primaryBodies: ["Viridis", "Aetheris"],
        maxSeparation: 0.65, // 0.5° + 0.15°
        minOverlap: 0.1,
        viewingLongitude: 190,
        visibilityCondition: 'night',
        approximatePeriodDays: 1166400, // ~3600 Sebakan years
    },
    {
        name: "Triple Cascade",
        description: "Extremely rare occultation of all three, a 'Triple Cascade.'",
        type: 'occultation',
        primaryBodies: ["Viridis", "Spectris", "Aetheris"],
        maxSeparation: 1, // 0.5–1° tolerance
        minOverlap: 0.1,
        viewingLongitude: 188,
        visibilityCondition: 'night',
        approximatePeriodDays: 15877620, // ~49005 Sebakan years
    },
    {
        name: "Inner Conjunction",
        description: "A rare alignment where all inner planets eclipse each other.",
        type: 'occultation',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        maxSeparation: 1.0, // Tight eclipse
        minOverlap: 0.05,
        viewingLongitude: 180,
        visibilityCondition: 'night',
        approximatePeriodDays: 25000000, // Extremely rare
    },
];
