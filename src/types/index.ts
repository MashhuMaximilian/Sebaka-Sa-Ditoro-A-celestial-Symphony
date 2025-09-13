

interface CelestialBody {
    name: string;
    color: string;
    size: number;
    type: 'Planet' | 'Star';
    classification: string;
    orbitalRole: string;
    orbitalPeriod: string;
    orbitalDistance: string;
    radius: string;
    mass: string;
    surface: string;
    characteristics: string;
    appearance: string;
    lore: string;
    orbitPeriodDays: number;
    orbitRadius?: number;
    eccentric?: boolean;
    eccentricity?: number;
    rotation?: string;
    axialTilt?: string;
    moons?: string;
    rotationPeriodHours?: number;
    luminosity?: number;
    initialPhase?: number; // Starting angle in degrees
    
    // Calculated properties
    radsPerHour?: number;
    initialPhaseRad?: number;
}

export interface PlanetData extends CelestialBody {
  type: 'Planet';
  orbitRadius: number;
  eccentric: boolean;
  eccentricity: number;
  rotation: string;
  axialTilt: string;
  moons: string;
  rotationPeriodHours: number;
  position?: THREE.Vector3; // For event solver
}

export interface StarData extends CelestialBody {
  type: 'Star';
  luminosity: number;
}

export type AnyBodyData = PlanetData | StarData;

export interface MaterialProperties {
  [key: string]: {
    // Standard Planet/Star properties
    albedo?: number;
    emissiveIntensity?: number;
    normalScale?: number;
    displacementScale?: number;
    specularIntensity?: number;
    shininess?: number;
    aoMapIntensity?: number;
    
    // Character Blob properties
    noiseFrequency?: number;
    noiseSpeed?: number;
    blobComplexity?: number;
    opacity?: number;
    height?: number;
    iridescenceStrength?: number;
    rimPower?: number;
    colorSpeed?: number;
    latitude?: number;
    longitude?: number;

    // Viridis Volcano properties
    noiseScale?: number;
    smokeDensity?: number;
    lavaDensity?: number;
    lavaDotSize?: number;
    lavaDotSizeVariance?: number;
    lavaBrightness?: number;
  };
}


export type EventAlignmentType = 
    | 'conjunction' // All bodies within a tight arc but not overlapping
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
    longitudeTolerance: number; // Max longitude deviation from mean in degrees
    minSeparation?: number; // Min separation for dominance events or non-overlapping conjunctions
    overlapThreshold?: number; // Min overlap fraction for occultations (0–1)
    sunSeparationMultiplier?: number; // New field
    allowSunOverlap?: boolean; // New field for special eclipse events
    viewingLongitude?: number; // Optimal longitude on Sebaka (degrees)
    visibilityCondition?: 'night' | 'twilight' | 'day';
}
