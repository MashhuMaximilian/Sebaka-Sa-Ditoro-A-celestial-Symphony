
"use client";

import type { MaterialProperties } from "@/types";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "./ui/button";

interface MaterialSettingsPanelProps {
  properties: MaterialProperties;
  onPropertiesChange: (newProperties: MaterialProperties) => void;
  onReset: () => void;
}

const bodiesWithSettings = [
  'Alpha', 'Twilight', 'Beacon', 'Rutilus', 'Sebaka', 
  'Spectris', 'Viridis', 'Aetheris', 'Gelidis', 'Liminis'
];

export default function MaterialSettingsPanel({ 
  properties, 
  onPropertiesChange,
  onReset
}: MaterialSettingsPanelProps) {
  
  const handleSliderChange = (bodyName: string, propName: keyof MaterialProperties[string], value: number[]) => {
    const newProps = {
      ...properties,
      [bodyName]: {
        ...properties[bodyName],
        [propName]: value[0]
      }
    };
    onPropertiesChange(newProps);
  };

  return (
    <div className="space-y-4">
      <Accordion type="multiple" className="w-full">
        {bodiesWithSettings.map((bodyName) => {
          const bodyProps = properties[bodyName];
          if (!bodyProps) return null;

          return (
            <AccordionItem value={bodyName} key={bodyName}>
              <AccordionTrigger>{bodyName}</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="grid gap-2">
                    <Label htmlFor={`${bodyName}-normal`}>Normal Map Strength</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        id={`${bodyName}-normal`}
                        min={0}
                        max={5}
                        step={0.01}
                        value={[bodyProps.normalScale]}
                        onValueChange={(value) => handleSliderChange(bodyName, 'normalScale', value)}
                      />
                      <span className="text-xs font-mono w-12 text-center">{bodyProps.normalScale.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${bodyName}-displacement`}>Displacement Map Strength</Label>
                     <div className="flex items-center gap-2">
                        <Slider
                          id={`${bodyName}-displacement`}
                          min={0}
                          max={5}
                          step={0.01}
                          value={[bodyProps.displacementScale]}
                          onValueChange={(value) => handleSliderChange(bodyName, 'displacementScale', value)}
                        />
                        <span className="text-xs font-mono w-12 text-center">{bodyProps.displacementScale.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
      <Button onClick={onReset} variant="outline" className="w-full">
        Reset to Defaults
      </Button>
    </div>
  );
}