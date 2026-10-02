import * as THREE from "three";
import { initialPlanets, initialStars } from "./celestial-data";
import { getBodyData } from "@/components/CelestialSymphony/hooks/useBodyData";
import { calculateBodyPositions } from "@/components/CelestialSymphony/utils/calculateBodyPositions";
import {
  HOURS_IN_SEBAKA_DAY,
  SEBAKA_YEAR_IN_DAYS,
  SEBAKA_MONTH_IN_DAYS,
} from "@/components/CelestialSymphony/constants/config";

export const YEAR = SEBAKA_YEAR_IN_DAYS;
export const DAY = HOURS_IN_SEBAKA_DAY;
export const MONTH = SEBAKA_MONTH_IN_DAYS;
export const bodies = getBodyData([...initialStars, ...initialPlanets]);
export const witnesses = ["Rutilis", "Spectris", "Viridis", "Aetheris"];
export const knownBodies = bodies.filter(
  (b) => !["Gelidis", "Liminis"].includes(b.name),
);
export const mod = (n: number, m: number) => ((n % m) + m) % m;
export const deg = THREE.MathUtils.radToDeg;
export const rad = THREE.MathUtils.degToRad;
const KM_PER_AU = 149597870.7;

// Legacy `size` is a renderer scale, not a physical radius. Use the stated
// radius metadata for the observer calculation, retaining orbital parameters.
export function radiusKm(name: string): number {
  const body = bodies.find((b) => b.name === name)!;
  const factor = parseFloat(body.radius.replace(/[^\d.]/g, " "));
  return factor * (body.type === "Star" ? 695700 : 6371);
}

export function calendar(hours: number) {
  const days = Math.floor(hours / DAY);
  const dayOfYear = mod(days, YEAR);
  return {
    year: Math.floor(days / YEAR),
    day: dayOfYear + 1,
    month: Math.floor(dayOfYear / MONTH) + 1,
    date: (dayOfYear % MONTH) + 1,
    week: Math.floor((dayOfYear % MONTH) / 9) + 1,
    hour: Math.floor(mod(hours, DAY)),
    minute: Math.floor(mod(hours, 1) * 60),
  };
}

export function observerFrame(hours: number, latitude = 24, longitude = 0) {
  const phase = (2 * Math.PI * hours) / DAY + rad(longitude);
  const tilt = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 0, 1),
    rad(23.5),
  );
  const up = new THREE.Vector3(
    Math.cos(rad(latitude)) * Math.cos(phase),
    Math.sin(rad(latitude)),
    Math.cos(rad(latitude)) * Math.sin(phase),
  ).applyQuaternion(tilt);
  const east = new THREE.Vector3(
    -Math.sin(phase),
    0,
    Math.cos(phase),
  ).applyQuaternion(tilt);
  const north = new THREE.Vector3().crossVectors(east, up).normalize();
  return { up, east, north };
}

export type SkyBody = ReturnType<typeof observe>["sky"][number];
export function observe(
  hours: number,
  latitude = 24,
  longitude = 0,
  weave = true,
) {
  const positions = calculateBodyPositions(hours, bodies);
  const frame = observerFrame(hours, latitude, longitude);
  const observer = positions.Sebaka.clone().addScaledVector(
    frame.up,
    (radiusKm("Sebaka") / KM_PER_AU) * 150,
  );
  // east/up/north is a right-handed basis for this ephemeris convention.
  const local = (v: THREE.Vector3) =>
    new THREE.Vector3(v.dot(frame.east), v.dot(frame.up), v.dot(frame.north));
  const sunDirections = ["Alpha", "Twilight"].map((name) =>
    positions[name].clone().sub(observer).normalize(),
  );
  const sky = knownBodies
    .filter((b) => b.name !== "Sebaka")
    .map((body) => {
      const offset = positions[body.name].clone().sub(observer);
      const distanceAU = offset.length() / 150;
      const direction = offset.normalize();
      const physicalDiameter = deg(
        2 * Math.atan(radiusKm(body.name) / (distanceAU * KM_PER_AU)),
      );
      const apparentDiameter = weave
        ? Math.min(
            physicalDiameter * (body.weaveSizeMultiplier ?? 1),
            body.maxApparentDiameterDeg ?? Infinity,
          )
        : physicalDiameter;
      const altitude = deg(
        Math.asin(THREE.MathUtils.clamp(direction.dot(frame.up), -1, 1)),
      );
      const elongation = Math.min(
        ...sunDirections.map((s) => deg(s.angleTo(direction))),
      );
      return {
        ...body,
        direction,
        local: local(direction),
        altitude,
        azimuth: mod(
          deg(
            Math.atan2(direction.dot(frame.east), direction.dot(frame.north)),
          ),
          360,
        ),
        physicalDiameter,
        apparentDiameter,
        distanceAU,
        elongation,
        aboveHorizon: altitude > 0,
      };
    });
  const solarAltitude = Math.max(
    ...sky
      .filter((b) => ["Alpha", "Twilight"].includes(b.name))
      .map((b) => b.altitude),
  );
  const visibleWitnesses = sky.filter(
    (b) =>
      witnesses.includes(b.name) &&
      b.altitude > 3 &&
      b.elongation > 10 &&
      solarAltitude < -4,
  );
  return {
    positions,
    sky,
    frame,
    local,
    solarAltitude,
    visibleWitnesses,
    night: solarAltitude < -6,
  };
}

