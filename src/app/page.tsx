
"use client";

import { useState } from "react";
import { Palette, History, Eye, PersonStanding, Orbit, RotateCw, Focus } from "lucide-react";

import type { PlanetData, StarData } from "@/types";
import CelestialSymphony from "@/components/celestial-symphony";
import ColorHarmonizerPanel from "@/components/color-harmonizer-panel";
import InfoPanel from "@/components/info-panel";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


// 1 AU = 150 simulation units.
const AU_TO_UNITS = 150;
const SEBAKA_YEAR_IN_DAYS = 324;
const HOURS_IN_SEBAKA_DAY = 24;

const initialStars: StarData[] = [
  {
      name: "Golden Giver", color: "#FFD700", size: 6.96, orbitPeriodDays: 26,
      type: 'Star', classification: 'Yellow Dwarf',
      orbitalRole: 'Central Binary (orbits Twilight)', orbitalPeriod: '26 days', orbitalDistance: '0.2 AU',
      radius: '~1.0 R☉', mass: '1.0 M☉', luminosity: 1,
      surface: 'Typical yellow dwarf stellar surface, radiating warm golden light.',
      characteristics: 'Primary illuminator and dominant light source.',
      appearance: 'Bright golden disk, creates vibrant sunrises and is the primary driver of the day-night cycle.',
      lore: 'Revered as a life-giving force, often called the Golden Giver.'
  },
  {
      name: "Twilight", color: "#FF6400", size: 4.87, orbitPeriodDays: 26,
      type: 'Star', classification: 'Orange Dwarf',
      orbitalRole: 'Central Binary (orbits Golden Giver)', orbitalPeriod: '26 days', orbitalDistance: '0.2 AU',
      radius: '~0.7 R☉', mass: '0.6 M☉', luminosity: 0.7,
      surface: 'Typical orange dwarf stellar surface, emitting a warm reddish glow.',
      characteristics: 'Secondary illuminator, less luminous than Golden Giver.',
      appearance: 'Smaller, orange-red disk, prominent at dusk and dawn.',
      lore: 'Represents quiet strength and endurance, a counterpoint to Golden Giver’s vibrancy.'
  },
  {
      name: "Beacon", color: "#B4DCFF", size: 34.8, orbitPeriodDays: 12328 * SEBAKA_YEAR_IN_DAYS, orbitRadius: 1000 * AU_TO_UNITS,
      type: 'Star', classification: 'Blue-White Giant',
      orbitalRole: 'Distant Companion (orbits common barycenter of Golden Giver-Twilight)', orbitalPeriod: '12,328 years', orbitalDistance: '1,000 AU',
      radius: '~5-10 R☉', mass: '5.0 M☉', luminosity: 100,
      surface: 'Brilliant blue-white giant, intensely luminous.',
      characteristics: 'Significantly more luminous than the binary pair. Hosts its own planetary subsystem (Gelidis, Liminis).',
      appearance: 'Extraordinarily bright point of light. Visible at night, occasionally during the day.',
      lore: 'A guiding star for navigation and long-term cycles, marks "Great Years".'
  },
];

