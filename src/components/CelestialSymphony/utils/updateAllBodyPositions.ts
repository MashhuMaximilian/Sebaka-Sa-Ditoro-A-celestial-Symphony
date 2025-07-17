
import * as THREE from 'three';
import type { PlanetData } from '@/types';
import type { BodyData } from '../hooks/useBodyData';

export const updateAllBodyPositions = (
    currentHours: number,
    bodyData: BodyData[],
    allBodies: THREE.Mesh[],
    beaconPosition: THREE.Vector3
) => {
   bodyData.forEach(data => {
      const bodyMesh = allBodies.find(m => m.name === data.name);
      if (!bodyMesh) return;

      let orbitCenter = new THREE.Vector3(0,0,0);
      
      const beaconData = bodyData.find(d => d.name === 'Beacon');
      if (beaconData && beaconData.orbitRadius) {
          const beaconAngle = currentHours * beaconData.radsPerHour;
          const beaconX = beaconData.orbitRadius * Math.cos(beaconAngle);
          const beaconZ = beaconData.orbitRadius * Math.sin(beaconAngle);
          beaconPosition.set(beaconX, 0, beaconZ);
      }

      if (data.name === 'Beacon') {
          bodyMesh.position.copy(beaconPosition);
          return;
      }

      if (data.name === 'Gelidis' || data.name === 'Liminis') {
          orbitCenter.copy(beaconPosition);
      }

      const semiMajorAxis = data.orbitRadius || 0;
      let x, z;
      let angle = currentHours * data.radsPerHour;

      if ((data as PlanetData).eccentric) {
          const eccentricity = data.name === 'Spectris' ? 0.2 : data.name === 'Aetheris' ? 0.5 : 0.1;
          const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
          x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
          z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
      } else if (data.type === 'Star' && (data.name === 'Golden Giver' || data.name === 'Twilight')) {
          const r1 = 0.1 * 150; // AU_TO_UNITS
          const binaryAngle = currentHours * data.radsPerHour;
          x = (data.name === 'Golden Giver' ? -1 : 1) * r1 * Math.cos(binaryAngle);
          z = (data.name === 'Golden Giver' ? -1 : 1) * r1 * Math.sin(binaryAngle);
      } else {
          const semiMinorAxis = semiMajorAxis;
          x = orbitCenter.x + semiMajorAxis * Math.cos(angle);
          z = orbitCenter.z + semiMinorAxis * Math.sin(angle);
      }

      const y = orbitCenter.y;
      bodyMesh.position.set(x, y, z);
  });
};
