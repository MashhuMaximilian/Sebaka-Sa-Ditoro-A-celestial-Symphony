
import { useEffect } from "react";
import * as THREE from "three";

interface BodyClickHandlerProps {
    renderer: THREE.WebGLRenderer | undefined;
    camera: THREE.PerspectiveCamera | undefined;
    allBodies: THREE.Object3D[];
    characterMesh: THREE.Object3D | null;
    onBodyClick: (name: string) => void;
    viewFromSebaka: boolean;
}

export const useBodyClickHandler = ({ renderer, camera, allBodies, characterMesh, onBodyClick, viewFromSebaka }: BodyClickHandlerProps) => {
    useEffect(() => {
        if (!renderer || !camera || (allBodies.length === 0 && !characterMesh)) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();
        
        const objectsToIntersect = [...allBodies];
        if (characterMesh) {
            objectsToIntersect.push(characterMesh);
        }

        const onClick = (event: MouseEvent | TouchEvent) => {
            const rect = renderer.domElement.getBoundingClientRect();
            let x, y;
            if (event instanceof MouseEvent) { x = event.clientX; y = event.clientY; } 
            else if (event.touches && event.touches.length > 0) { x = event.touches[0].clientX; y = event.touches[0].clientY; } 
            else { return; }
            mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);

            const intersects = raycaster.intersectObjects(objectsToIntersect, true);

            if (intersects.length > 0) {
                let currentObject = intersects[0].object;
                
                // For the character, the name is on the mesh itself.
                if (currentObject.name === 'Character') {
                    onBodyClick('Character');
                    return;
                }
                
                // For other bodies, traverse up the hierarchy to find the main body group, which has the name.
                while(currentObject.parent && !allBodies.some(body => body.name === currentObject.name)) {
                    if (currentObject.parent) {
                        currentObject = currentObject.parent;
                    } else {
                        break; // Reached the scene root without finding a named body
                    }
                }
                
                // When in Sebaka view, allow clicking on any body except Sebaka itself.
                if (currentObject.name && (!viewFromSebaka || currentObject.name !== 'Sebaka')) {
                    onBodyClick(currentObject.name);
                }
            }
        };

        const currentDomElement = renderer.domElement;
        currentDomElement.addEventListener('click', onClick);
        currentDomElement.addEventListener('touchstart', onClick, { passive: true });

        return () => {
            currentDomElement.removeEventListener('click', onClick);
            currentDomElement.removeEventListener('touchstart', onClick);
        };
    }, [renderer, camera, allBodies, characterMesh, onBodyClick, viewFromSebaka]);
};
