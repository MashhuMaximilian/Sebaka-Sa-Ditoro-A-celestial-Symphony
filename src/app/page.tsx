
"use client";

import { useState } from "react";
import { Palette, History, Eye, PersonStanding, Orbit, RotateCw } from "lucide-react";

import type { PlanetData, StarData } from "@/types";
import CelestialSymphony from "@/components/celestial-symphony";
import ColorHarmonizerPanel from "@/components/color-harmonizer-panel";
import InfoPanel from "@/components/info-panel";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
const BASE_SPEED = 0.001; // Base speed for 1 year (324 days)

const initialStars: StarData[] = [
    { 
        name: "Alpha", color: "#FFD700", size: 6.96, position: [-0.1 * AU_TO_UNITS, 0, 0],
        type: 'Star', classification: 'Yellow Dwarf',
        orbitalRole: 'Central Binary (orbits Twilight)', orbitalPeriod: '26 days', orbitalDistance: '0.2 AU',
        radius: '1 R☉ (696,000 km)', mass: '1 M☉',
        surface: 'Typical yellow dwarf stellar surface, radiating warm golden light.',
        characteristics: 'Dominant light source, slightly larger and more luminous than Twilight.',
        appearance: 'Appears as the primary sun, a bright golden disk. Creates vibrant golden sunrises, primary driver of day-night cycle.',
        lore: 'Symbolizes action and passion in Hypodia’s Sky-Writing, revered as a life-giving force. Influences magical energies in the Aerolith Zones.'
    },
    { 
        name: "Twilight", color: "#FF6400", size: 4.87, position: [0.1 * AU_TO_UNITS, 0, 0],
        type: 'Star', classification: 'Orange Dwarf',
        orbitalRole: 'Central Binary (orbits Alpha)', orbitalPeriod: '26 days', orbitalDistance: '0.2 AU',
        radius: '0.7 R☉ (487,200 km)', mass: '0.6 M☉',
        surface: 'Typical orange dwarf stellar surface, emitting a warm reddish glow.',
        characteristics: 'Less luminous than Alpha, creates a subtler light.',
        appearance: 'Appears as a secondary sun, smaller and redder than Alpha. Creates deep orange/red sunsets, lingers after Alpha sets.',
        lore: 'Represents quiet strength and endurance in Hypodia’s Sky-Writing, a counterpoint to Alpha’s vibrancy. May amplify calming magical effects in the Aerolith Zones.'
    },
    { 
        name: "Beacon", color: "#B4DCFF", size: 27.84, position: [1000 * AU_TO_UNITS, 0, 0],
        type: 'Star', classification: 'Blue-White Giant',
        orbitalRole: 'Distant Companion (orbits common barycenter of Alpha-Twilight)', orbitalPeriod: '12,328 years', orbitalDistance: '1,000 AU',
        radius: '4 R☉ (2,784,000 km)', mass: '5 M☉',
        surface: 'Brilliant blue-white giant, intensely luminous.',
        characteristics: 'Significantly more luminous than Alpha and Twilight combined, hosts its own planetary subsystem (Gelidis, Liminis).',
        appearance: 'Extraordinarily bright, unblinking point of light. Visible at night, occasionally during day. Its slow annual shift provides a fundamental marker for long-term cycles.',
        lore: 'Symbolizes constancy and endurance in Hypodia’s Sky-Writing, a guiding star for navigation and rituals. Marks long-term seasons or “Great Years”.'
    },
];
  
