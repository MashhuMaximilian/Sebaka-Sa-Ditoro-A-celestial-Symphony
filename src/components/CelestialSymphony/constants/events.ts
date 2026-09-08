
import type { CelestialEvent } from '@/types';

export const celestialEvents: CelestialEvent[] = [
    {
        name: "Great Conjunction",
        description: "Rare close alignment of four planets within 30 arcminutes, creating a 'Celestial Crescent.'",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        longitudeTolerance: 0.5, // 30 arcmin - matches real great conjunctions
        minSeparation: 10, // 10 arcmin minimum separation
        sunSeparationMultiplier: 5, // Reduced from 10, more realistic
        viewingLongitude: 180,
        visibilityCondition: 'night',
        eventRole: 'derived',
    },
    {
        name: "Full Triune Alignment",
        description: "The rare Year 0 / approximately Year 2454 episode: four planets form an ordered crescent, shadows pass in sequence, darkness arrives in stages, and Beacon provides the finale.",
        type: 'cluster',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        secondaryBodies: ["Beacon"],
        longitudeTolerance: 60,
        sunSeparationMultiplier: 1.0,
        viewingLongitude: 180,
        visibilityCondition: 'night',
        eventRole: 'core',
        durationDays: 54,
        orderedBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        requiresBeacon: true,
        historicalRecurrenceYears: 2454,
    },
    {
        name: "Gathering of Witnesses",
        description: "Annual planetary cluster spanning 5 degrees - visible as a loose celestial arc.",
        type: 'cluster', 
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        secondaryBodies: ["Beacon"],
        longitudeTolerance: 35, // 5° cluster - realistic for naked eye grouping
        viewingLongitude: 270,
        visibilityCondition: 'night',
        eventRole: 'core',
        durationDays: 27,
    },
    {
        name: "Twin Conjunction",
        description: "Close pairing of inner planets within 1 degree - the 'Double Ember' effect.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris"], 
        longitudeTolerance: 1, // 1° tolerance for close pair
        minSeparation: 0.5, // 30 arcmin minimum separation
        viewingLongitude: 240,
        visibilityCondition: 'twilight',
        eventRole: 'derived',
    },
    {
        name: "Triad Alignment",
        description: "Precise triangular formation within 15 arcminutes - the 'Triad Lantern.'",
        type: 'triangle',
        primaryBodies: ["Rutilis", "Spectris", "Viridis"],
        longitudeTolerance: 1, // 15 arcmin - tight triangle
        minSeparation: 0.17, // 10 arcmin between vertices
        viewingLongitude: 210,
        visibilityCondition: 'night',
        eventRole: 'derived',
    },
    {
        name: "Quadrant Convergence", 
        description: "Four-planet cluster with distant Beacon within 3 degrees - the 'Quadrant Veil.'",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        secondaryBodies: ["Beacon"],
        longitudeTolerance: 3, // 3° spread including distant Beacon
        viewingLongitude: 270,
        visibilityCondition: 'night',
    },
    {
        name: "Aetheris Dominance",
        description: "Aetheris isolated by 15+ degrees from other planets - the 'Blue Halo' dominance.",
        type: 'dominance',
        primaryBodies: ["Aetheris"],
        secondaryBodies: ["Spectris", "Viridis"], 
        longitudeTolerance: 180, // Not applicable for dominance
        minSeparation: 15, // 15° isolation requirement
        viewingLongitude: 180,
        visibilityCondition: 'night',
        eventRole: 'derived',
    },
    {
        name: "Pre-Conjunction Prelude",
        description: "Loose 8-degree grouping preceding the Great Conjunction - the 'Pre-Conjunction Blaze.'", 
        type: 'cluster',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        longitudeTolerance: 8, // 8° loose pre-alignment cluster
        sunSeparationMultiplier: 0.8, // Closer to sun, harder to see
        viewingLongitude: 90,
        visibilityCondition: 'twilight',
        eventRole: 'derived',
    },
    {
        name: "Spectris-Viridis Occultation",
        description: "True occultation with 90%+ overlap - the 'Ringed Eclipse.'",
        type: 'occultation',
        primaryBodies: ["Spectris", "Viridis"],
        longitudeTolerance: 0.017, // 1 arcmin - true occultation precision
        overlapThreshold: 0.9, // 90% overlap for visible occultation
        viewingLongitude: 170,
        visibilityCondition: 'night',
        eventRole: 'derived',
    },
    {
        name: "Spectris-Aetheris Occultation", 
        description: "Giant planet occultation with precise alignment - the 'Giant's Veil.'",
        type: 'occultation',
        primaryBodies: ["Spectris", "Aetheris"],
        longitudeTolerance: 0.017, // 1 arcmin precision
        overlapThreshold: 0.9,
        viewingLongitude: 185,
        visibilityCondition: 'night',
        eventRole: 'derived',
    },
    {
        name: "Viridis-Aetheris Occultation",
        description: "Partial occultation with 70% overlap - the 'Storm Shroud.'",
        type: 'occultation', 
        primaryBodies: ["Viridis", "Aetheris"],
        longitudeTolerance: 0.03, // 2 arcmin - slightly looser
        overlapThreshold: 0.7, // Partial occultation
        viewingLongitude: 190,
        visibilityCondition: 'night',
        eventRole: 'derived',
    },
    {
        name: "The Great Eclipse",
        description: "A rare V/S/A occultation sequence: the Triple Cascade. This is distinct from the Full Triune Alignment.",
        type: 'occultation',
        primaryBodies: ["Viridis", "Spectris", "Aetheris"], 
        longitudeTolerance: 0.5, // truly: 0.017 1 arcmin - maximum precision
        overlapThreshold: 0.95, // Near-total overlap
        sunSeparationMultiplier: 0.5, // Very close sun approach allowed
        viewingLongitude: 188,
        visibilityCondition: 'night',
        eventRole: 'core',
        durationDays: 54,
        historicalRecurrenceYears: 10000,
    },
];
