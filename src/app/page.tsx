
"use client";

import { useState } from "react";
import { Palette, History, Eye, PersonStanding, Orbit, RotateCw, Focus, ChevronsUpDown, Settings, Layers, Camera } from "lucide-react";

import type { PlanetData, StarData, MaterialProperties } from "@/types";
import CelestialSymphony from "@/components/celestial-symphony";
import ColorHarmonizerPanel from "@/components/color-harmonizer-panel";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
      name: "Alpha", color: "#FFD700", size: 6.96, orbitPeriodDays: 26,
      type: 'Star', classification: 'G-type Yellow Dwarf',
      orbitalRole: 'Central Binary (orbits common barycenter)', orbitalPeriod: '26 Earth days (0.08 Sebakan years)', orbitalDistance: '0.2 AU',
      radius: '~1.0 R☉', mass: '1.0 M☉', luminosity: 1,
      surface: 'Typical yellow dwarf stellar surface, radiating warm golden light.',
      characteristics: 'Dominant light source, slightly larger and more luminous than Twilight.',
      appearance: 'Appears as the primary sun, a bright golden disk. Creates vibrant golden sunrises, primary driver of day-night cycle.',
      lore: 'Symbolizes action and passion in Hypodia’s Sky-Writing, revered as a life-giving force.'
  },
  {
      name: "Twilight", color: "#D95B00", size: 4.87, orbitPeriodDays: 26,
      type: 'Star', classification: 'K-type Orange Dwarf',
      orbitalRole: 'Central Binary (orbits common barycenter)', orbitalPeriod: '26 Earth days (0.08 Sebakan years)', orbitalDistance: '0.2 AU',
      radius: '~0.7 R☉', mass: '0.6 M☉', luminosity: 0.7,
      surface: 'Typical orange dwarf stellar surface, emitting a warm reddish glow.',
      characteristics: 'Less luminous than Alpha, creates a subtler light.',
      appearance: 'Appears as a secondary sun, smaller and redder than Alpha. Visible during day, prominent at dusk, creating reddish sunsets.',
      lore: 'Represents quiet strength and endurance in Hypodia’s Sky-Writing, a counterpoint to Alpha’s vibrancy.'
  },
  {
      name: "Beacon", color: "#B4DCFF", size: 27.84, orbitPeriodDays: 724464, orbitRadius: 200 * AU_TO_UNITS,
      type: 'Star', classification: 'B-type Blue-White Giant',
      orbitalRole: 'Distant Companion (orbits common barycenter of Alpha-Twilight)', orbitalPeriod: '~2,236 Sebakan years (724,464 days)', orbitalDistance: '200 AU',
      radius: '~4 R☉', mass: '5.0 M☉', luminosity: 1000,
      surface: 'Brilliant blue-white giant, intensely luminous.',
      characteristics: 'Significantly more luminous than Alpha and Twilight combined. Hosts its own planetary subsystem (Gelidis, Liminis).',
      appearance: 'A brilliant, unblinking point of light (brighter than Sirius), often visible at twilight and occasionally during the day. Its slow generational shift provides a marker for cultural ages.',
      lore: 'Marks long-term "Great Years." Symbolizes constancy and divine oversight in Hypodia’s Sky-Writing, a guiding star for navigation and major rituals.'
  },
];

