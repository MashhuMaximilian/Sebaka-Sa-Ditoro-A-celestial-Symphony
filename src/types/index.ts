
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
}

export interface PlanetData extends CelestialBody {
  type: 'Planet';
  orbitRadius: number;
  orbitSpeed: number;
  orbitCenter?: [number, number, number];
  eccentric?: boolean;
  rotation: string;
  axialTilt: string;
  moons: string;
}

export interface StarData extends CelestialBody {
  type: 'Star';
  position: [number, number, number];
}
