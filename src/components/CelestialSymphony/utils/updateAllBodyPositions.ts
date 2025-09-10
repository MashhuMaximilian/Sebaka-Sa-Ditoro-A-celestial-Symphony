
import * as THREE from 'three';
import type { ProcessedBodyData } from '../hooks/useBodyData';
import { calculateBodyPositions } from './calculateBodyPositions';

export const updateAllBodyPositions = (
    currentHours: number,
    bodyData: ProcessedBodyData[],
    allBodies: THREE.Object3D[],
    beaconPositionRef: THREE.Vector3
) => {
   const bodyPositions = calculateBodyPositions(currentHours, bodyData);

   Object.keys(bodyPositions).forEach(name => {
       const bodyObject = allBodies.find(m => m.name === name);
       if (bodyObject) {
           bodyObject.position.copy(bodyPositions[name]);
       }
   });
   
   // Update the mutable ref for components that still use it
   if (bodyPositions['Beacon']) {
       beaconPositionRef.copy(bodyPositions['Beacon']);
   }
};