const initialPlanets: PlanetData[] = [
  {
      name: "Rutilus", color: "#FF6600", size: 3.189, orbitRadius: 0.7 * AU_TO_UNITS, orbitPeriodDays: 169, eccentric: true, eccentricity: 0.1,
      type: 'Planet', classification: 'Terrestrial',
      orbitalRole: 'Innermost planet orbiting Alpha-Twilight binary', orbitalPeriod: '0.522 Sebakan years (169 days)', orbitalDistance: '0.7 AU (periapsis 0.63 AU, apoapsis 0.77 AU)',
      rotation: '40 days', axialTilt: '10°', moons: 'None',
      radius: '0.5 R⊕', mass: '~0.3 M⊕',
      surface: 'Scorched, sulfur-yellow crust with bleeding magma lines, thin atmosphere with volcanic outgassing.',
      characteristics: 'Intense heat due to proximity to binary. Eccentricity (e=0.1).',
      appearance: 'Bright, ember-like point of light. Visible at twilight, occasionally during day. Synodic Period: ~1.091 Sebakan Years.',
      lore: 'Seen as a fiery, untamed world in Hypodia’s Sky-Writing, symbolizing raw passion.',
      rotationPeriodHours: 960,
  },
  {
      name: "Sebaka", color: "#0096C8", size: 6.371, orbitRadius: 1.08 * AU_TO_UNITS, orbitPeriodDays: 324, eccentric: true, eccentricity: 0.05,
      type: 'Planet', classification: 'Terrestrial (Homeworld)',
      orbitalRole: 'Second planet orbiting Alpha-Twilight binary', orbitalPeriod: '1 Sebakan year (324 days)', orbitalDistance: '1.08 AU (periapsis 1.026 AU, apoapsis 1.134 AU)',
      rotation: '24 hours', axialTilt: '23.5°', moons: 'None',
      radius: '1 R⊕', mass: '1 M⊕',
      surface: 'Earth-like, with oceans, continents, and a breathable atmosphere.',
      characteristics: 'Habitable zone, supports life. Eccentricity (e=0.05).',
      appearance: 'N/A (observer’s planet). Hosts vibrant sunrises/sunsets from Alpha and Twilight.',
      lore: 'Defines year (324 days, 12 months of 27 days). Central to Hypodia’s Sky-Writing.',
      rotationPeriodHours: 24,
  },
  {
      name: "Spectris", color: "#B4B4C8", size: 5.097, orbitRadius: 2.0 * AU_TO_UNITS, orbitPeriodDays: 818, eccentric: true, eccentricity: 0.2,
      type: 'Planet', classification: 'Terrestrial',
      orbitalRole: 'Third planet orbiting Alpha-Twilight binary', orbitalPeriod: '2.525 Sebakan years (818 days)', orbitalDistance: '2.0 AU (periapsis 1.6 AU, apoapsis 2.4 AU)',
      rotation: '30 hours', axialTilt: '15°', moons: '1 (28-day orbital period)',
      radius: '0.8 R⊕', mass: '~0.7 M⊕',
      surface: 'Hazy, greyish-white atmosphere, iridescent icy rings.',
      characteristics: 'High eccentricity (e = 0.2) causes significant brightness variations.',
      appearance: 'Fist-sized orb with shimmering rings. Prominent at sunset, visible at night. Synodic Period: ~1.660 Sebakan Years.',
      lore: 'Called the Calendar Planet, its subtle shifts inspire myths of revelation. Marks months via its sunset position and 28-day moon phases.',
      rotationPeriodHours: 30,
  },
  {
    name: "Viridis",
    color: "#9ACD32",
    size: 8.282,
    orbitRadius: 3.0 * AU_TO_UNITS,
    orbitPeriodDays: 1500,
    eccentric: true,
    eccentricity: 0.1,
    type: 'Planet',
    classification: 'Terrestrial',
    orbitalRole: 'Fourth planet orbiting Alpha-Twilight binary',
    orbitalPeriod: '4.630 Sebakan years (1,500 days)',
    orbitalDistance: '3.0 AU (periapsis 2.7 AU, apoapsis 3.3 AU)',
    rotation: '20 hours',
    axialTilt: '20°',
    moons: 'None',
    radius: '1.3 R⊕',
    mass: '2.0 M⊕',
    surface: 'Sulfur-yellow crust, bleeding magma lines, thick atmosphere with volcanic plumes.',
    characteristics: 'Intense 27-day volcanic cycle (albedo 0.1–0.5). Eccentricity (e=0.1).',
    appearance: 'Bright orange-red disk during eruptions, faint glow when ash-covered. Synodic Period: ~1.275 Sebakan Years.',
    lore: 'The "Phase Maker." Its 27-day volcanic cycle divides Sebaka\'s 27-day month into three 9-day weeks.',
    rotationPeriodHours: 20,
  },
  {
      name: "Aetheris", color: "#5082C8", size: 95.565, orbitRadius: 6.0 * AU_TO_UNITS, orbitPeriodDays: 4241, eccentric: true, eccentricity: 0.5,
      type: 'Planet', classification: 'Gas Giant',
      orbitalRole: 'Fifth planet orbiting Alpha-Twilight binary', orbitalPeriod: '13.09 Sebakan years (4,241 days)', orbitalDistance: '6.0 AU (periapsis 3.0 AU, apoapsis 9.0 AU)',
      rotation: '10 hours', axialTilt: '25°', moons: 'Multiple (5–10 visible)',
      radius: '15.0 R⊕ (~1.36 RJ)', mass: '~300 M⊕ (~0.94 MJ)',
      surface: 'Banded atmosphere with blue, purple, green hues, internal heat glow.',
      characteristics: 'Very high eccentricity (e = 0.5), causing dramatic changes in size and brightness.',
      appearance: 'Varies from a large disk to a smaller point. Dominant at night. Synodic Period: ~1.083 Sebakan Years.',
      lore: 'Marks long-term cycles via size changes. Portrayed as a majestic, calming presence.',
      rotationPeriodHours: 10,
  },
  {
      name: "Gelidis",
      color: "#1E90FF",
      size: 25.484,
      orbitRadius: 10 * AU_TO_UNITS,
      orbitPeriodDays: 8991,
      eccentric: true,
      eccentricity: 0.1,
      type: 'Planet',
      classification: 'Ice Giant',
      orbitalRole: 'First planet orbiting Beacon',
      orbitalPeriod: '~27.75 Sebakan years (8,991 days)',
      orbitalDistance: '10 AU from Beacon (periapsis 9 AU, apoapsis 11 AU)',
      rotation: '16 hours',
      axialTilt: '28°',
      moons: '2-3 (small, telescopic only)',
      radius: '4.0 R⊕',
      mass: '~15 M⊕',
      surface: 'Vast atmosphere with swirling storm systems, faint icy cloud bands.',
      characteristics: 'Remote, dimly lit by Beacon’s light. Eccentricity (e=0.1).',
      appearance: 'Faint point of light (telescopic only). Synodic Period tied to Beacon\'s orbit.',
      lore: 'Known only through advanced astronomical calculations; a mysterious, remote world.',
      rotationPeriodHours: 16,
  },
  {
      name: "Liminis",
      color: "#F5F5F5",
      size: 1.274,
      orbitRadius: 18.9 * AU_TO_UNITS,
      orbitPeriodDays: 26820,
      eccentric: true,
      eccentricity: 0.2,
      type: 'Planet',
      classification: 'Ice Dwarf',
      orbitalRole: 'Second planet orbiting Beacon',
      orbitalPeriod: '~82.78 Sebakan years (26,820 days)',
      orbitalDistance: '18.9 AU from Beacon (periapsis 15.12 AU, apoapsis 22.68 AU)',
      rotation: '48 hours',
      axialTilt: '5°',
      moons: 'None',
      radius: '0.2 R⊕',
      mass: '~0.01 M⊕',
      surface: 'Frozen expanse of rock and ice, thin atmosphere.',
      characteristics: 'Furthest known planet. Eccentricity (e=0.2).',
      appearance: 'Tiny point of light (telescopic only). Synodic Period tied to Beacon\'s orbit.',
      lore: 'Discovered through long-duration observations, represents the edge of the known system.',
      rotationPeriodHours: 48,
  },
];

