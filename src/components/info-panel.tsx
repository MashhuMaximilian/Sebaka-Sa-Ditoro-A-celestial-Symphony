
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
  onPropertiesChange: React.Dispatch<React.SetStateAction<MaterialProperties>>;
  onReset: () => void;
  characterLatitude: number;
  onCharacterLatitudeChange: (value: number) => void;
  characterLongitude: number;
  onCharacterLongitudeChange: (value: number) => void;
  characterHeight: number;
  onCharacterHeightChange: (value: number) => void;
  characterOpacity: number;
  onCharacterOpacityChange: (value: number) => void;
  viewFromSebaka: boolean;
}

const InfoPanel = ({ 
    data, materialProperties, onPropertiesChange, onReset,
    characterLatitude, onCharacterLatitudeChange,
    characterLongitude, onCharacterLongitudeChange,
    characterHeight, onCharacterHeightChange,
    characterOpacity, onCharacterOpacityChange,
    viewFromSebaka
}: InfoPanelProps) => {

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
    if (!bodyProps) return null;
    
    if (data.name === 'Character') {
      const charProps = materialProperties.Character;
      
      return (
        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <h3 className="text-lg font-bold">Blob Settings</h3>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4 pt-2">
                  <div className="grid gap-2">
                    <Label>Blob Deformation</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        min={0} max={0.5} step={0.01}
                        value={[charProps.displacementScale ?? 0.05]}
                        onValueChange={(value) => handleSliderChange(data.name, 'displacementScale', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">
                        {(charProps.displacementScale ?? 0.05).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Noise Frequency</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        min={0.1} max={15} step={0.1}
                        value={[charProps.noiseFrequency ?? 8.3]}
                        onValueChange={(value) => handleSliderChange(data.name, 'noiseFrequency', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">
                        {(charProps.noiseFrequency ?? 8.3).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Animation Speed</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        min={0.1} max={5} step={0.1}
                        value={[charProps.noiseSpeed ?? 0.5]}
                        onValueChange={(value) => handleSliderChange(data.name, 'noiseSpeed', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">
                        {(charProps.noiseSpeed ?? 0.5).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Blob Complexity (Layers)</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        min={1} max={8} step={1}
                        value={[charProps.blobComplexity ?? 1]}
                        onValueChange={(value) => handleSliderChange(data.name, 'blobComplexity', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">
                        {(charProps.blobComplexity ?? 1).toFixed(0)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Iridescence Strength</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                         min={0} max={20} step={0.1}
                        value={[charProps.iridescenceStrength ?? 14.3]}
                        onValueChange={(value) => handleSliderChange(data.name, 'iridescenceStrength', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">
                        {(charProps.iridescenceStrength ?? 14.3).toFixed(1)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Rim Power</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                         min={0} max={10} step={0.1}
                        value={[charProps.rimPower ?? 1.9]}
                        onValueChange={(value) => handleSliderChange(data.name, 'rimPower', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">
                        {(charProps.rimPower ?? 1.9).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Color Speed</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                         min={0} max={5} step={0.1}
                        value={[charProps.colorSpeed ?? 2.2]}
                        onValueChange={(value) => handleSliderChange(data.name, 'colorSpeed', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">
                        {(charProps.colorSpeed ?? 2.2).toFixed(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Opacity</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                         min={0} max={1} step={0.01}
                        value={[characterOpacity]}
                        onValueChange={(v) => onCharacterOpacityChange(v[0])}
                      />
                      <span className="text-xs font-mono w-12 text-center">
                        {characterOpacity.toFixed(2)}
                      </span>
                    </div>
                  </div>

                <Button onClick={onReset} variant="outline" className="w-full">
                  Reset All to Defaults
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
          {!viewFromSebaka && (
             <AccordionItem value="item-2">
                <AccordionTrigger>
                    <h3 className="text-lg font-bold">Position</h3>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4 pt-2">
                        <div className="grid gap-2">
                            <Label>Latitude</Label>
                            <div className="flex items-center gap-2">
                                <Slider
                                    min={-90} max={90} step={1}
                                    value={[characterLatitude]}
                                    onValueChange={(v) => onCharacterLatitudeChange(v[0])}
                                />
                                <span className="text-xs font-mono w-12 text-center">
                                    {characterLatitude.toFixed(0)}°
                                </span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Longitude</Label>
                            <div className="flex items-center gap-2">
                                <Slider
                                    min={0} max={360} step={1}
                                    value={[characterLongitude]}
                                    onValueChange={(v) => onCharacterLongitudeChange(v[0])}
                                />
                                <span className="text-xs font-mono w-12 text-center">
                                    {characterLongitude.toFixed(0)}°
                                </span>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Height From Surface</Label>
                            <div className="flex items-center gap-2">
                                <Slider
                                    min={0.01} max={0.5} step={0.01}
                                    value={[characterHeight]}
                                    onValueChange={(v) => onCharacterHeightChange(v[0])}
                                />
                                <span className="text-xs font-mono w-12 text-center">
                                    {characterHeight.toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>
                </AccordionContent>
             </AccordionItem>
          )}
        </Accordion>
      )
    }

    const bodyTexturePaths = texturePaths[data.name];
    const hasNormalMap = !!bodyTexturePaths?.normal;
    const hasDisplacementMap = !!bodyTexturePaths?.displacement;
    const hasSpecularMap = !!bodyTexturePaths?.specular;
    const hasAoMap = !!bodyTexturePaths?.ambient;
    
    return (
       <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
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
                      onValueChange={(value) => handleSliderChange(data.name, 'normalScale', value)}
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
                        onValueChange={(value) => handleSliderChange(data.name, 'displacementScale', value)}
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
                            onValueChange={(value) => handleSliderChange(data.name, 'albedo', value)}
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
                      onValueChange={(value) => handleSliderChange(data.name, 'emissiveIntensity', value)}
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
                        onValueChange={(value) => handleSliderChange(data.name, 'specularIntensity', value)}
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
                        onValueChange={(value) => handleSliderChange(data.name, 'shininess', value)}
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
                      onValueChange={(value) => handleSliderChange(data.name, 'aoMapIntensity', value)}
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
    )
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
