
"use client";

import type { PlanetData, StarData } from "@/types";
import DataDisplay from "./data-display";
import { Separator } from "./ui/separator";

interface InfoPanelProps {
  data: PlanetData | StarData;
}

const InfoPanel = ({ data }: InfoPanelProps) => {
  return (
    <div className="space-y-6 text-sm">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-primary">Overview</h3>
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
        <h3 className="text-lg font-bold text-primary">Physical Characteristics</h3>
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
        <h3 className="text-lg font-bold text-primary">Appearance & Lore</h3>
        <dl className="space-y-2">
            <DataDisplay label="Appearance from Sebaka" value={data.appearance} />
            <DataDisplay label="Lore" value={data.lore} />
        </dl>
      </div>
    </div>
  );
};

export default InfoPanel;