const initialPlanets: PlanetData[] = [
    { 
        name: "Rutilus", color: "#FF6600", size: 3.189, orbitRadius: 0.7 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (324 / 169),
        type: 'Planet', classification: 'Terrestrial',
        orbitalRole: 'Innermost planet orbiting Alpha-Twilight binary', orbitalPeriod: '169 days', orbitalDistance: '0.7 AU',
        rotation: '40 days', axialTilt: '10°', moons: 'None',
        radius: '0.5 R⊕ (3,189 km)', mass: '0.125 M⊕',
        surface: 'Scorched, sulfur-yellow crust with bleeding magma lines, thin atmosphere with volcanic outgassing.',
        characteristics: 'Intense heat due to proximity to binary, strong magnetic field from dense iron core.',
        appearance: 'Bright, ember-like point of light. Visible at twilight, occasionally during day. Flickers with volcanic activity.',
        lore: 'Seen as a fiery, untamed world in Hypodia’s Sky-Writing, symbolizing raw passion. Magnetic field may enhance fire-based magic.'
    },
    { 
        name: "Sebaka", color: "#0096C8", size: 6.371, orbitRadius: 1.08 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (324 / 324),
        type: 'Planet', classification: 'Terrestrial',
        orbitalRole: 'Second planet orbiting Alpha-Twilight binary', orbitalPeriod: '324 days', orbitalDistance: '1.08 AU',
        rotation: '24 hours', axialTilt: '23.5°', moons: 'None',
        radius: '1 R⊕ (6,371 km)', mass: '1 M⊕',
        surface: 'Earth-like, with oceans, continents, and a breathable atmosphere.',
        characteristics: 'Habitable zone, supports life, experiences Aerolith Zone phenomena. A year is 324 days, consisting of 12 months, with each month having 3 weeks of 9 days each.',
        appearance: 'N/A (observer’s planet). Hosts vibrant sunrises/sunsets from Alpha and Twilight, auroras from Aerolith Zones.',
        lore: 'Central to Hypodia’s Sky-Writing. Defines year (324 days). Aerolith Zones amplify magical energies.'
    },
    { 
        name: "Spectris", color: "#B4B4C8", size: 5.097, orbitRadius: 2.0 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (324 / 818), eccentric: true,
        type: 'Planet', classification: 'Terrestrial',
        orbitalRole: 'Third planet orbiting Alpha-Twilight binary', orbitalPeriod: '818 days', orbitalDistance: '2.0 AU',
        rotation: '30 hours', axialTilt: '15°', moons: '1 (28-day orbital period)',
        radius: '0.8 R⊕ (5,097 km)', mass: '0.512 M⊕',
        surface: 'Hazy, greyish-white atmosphere, iridescent icy rings.',
        characteristics: 'Eccentric orbit (e = 0.2) causes brightness variations. Known as the “Dream-Weaver”.',
        appearance: 'Fist-sized orb with shimmering rings. Prominent at sunset, visible at night. Rings reflect binary starlight.',
        lore: 'Called the Calendar Planet, it marks months via sunset position and its moon’s phases. Rings may influence dream-related magic.'
    },
    { 
        name: "Viridis", color: "#9ACD32", size: 8.282, orbitRadius: 3.0 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (324 / 1500),
        type: 'Planet', classification: 'Terrestrial',
        orbitalRole: 'Fourth planet orbiting Alpha-Twilight binary', orbitalPeriod: '1,500 days', orbitalDistance: '3.0 AU',
        rotation: '20 hours', axialTilt: '20°', moons: 'None',
        radius: '1.3 R⊕ (8,282 km)', mass: '2.0 M⊕',
        surface: 'Sulfur-yellow crust, bleeding magma lines, thick atmosphere with volcanic plumes.',
        characteristics: 'Intense volcanism creates ~27.75-day brightness cycle (albedo 0.1–0.5).',
        appearance: 'Bright orange-red disk during eruptions, faint crescent-like glow when ash-covered. Cycles of “flame and shade” mark days within a month.',
        lore: 'The Phase Maker. Volcanic activity may amplify fire or chaotic magic. Hypodia’s Sky-Writing describes it as a fiery, mysterious world.'
    },
    { 
        name: "Aetheris", color: "#5082C8", size: 95.565, orbitRadius: 6.0 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (324 / 4241), eccentric: true,
        type: 'Planet', classification: 'Gas Giant',
        orbitalRole: 'Fifth planet orbiting Alpha-Twilight binary', orbitalPeriod: '4,241 days (~11.62 years)', orbitalDistance: '6.0 AU',
        rotation: '10 hours', axialTilt: '25°', moons: 'Multiple (5–10 visible)',
        radius: '15 R⊕ (95,565 km)', mass: '400 M⊕',
        surface: 'Banded atmosphere with blue, purple, green hues, internal heat glow.',
        characteristics: 'Eccentric orbit (e = 0.5, periapsis 3.0 AU, apoapsis 9.0 AU), large magnetosphere.',
        appearance: 'Varies in size from large disk to smaller point. Dominant at night. Moons orbit like “silent thoughts.”',
        lore: 'Marks long-term cycles. Magnetosphere enhances protective magic. Hypodia’s Sky-Writing portrays it as a majestic, calming presence.'
    },
    { 
        name: "Gelidis", color: "#1E90FF", size: 25.484, orbitRadius: 10 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (324 / 2236), orbitCenter: [1000 * AU_TO_UNITS, 0, 0],
        type: 'Planet', classification: 'Ice Giant',
        orbitalRole: 'First planet orbiting Beacon', orbitalPeriod: '2,236 days (~6.12 years)', orbitalDistance: '10 AU from Beacon',
        rotation: '16 hours', axialTilt: '28°', moons: '2-3 (small)',
        radius: '4 R⊕ (25,484 km)', mass: '15 M⊕',
        surface: 'Vast atmosphere with swirling storm systems, faint icy cloud bands, frigid temperatures.',
        characteristics: 'Remote, dimly lit by Beacon’s light.',
        appearance: 'Not visible to the naked eye, requires powerful telescopes.',
        lore: 'Known only through advanced astronomical calculations, a mysterious, remote world.'
    },
    { 
        name: "Liminis", color: "#F5F5F5", size: 1.274, orbitRadius: 30 * AU_TO_UNITS, orbitSpeed: BASE_SPEED * (324 / 13416), orbitCenter: [1000 * AU_TO_UNITS, 0, 0],
        type: 'Planet', classification: 'Ice Dwarf',
        orbitalRole: 'Second planet orbiting Beacon', orbitalPeriod: '13,416 days (~36.73 years)', orbitalDistance: '30 AU from Beacon',
        rotation: '48 hours', axialTilt: '5°', moons: 'None',
        radius: '0.2 R⊕ (1,274 km)', mass: '0.05 M⊕',
        surface: 'Frozen expanse of rock and ice, thin atmosphere, perpetually shrouded in twilight.',
        characteristics: 'Furthest known planet, minimal light from Beacon.',
        appearance: 'Not visible to the naked eye, requires powerful telescopes.',
        lore: 'Discovered through long-duration observations, represents the system’s edge.'
    },
];

