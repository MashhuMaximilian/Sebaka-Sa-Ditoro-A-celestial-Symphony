
"use client";

import type { PlanetData, StarData, MaterialProperties } from "@/types";
import DataDisplay from "./data-display";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "./ui/button";

interface InfoPanelProps {
  data: PlanetData | StarData;
  materialProperties: MaterialProperties;
  onPropertiesChange: React.Dispatch<React.SetStateAction<MaterialProperties>>;
  onReset: () => void;
}

const bodiesWithSettings = [
  'Alpha', 'Twilight', 'Beacon', 'Rutilus', 'Sebaka', 
  'Spectris', 'Viridis', 'Aetheris', 'Gelidis', 'Liminis'
];

const InfoPanel = ({ data, materialProperties, onPropertiesChange, onReset }: InfoPanelProps) => {

  const handleSliderChange = (bodyName: string, propName: keyof MaterialProperties[string], value: number[]) => {
    onPropertiesChange(prevProps => ({
      ...prevProps,
      [bodyName]: {
        ...prevProps[bodyName],
        [propName]: value[0]
      }
    }));
  };
  
  const renderMaterialSettings = () => {
    const bodyProps = materialProperties[data.name];
    if (!bodyProps || !bodiesWithSettings.includes(data.name)) return null;

    // A simple way to check if maps exist by checking the initial properties
    const hasSpecular = initialMaterialProperties[data.name]?.specularIntensity > 0;
    const hasAo = initialMaterialProperties[data.name]?.aoMapIntensity > 0;
    
    return (
       <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>
             <h3 className="text-lg font-bold">Material Settings</h3>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-2">
               <div className="grid gap-2">
                <Label htmlFor={`${data.name}-normal`}>Normal Map Strength</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    id={`${data.name}-normal`}
                    min={0}
                    max={15}
                    step={0.01}
                    value={[bodyProps.normalScale]}
                    onValueChange={(value) => handleSliderChange(data.name, 'normalScale', value)}
                  />
                  <span className="text-xs font-mono w-12 text-center">{bodyProps.normalScale.toFixed(2)}</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${data.name}-displacement`}>Displacement Scale</Label>
                 <div className="flex items-center gap-2">
                    <Slider
                      id={`${data.name}-displacement`}
                      min={0}
                      max={15}
                      step={0.01}
                      value={[bodyProps.displacementScale]}
                      onValueChange={(value) => handleSliderChange(data.name, 'displacementScale', value)}
                    />
                    <span className="text-xs font-mono w-12 text-center">{bodyProps.displacementScale.toFixed(2)}</span>
                </div>
              </div>
              <div className="grid gap-2">
                  <Label htmlFor={`${data.name}-albedo`}>Albedo (Brightness)</Label>
                  <div className="flex items-center gap-2">
                      <Slider
                          id={`${data.name}-albedo`}
                          min={0}
                          max={5}
                          step={0.01}
                          value={[bodyProps.albedo ?? 1]}
                          onValueChange={(value) => handleSliderChange(data.name, 'albedo', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">{(bodyProps.albedo ?? 1).toFixed(2)}</span>
                  </div>
              </div>
               {data.type === 'Star' && (
                <div className="grid gap-2">
                  <Label htmlFor={`${data.name}-emissive`}>Emissive Intensity</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id={`${data.name}-emissive`}
                      min={0}
                      max={20}
                      step={0.1}
                      value={[bodyProps.emissiveIntensity ?? 1]}
                      onValueChange={(value) => handleSliderChange(data.name, 'emissiveIntensity', value)}
                    />
                    <span className="text-xs font-mono w-12 text-center">{(bodyProps.emissiveIntensity ?? 1).toFixed(1)}</span>
                  </div>
                </div>
              )}
               {hasSpecular && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor={`${data.name}-specular`}>Specular Intensity</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id={`${data.name}-specular`}
                        min={0}
                        max={5}
                        step={0.01}
                        value={[bodyProps.specularIntensity]}
                        onValueChange={(value) => handleSliderChange(data.name, 'specularIntensity', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">{bodyProps.specularIntensity.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${data.name}-shininess`}>Shininess</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id={`${data.name}-shininess`}
                        min={0}
                        max={256}
                        step={1}
                        value={[bodyProps.shininess]}
                        onValueChange={(value) => handleSliderChange(data.name, 'shininess', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">{bodyProps.shininess.toFixed(0)}</span>
                    </div>
                  </div>
                </>
              )}
              {hasAo && (
                <div className="grid gap-2">
                  <Label htmlFor={`${data.name}-ao`}>Ambient Occlusion Intensity</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      id={`${data.name}-ao`}
                      min={0}
                      max={2}
                      step={0.01}
                      value={[bodyProps.aoMapIntensity]}
                      onValueChange={(value) => handleSliderChange(data.name, 'aoMapIntensity', value)}
                    />
                    <span className="text-xs font-mono w-12 text-center">{bodyProps.aoMapIntensity.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <Button onClick={onReset} variant="outline" className="w-full">
                Reset All to Defaults
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    )
  }

  return (
    <ScrollArea className="h-full w-full p-6">
      <div className="space-y-6 text-sm">
        <h2 className="text-2xl font-bold">{data.name}</h2>
        <div className="space-y-2">
          <h3 className="text-lg font-bold">Overview</h3>
          <dl className="space-y-2">
            <DataDisplay label="Type" value={data.type} />
            <DataDisplay label="Classification" value={data.classification} />
            <DataDisplay label="Orbital Role" value={data.orbitalRole} />
            <DataDisplay label="Orbital Period" value={data.orbitalPeriod} />
            <DataDisplay label="Orbital Distance" value={data.orbitalDistance} />
          </dl>
        </div>

        <Separator />

        <div className="space-y-2">
          <h3 className="text-lg font-bold">Physical Characteristics</h3>
          <dl className="space-y-2">
            <DataDisplay label="Radius" value={data.radius} />
            <DataDisplay label="Mass" value={data.mass} />
            {'luminosity' in data && <DataDisplay label="Luminosity (L☉)" value={data.luminosity} />}
            {'rotation' in data && <DataDisplay label="Rotation / Day Length" value={data.rotation} />}
            {'axialTilt' in data && <DataDisplay label="Axial Tilt" value={data.axialTilt} />}
            {'moons' in data && <DataDisplay label="Moons" value={data.moons} />}
            <DataDisplay label="Surface" value={data.surface} />
            <DataDisplay label="Notable Characteristics" value={data.characteristics} />
          </dl>
        </div>
        
        <Separator />

        <div className="space-y-2">
          <h3 className="text-lg font-bold">Appearance & Lore</h3>
          <dl className="space-y-2">
              <DataDisplay label="Appearance from Sebaka" value={data.appearance} />
              <DataDisplay label="Lore" value={data.lore} />
          </dl>
        </div>
        
        {renderMaterialSettings()}
      </div>
    </ScrollArea>
  );
};

// We need a copy of the initial properties to check if a map exists
const initialMaterialProperties: MaterialProperties = {
  Alpha: { normalScale: 1, displacementScale: 0.6, albedo: 1.0, emissiveIntensity: 2.0, shininess: 10, specularIntensity: 1, aoMapIntensity: 1 },
  Twilight: { normalScale: 1, displacementScale: 0.2, albedo: 1.0, emissiveIntensity: 1.2, shininess: 10, specularIntensity: 1, aoMapIntensity: 1 },
  Beacon: { normalScale: 1, displacementScale: 2.95, albedo: 1.0, emissiveIntensity: 10, shininess: 10, specularIntensity: 1, aoMapIntensity: 1 },
  Rutilus: { albedo: 1.2, normalScale: 0.45, displacementScale: 1.74, shininess: 32, specularIntensity: 0, aoMapIntensity: 1 },
  Sebaka: { albedo: 0.4, normalScale: 0.0, displacementScale: 0.01, shininess: 100, specularIntensity: 1, aoMapIntensity: 1 },
  Spectris: { albedo: 0.6, normalScale: 0, displacementScale: 0.01, shininess: 0, specularIntensity: 1, aoMapIntensity: 1 },
  Viridis: { albedo: 1.9, normalScale: 0.3, displacementScale: 2.0, shininess: 0, specularIntensity: 1, aoMapIntensity: 1 },
  Aetheris: { albedo: 2.0, normalScale: 0, displacementScale: 0, shininess: 14, specularIntensity: 1, aoMapIntensity: 0 },
  Gelidis: { albedo: 0.5, normalScale: 0, displacementScale: 0, shininess: 100, specularIntensity: 1, aoMapIntensity: 1 },
  Liminis: { albedo: 1.0, normalScale: 1, displacementScale: 0.1, shininess: 32, specularIntensity: 1, aoMapIntensity: 1 },
};

export default InfoPanel;
