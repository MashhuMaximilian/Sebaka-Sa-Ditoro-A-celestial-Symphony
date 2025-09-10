
import { useMemo } from "react";
import type { PlanetData, StarData, AnyBodyData } from "@/types";
import { HOURS_IN_SEBAKA_DAY } from "../constants/config";
import * as THREE from 'three';

// Renamed from BodyData to avoid confusion
export interface ProcessedBodyData extends Omit<AnyBodyData, 'orbitPeriodDays'> {
    radsPerHour: number;
    originalOrbitPeriodDays: number;
    initialPhaseRad: number;
}

export const getBodyData = (allBodies: AnyBodyData[]): ProcessedBodyData[] => {
    return allBodies.map(body => ({
      ...body,
      radsPerHour: (2 * Math.PI) / ((body.orbitPeriodDays || Infinity) * HOURS_IN_SEBAKA_DAY),
      originalOrbitPeriodDays: body.orbitPeriodDays,
      initialPhaseRad: THREE.MathUtils.degToRad(body.initialPhase ?? 0),
    }));
}

export const useBodyData = (stars: StarData[], planets: PlanetData[]): ProcessedBodyData[] => {
    return useMemo(() => {
        const all: AnyBodyData[] = [...stars, ...planets];
        return getBodyData(all);
      }, [stars, planets]);
};
