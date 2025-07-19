

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
    orbitPeriodDays: number; // The orbital period in Sebaka days.
    orbitRadius?: number;
}

export interface PlanetData extends CelestialBody {
  type: 'Planet';
  orbitRadius: number;
  eccentric?: boolean;
  eccentricity?: number;
  rotation: string;
  axialTilt: string;
  moons: string;
  rotationPeriodHours?: number;
}

export interface StarData extends CelestialBody {
  type: 'Star';
  luminosity?: number;
}

export interface MaterialProperties {
  [key: string]: {
    normalScale: number;
    displacementScale: number;
    emissiveIntensity?: number;
    specularMap?: boolean;
    aoMap?: boolean;
    shininess?: number;
    aoMapIntensity?: number;
  };
}

    