const initialPlanets: PlanetData[] = [
  {
      name: "Rutilus", color: "#FF6600", size: 3.189, orbitRadius: 0.7 * AU_TO_UNITS, orbitPeriodDays: 169, eccentric: true,
      type: 'Planet', classification: 'Terrestrial',
      orbitalRole: 'Innermost planet orbiting Golden Giver-Twilight binary', orbitalPeriod: '169 days (Synodic: 353.36 days)', orbitalDistance: '0.7 AU',
      rotation: 'N/A', axialTilt: 'N/A', moons: 'None',
      radius: '0.5 R⊕', mass: '~0.3 M⊕',
      surface: 'Scorched, volcanic crust with a thin atmosphere.',
      characteristics: 'Eccentricity of 0.1. Intense heat due to proximity to binary stars.',
      appearance: 'Bright, ember-like point of light, primarily visible during twilight.',
      lore: 'Seen as a fiery, untamed world, its rapid synodic cycle is tracked by astronomers.'
  },
  {
      name: "Sebaka", color: "#0096C8", size: 6.371, orbitRadius: 1.08 * AU_TO_UNITS, orbitPeriodDays: 324, eccentric: true,
      type: 'Planet', classification: 'Terrestrial (Homeworld)',
      orbitalRole: 'Second planet orbiting Golden Giver-Twilight binary', orbitalPeriod: '324 days', orbitalDistance: '1.08 AU',
      rotation: '24 hours', axialTilt: '23.5°', moons: 'None',
      radius: '1.0 R⊕', mass: '~1.0 M⊕',
      surface: 'Earth-like, with oceans, continents, and a breathable atmosphere.',
      characteristics: 'Habitable. Eccentricity of 0.05. A year is 324 days, divided into 12 months of 27 days each.',
      appearance: 'Observer\'s planet.',
      lore: 'The homeworld. Its calendar is defined by its orbit and Viridis\'s volcanic cycle.'
  },
  {
      name: "Spectris", color: "#B4B4C8", size: 5.097, orbitRadius: 2.0 * AU_TO_UNITS, orbitPeriodDays: 818, eccentric: true,
      type: 'Planet', classification: 'Terrestrial',
      orbitalRole: 'Third planet orbiting Golden Giver-Twilight binary', orbitalPeriod: '818 days (Synodic: 537.63 days)', orbitalDistance: '2.0 AU',
      rotation: 'N/A', axialTilt: 'N/A', moons: '1 (28-day cycle)',
      radius: '0.8 R⊕', mass: '~0.7 M⊕',
      surface: 'Hazy atmosphere with iridescent icy rings.',
      characteristics: 'Eccentric orbit (e = 0.2) causes brightness variations. Has one moon with a 28-day orbit.',
      appearance: 'A prominent night-sky object with shimmering rings.',
      lore: 'The position of its setting marks the months. Known as the "Dream-Weaver".'
  },
  {
      name: "Viridis", color: "#9ACD32", size: 8.282, orbitRadius: 3.0 * AU_TO_UNITS, orbitPeriodDays: 1500, eccentric: true,
      type: 'Planet', classification: 'Terrestrial',
      orbitalRole: 'Fourth planet orbiting Golden Giver-Twilight binary', orbitalPeriod: '1,500 days (Synodic: 413.22 days)', orbitalDistance: '3.0 AU',
      rotation: 'N/A', axialTilt: 'N/A', moons: 'None',
      radius: '1.3 R⊕', mass: '~2.0 M⊕',
      surface: 'Geologically active with significant volcanic activity.',
      characteristics: 'Eccentricity of 0.1. Features a 27-day volcanic brightness cycle (Bright, Waning, Dim).',
      appearance: 'A night-sky object whose brightness visibly changes over a 27-day period.',
      lore: 'The "Phase Maker." Its 27-day cycle is the basis for Sebaka\'s 9-day weeks and 27-day months.'
  },
  {
      name: "Aetheris", color: "#5082C8", size: 95.565, orbitRadius: 6.0 * AU_TO_UNITS, orbitPeriodDays: 4241, eccentric: true,
      type: 'Planet', classification: 'Gas Giant',
      orbitalRole: 'Fifth planet orbiting Golden Giver-Twilight binary', orbitalPeriod: '4,241 days (Synodic: 350.88 days)', orbitalDistance: '6.0 AU',
      rotation: 'N/A', axialTilt: 'N/A', moons: 'Multiple',
      radius: '15.0 R⊕', mass: '~300 M⊕',
      surface: 'Banded atmosphere with a visible internal heat glow.',
      characteristics: 'Highly eccentric orbit (e = 0.5) causes its apparent size and brightness to vary significantly.',
      appearance: 'Dominant night-sky object, varying from a large disk to a smaller point.',
      lore: 'Its long, eccentric orbit marks generational cycles.'
  },
  {
      name: "Gelidis", color: "#1E90FF", size: 25.484, orbitRadius: 5.7 * AU_TO_UNITS, orbitPeriodDays: 5163, eccentric: true,
      type: 'Planet', classification: 'Ice Giant',
      orbitalRole: 'First planet orbiting Beacon', orbitalPeriod: '5,163 days', orbitalDistance: '5.7 AU from Beacon',
      rotation: 'N/A', axialTilt: 'N/A', moons: '2-3 small',
      radius: '4.0 R⊕', mass: '~15 M⊕',
      surface: 'Vast, frigid atmosphere with swirling storm systems.',
      characteristics: 'Remote and dimly lit by Beacon. Eccentricity of 0.1.',
      appearance: 'Invisible to the naked eye, requires powerful telescopes.',
      lore: 'Known only through advanced astronomical calculations; a mysterious, remote world.'
  },
  {
      name: "Liminis", color: "#F5F5F5", size: 1.274, orbitRadius: 18.9 * AU_TO_UNITS, orbitPeriodDays: 26820, eccentric: true,
      type: 'Planet', classification: 'Ice Dwarf',
      orbitalRole: 'Second planet orbiting Beacon', orbitalPeriod: '26,820 days', orbitalDistance: '18.9 AU from Beacon',
      rotation: 'N/A', axialTilt: 'N/A', moons: 'None',
      radius: '0.2 R⊕', mass: '~0.01 M⊕',
      surface: 'Frozen expanse of rock and ice with a thin atmosphere.',
      characteristics: 'Furthest known planet, perpetually in twilight. Eccentricity of 0.2.',
      appearance: 'Invisible to the naked eye, requires powerful telescopes.',
      lore: 'Represents the edge of the known system, discovered through long-duration observation.'
  },
];