export const initialMaterialProperties: MaterialProperties = {
  Alpha: { albedo: 1.0, normalScale: 1.00, displacementScale: 0.60, emissiveIntensity: 18.5, shininess: 10, specularIntensity: 0.00, aoMapIntensity: 1.82 },
  Twilight: { albedo: 1.0, normalScale: 1.00, displacementScale: 0.20, emissiveIntensity: 15.5, shininess: 10, specularIntensity: 0.00, aoMapIntensity: 0.88 },
  Beacon: { albedo: 1.0, normalScale: 2.11, displacementScale: 5.27, emissiveIntensity: 20.0, shininess: 1, specularIntensity: 0.00, aoMapIntensity: 0.00 },
  Rutilus: { albedo: 3.08, normalScale: 0.00, displacementScale: 3.20, emissiveIntensity: 0, shininess: 21, specularIntensity: 0.00, aoMapIntensity: 2.00 },
  Sebaka: { albedo: 1.96, normalScale: 0.00, displacementScale: 0.00, emissiveIntensity: 0, shininess: 36, specularIntensity: 0.00, aoMapIntensity: 1.25 },
  Spectris: { albedo: 1.59, normalScale: 0.00, displacementScale: 0.00, emissiveIntensity: 0, shininess: 1, specularIntensity: 0.46, aoMapIntensity: 0.17 },
  Viridis: { 
    albedo: 3.04, normalScale: 0.75, displacementScale: 13.02, emissiveIntensity: 0, shininess: 5, specularIntensity: 1.41, aoMapIntensity: 0.00,
    noiseScale: 5.9, smokeDensity: 5.0, lavaSoftnessMin: 0.11, lavaSoftnessMax: 0.80
  },
  Aetheris: { albedo: 4.51, normalScale: 0.00, displacementScale: 0.00, emissiveIntensity: 0, shininess: 19, specularIntensity: 0.00, aoMapIntensity: 0.00 },
  Gelidis: { albedo: 0.20, normalScale: 0.00, displacementScale: 0.00, emissiveIntensity: 0, shininess: 1, specularIntensity: 0.32, aoMapIntensity: 0.38 },
  Liminis: { albedo: 0.72, normalScale: 0.00, displacementScale: 0.00, emissiveIntensity: 0, shininess: 32, specularIntensity: 0.00, aoMapIntensity: 2.00 },
  Character: {
    displacementScale: 0.03,
    noiseFrequency: 16.9,
    noiseSpeed: 0.2,
    blobComplexity: 3,
    opacity: 0.88,
    height: 0.05,
    albedo: 1.8,
    iridescenceStrength: 1.5,
    rimPower: 4.75,
    colorSpeed: 3.2,
    specularIntensity: 1.04,
    shininess: 256,
  }
};

