
import { useMemo } from "react";
import type { PlanetData, StarData, AnyBodyData } from "@/types";
import { HOURS_IN_SEBAKA_DAY } from "../constants/config";
import * as THREE from 'three';

export interface BodyData extends Omit<AnyBodyData, 'orbitPeriodDays'> {
    radsPerHour: number;
    originalOrbitPeriodDays: number;
    initialPhaseRad: number;
}

export const useBodyData = (stars: StarData[], planets: PlanetData[]): BodyData[] => {
    return useMemo(() => {
        const all: AnyBodyData[] = [...stars, ...planets];
        return all.map(body => ({
          ...body,
          radsPerHour: (2 * Math.PI) / ((body.orbitPeriodDays || Infinity) * HOURS_IN_SEBAKA_DAY),
          originalOrbitPeriodDays: body.orbitPeriodDays,
          initialPhaseRad: THREE.MathUtils.degToRad(body.initialPhase ?? 0),
        }));
      }, [stars, planets]);
};
