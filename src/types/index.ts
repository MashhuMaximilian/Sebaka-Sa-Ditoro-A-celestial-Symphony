export interface PlanetData {
  name: string;
  color: string;
  size: number;
  orbitRadius: number;
  orbitSpeed: number;
}

export interface StarData {
  name: string;
  color: string;
  size: number;
  position: [number, number, number];
}