// A scenic starting observation is selected by geometry, never labeled as
// a historical event. All views continue to use this exact simulation time.
export function openingObservation() {
  let best = 18,
    score = -Infinity;
  for (let h = 0; h < YEAR * DAY; h += 0.5) {
    const s = observe(h);
    const a = s.sky.find((b) => b.name === "Aetheris")!;
    const value =
      -Math.abs(a.altitude - 14) - Math.abs(s.solarAltitude + 10) * 0.6;
    if (value > score) {
      score = value;
      best = h;
    }
  }
  return best;
}

export async function nextGathering(
  start: number,
  latitude: number,
  longitude: number,
  signal: AbortSignal,
  progress: (p: number) => void,
) {
  // Practical observing opportunity: >=3 witnesses above 3°, both suns below
  // -4°, elongation >10°. This is an explicit interpretation, not a rare-event proof.
  const end = start + YEAR * DAY;
  let wasGathering =
    observe(start, latitude, longitude).visibleWitnesses.length >= 3;
  for (let h = start + 1; h <= end; h += 1) {
    if (signal.aborted) return null;
    const match = observe(h, latitude, longitude).visibleWitnesses.length >= 3;
    if (match && !wasGathering) return h;
    if (!match) wasGathering = false;
    if (Math.round(h - start) % 96 === 0) {
      progress((h - start) / (YEAR * DAY));
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  return null;
}

export function nextRise(
  start: number,
  name: string,
  latitude: number,
  longitude: number,
): number | null {
  for (let hours = start + 0.25; hours <= start + 2 * DAY; hours += 0.25) {
    const body = observe(hours, latitude, longitude).sky.find(
      (b) => b.name === name,
    );
    if (body && body.altitude >= 5) return hours;
  }
  return null;
}

export const fieldNotes: Record<
  string,
  { title: string; text: string; color: string }
> = {
  Aetheris: {
    title: "The quiet giant",
    text: "Blue cloud belts turn above the horizon. To the sky-watchers of Sebaka, Aetheris is a presence measured in generations.",
    color: "#94b6d4",
  },
  Spectris: {
    title: "The ringed witness",
    text: "An icy halo catches the light of two suns. Its changing aspect inspires stories of concealment and revelation.",
    color: "#dfceb4",
  },
  Viridis: {
    title: "The phase maker",
    text: "A world of ash and fire. Its physical 27-day volcanic rhythm gives Sebaka its months: three weeks, each nine days long.",
    color: "#b9c69b",
  },
  Rutilis: {
    title: "The double ember",
    text: "The innermost witness follows the suns through the twilight. A scorched world, restless and bright.",
    color: "#dd9870",
  },
  Alpha: {
    title: "The golden giver",
    text: "The brighter member of the close binary. Alpha and Twilight circle their shared center while Sebaka orbits them both.",
    color: "#f7d996",
  },
  Twilight: {
    title: "The quieter sun",
    text: "Warm orange light accompanies Alpha across the sky. Two suns, one shared gravitational center.",
    color: "#f1ac7a",
  },
  Beacon: {
    title: "The distant light",
    text: "A brilliant point beyond the familiar worlds. Its true nature is not yet known to the people of Sebaka.",
    color: "#d4edff",
  },
  Sebaka: {
    title: "Where we stand",
    text: "An independent planet around the twin suns. Every view of this sky begins here.",
    color: "#87c1b1",
  },
};
