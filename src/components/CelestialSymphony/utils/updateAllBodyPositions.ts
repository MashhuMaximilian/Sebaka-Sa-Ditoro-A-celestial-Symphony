
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';
import { PlanetData } from '@/types';

export const updateAllBodyPositions = (
    currentHours: number,
    bodyData: BodyData[],
    allBodies: THREE.Object3D[],
    beaconPosition: THREE.Vector3
) => {
   bodyData.forEach(data => {
      const bodyObject = allBodies.find(m => m.name === data.name);
      if (!bodyObject) return;

      let orbitCenter = new THREE.Vector3(0,0,0);
      
      const beaconData = bodyData.find(d => d.name === 'Beacon');
      if (beaconData && beaconData.orbitRadius) {
          const beaconAngle = currentHours * beaconData.radsPerHour;
          const beaconX = beaconData.orbitRadius * Math.cos(beaconAngle);
          const beaconZ = beaconData.orbitRadius * Math.sin(beaconAngle);
          beaconPosition.set(beaconX, 0, beaconZ);
      }

      if (data.name === 'Beacon') {
          bodyObject.position.copy(beaconPosition);
          return;
      }

      if (data.name === 'Gelidis' || data.name === 'Liminis') {
          orbitCenter.copy(beaconPosition);
      }

      const semiMajorAxis = data.orbitRadius || 0;
      let x, z;
      const angle = currentHours * data.radsPerHour;

      if (data.type === 'Planet' && data.eccentric && data.eccentricity) {
          const eccentricity = data.eccentricity;
          const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
          const focus = semiMajorAxis * eccentricity;
          
          x = orbitCenter.x + focus + semiMajorAxis * Math.cos(angle);
          z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
      } else if (data.type === 'Star' && (data.name === 'Alpha' || data.name === 'Twilight')) {
          const r1 = 0.1 * 150; // AU_TO_UNITS
          const binaryAngle = currentHours * data.radsPerHour;
          x = (data.name === 'Alpha' ? -1 : 1) * r1 * Math.cos(binaryAngle);
          z = (data.name === 'Alpha' ? -1 : 1) * r1 * Math.sin(binaryAngle);
      } else {
          x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
          z = orbitCenter.z + semiMajorAxis * Math.sin(angle);
      }

      const y = orbitCenter.y;
      bodyObject.position.set(x, y, z);
  });
};
