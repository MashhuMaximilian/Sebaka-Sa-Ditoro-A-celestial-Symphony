
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
import { texturePaths } from "./CelestialSymphony/utils/createBodyMesh";

interface InfoPanelProps {
  data: PlanetData | StarData | { name: string };
  materialProperties: MaterialProperties;
  onCharacterPropChange: (prop: keyof MaterialProperties['Character'], value: number) => void;
  onMaterialPropertiesChange: React.Dispatch<React.SetStateAction<MaterialProperties>>;
  onReset: () => void;
  viewFromSebaka: boolean;
}

const InfoPanel = ({ 
    data, materialProperties, 
    onCharacterPropChange,
    onMaterialPropertiesChange, 
    onReset,
    viewFromSebaka
}: InfoPanelProps) => {

  const handleMaterialSliderChange = (bodyName: string, propName: keyof MaterialProperties[string], value: number[]) => {
    onMaterialPropertiesChange(prevProps => ({
      ...prevProps,
      [bodyName]: {
        ...prevProps[bodyName],
        [propName]: value[0]
      }
    }));
  };

  const handleDualMaterialSliderChange = (bodyName: string, propNameMin: keyof MaterialProperties[string], propNameMax: keyof MaterialProperties[string], value: number[]) => {
    onMaterialPropertiesChange(prevProps => ({
      ...prevProps,
      [bodyName]: {
        ...prevProps[bodyName],
        [propNameMin]: value[0],
        [propNameMax]: value[1],
      }
    }));
  };

  const renderStandardMaterialSettings = () => {
    const bodyProps = materialProperties[data.name];
    if (!bodyProps) return null;
    const bodyTexturePaths = texturePaths[data.name];
    const hasNormalMap = !!bodyTexturePaths?.normal;
    const hasDisplacementMap = !!bodyTexturePaths?.displacement;
    const hasSpecularMap = !!bodyTexturePaths?.specular;
    const hasAoMap = !!bodyTexturePaths?.ambient;

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-2">
            <AccordionTrigger>
                <h3 className="text-lg font-bold">Material Settings</h3>
            </AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4 pt-2">
                {hasNormalMap && (
                    <div className="grid gap-2">
                    <Label htmlFor={`${data.name}-normal`}>Normal Map Strength</Label>
                    <div className="flex items-center gap-2">
                        <Slider
                        id={`${data.name}-normal`}
                        min={0}
                        max={15}
                        step={0.01}
                        value={[bodyProps.normalScale ?? 1.0]}
                        onValueChange={(value) => handleMaterialSliderChange(data.name, 'normalScale', value)}
                        />
                        <span className="text-xs font-mono w-12 text-center">{(bodyProps.normalScale ?? 1.0).toFixed(2)}</span>
                    </div>
                    </div>
                )}
                {hasDisplacementMap && (
                    <div className="grid gap-2">
                    <Label htmlFor={`${data.name}-displacement`}>Displacement Scale</Label>
                    <div className="flex items-center gap-2">
                        <Slider
                            id={`${data.name}-displacement`}
                            min={0}
                            max={25}
                            step={0.01}
                            value={[bodyProps.displacementScale ?? 0]}
                            onValueChange={(value) => handleMaterialSliderChange(data.name, 'displacementScale', value)}
                        />
                        <span className="text-xs font-mono w-12 text-center">{(bodyProps.displacementScale ?? 0).toFixed(2)}</span>
                    </div>
                    </div>
                )}
                {data.type === 'Planet' && (
                    <div className="grid gap-2">
                        <Label htmlFor={`${data.name}-albedo`}>Albedo (Brightness)</Label>
                        <div className="flex items-center gap-2">
                            <Slider
                                id={`${data.name}-albedo`}
                                min={0}
                                max={5}
                                step={0.01}
                                value={[bodyProps.albedo ?? 1]}
                                onValueChange={(value) => handleMaterialSliderChange(data.name, 'albedo', value)}
                            />
                            <span className="text-xs font-mono w-12 text-center">{(bodyProps.albedo ?? 1).toFixed(2)}</span>
                        </div>
                    </div>
                )}
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
                        onValueChange={(value) => handleMaterialSliderChange(data.name, 'emissiveIntensity', value)}
                        />
                        <span className="text-xs font-mono w-12 text-center">{(bodyProps.emissiveIntensity ?? 1).toFixed(1)}</span>
                    </div>
                    </div>
                )}
                {hasSpecularMap && (
                    <>
                    <div className="grid gap-2">
                        <Label htmlFor={`${data.name}-specular`}>Specular Intensity</Label>
                        <div className="flex items-center gap-2">
                        <Slider
                            id={`${data.name}-specular`}
                            min={0}
                            max={5}
                            step={0.01}
                            value={[bodyProps.specularIntensity ?? 0]}
                            onValueChange={(value) => handleMaterialSliderChange(data.name, 'specularIntensity', value)}
                        />
                        <span className="text-xs font-mono w-12 text-center">{(bodyProps.specularIntensity ?? 0).toFixed(2)}</span>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor={`${data.name}-shininess`}>Shininess</Label>
                        <div className="flex items-center gap-2">
                        <Slider
                            id={`${data.name}-shininess`}
                            min={1}
                            max={256}
                            step={1}
                            value={[bodyProps.shininess ?? 1]}
                            onValueChange={(value) => handleMaterialSliderChange(data.name, 'shininess', value)}
                        />
                        <span className="text-xs font-mono w-12 text-center">{(bodyProps.shininess ?? 1).toFixed(0)}</span>
                        </div>
                    </div>
                    </>
                )}
                {hasAoMap && (
                    <div className="grid gap-2">
                    <Label htmlFor={`${data.name}-ao`}>Ambient Occlusion Intensity</Label>
                    <div className="flex items-center gap-2">
                        <Slider
                        id={`${data.name}-ao`}
                        min={0}
                        max={2}
                        step={0.01}
                        value={[bodyProps.aoMapIntensity ?? 0]}
                        onValueChange={(value) => handleMaterialSliderChange(data.name, 'aoMapIntensity', value)}
                        />
                        <span className="text-xs font-mono w-12 text-center">{(bodyProps.aoMapIntensity ?? 0).toFixed(2)}</span>
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
    );
  }
  
  const renderMaterialSettings = () => {
    const bodyProps = materialProperties[data.name];
    if (!bodyProps) return null;
    
    if (data.name === 'Character') {
      const charProps = materialProperties.Character;
      
      const characterSliders = [
        { label: "Blob Deformation", prop: "displacementScale", min: 0, max: 0.5, step: 0.01, defaultValue: 0.03 },
        { label: "Noise Frequency", prop: "noiseFrequency", min: 0.1, max: 20, step: 0.1, defaultValue: 16.9 },
        { label: "Animation Speed", prop: "noiseSpeed", min: 0.1, max: 5, step: 0.1, defaultValue: 0.2 },
        { label: "Blob Complexity (Layers)", prop: "blobComplexity", min: 1, max: 8, step: 1, defaultValue: 3 },
        { label: "Opacity", prop: "opacity", min: 0, max: 1, step: 0.01, defaultValue: 0.88 },
      ] as const;

      const lightingSliders = [
          { label: "Iridescence Strength", prop: "iridescenceStrength", min: 0, max: 30, step: 0.01, defaultValue: 1.5 },
          { label: "Rim Power", prop: "rimPower", min: 0.1, max: 5, step: 0.01, defaultValue: 4.75 },
          { label: "Color Speed", prop: "colorSpeed", min: 0, max: 10, step: 0.1, defaultValue: 3.2 },
          { label: "Albedo", prop: "albedo", min: 0, max: 2, step: 0.01, defaultValue: 1.8 },
          { label: "Specular Intensity", prop: "specularIntensity", min: 0, max: 2, step: 0.01, defaultValue: 1.04 },
          { label: "Shininess", prop: "shininess", min: 1, max: 256, step: 1, defaultValue: 256 },
      ] as const;

      const positionSliders = [
          { label: "Latitude", prop: "latitude", min: -90, max: 90, step: 1, defaultValue: 0 },
          { label: "Longitude", prop: "longitude", min: 0, max: 360, step: 1, defaultValue: 0 },
          { label: "Height From Surface", prop: "height", min: 0.01, max: 0.5, step: 0.01, defaultValue: 0.05 },
      ] as const;
      
      return (
        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <h3 className="text-lg font-bold">Blob Appearance</h3>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                  {characterSliders.map(({ label, prop, min, max, step, defaultValue }) => (
                     <div className="grid gap-2" key={prop}>
                        <Label>{label}</Label>
                        <div className="flex items-center gap-2">
                        <Slider
                            min={min} max={max} step={step}
                            value={[charProps[prop] ?? defaultValue]}
                            onValueChange={(value) => onCharacterPropChange(prop, value[0])}
                        />
                        <span className="text-xs font-mono w-12 text-center">
                            {(charProps[prop] ?? defaultValue).toFixed(step < 1 ? 2 : 0)}
                        </span>
                        </div>
                    </div>
                  ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>
              <h3 className="text-lg font-bold">Blob Lighting & Color</h3>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                  {lightingSliders.map(({ label, prop, min, max, step, defaultValue }) => (
                     <div className="grid gap-2" key={prop}>
                        <Label>{label}</Label>
                        <div className="flex items-center gap-2">
                        <Slider
                            min={min} max={max} step={step}
                            value={[charProps[prop] ?? defaultValue]}
                            onValueChange={(value) => onCharacterPropChange(prop, value[0])}
                        />
                        <span className="text-xs font-mono w-12 text-center">
                            {(charProps[prop] ?? defaultValue).toFixed(step < 1 ? 2 : 0)}
                        </span>
                        </div>
                    </div>
                  ))}
              </div>
            </AccordionContent>
          </AccordionItem>
          {!viewFromSebaka && (
             <AccordionItem value="item-3">
                <AccordionTrigger>
                    <h3 className="text-lg font-bold">Position</h3>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4 pt-2">
                        {positionSliders.map(({ label, prop, min, max, step, defaultValue }) => (
                             <div className="grid gap-2" key={prop}>
                                <Label>{label}</Label>
                                <div className="flex items-center gap-2">
                                <Slider
                                    min={min} max={max} step={step}
                                    value={[charProps[prop] ?? defaultValue]}
                                    onValueChange={(value) => onCharacterPropChange(prop, value[0])}
                                />
                                <span className="text-xs font-mono w-12 text-center">
                                    {(charProps[prop] ?? defaultValue).toFixed(0)}°
                                </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </AccordionContent>
             </AccordionItem>
          )}
           <div className="pt-4">
             <Button onClick={onReset} variant="outline" className="w-full">
                Reset All to Defaults
              </Button>
           </div>
        </Accordion>
      )
    }

    if (data.name === 'Viridis') {
      const viridisProps = materialProperties.Viridis;
      return (
        <>
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <h3 className="text-lg font-bold">Volcanic Activity</h3>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="viridis-noise-scale">Noise Scale</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="viridis-noise-scale"
                        min={0.1} max={10} step={0.1}
                        value={[viridisProps.noiseScale ?? 3.0]}
                        onValueChange={(value) => handleMaterialSliderChange(data.name, 'noiseScale', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">{(viridisProps.noiseScale ?? 3.0).toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="viridis-smoke-density">Smoke Density</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="viridis-smoke-density"
                        min={0} max={5} step={0.1}
                        value={[viridisProps.smokeDensity ?? 2.8]}
                        onValueChange={(value) => handleMaterialSliderChange(data.name, 'smokeDensity', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">{(viridisProps.smokeDensity ?? 2.8).toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="viridis-lava-softness">Lava Edge Softness</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id="viridis-lava-softness"
                        min={0} max={1} step={0.01}
                        value={[viridisProps.lavaSoftnessMin ?? 0.4, viridisProps.lavaSoftnessMax ?? 0.8]}
                        onValueChange={(value) => handleDualMaterialSliderChange(data.name, 'lavaSoftnessMin', 'lavaSoftnessMax', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">{(viridisProps.lavaSoftnessMin ?? 0.4).toFixed(2)}</span>
                       <span className="text-xs font-mono w-12 text-center">{(viridisProps.lavaSoftnessMax ?? 0.8).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          {renderStandardMaterialSettings()}
        </>
      )
    }

    return renderStandardMaterialSettings();
  }
  
  return (
    <ScrollArea className="h-full w-full p-6">
    <div className="space-y-6 text-sm">
        <h2 className="text-2xl font-bold">{data.name}</h2>
        
        { 'type' in data && (
            <>
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
            </>
        )}
        
        {renderMaterialSettings()}
    </div>
    </ScrollArea>
  );
};


export default InfoPanel;
