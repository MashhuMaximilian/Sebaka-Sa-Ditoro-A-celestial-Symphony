
export type EventAlignmentType =
    | 'conjunction' // All bodies within a tight arc, but not overlapping
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
    longitudeTolerance: number; // Max angular deviation from mean in degrees
    minSeparation?: number; // Min separation for dominance events or non-overlapping conjunctions
    overlapThreshold?: number; // Min overlap fraction for occultations (0–1)
    viewingLongitude?: number; // Optimal longitude on Sebaka (degrees)
    visibilityCondition?: 'night' | 'twilight' | 'day';
    approximatePeriodDays: number; // Guide for detection window
}


export const celestialEvents: CelestialEvent[] = [
    {
        name: "Great Conjunction",
        description: "Rare alignment of Rutilus, Spectris, Viridis, and Aetheris in a 'Celestial Crescent,' a prophetic night event.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        longitudeTolerance: 20, // A wide 20-degree arc
        minSeparation: 1.0,    // But no two planets can be closer than 1.0 degree
        viewingLongitude: 180,
        visibilityCondition: 'night',
        approximatePeriodDays: 795060, // ~2,454 Sebakan years
    },
    {
        name: "Gathering of Witnesses",
        description: "Annual visibility of Rutilus, Spectris, Viridis, Aetheris, and Beacon in a loose arc, a festive night event.",
        type: 'cluster',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        secondaryBodies: ["Beacon"],
        longitudeTolerance: 15,
        viewingLongitude: 270,
        visibilityCondition: 'night',
        approximatePeriodDays: 324, // 1 Sebakan year
    },
    {
        name: "Twin Conjunction",
        description: "Rutilus and Spectris appear close, creating a 'Double Ember' effect, a twilight event.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris"],
        longitudeTolerance: 5,
        viewingLongitude: 240,
        visibilityCondition: 'twilight',
        approximatePeriodDays: 972, // ~3 Sebakan years
    },
    {
        name: "Triad Alignment",
        description: "Rutilus, Spectris, and Viridis form a triangle, the 'Triad Lantern' during the Lantern Festival, at night.",
        type: 'triangle',
        primaryBodies: ["Rutilis", "Spectris", "Viridis"],
        longitudeTolerance: 10,
        viewingLongitude: 210,
        visibilityCondition: 'night',
        approximatePeriodDays: 1620, // ~5 Sebakan years
    },
    {
        name: "Quadrant Convergence",
        description: "Rutilus, Spectris, Viridis, and Aetheris align with Beacon, the 'Quadrant Veil' for Veil Nights.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        secondaryBodies: ["Beacon"],
        longitudeTolerance: 15,
        viewingLongitude: 270,
        visibilityCondition: 'night',
        approximatePeriodDays: 3240, // ~10 Sebakan years
    },
    {
        name: "Aetheris Dominance",
        description: "Aetheris at periapsis forms a 'Blue Halo,' a night event for Halo Ascendance.",
        type: 'dominance',
        primaryBodies: ["Aetheris"],
        secondaryBodies: ["Spectris", "Viridis"],
        longitudeTolerance: 180, // Not relevant for dominance
        minSeparation: 20,
        viewingLongitude: 180,
        visibilityCondition: 'night',
        approximatePeriodDays: 8748, // ~27 Sebakan years
    },
    {
        name: "Pre-Conjunction Prelude",
        description: "Near-alignment of inner planets, the 'Pre-Conjunction Blaze,' a twilight event before Great Conjunction.",
        type: 'cluster',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        longitudeTolerance: 20,
        viewingLongitude: 90,
        visibilityCondition: 'twilight',
        approximatePeriodDays: 32400, // ~100 Sebakan years
    },
    {
        name: "Spectris-Viridis Occultation",
        description: "Rare eclipse, a 'Ringed Eclipse,' at night.",
        type: 'occultation',
        primaryBodies: ["Spectris", "Viridis"],
        longitudeTolerance: 0.2,
        overlapThreshold: 0.5,
        viewingLongitude: 170,
        visibilityCondition: 'night',
        approximatePeriodDays: 489870, // ~1,515 Sebakan years
    },
    {
        name: "Spectris-Aetheris Occultation",
        description: "Rare 'Giant’s Veil' eclipse, at night.",
        type: 'occultation',
        primaryBodies: ["Spectris", "Aetheris"],
        longitudeTolerance: 0.3,
        overlapThreshold: 0.5,
        viewingLongitude: 185,
        visibilityCondition: 'night',
        approximatePeriodDays: 1589220, // ~4,905 Sebakan years
    },
    {
        name: "Viridis-Aetheris Occultation",
        description: "Rare 'Storm Shroud' eclipse, at night.",
        type: 'occultation',
        primaryBodies: ["Viridis", "Aetheris"],
        longitudeTolerance: 0.3,
        overlapThreshold: 0.5,
        viewingLongitude: 190,
        visibilityCondition: 'night',
        approximatePeriodDays: 1166400, // ~3,600 Sebakan years
    },
    {
        name: "Triple Cascade",
        description: "Extremely rare occultation of all three, a 'Triple Cascade.'",
        type: 'occultation',
        primaryBodies: ["Viridis", "Spectris", "Aetheris"],
        longitudeTolerance: 0.5,
        overlapThreshold: 0.3,
        viewingLongitude: 188,
        visibilityCondition: 'night',
        approximatePeriodDays: 15877620, // ~49,005 Sebakan years
    },
    {
        name: "Quadruple Cascade (Inner Conjunction)",
        description: "Extremely rare occultation of Rutilus, Spectris, Viridis, and Aetheris, an 'Inner Eclipse,' at night.",
        type: 'occultation',
        primaryBodies: ["Rutilus", "Spectris", "Viridis", "Aetheris"],
        longitudeTolerance: 0.5,
        overlapThreshold: 0.5,
        viewingLongitude: 180,
        visibilityCondition: 'night',
        approximatePeriodDays: 25000000, // ~77,160 Sebakan years
    },
];
