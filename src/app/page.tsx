

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { History, Eye, PersonStanding, Orbit, RotateCw, Focus, ChevronsUpDown, Settings, Layers, Camera, ArrowLeft, ArrowRight, Loader2, Globe, X } from "lucide-react";

import type { PlanetData, StarData, MaterialProperties, AnyBodyData, PrecomputedEvent, CelestialEvent } from "@/types";
import CelestialSymphony from "@/components/celestial-symphony";
import { celestialEvents } from "@/components/CelestialSymphony/constants/events";
import { findNextEvent, type EventSearchParams } from "@/components/CelestialSymphony/utils/eventSolver";
import precomputedEvents from '@/lib/precomputed-events.json';
import { initialStars, initialPlanets } from '@/lib/celestial-data';

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
}
from "@/components/ui/select";
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

export const initialMaterialProperties: MaterialProperties = {
  Alpha: { albedo: 1.0, normalScale: 1.00, displacementScale: 0.60, emissiveIntensity: 18.5, shininess: 10, specularIntensity: 0.00, aoMapIntensity: 1.82 },
  Twilight: { albedo: 1.0, normalScale: 1.00, displacementScale: 0.20, emissiveIntensity: 15.5, shininess: 10, specularIntensity: 0.00, aoMapIntensity: 0.88 },
  Beacon: { albedo: 1.0, normalScale: 2.11, displacementScale: 5.27, emissiveIntensity: 20.0, shininess: 1, specularIntensity: 0.00, aoMapIntensity: 0.00 },
  Rutilis: { albedo: 3.08, normalScale: 0.00, displacementScale: 3.20, emissiveIntensity: 0, shininess: 21, specularIntensity: 0.00, aoMapIntensity: 2.00 },
  Sebaka: { albedo: 1.96, normalScale: 0.00, displacementScale: 0.00, emissiveIntensity: 0, shininess: 36, specularIntensity: 0.00, aoMapIntensity: 1.25 },
  Spectris: { albedo: 1.59, normalScale: 0.00, displacementScale: 0.00, emissiveIntensity: 0, shininess: 1, specularIntensity: 0.46, aoMapIntensity: 0.17 },
  Viridis: { 
    albedo: 3.04, normalScale: 0.75, displacementScale: 13.02, emissiveIntensity: 0, shininess: 5, specularIntensity: 1.41, aoMapIntensity: 0.00,
    noiseScale: 5.9, smokeDensity: 5.0,
    lavaDensity: 0.44, lavaDotSize: 41.9, lavaDotSizeVariance: 1.0,
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
type OrbitMode = 'iridescent' | 'plain' | 'hidden';

export default function Home() {
  const [planets, setPlanets] = useState<PlanetData[]>(initialPlanets);
  const [speedMultiplier, setSpeedMultiplier] = useState(24);
  const [speedInput, setSpeedInput] = useState('24');
  const [selectedBody, setSelectedBody] = useState<AnyBodyData | { name: string } | null>(null);
  const [isInfoPanelOpen, setInfoPanelOpen] = useState(false);
  const [viewFromSebaka, setViewFromSebaka] = useState(false);
  const [isSebakaRotating, setIsSebakaRotating] = useState(true);
  const [isSebakaVisible, setIsSebakaVisible] = useState(true);
  const [isViridisAnimationActive, setIsViridisAnimationActive] = useState(true);
  const [cameraTarget, setCameraTarget] = useState<string | null>('Binary Stars');
  const [activeSebakaPanel, setActiveSebakaPanel] = useState<ActiveSebakaPanel | null>(null);
  const [orbitMode, setOrbitMode] = useState<OrbitMode>('iridescent');

  const [currentYear, setCurrentYear] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);
  const [targetYear, setTargetYear] = useState(0);
  const [targetDay, setTargetDay] = useState(1);
  const [elapsedHours, setElapsedHours] = useState(0);
  const [goToTime, setGoToTime] = useState<number | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [fov, setFov] = useState(70);

  const [characterLatitude, setCharacterLatitude] = useState(45);
  const [characterLongitude, setCharacterLongitude] = useState(150);
  const [isFreeCamera, setIsFreeCamera] = useState(false);
  
  const [selectedEvent, setSelectedEvent] = useState<CelestialEvent | null>(null);
  const [isJumpingTime, setIsJumpingTime] = useState(false);
  const searchAbortController = useRef<AbortController | null>(null);
  const [eventButtonLoading, setEventButtonLoading] = useState<'first' | 'previous' | 'next' | null>(null);

  useEffect(() => {
    if (goToTime === null) return;
    
    const totalDays = Math.floor(goToTime / HOURS_IN_SEBAKA_DAY);
    const newTargetYear = Math.floor(totalDays / SEBAKA_YEAR_IN_DAYS);
    const newTargetDay = (totalDays % SEBAKA_YEAR_IN_DAYS + SEBAKA_YEAR_IN_DAYS) % SEBAKA_YEAR_IN_DAYS + 1;
    
    setTargetYear(newTargetYear);
    setTargetDay(newTargetDay);

  }, [goToTime]);

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
    setOrbitMode('iridescent');
  }

  const enterSebakaView = useCallback(() => {
      if (!viewFromSebaka) {
          setIsInitialized(false);
          setViewFromSebaka(true);
          setFov(111);
          setCharacterLatitude(45);
          setCharacterLongitude(150);
          setActiveSebakaPanel(null);
          setSpeedMultiplier(2);
          setSpeedInput('2');
          setOrbitMode('hidden');
      }
  }, [viewFromSebaka]);
  
  const handleSebakaPanelToggle = (panel: ActiveSebakaPanel | null) => {
    setActiveSebakaPanel(current => current === panel ? null : panel);
  }

  const handleGoToTime = () => {
    const year = Math.max(0, targetYear);
    const day = Math.max(1, Math.min(SEBAKA_YEAR_IN_DAYS, targetDay));
    const newElapsedHours = (year * SEBAKA_YEAR_IN_DAYS + (day - 1)) * HOURS_IN_SEBAKA_DAY;
    setGoToTime(newElapsedHours);
    setIsJumpingTime(true);
  }

  const handleTimeUpdate = (hours: number) => {
    setElapsedHours(hours);
    const totalDays = Math.floor(hours / HOURS_IN_SEBAKA_DAY);
    setCurrentYear(Math.floor(totalDays / SEBAKA_YEAR_IN_DAYS));
    setCurrentDay(Math.floor(totalDays % SEBAKA_YEAR_IN_DAYS) + 1);
  }

  const resetGoToTime = () => {
    setGoToTime(null);
    setIsJumpingTime(false);
  };
  
  const handleFocusTargetChange = (target: string) => {
    if (viewFromSebaka) {
        setIsInitialized(false);
        setViewFromSebaka(false);
        setFov(70);
        setOrbitMode('iridescent');
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

  const handleOrbitModeToggle = () => {
    setOrbitMode(prevMode => {
      if (prevMode === 'iridescent') return 'plain';
      if (prevMode === 'plain') return 'hidden';
      return 'iridescent';
    });
  };

  const getNextOrbitModeText = () => {
    if (orbitMode === 'iridescent') return 'Plain Orbits';
    if (orbitMode === 'plain') return 'Hide Orbits';
    return 'Iridescent Orbits';
  };

  const handleEventSelect = (eventName: string) => {
    const event = celestialEvents.find(e => e.name === eventName) ?? null;
    setSelectedEvent(event);
  };

  const handleCancelSearch = () => {
    if (searchAbortController.current) {
        searchAbortController.current.abort();
    }
    setIsJumpingTime(false);
    setEventButtonLoading(null);
};
  
const handleGoToEvent = useCallback(async (direction: 'next' | 'previous' | 'first') => {
  if (!selectedEvent || isJumpingTime) return;

  setIsJumpingTime(true);
  setEventButtonLoading(direction);
  
  const controller = new AbortController();
  searchAbortController.current = controller;

  try {
      const cachedEvents = (precomputedEvents as PrecomputedEvent[]).filter(e => e.name === selectedEvent.name);
      let foundResult: { foundHours: number; viewingLongitude: number; viewingLatitude: number; } | null = null;
      let startSearchHour = direction === 'first' ? 0 : elapsedHours;

      if (direction !== 'first' && cachedEvents.length > 0) {
          let potentialCachedEvent: PrecomputedEvent | undefined;
          if (direction === 'next') {
              potentialCachedEvent = cachedEvents
                  .filter(e => e.hours > elapsedHours)
                  .sort((a, b) => a.hours - b.hours)[0];
          } else { // previous
              potentialCachedEvent = cachedEvents
                  .filter(e => e.hours < elapsedHours)
                  .sort((a, b) => b.hours - a.hours)[0];
          }
          
          if (potentialCachedEvent) {
              startSearchHour = potentialCachedEvent.hours;
          }
      }
      
      const params: EventSearchParams = {
          startHours: startSearchHour,
          event: selectedEvent,
          allBodiesData: [...initialStars, ...initialPlanets],
          direction,
          SEBAKA_YEAR_IN_DAYS,
          HOURS_IN_SEBAKA_DAY,
          signal: controller.signal
      };

      foundResult = await findNextEvent(params);

      if (controller.signal.aborted) {
          console.log("Event search cancelled.");
          setIsJumpingTime(false);
          setEventButtonLoading(null);
          return;
      }
      
      if (foundResult) {
          if (!viewFromSebaka) {
              enterSebakaView();
              await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          setCharacterLongitude(foundResult.viewingLongitude);
          setCharacterLatitude(foundResult.viewingLatitude);
          setGoToTime(foundResult.foundHours);
      } else {
          console.warn(`Could not find ${direction} occurrence of ${selectedEvent.name}`);
          setIsJumpingTime(false);
          setEventButtonLoading(null);
      }
  } catch (error: any) {
      if (error.name === 'AbortError') {
          console.log("Event search was aborted by the user.");
      } else {
          console.error("An error occurred during event search:", error);
      }
      setIsJumpingTime(false);
      setEventButtonLoading(null);
  } finally {
       if (!controller.signal.aborted) {
          setEventButtonLoading(null);
       }
  }
}, [selectedEvent, elapsedHours, isJumpingTime, viewFromSebaka, enterSebakaView]);

  const renderSebakaPanelContent = () => {
    if (!activeSebakaPanel) return null;
    
    const isLoading = isJumpingTime;

    const panels: Record<Exclude<ActiveSebakaPanel, null>, React.ReactNode> = {
        time: (
            <div className="space-y-2">
                <div className="bg-black/50 backdrop-blur-sm p-2 rounded-lg shadow-lg flex flex-col gap-2">
                    <Label className="text-xs font-medium text-muted-foreground text-center">
                        Manual Time Jump
                    </Label>
                     <div className="flex items-center gap-2">
                        <Input
                            id="year-input"
                            type="number"
                            placeholder="Year"
                            value={targetYear}
                            onChange={(e) => setTargetYear(parseInt(e.target.value, 10) || 0)}
                            className="w-full bg-card h-8"
                            disabled={isLoading}
                        />
                        <Input
                            id="day-input"
                            type="number"
                            placeholder="Day"
                            value={targetDay}
                            onChange={(e) => setTargetDay(parseInt(e.target.value, 10) || 1)}
                            className="w-full bg-card h-8"
                            min={1}
                            max={324}
                            disabled={isLoading}
                        />
                        <Button onClick={handleGoToTime} size="sm" disabled={isLoading}>
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
                        </Button>
                    </div>
                </div>
                <div className="bg-black/50 backdrop-blur-sm p-2 rounded-lg shadow-lg flex flex-col gap-2">
                    <Label className="text-xs font-medium text-muted-foreground text-center">
                        Celestial Events
                    </Label>
                    <Select onValueChange={handleEventSelect} disabled={isLoading}>
                        <SelectTrigger className="w-full h-8 bg-card">
                            <SelectValue placeholder="Select an event..." />
                        </SelectTrigger>
                        <SelectContent className="backdrop-blur-sm">
                            {celestialEvents.map(event => (
                                <SelectItem key={event.name} value={event.name}>{event.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <div className="flex items-center justify-between gap-1">
                         <Button onClick={() => handleGoToEvent('first')} size="sm" variant="outline" className="flex-1" disabled={!selectedEvent || isLoading}>
                            {eventButtonLoading === 'first' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />} Go to First
                        </Button>
                        <Button onClick={() => handleGoToEvent('previous')} size="sm" variant="outline" className="flex-1" disabled={!selectedEvent || isLoading}>
                             {eventButtonLoading === 'previous' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />} Previous
                        </Button>
                         <Button onClick={() => handleGoToEvent('next')} size="sm" variant="outline" className="flex-1" disabled={!selectedEvent || isLoading}>
                            Next {eventButtonLoading === 'next' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                        </Button>
                    </div>
                     {isJumpingTime && (
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <p className="text-xs text-muted-foreground text-center">Searching meticulously across thousands of years... This may take a while.</p>
                            <Button variant="ghost" size="icon" onClick={handleCancelSearch} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
                <div className="bg-black/50 backdrop-blur-sm p-2 rounded-lg shadow-lg flex items-center gap-2">
                    <Label htmlFor="speed-input" className="text-xs font-medium text-muted-foreground min-w-16 text-center">
                        Speed (hrs/s)
                    </Label>
                    <Input
                        id="speed-input"
                        type="number"
                        value={speedInput}
                        onChange={handleSpeedChange}
                        className="w-full bg-card h-8"
                        min={0.1}
                        step={0.1}
                        disabled={isLoading}
                    />
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={resetSpeed} className="text-foreground hover:bg-accent hover:text-accent-foreground h-8 w-8" disabled={isLoading}>
                                    <History className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Reset Speed to 1 day/sec</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        ),
        move: (
            <div className="space-y-2">
                <div className="bg-black/50 backdrop-blur-sm p-2 rounded-lg shadow-lg flex items-center gap-2">
                    <Label htmlFor="latitude-slider" className="text-xs font-medium text-muted-foreground min-w-16 text-center">
                      N/S
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
                    <span className="text-xs font-medium text-foreground w-10 text-center">{characterLatitude.toFixed(0)}°</span>
                </div>
                <div className="bg-black/50 backdrop-blur-sm p-2 rounded-lg shadow-lg flex items-center gap-2">
                    <Label htmlFor="longitude-slider" className="text-xs font-medium text-muted-foreground min-w-16 text-center">
                      E/W
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
                    <span className="text-xs font-medium text-foreground w-10 text-center">{characterLongitude.toFixed(0)}°</span>
                </div>
                <div className="bg-black/50 backdrop-blur-sm p-2 rounded-lg shadow-lg flex items-center gap-2">
                    <Label htmlFor="fov-slider" className="text-xs font-medium text-muted-foreground min-w-16 text-center">
                      FoV
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
                    <span className="text-xs font-medium text-foreground w-10 text-center">{fov.toFixed(0)}°</span>
                </div>
            </div>
        )
    };
    
    return (
      <div className="w-full space-y-2">
        {panels[activeSebakaPanel]}
      </div>
    );
  }

  return (
    <main className="relative min-h-svh w-screen overflow-hidden">
      <CelestialSymphony
        stars={initialStars} 
        planets={planets} 
        speedMultiplier={speedMultiplier} 
        onBodyClick={handleBodyClick}
        viewFromSebaka={viewFromSebaka}
        isSebakaRotating={isSebakaRotating}
        isSebakaVisible={isSebakaVisible}
        characterLongitude={characterLongitude}
        characterLatitude={characterLatitude}
        isViridisAnimationActive={isViridisAnimationActive}
        onTimeUpdate={handleTimeUpdate}
        goToTime={goToTime}
        onGoToTimeComplete={resetGoToTime}
        cameraTarget={cameraTarget}
        isInitialized={isInitialized}
        setIsInitialized={setIsInitialized}
        initialMaterialProperties={initialMaterialProperties}
        usePlainOrbits={orbitMode === 'plain'}
        showOrbits={orbitMode !== 'hidden'}
        fov={fov}
        selectedBody={selectedBody}
        isInfoPanelOpen={isInfoPanelOpen}
        setInfoPanelOpen={setInfoPanelOpen}
        elapsedHours={elapsedHours}
        isFreeCamera={isFreeCamera}
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
        <div className="flex items-center justify-end gap-2 z-50 flex-wrap">
            <a href="https://www.buymeacoffee.com/mashhul" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="bg-card/80 backdrop-blur-sm">
                🎲 Buy me a dice set
              </Button>
            </a>
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
                    <DropdownMenuItem onSelect={handleOrbitModeToggle}>
                      <Layers className="mr-2 h-4 w-4" />
                      <span>{getNextOrbitModeText()}</span>
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
                  {viewFromSebaka && (
                      <DropdownMenuItem onSelect={() => setIsSebakaVisible(prev => !prev)}>
                          <Globe className="mr-2 h-4 w-4" />
                          <span>{isSebakaVisible ? 'Hide Sebaka' : 'Show Sebaka'}</span>
                      </DropdownMenuItem>
                  )}
                  {viewFromSebaka && (
                      <DropdownMenuItem onSelect={() => setIsFreeCamera(prev => !prev)}>
                          <Camera className="mr-2 h-4 w-4" />
                          <span>{isFreeCamera ? 'Lock Camera' : 'Free Camera'}</span>
                      </DropdownMenuItem>
                  )}
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-md px-4">
          {viewFromSebaka ? (
              <div className="w-full space-y-2">
                  {renderSebakaPanelContent()}
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
              </div>
          ) : (
            <div className="bg-card/80 backdrop-blur-sm p-2 rounded-lg shadow-lg flex flex-col gap-2">
              <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium text-muted-foreground min-w-16 text-center">
                      Go to Time
                  </Label>
                  <Input
                      id="year-input"
                      type="number"
                      placeholder="Year"
                      value={targetYear}
                      onChange={(e) => setTargetYear(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-card h-8"
                  />
                  <Input
                      id="day-input"
                      type="number"
                      placeholder="Day"
                      value={targetDay}
                      onChange={(e) => setTargetDay(parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-card h-8"
                      min={1}
                      max={324}
                  />
                  <Button onClick={handleGoToTime} size="sm">Go</Button>
              </div>
              <div className="flex items-center gap-2">
                  <Label htmlFor="speed-input" className="text-xs font-medium text-muted-foreground min-w-16 text-center">
                      Speed (hrs/s)
                  </Label>
                  <Input
                      id="speed-input"
                      type="number"
                      value={speedInput}
                      onChange={handleSpeedChange}
                      className="w-full bg-card h-8"
                      min={0.1}
                      step={0.1}
                  />
                   <TooltipProvider>
                      <Tooltip>
                          <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={resetSpeed} className="text-foreground hover:bg-accent hover:text-accent-foreground h-8 w-8">
                                  <History className="h-4 w-4" />
                              </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                              <p>Reset Speed to 1 day/sec</p>
                          </TooltipContent>
                      </Tooltip>
                  </TooltipProvider>
              </div>
            </div>
          )}
      </div>
    </main>
  );
}

    
