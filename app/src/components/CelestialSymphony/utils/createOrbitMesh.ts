
import * as THREE from 'three';
import type { ProcessedBodyData } from '../hooks/useBodyData';
import { spiderStrandShader } from '../shaders/spiderStrandShader';

export const createOrbitMesh = (body: ProcessedBodyData, usePlainOrbits: boolean): THREE.Mesh | null => {
    if ((body.type === 'Planet' || body.name === 'Beacon') && body.orbitRadius) {
        
        let tubeRadius: number;
        if (usePlainOrbits) {
            tubeRadius = body.name === 'Beacon' ? 1.5 : 0.15; // 3x thinner
        } else {
            tubeRadius = body.name === 'Beacon' ? 0.5 : 0.05; // 10x thinner
        }

        const tubularSegments = 512;
        const radialSegments = 12;

        let orbitGeometry: THREE.BufferGeometry;

        if (body.eccentric && body.eccentricity && body.eccentricity > 0) {
            const eccentricity = body.eccentricity;
            const semiMajorAxis = body.orbitRadius;
            const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
            
            // The distance from the center of the ellipse to one of the foci.
            const focusOffset = Math.sqrt(semiMajorAxis**2 - semiMinorAxis**2);

            // To place the sun at the origin (which is a focus), the center of the
            // ellipse must be offset by -focusOffset along the x-axis.
            const curve = new THREE.EllipseCurve(
                -focusOffset, 0,      // Center of the ellipse (aX, aY)
                semiMajorAxis, semiMinorAxis, // xRadius, yRadius
                0, 2 * Math.PI,      // aStartAngle, aEndAngle
                false,               // aClockwise
                0                    // aRotation
            );

            const points2D = curve.getPoints(tubularSegments);
            // The points are in the XY plane by default. We map Y to Z to place the orbit on our desired plane.
            const points3D = points2D.map(p => new THREE.Vector3(p.x, 0, p.y));
            orbitGeometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points3D), tubularSegments, tubeRadius, radialSegments, true);
        } else {
            orbitGeometry = new THREE.TorusGeometry(body.orbitRadius, tubeRadius, radialSegments, tubularSegments);
        }

        let orbitMaterial: THREE.Material;

        if (usePlainOrbits) {
             orbitMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.5
            });
        } else {
            orbitMaterial = new THREE.ShaderMaterial({
                uniforms: THREE.UniformsUtils.clone(spiderStrandShader.uniforms),
                vertexShader: spiderStrandShader.vertexShader,
                fragmentShader: spiderStrandShader.fragmentShader,
                transparent: true,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
            });
            (orbitMaterial as THREE.ShaderMaterial).uniforms.iridescenceStrength.value = 1;
            (orbitMaterial as THREE.ShaderMaterial).uniforms.opacity.value = 0.585;
        }
        
        const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
        
        // For circular (Torus) orbits, they are created in the XY plane by default, so we rotate them to the XZ plane.
        // For elliptical (Tube) orbits, we have already mapped the points to the XZ plane, so no rotation is needed.
        if (!(body.eccentric && body.eccentricity && body.eccentricity > 0)) {
            orbit.rotation.x = Math.PI / 2;
        }

        orbit.name = `${body.name}_orbit`;

        return orbit;
    }
    return null;
};
