
"use client";

import { useState } from "react";
import { Palette, History } from "lucide-react";

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
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


// 1 AU = 150 simulation units.
const AU_TO_UNITS = 150;
const BASE_SPEED = 0.001; // Base speed for 1 year (333 days)

const initialStars: StarData[] = [
    // Alpha-Twilight Binary pair. They orbit each other.
    { name: "Alpha", color: "#FFD700", size: 6.96, position: [-0.1 * AU_TO_UNITS, 0, 0] }, // 1 R☉, at 0.1 AU from barycenter
    { name: "Twilight", color: "#FF6400", size: 4.87, position: [0.1 * AU_TO_UNITS, 0, 0] }, // 0.7 R☉, at 0.1 AU from barycenter
    // Distant companion star
    { name: "Beacon", color: "#B4DCFF", size: 27.84, position: [1000 * AU_TO_UNITS, 0, 0] }, // 4 R☉, at 1000 AU
];
  
const initialPlanets: PlanetData[] = [
    { name: "Rutilus", color: "#FF6600", size: 3.189, orbitRadius: 0.7 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (333 / 169) },
    { name: "Sebaka", color: "#0096C8", size: 6.371, orbitRadius: 1.1 * AU_TO_UNITS, orbitSpeed: BASE_SPEED }, // Baseline 333 days
    { name: "Spectris", color: "#B4B4C8", size: 5.097, orbitRadius: 2.0 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (333 / 818) },
    { name: "Viridis", color: "#FF783C", size: 8.282, orbitRadius: 3.0 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (333 / 1500) },
    { name: "Aetheris", color: "#5082C8", size: 95.565, orbitRadius: 6.0 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (333 / 4241), eccentric: true },
  
    // Planets orbiting Beacon
    { name: "Gelidis", color: "#1E90FF", size: 25.484, orbitRadius: 10 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (333 / 2236), orbitCenter: [1000 * AU_TO_UNITS, 0, 0] },
    { name: "Liminis", color: "#F5F5F5", size: 1.274, orbitRadius: 30 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (333 / 13416), orbitCenter: [1000 * AU_TO_UNITS, 0, 0] },
];

export default function Home() {
  const [planets, setPlanets] = useState<PlanetData[]>(initialPlanets);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);

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
  
  const handleSpeedChange = (value: number[]) => {
    setSpeedMultiplier(value[0]);
  };

  const resetSpeed = () => {
    setSpeedMultiplier(1);
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <CelestialSymphony stars={initialStars} planets={planets} speedMultiplier={speedMultiplier} />
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

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm md:max-w-md p-4">
          <div className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
              <span className="text-sm font-medium text-primary-foreground/90 min-w-20 text-center">
                  Speed: {speedMultiplier.toFixed(1)}x
              </span>
              <Slider
                  min={0.1}
                  max={100}
                  step={0.1}
                  value={[speedMultiplier]}
                  onValueChange={handleSpeedChange}
                  className="w-full"
              />
               <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={resetSpeed} className="text-primary-foreground/90 hover:bg-background/30 hover:text-primary-foreground">
                              <History className="h-5 w-5" />
                          </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                          <p>Reset Speed</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
          </div>
      </div>
    </main>
  );
}