export default function Home() {
  const [planets, setPlanets] = useState<PlanetData[]>(initialPlanets);
  const [speedMultiplier, setSpeedMultiplier] = useState(24); // Default to 24 hours/sec (1 day/sec)
  const [selectedBody, setSelectedBody] = useState<PlanetData | StarData | null>(null);
  const [isInfoPanelOpen, setInfoPanelOpen] = useState(false);
  const [viewFromSebaka, setViewFromSebaka] = useState(false);
  const [isSebakaRotating, setIsSebakaRotating] = useState(true);
  const [resetViewToggle, setResetViewToggle] = useState(false);
  const [isViridisAnimationActive, setIsViridisAnimationActive] = useState(false);
  const [longitude, setLongitude] = useState(0);
  const [latitude, setLatitude] = useState(0);
  const [cameraPitch, setCameraPitch] = useState(0);
  const [cameraYaw, setCameraYaw] = useState(0);
  const [isBeaconView, setIsBeaconView] = useState(false);

  const [currentYear, setCurrentYear] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);
  const [targetYear, setTargetYear] = useState(0);
  const [targetDay, setTargetDay] = useState(1);
  const [elapsedHours, setElapsedHours] = useState(0);
  const [goToTime, setGoToTime] = useState<number | null>(null);

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
  
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
        setSpeedMultiplier(value);
    }
  };

  const handleLongitudeChange = (value: number[]) => {
    setLongitude(value[0]);
  };

  const handleLatitudeChange = (value: number[]) => {
    setLatitude(value[0]);
  };
  
  const handleCameraPitchChange = (value: number[]) => {
    setCameraPitch(value[0]);
  }

  const handleCameraYawChange = (value: number[]) => {
    setCameraYaw(value[0]);
  }

  const resetSpeed = () => {
    setSpeedMultiplier(24);
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
    if (!isSebakaRotating) {
        setIsSebakaRotating(true);
    }
    if (isBeaconView) {
        setIsBeaconView(false);
    }
    setResetViewToggle(prev => !prev);
  }

  const toggleSebakaView = () => {
      setViewFromSebaka(prev => {
          const newView = !prev;
          if (newView) {
            setLongitude(0);
            setLatitude(0);
            setCameraPitch(0);
            setCameraYaw(0);
          }
          return newView;
      })
  }

  const handleGoToTime = () => {
    const year = Math.max(0, targetYear);
    const day = Math.max(1, Math.min(SEBAKA_YEAR_IN_DAYS, targetDay));
    const newElapsedHours = (year * SEBAKA_YEAR_IN_DAYS + day) * HOURS_IN_SEBAKA_DAY;
    setElapsedHours(newElapsedHours);
    setGoToTime(newElapsedHours);
    setCurrentYear(year);
    setCurrentDay(day);
  }

  const handleTimeUpdate = (hours: number) => {
    setElapsedHours(hours);
    const totalDays = hours / HOURS_IN_SEBAKA_DAY;
    setCurrentYear(Math.floor(totalDays / SEBAKA_YEAR_IN_DAYS));
    setCurrentDay(Math.floor(totalDays % SEBAKA_YEAR_IN_DAYS) + 1);
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
        longitude={longitude}
        latitude={latitude}
        cameraPitch={cameraPitch}
        cameraYaw={cameraYaw}
        resetViewToggle={resetViewToggle}
        isViridisAnimationActive={isViridisAnimationActive}
        onTimeUpdate={handleTimeUpdate}
        goToTime={goToTime}
        isBeaconView={isBeaconView}
      />
      <div className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start">
        <div className="text-left">
          <h1 className="font-headline text-3xl md:text-5xl font-bold text-primary-foreground/90 tracking-tighter">
            Celestial Symphony
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mt-1">
            Year: {currentYear.toLocaleString()} | Day: {currentDay.toLocaleString()}
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
                         <Button variant="outline" size="icon" className="bg-background/20 backdrop-blur-sm" onClick={() => setIsBeaconView(prev => !prev)}>
                            <Focus className="h-5 w-5" />
                            <span className="sr-only">Toggle Beacon View</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isBeaconView ? 'Focus on Binary Stars' : 'Focus on Beacon'}</p>
                    </TooltipContent>
                </Tooltip>
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
                        <Button variant="outline" size="icon" className="bg-background/20 backdrop-blur-sm" onClick={toggleSebakaView}>
                            <PersonStanding className="h-5 w-5" />
                            <span className="sr-only">Toggle View from Sebaka</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{viewFromSebaka ? 'Exit Sebaka View' : 'View from Sebaka'}</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="bg-background/20 backdrop-blur-sm" onClick={() => setIsSebakaRotating(prev => !prev)}>
                            <RotateCw className="h-5 w-5" />
                            <span className="sr-only">Toggle Planet Rotation</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isSebakaRotating ? 'Pause Planet Rotation' : 'Resume Planet Rotation'}</p>
                    </TooltipContent>
                </Tooltip>
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
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-lg p-4 space-y-2">
          {viewFromSebaka ? (
              <Accordion type="single" collapsible className="w-full" defaultValue="time">
                  <AccordionItem value="time" className="border-none">
                      <AccordionTrigger className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg text-primary-foreground/90">Time</AccordionTrigger>
                      <AccordionContent className="space-y-2 pt-2">
                          <div className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                              <Label className="text-sm font-medium text-primary-foreground/90 min-w-20 text-center">
                                  Go to Time
                              </Label>
                              <Input
                                  id="year-input"
                                  type="number"
                                  placeholder="Year"
                                  value={targetYear}
                                  onChange={(e) => setTargetYear(parseInt(e.target.value, 10) || 0)}
                                  className="w-full"
                              />
                              <Input
                                  id="day-input"
                                  type="number"
                                  placeholder="Day"
                                  value={targetDay}
                                  onChange={(e) => setTargetDay(parseInt(e.target.value, 10) || 1)}
                                  className="w-full"
                                  min={1}
                                  max={324}
                              />
                              <Button onClick={handleGoToTime}>Go</Button>
                          </div>
                          <div className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                              <Label htmlFor="speed-input" className="text-sm font-medium text-primary-foreground/90 min-w-20 text-center">
                                  Speed (hrs/s)
                              </Label>
                              <Input
                                  id="speed-input"
                                  type="number"
                                  value={speedMultiplier}
                                  onChange={handleSpeedChange}
                                  className="w-full"
                                  min={0.1}
                                  step={0.1}
                              />
                               <TooltipProvider>
                                  <Tooltip>
                                      <TooltipTrigger asChild>
                                          <Button variant="ghost" size="icon" onClick={resetSpeed} className="text-primary-foreground/90 hover:bg-background/30 hover:text-primary-foreground">
                                              <History className="h-5 w-5" />
                                          </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                          <p>Reset Speed to 1 day/sec</p>
                                      </TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          </div>
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="look" className="border-none">
                      <AccordionTrigger className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg text-primary-foreground/90 mt-2">Look</AccordionTrigger>
                      <AccordionContent className="space-y-2 pt-2">
                          <div className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                              <Label htmlFor="look-angle-slider" className="text-sm font-medium text-primary-foreground/90 min-w-20 text-center">
                                Look Up/Down
                              </Label>
                              <Slider
                                  id="look-angle-slider"
                                  min={-90}
                                  max={90}
                                  step={1}
                                  value={[cameraPitch]}
                                  onValueChange={handleCameraPitchChange}
                                  className="w-full"
                              />
                          </div>
                          <div className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                              <Label htmlFor="look-yaw-slider" className="text-sm font-medium text-primary-foreground/90 min-w-20 text-center">
                                Look Left/Right
                              </Label>
                              <Slider
                                  id="look-yaw-slider"
                                  min={0}
                                  max={360}
                                  step={1}
                                  value={[cameraYaw]}
                                  onValueChange={handleCameraYawChange}
                                  className="w-full"
                              />
                          </div>
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="move" className="border-none">
                      <AccordionTrigger className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg text-primary-foreground/90 mt-2">Move</AccordionTrigger>
                      <AccordionContent className="space-y-2 pt-2">
                          <div className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                              <Label htmlFor="latitude-slider" className="text-sm font-medium text-primary-foreground/90 min-w-20 text-center">
                                Latitude
                              </Label>
                              <Slider
                                  id="latitude-slider"
                                  min={-90}
                                  max={90}
                                  step={1}
                                  value={[latitude]}
                                  onValueChange={handleLatitudeChange}
                                  className="w-full"
                              />
                          </div>
                          <div className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                              <Label htmlFor="longitude-slider" className="text-sm font-medium text-primary-foreground/90 min-w-20 text-center">
                                Longitude
                              </Label>
                              <Slider
                                  id="longitude-slider"
                                  min={0}
                                  max={360}
                                  step={1}
                                  value={[longitude]}
                                  onValueChange={handleLongitudeChange}
                                  className="w-full"
                              />
                          </div>
                      </AccordionContent>
                  </AccordionItem>
              </Accordion>
          ) : (
            <>
              <div className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                  <Label className="text-sm font-medium text-primary-foreground/90 min-w-20 text-center">
                      Go to Time
                  </Label>
                  <Input
                      id="year-input"
                      type="number"
                      placeholder="Year"
                      value={targetYear}
                      onChange={(e) => setTargetYear(parseInt(e.target.value, 10) || 0)}
                      className="w-full"
                  />
                  <Input
                      id="day-input"
                      type="number"
                      placeholder="Day"
                      value={targetDay}
                      onChange={(e) => setTargetDay(parseInt(e.target.value, 10) || 1)}
                      className="w-full"
                      min={1}
                      max={324}
                  />
                  <Button onClick={handleGoToTime}>Go</Button>
              </div>
              <div className="bg-background/20 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                  <Label htmlFor="speed-input" className="text-sm font-medium text-primary-foreground/90 min-w-20 text-center">
                      Speed (hrs/s)
                  </Label>
                  <Input
                      id="speed-input"
                      type="number"
                      value={speedMultiplier}
                      onChange={handleSpeedChange}
                      className="w-full"
                      min={0.1}
                      step={0.1}
                  />
                   <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={resetSpeed} className="text-primary-foreground/90 hover:bg-background/30 hover:text-primary-foreground">
                                  <History className="h-5 w-5" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>Reset Speed to 1 day/sec</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
              </div>
            </>
          )}
      </div>
    </main>
  );
}
