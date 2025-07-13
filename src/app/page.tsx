"use client";

import { useState } from "react";
import { Palette } from "lucide-react";

import type { PlanetData, StarData } from "@/types";
import CelestialSymphony from "@/components/celestial-symphony";
import ColorHarmonizerPanel from "@/components/color-harmonizer-panel";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// 1 AU = 150 simulation units.
const AU_TO_UNITS = 150;
const BASE_SPEED = 0.005;

const initialStars: StarData[] = [
  // Alpha-Twilight Binary pair. They orbit each other.
  { name: "Alpha", color: "#FFD700", size: 12, position: [-15, 0, 0] }, // 1 R☉, relative size
  { name: "Twilight", color: "#FF6400", size: 8.4, position: [15, 0, 0] }, // 0.7 R☉, relative size
  // Distant companion star
  { name: "Beacon", color: "#B4DCFF", size: 48, position: [1000 * AU_TO_UNITS, 0, 0] }, // 4 R☉, at 1000 AU
];

const initialPlanets: PlanetData[] = [
  // Planets orbiting the Alpha-Twilight binary barycenter
  { name: "Rutilus", color: "#FF6600", size: 3.1, orbitRadius: 0.7 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * 1.97 }, // 169 days
  { name: "Sebaka", color: "#0096C8", size: 6.4, orbitRadius: 1.1 * AU_TO_UNITS, orbitSpeed: BASE_SPEED }, // 333 days (baseline)
  { name: "Spectris", color: "#B4B4C8", size: 5.1, orbitRadius: 2.0 * AU_TO_UNITS, orbitSpeed: BASE_SPEED / 2.45 }, // 818 days
  { name: "Viridis", color: "#FF783C", size: 8.3, orbitRadius: 3.0 * AU_TO_UNITS, orbitSpeed: BASE_SPEED / 4.5 }, // 1500 days
  { name: "Aetheris", color: "#5082C8", size: 20, orbitRadius: 6.0 * AU_TO_UNITS, orbitSpeed: BASE_SPEED / 12.7 }, // 4241 days

  // Planets orbiting Beacon (practically invisible from the main system)
  { name: "Gelidis", color: "#1E90FF", size: 25.4, orbitRadius: 10 * AU_TO_UNITS, orbitSpeed: BASE_SPEED, orbitCenter: [1000 * AU_TO_UNITS, 0, 0] },
  { name: "Liminis", color: "#F5F5F5", size: 1.2, orbitRadius: 30 * AU_TO_UNITS, orbitSpeed: BASE_SPEED / 6, orbitCenter: [1000 * AU_TO_UNITS, 0, 0] },
];

export default function Home() {
  const [planets, setPlanets] = useState<PlanetData[]>(initialPlanets);

  const handleApplyPalette = (newColors: string[]) => {
    // Only apply colors to the 5 inner planets
    const innerPlanets = initialPlanets.slice(0, 5);
    const outerPlanets = initialPlanets.slice(5);

    const updatedInnerPlanets = innerPlanets.map((planet, i) => ({
      ...planet,
      color: newColors[i % newColors.length],
    }));

    setPlanets([...updatedInnerPlanets, ...outerPlanets]);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <CelestialSymphony stars={initialStars} planets={planets} />
      <div className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start">
        <div className="text-left">
          <h1 className="font-headline text-3xl md:text-5xl font-bold text-primary-foreground/90 tracking-tighter">
            Celestial Symphony
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mt-1">
            An interactive 3D celestial simulation with AI-powered color harmonization.
          </p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-background/20 backdrop-blur-sm">
              <Palette className="h-5 w-5" />
              <span className="sr-only">Open Color Harmonizer</span>
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Color Harmonizer</SheetTitle>
              <SheetDescription>
                Use AI to generate a new harmonious color palette for the planets.
              </SheetDescription>
            </SheetHeader>
            <ColorHarmonizerPanel onApplyPalette={handleApplyPalette} />
          </SheetContent>
        </Sheet>
      </div>
    </main>
  );
}
