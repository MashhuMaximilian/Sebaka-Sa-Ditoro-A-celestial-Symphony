"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  Home,
  RotateCw,
} from "lucide-react";
export type CameraCommand = {
  id: number;
  action: "left" | "right" | "up" | "down" | "in" | "out";
};
export type OrbitTarget = "system" | "beacon" | "body";

interface Props {
  mode: "sky" | "orbit";
  latitude: number;
  longitude: number;
  onMove: (north: number, east: number) => void;
  onCoordinates: (latitude: number, longitude: number) => void;
  onCommand: (action: CameraCommand["action"]) => void;
  rotating: boolean;
  onRotation: () => void;
  tracking: boolean;
  onTracking: () => void;
  onFocus: () => void;
  onHome: () => void;
  onBeacon: () => void;
  target: OrbitTarget;
  selected: string;
}

export default function NavigationDock(p: Props) {
  const surface = p.mode === "sky";
  const directions = [
    ["up", "north", ArrowUp, 5, 0],
    ["left", "west", ArrowLeft, 0, -5],
    ["right", "east", ArrowRight, 0, 5],
    ["down", "south", ArrowDown, -5, 0],
  ] as const;
  return (
    <section
      className="navigation-dock"
      aria-label={surface ? "Surface navigation" : "Orbital navigation"}
    >
      <div className="navigation-title">
        <span>
          {surface
            ? "EXPLORE SEBAKA"
            : p.target === "body"
              ? `ORBITING ${p.selected.toUpperCase()}`
              : p.target === "beacon"
                ? "BEACON SYSTEM · AUTHOR ATLAS"
                : "EXPLORE THE SYSTEM"}
        </span>
        <button
          aria-label="Recenter selected body"
          title="Recenter selected body"
          onClick={p.onFocus}
        >
          <Crosshair size={15} />
        </button>
      </div>
      <div className="navigation-main">
        <div className="direction-pad">
          {directions.map(([action, cardinal, Icon, north, east]) => (
            <button
              key={action}
              className={`direction-${action}`}
              aria-label={
                surface
                  ? `Move ${cardinal} on Sebaka`
                  : `Orbit camera ${action}`
              }
              title={surface ? `Move 5° ${cardinal}` : `Orbit ${action}`}
              onClick={() =>
                surface ? p.onMove(north, east) : p.onCommand(action)
              }
            >
              <Icon size={16} />
            </button>
          ))}
          <span aria-hidden="true">{surface ? "⌖" : "◎"}</span>
        </div>
        {surface ? (
          <div className="coordinate-controls">
            <label>
              LATITUDE{" "}
              <input
                aria-label="Surface latitude"
                type="number"
                min={-89}
                max={89}
                step={1}
                value={p.latitude}
                onChange={(e) =>
                  p.onCoordinates(
                    Math.max(-89, Math.min(89, Number(e.target.value))),
                    p.longitude,
                  )
                }
              />
              <span>°</span>
            </label>
            <label>
              LONGITUDE{" "}
              <input
                aria-label="Surface longitude"
                type="number"
                min={-180}
                max={180}
                step={1}
                value={p.longitude}
                onChange={(e) =>
                  p.onCoordinates(
                    p.latitude,
                    Math.max(-180, Math.min(180, Number(e.target.value))),
                  )
                }
              />
              <span>°</span>
            </label>
          </div>
        ) : (
          <div className="navigation-destinations">
            <button onClick={p.onHome}>
              <Home size={13} /> Inner system
            </button>
            <button onClick={p.onBeacon}>
              Beacon system <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
      <div className="navigation-switches">
        <button
          aria-label="Sebaka rotation"
          aria-pressed={p.rotating}
          onClick={p.onRotation}
        >
          <RotateCw size={13} /> Rotation {p.rotating ? "on" : "off"}
        </button>
        <button
          aria-label="Track selected body"
          aria-pressed={p.tracking}
          onClick={p.onTracking}
        >
          {p.tracking ? "Tracking" : "Free camera"}
        </button>
      </div>
      <small>
        {surface
          ? "Drag to look · WASD to travel · scroll to zoom"
          : "Drag to orbit · right-drag to pan · scroll to approach"}
      </small>
    </section>
  );
}
