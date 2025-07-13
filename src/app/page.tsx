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

const initialStars: StarData[] = [
  { name: "Alpha", color: "#FFD700", size: 50, position: [0, 0, 0] },
  { name: "Twilight", color: "#FF6400", size: 35, position: [0, 0, 0] },
  { name: "Beacon", color: "#B4DCFF", size: 100, position: [1000, 0, 0] },
];

const initialPlanets: PlanetData[] = [
  { name: "Rutilus", color: "#FF6600", size: 8, orbitRadius: 100, orbitSpeed: 0.03 },
  { name: "Sebaka", color: "#0096C8", size: 12, orbitRadius: 160, orbitSpeed: 0.02 },
  { name: "Spectris", color: "#B4B4C8", size: 10, orbitRadius: 220, orbitSpeed: 0.015 },
  { name: "Viridis", color: "#FF783C", size: 15, orbitRadius: 280, orbitSpeed: 0.012 },
  { name: "Aetheris", color: "#5082C8", size: 25, orbitRadius: 360, orbitSpeed: 0.009 },
];

export default function Home() {
  const [planets, setPlanets] = useState<PlanetData[]>(initialPlanets);

  const handleApplyPalette = (newColors: string[]) => {
    setPlanets((prevPlanets) =>
      prevPlanets.map((planet, i) => ({
        ...planet,
        color: newColors[i % newColors.length],
      }))
    );
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
