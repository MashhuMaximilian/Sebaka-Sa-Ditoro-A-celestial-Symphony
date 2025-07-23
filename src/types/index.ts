
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
}

export interface StarData extends CelestialBody {
  type: 'Star';
  luminosity: number;
}

export type AnyBodyData = PlanetData | StarData;

export interface MaterialProperties {
  [key: string]: {
    // Existing properties
    albedo?: number;
    emissiveIntensity?: number;
    normalScale?: number;
    displacementScale?: number;
    specularIntensity?: number;
    shininess?: number;
    aoMapIntensity?: number;
    
    // New blob properties
    noiseFrequency?: number;
    noiseSpeed?: number;
    blobComplexity?: number;
    iridescenceStrength?: number;
    rimPower?: number;
    opacity?: number;
    height?: number;
  };
}