export default function Home() {
  const [planets, setPlanets] = useState<PlanetData[]>(initialPlanets);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [selectedBody, setSelectedBody] = useState<PlanetData | StarData | null>(null);
  const [isInfoPanelOpen, setInfoPanelOpen] = useState(false);
  const [viewFromSebaka, setViewFromSebaka] = useState(false);
  const [isSebakaRotating, setIsSebakaRotating] = useState(false);
  const [resetViewToggle, setResetViewToggle] = useState(false);
  const [isViridisAnimationActive, setIsViridisAnimationActive] = useState(false);

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
  
  const handleBodyClick = (bodyName: string) => {
    const allBodies = [...initialStars, ...planets];
    const body = allBodies.find(p => p.name === bodyName);
    if (body) {
      setSelectedBody(body);
      setInfoPanelOpen(true);
    }
  };
  
  const handleResetView = () => {
    if (viewFromSebaka) {
      setViewFromSebaka(false);
    }
    if (isSebakaRotating) {
        setIsSebakaRotating(false);
    }
    setResetViewToggle(prev => !prev);
  }

  const toggleSebakaView = () => {
      setViewFromSebaka(prev => {
          const newVew = !prev;
          if (!newVew && isSebakaRotating) {
              setIsSebakaRotating(false);
          }
          return newVew;
      })
  }

  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <CelestialSymphony 
        stars={initialStars} 
        planets={planets} 
        speedMultiplier={speedMultiplier} 
        onBodyClick={handleBodyClick}
        viewFromSebaka={viewFromSebaka}
        isSebakaRotating={isSebakaRotating}
        resetViewToggle={resetViewToggle}
        isViridisAnimationActive={isViridisAnimationActive}
      />
      <div className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start">
        <div className="text-left">
          <h1 className="font-headline text-3xl md:text-5xl font-bold text-primary-foreground/90 tracking-tighter">
            Celestial Symphony
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mt-1">
            An interactive 3D celestial simulation with AI-powered color harmonization.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Dialog open={isInfoPanelOpen} onOpenChange={setInfoPanelOpen}>
                {selectedBody && (
                    <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                        <DialogTitle>{selectedBody.name}</DialogTitle>
                        </DialogHeader>
                        <InfoPanel data={selectedBody} />
                    </DialogContent>
                )}
            </Dialog>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="outline" size="icon" className="bg-background/20 backdrop-blur-sm" onClick={() => setIsViridisAnimationActive(prev => !prev)}>
                            <Orbit className="h-5 w-5" />
                            <span className="sr-only">Toggle Viridis Animation</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isViridisAnimationActive ? 'Stop Viridis Animation' : 'Start Viridis Animation'}</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-background/20 backdrop-blur-sm" onClick={toggleSebakaView} disabled={isSebakaRotating}>
                            <PersonStanding className="h-5 w-5" />
                            <span className="sr-only">Toggle View from Sebaka</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{viewFromSebaka ? 'Exit Sebaka View' : 'View from Sebaka'}</p>
                    </TooltipContent>
                </Tooltip>
                {viewFromSebaka && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" className="bg-background/20 backdrop-blur-sm" onClick={() => setIsSebakaRotating(prev => !prev)}>
                                <RotateCw className="h-5 w-5" />
                                <span className="sr-only">Toggle Sebaka Rotation</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isSebakaRotating ? 'Stop Sebaka Rotation' : 'Rotate with Sebaka'}</p>
                        </TooltipContent>
                    </Tooltip>
                )}
                 <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="outline" size="icon" className="bg-background/20 backdrop-blur-sm" onClick={handleResetView}>
                            <Eye className="h-5 w-5" />
                            <span className="sr-only">Reset View</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Reset View</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

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
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-sm md:max-w-md p-4">
          <div className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
              <span className="text-sm font-medium text-primary-foreground/90 min-w-20 text-center">
                  Speed: {speedMultiplier.toFixed(1)}x
              </span>
              <Slider
                  min={0.1}
                  max={2000}
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
