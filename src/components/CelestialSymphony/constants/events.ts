
import type { CelestialEvent } from '@/types';

export const celestialEvents: CelestialEvent[] = [
    {
        name: "Great Conjunction",
        description: "Rare close alignment of four planets within 30 arcminutes, creating a 'Celestial Crescent.'",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        longitudeTolerance: 0.5, // 30 arcmin - matches real great conjunctions
        minSeparation: 0.17, // 10 arcmin minimum separation
        sunSeparationMultiplier: 5, // Reduced from 10, more realistic
        viewingLongitude: 180,
        visibilityCondition: 'night',
    },
    {
        name: "Celestial Origin Alignment", 
        description: "Perfect alignment of five planets within 20 arcminutes - recreating Year 0 positions.",
        type: 'conjunction',
        primaryBodies: ["Rutilis", "Sebaka", "Spectris", "Viridis", "Aetheris"],
        longitudeTolerance: 0.33, // 20 arcmin - very tight alignment
        minSeparation: 0.08, // 5 arcmin - extremely close
        sunSeparationMultiplier: 1.0,
        viewingLongitude: 180,
        visibilityCondition: 'night',
    },
    {
        name: "Gathering of Witnesses",
        description: "Annual planetary cluster spanning 5 degrees - visible as a loose celestial arc.",
        type: 'cluster', 
        primaryBodies: ["Rutilis", "Spectris", "Viridis", "Aetheris"],
        secondaryBodies: ["Beacon"],
        longitudeTolerance: 5, // 5° cluster - realistic for naked eye grouping
        viewingLongitude: 270,
        visibilityCondition: 'night',
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
    },
    {
        name: "Triad Alignment",
        description: "Precise triangular formation within 15 arcminutes - the 'Triad Lantern.'",
        type: 'triangle',
        primaryBodies: ["Rutilis", "Spectris", "Viridis"],
        longitudeTolerance: 0.25, // 15 arcmin - tight triangle
        minSeparation: 0.17, // 10 arcmin between vertices
        viewingLongitude: 210,
        visibilityCondition: 'night',
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
    },
    {
        name: "The Great Eclipse",
        description: "Extraordinary triple occultation with 95%+ overlap - the 'Triple Cascade.'",
        type: 'occultation',
        primaryBodies: ["Viridis", "Spectris", "Aetheris"], 
        longitudeTolerance: 0.017, // 1 arcmin - maximum precision
        overlapThreshold: 0.95, // Near-total overlap
        sunSeparationMultiplier: 0.5, // Very close sun approach allowed
        viewingLongitude: 188,
        visibilityCondition: 'night',
    },
];
