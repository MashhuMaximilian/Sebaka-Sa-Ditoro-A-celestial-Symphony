
import * as THREE from 'three';
import type { BodyData } from '../hooks/useBodyData';

export const createOrbitMesh = (body: BodyData): THREE.Mesh | null => {
    if ((body.type === 'Planet' || body.name === 'Beacon') && body.orbitRadius) {
        const tubeRadius = body.name === 'Beacon' ? 5 : 0.5;
        const tubularSegments = 512;
        const radialSegments = 12;

        let orbitGeometry: THREE.BufferGeometry;

        if (body.eccentric && body.eccentricity) {
            const eccentricity = body.eccentricity;
            const semiMajorAxis = body.orbitRadius;
            const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
            const focus = Math.sqrt(semiMajorAxis**2 - semiMinorAxis**2);

            const curve = new THREE.EllipseCurve(
                focus, 0,            // ax, aY
                semiMajorAxis, semiMinorAxis, // xRadius, yRadius
                0, 2 * Math.PI,      // aStartAngle, aEndAngle
                false,               // aClockwise
                0                    // aRotation
            );

            const points2D = curve.getPoints(tubularSegments);
            const points3D = points2D.map(p => new THREE.Vector3(p.x, p.y, 0));
            orbitGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points3D), tubularSegments, tubeRadius, radialSegments, true);
        } else {
            orbitGeometry = new THREE.TorusGeometry(body.orbitRadius, tubeRadius, radialSegments, tubularSegments);
        }

        const orbitMaterial = new THREE.MeshBasicMaterial({ color: 0x444444 });
        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        orbit.rotation.x = Math.PI / 2;
        orbit.name = `${body.name}_orbit`;

        return orbit;
    }
    return null;
};
