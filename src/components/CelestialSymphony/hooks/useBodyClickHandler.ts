
import { useEffect } from "react";
import * as THREE from "three";

interface BodyClickHandlerProps {
    renderer: THREE.WebGLRenderer | undefined;
    camera: THREE.PerspectiveCamera | undefined;
    allBodies: THREE.Object3D[];
    onBodyClick: (name: string) => void;
    viewFromSebaka: boolean;
}

export const useBodyClickHandler = ({ renderer, camera, allBodies, onBodyClick, viewFromSebaka }: BodyClickHandlerProps) => {
    useEffect(() => {
        if (!renderer || !camera || allBodies.length === 0) return;

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onClick = (event: MouseEvent | TouchEvent) => {
            if (viewFromSebaka) return;
            const rect = renderer.domElement.getBoundingClientRect();
            let x, y;
            if (event instanceof MouseEvent) { x = event.clientX; y = event.clientY; } 
            else if (event.touches && event.touches.length > 0) { x = event.touches[0].clientX; y = event.touches[0].clientY; } 
            else { return; }
            mouse.x = ((x - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((y - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(allBodies, true);
            if (intersects.length > 0) {
                let currentObject = intersects[0].object;
                while(currentObject.parent && !currentObject.name) {
                    if (currentObject.parent.name) {
                        currentObject = currentObject.parent;
                        break;
                    }
                    currentObject = currentObject.parent;
                }
                if (currentObject.name) onBodyClick(currentObject.name);
            }
        };

        const currentDomElement = renderer.domElement;
        currentDomElement.addEventListener('click', onClick);
        currentDomElement.addEventListener('touchstart', onClick, { passive: true });

        return () => {
            currentDomElement.removeEventListener('click', onClick);
            currentDomElement.removeEventListener('touchstart', onClick);
        };
    }, [renderer, camera, allBodies, onBodyClick, viewFromSebaka]);
};