type ActiveSebakaPanel = 'time' | 'move';

export default function Home() {
  const [planets, setPlanets] = useState<PlanetData[]>(initialPlanets);
  const [speedMultiplier, setSpeedMultiplier] = useState(24);
  const [speedInput, setSpeedInput] = useState('24');
  const [selectedBody, setSelectedBody] = useState<PlanetData | StarData | { name: string } | null>(null);
  const [isInfoPanelOpen, setInfoPanelOpen] = useState(false);
  const [viewFromSebaka, setViewFromSebaka] = useState(false);
  const [isSebakaRotating, setIsSebakaRotating] = useState(true);
  const [isViridisAnimationActive, setIsViridisAnimationActive] = useState(true);
  const [cameraTarget, setCameraTarget] = useState<string | null>('Binary Stars');
  const [activeSebakaPanel, setActiveSebakaPanel] = useState<ActiveSebakaPanel | null>(null);
  const [usePlainOrbits, setUsePlainOrbits] = useState(false);
  const [showOrbits, setShowOrbits] = useState(true);

  const [currentYear, setCurrentYear] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);
  const [targetYear, setTargetYear] = useState(0);
  const [targetDay, setTargetDay] = useState(1);
  const [elapsedHours, setElapsedHours] = useState(0);
  const [goToTime, setGoToTime] = useState<number | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [fov, setFov] = useState(70);

  const [characterLatitude, setCharacterLatitude] = useState(0);
  const [characterLongitude, setCharacterLongitude] = useState(0);

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
    setSpeedInput(e.target.value);
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
        setSpeedMultiplier(value);
    } else if (e.target.value.trim() === '') {
        setSpeedMultiplier(0);
    }
  };

  const handleFovChange = (value: number[]) => {
    setFov(value[0]);
  };

  const resetSpeed = () => {
    setSpeedMultiplier(24);
    setSpeedInput('24');
  };
  
  const handleBodyClick = (bodyName: string) => {
    const allBodies = [...initialStars, ...planets, { name: 'Character' }];
    const body = allBodies.find(p => p.name === bodyName);
    if (body) {
      setSelectedBody(body);
      setInfoPanelOpen(true);
    }
  };
  
  const handleResetView = () => {
    if (viewFromSebaka) {
      setIsInitialized(false);
      setViewFromSebaka(false);
      setFov(70);
    }
    resetSpeed();
    setIsSebakaRotating(true);
    setCameraTarget('Binary Stars');
    setShowOrbits(true);
  }

  const enterSebakaView = () => {
      if (!viewFromSebaka) {
          setIsInitialized(false);
          setViewFromSebaka(true);
          setFov(111);
          setCharacterLatitude(0);
          setCharacterLongitude(0);
          setActiveSebakaPanel(null);
          setSpeedMultiplier(2);
          setSpeedInput('2');
          setShowOrbits(false);
      }
  }
  
  const handleSebakaPanelToggle = (panel: ActiveSebakaPanel | null) => {
    setActiveSebakaPanel(current => current === panel ? null : panel);
  }

  const handleGoToTime = () => {
    const year = Math.max(0, targetYear);
    const day = Math.max(1, Math.min(SEBAKA_YEAR_IN_DAYS, targetDay));
    const newElapsedHours = (year * SEBAKA_YEAR_IN_DAYS + (day - 1)) * HOURS_IN_SEBAKA_DAY;
    setGoToTime(newElapsedHours);
    setCurrentYear(year);
    setCurrentDay(day);

    // Reset goToTime after a short delay to allow it to be re-triggered
    setTimeout(() => setGoToTime(null), 10);
  }

  const handleTimeUpdate = (hours: number) => {
    setElapsedHours(hours);
    const totalDays = hours / HOURS_IN_SEBAKA_DAY;
    setCurrentYear(Math.floor(totalDays / SEBAKA_YEAR_IN_DAYS));
    setCurrentDay(Math.floor(totalDays % SEBAKA_YEAR_IN_DAYS) + 1);
  }

  const resetGoToTime = () => {
    setGoToTime(null);
  };
  
  const handleFocusTargetChange = (target: string) => {
    if (viewFromSebaka) {
        setIsInitialized(false);
        setViewFromSebaka(false);
        setFov(70);
        setShowOrbits(true);
    }
    setCameraTarget(target);

    const isSystem = target === 'Binary Stars' || target === 'Beacon System';
    if (isSystem) {
      resetSpeed();
      if (!isSebakaRotating) {
        setIsSebakaRotating(true);
      }
    } else {
      setSpeedMultiplier(0);
      setSpeedInput('0');
    }
  };
  
  const renderSebakaPanelContent = () => {
    if (!activeSebakaPanel) return null;
    
    const panels: Record<Exclude<ActiveSebakaPanel, null>, React.ReactNode> = {
        time: (
            <>
                <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                    <Label className="text-sm font-medium text-muted-foreground min-w-20 text-center">
                        Go to Time
                    </Label>
                    <Input
                        id="year-input"
                        type="number"
                        placeholder="Year"
                        value={targetYear}
                        onChange={(e) => setTargetYear(parseInt(e.target.value, 10) || 0)}
                        className="w-full bg-card"
                    />
                    <Input
                        id="day-input"
                        type="number"
                        placeholder="Day"
                        value={targetDay}
                        onChange={(e) => setTargetDay(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-card"
                        min={1}
                        max={324}
                    />
                    <Button onClick={handleGoToTime}>Go</Button>
                </div>
                <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                    <Label htmlFor="speed-input" className="text-sm font-medium text-muted-foreground min-w-20 text-center">
                        Speed (hrs/s)
                    </Label>
                    <Input
                        id="speed-input"
                        type="number"
                        value={speedInput}
                        onChange={handleSpeedChange}
                        className="w-full bg-card"
                        min={0.1}
                        step={0.1}
                    />
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={resetSpeed} className="text-foreground hover:bg-accent hover:text-accent-foreground">
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
        ),
        move: (
            <>
                <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                    <Label htmlFor="latitude-slider" className="text-sm font-medium text-muted-foreground min-w-20 text-center">
                      Move North/South
                    </Label>
                    <Slider
                        id="latitude-slider"
                        min={-90}
                        max={90}
                        step={1}
                        value={[characterLatitude]}
                        onValueChange={(v) => setCharacterLatitude(v[0])}
                        className="w-full"
                    />
                    <span className="text-sm font-medium text-foreground w-10 text-center">{characterLatitude.toFixed(0)}°</span>
                </div>
                <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                    <Label htmlFor="longitude-slider" className="text-sm font-medium text-muted-foreground min-w-20 text-center">
                      Move East/West
                    </Label>
                    <Slider
                        id="longitude-slider"
                        min={0}
                        max={360}
                        step={1}
                        value={[characterLongitude]}
                        onValueChange={(v) => setCharacterLongitude(v[0])}
                        className="w-full"
                    />
                    <span className="text-sm font-medium text-foreground w-10 text-center">{characterLongitude.toFixed(0)}°</span>
                </div>
                <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                    <Label htmlFor="fov-slider" className="text-sm font-medium text-muted-foreground min-w-20 text-center">
                      Field of View
                    </Label>
                    <Slider
                        id="fov-slider"
                        min={25}
                        max={150}
                        step={1}
                        value={[fov]}
                        onValueChange={handleFovChange}
                        className="w-full"
                    />
                    <span className="text-sm font-medium text-foreground w-10 text-center">{fov.toFixed(0)}°</span>
                </div>
            </>
        )
    };
    
    return (
      <div className="w-full space-y-2">
        {panels[activeSebakaPanel]}
      </div>
    );
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
        characterLongitude={characterLongitude}
        characterLatitude={characterLatitude}
        onCharacterLatLongChange={(lat, long) => {
            setCharacterLatitude(lat);
            setCharacterLongitude(long);
        }}
        isViridisAnimationActive={isViridisAnimationActive}
        onTimeUpdate={handleTimeUpdate}
        goToTime={goToTime}
        onGoToTimeComplete={resetGoToTime}
        cameraTarget={cameraTarget}
        isInitialized={isInitialized}
        setIsInitialized={setIsInitialized}
        initialMaterialProperties={initialMaterialProperties}
        usePlainOrbits={usePlainOrbits}
        showOrbits={showOrbits}
        fov={fov}
        selectedBody={selectedBody}
        isInfoPanelOpen={isInfoPanelOpen}
        setInfoPanelOpen={setInfoPanelOpen}
        elapsedHours={elapsedHours}
      />

      <div className="absolute top-0 left-0 w-full p-4 md:p-8 flex justify-between items-start">
        <div className="text-left">
          <h1 className="font-headline text-3xl md:text-5xl font-bold text-foreground tracking-tighter">
            Celestial Symphony
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-md mt-1">
            Year: {currentYear.toLocaleString()} | Day: {currentDay.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
            
            <DropdownMenu>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                 <Button variant="outline" size="icon" className="bg-card/80 backdrop-blur-sm">
                                    <Focus className="h-5 w-5" />
                                    <span className="sr-only">Focus Camera</span>
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Focus Camera</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent className="w-56 max-h-[80vh] overflow-y-auto backdrop-blur-sm">
                    <DropdownMenuLabel>Focus Target</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Systems</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => handleFocusTargetChange('Binary Stars')}>Binary Stars</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleFocusTargetChange('Beacon System')}>Beacon System</DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                         <DropdownMenuLabel>Stars</DropdownMenuLabel>
                        {initialStars.map(star => (
                            <DropdownMenuItem key={star.name} onSelect={() => handleFocusTargetChange(star.name)}>
                                {star.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>Planets</DropdownMenuLabel>
                        {initialPlanets.map(planet => (
                            <DropdownMenuItem key={planet.name} onSelect={() => handleFocusTargetChange(planet.name)}>
                                {planet.name}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>
                </DropdownMenuContent>
            </DropdownMenu>

            <Sheet>
                 <DropdownMenu>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="icon" className="bg-card/80 backdrop-blur-sm">
                                        <Settings className="h-5 w-5" />
                                        <span className="sr-only">Settings</span>
                                    </Button>
                                </DropdownMenuTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Settings</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <DropdownMenuContent className="w-56 backdrop-blur-sm">
                        <DropdownMenuLabel>Settings</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                         <DropdownMenuItem onSelect={() => setUsePlainOrbits(prev => !prev)}>
                            <Layers className="mr-2 h-4 w-4" />
                            <span>{usePlainOrbits ? 'Iridescent Orbits' : 'Plain Orbits'}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleResetView}>
                            <Eye className="mr-2 h-4 w-4" />
                            <span>Reset View</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setIsSebakaRotating(prev => !prev)}>
                            <RotateCw className="mr-2 h-4 w-4" />
                            <span>{isSebakaRotating ? 'Pause Rotation' : 'Resume Rotation'}</span>
                        </DropdownMenuItem>
                         <DropdownMenuItem onSelect={() => setIsViridisAnimationActive(prev => !prev)}>
                            <Orbit className="mr-2 h-4 w-4" />
                             <span>{isViridisAnimationActive ? 'Stop Viridis' : 'Start Viridis'}</span>
                        </DropdownMenuItem>
                        {!viewFromSebaka && (
                            <DropdownMenuItem onSelect={enterSebakaView}>
                                <PersonStanding className="mr-2 h-4 w-4" />
                                <span>View from Sebaka</span>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <SheetTrigger asChild>
                            <DropdownMenuItem>
                                <Palette className="mr-2 h-4 w-4" />
                                <span>Color Palette</span>
                            </DropdownMenuItem>
                        </SheetTrigger>
                    </DropdownMenuContent>
                </DropdownMenu>

                <SheetContent className="backdrop-blur-sm bg-card/80" withoutOverlay>
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
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 space-y-2 pb-16 md:pb-4">
          {viewFromSebaka ? (
              <div className="flex flex-col-reverse items-center gap-2">
                  <div className="flex items-center justify-center gap-2 w-full">
                      {(['time', 'move'] as const).map((panelId) => (
                           <Button 
                              key={panelId}
                              onClick={() => handleSebakaPanelToggle(panelId)}
                              variant={activeSebakaPanel === panelId ? "secondary" : "default"}
                              className="backdrop-blur-sm p-4 rounded-lg shadow-lg text-foreground flex-1 basis-1/2 capitalize"
                          >
                              {panelId === 'move' ? <PersonStanding className="mr-2 h-4 w-4"/> : null}
                              {panelId === 'time' ? <History className="mr-2 h-4 w-4"/> : null}
                              {panelId}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                      ))}
                  </div>
                  {renderSebakaPanelContent()}
              </div>
          ) : (
            <>
              <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                  <Label className="text-sm font-medium text-muted-foreground min-w-20 text-center">
                      Go to Time
                  </Label>
                  <Input
                      id="year-input"
                      type="number"
                      placeholder="Year"
                      value={targetYear}
                      onChange={(e) => setTargetYear(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-card"
                  />
                  <Input
                      id="day-input"
                      type="number"
                      placeholder="Day"
                      value={targetDay}
                      onChange={(e) => setTargetDay(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-card"
                      min={1}
                      max={324}
                  />
                  <Button onClick={handleGoToTime}>Go</Button>
              </div>
              <div className="bg-card/80 backdrop-blur-sm p-4 rounded-lg shadow-lg flex items-center gap-4">
                  <Label htmlFor="speed-input" className="text-sm font-medium text-muted-foreground min-w-20 text-center">
                      Speed (hrs/s)
                  </Label>
                  <Input
                      id="speed-input"
                      type="number"
                      value={speedInput}
                      onChange={handleSpeedChange}
                      className="w-full bg-card"
                      min={0.1}
                      step={0.1}
                  />
                   <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={resetSpeed} className="text-foreground hover:bg-accent hover:text-accent-foreground">
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

    
