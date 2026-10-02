"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  bodies,
  knownBodies,
  observe,
  rad,
  fieldNotes,
} from "@/lib/observatory";
import { calculateBodyPositions } from "@/components/CelestialSymphony/utils/calculateBodyPositions";

export interface SceneProps {
  clock: MutableRefObject<number>;
  mode: "sky" | "orbit";
  selected: string;
  focusKey: number;
  weave: boolean;
  latitude: number;
  longitude: number;
  labels: boolean;
  fov: number;
  onSelect: (name: string) => void;
  onReady: () => void;
  onPerformance: (fps: number) => void;
}

const planetVertex = `varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld;
void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const planetFragment = `precision highp float;
uniform sampler2D surface; uniform vec3 sunA; uniform vec3 sunB; uniform vec3 tint; uniform float hasTexture; uniform float star; uniform float cycle;
varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld;
void main(){
 vec3 n=normalize(vNormal); vec3 eye=normalize(cameraPosition-vWorld);
 vec3 tex=mix(tint,texture2D(surface,vUv).rgb,hasTexture);
 float a=max(dot(n,normalize(sunA-vWorld)),0.); float b=max(dot(n,normalize(sunB-vWorld)),0.);
 float rim=pow(1.-max(dot(n,eye),0.),3.5);
 vec3 light=tex*(.055+a*.95+b*.42)+tint*rim*.32;
 light+=tex*cycle*.15; light=mix(light,tint*1.35,star);
 gl_FragColor=vec4(light,1.);
}`;
const skyVertex = `varying vec3 v; void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const skyFragment = `precision highp float; varying vec3 v; uniform float daylight; uniform float orbital;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){vec3 d=normalize(v);float h=max(d.y,0.);float cloud=noise(d*5.)*.55+noise(d*13.)*.3+noise(d*35.)*.15;
float band=exp(-pow((d.x*.38+d.y*.7+d.z*.55-.18)*5.,2.));
vec3 deep=mix(vec3(.022,.038,.062),vec3(.004,.011,.025),smoothstep(0.,.8,h));
deep+=band*pow(cloud,2.)*vec3(.10,.14,.17)*(1.-daylight);
vec3 dusk=mix(vec3(.36,.21,.12),vec3(.035,.13,.20),smoothstep(0.,.4,h));
vec3 c=mix(deep,dusk,daylight*.7);c+=vec3(.09,.07,.045)*exp(-h*14.)*(1.-orbital);
c=mix(c,vec3(.008,.016,.025)+band*cloud*vec3(.01,.016,.022),orbital);
gl_FragColor=vec4(c,1.);}`;

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export default function SkyScene(props: SceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const labelRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!host.current) return;
    const mount = host.current;
    let disposed = false;
    let invalidated = true;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      setError(true);
      latest.current.onReady();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor("#050c14");
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive sky. Drag or use arrow keys to look around; use the view controls to zoom.",
    );
    renderer.domElement.tabIndex = 0;
    mount.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 30000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 50;
    controls.maxDistance = 10000;
    controls.enabled = false;
    controls.addEventListener("change", () => {
      invalidated = true;
    });
    const skyMaterial = new THREE.ShaderMaterial({
      vertexShader: skyVertex,
      fragmentShader: skyFragment,
      uniforms: { daylight: { value: 0.1 }, orbital: { value: 0 } },
      side: THREE.BackSide,
      depthWrite: false,
    });
    const backdrop = new THREE.Mesh(
      new THREE.SphereGeometry(19000, 32, 20),
      skyMaterial,
    );
    scene.add(backdrop);
    const random = seeded(84);
    const stars = new THREE.BufferGeometry();
    const starPositions: number[] = [],
      starColors: number[] = [];
    for (let i = 0; i < 6500; i++) {
      const y = random() * 2 - 1,
        a = random() * Math.PI * 2,
        r = Math.sqrt(1 - y * y);
      starPositions.push(
        r * Math.cos(a) * 12000,
        y * 12000,
        r * Math.sin(a) * 12000,
      );
      const b = 0.15 + Math.pow(random(), 4) * 0.85;
      starColors.push(
        b,
        b * (0.85 + random() * 0.15),
        b * (0.75 + random() * 0.25),
      );
    }
    stars.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3),
    );
    stars.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(starColors, 3),
    );
    const starMaterial = new THREE.PointsMaterial({
      size: 1.6,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    const starfield = new THREE.Points(stars, starMaterial);
    scene.add(starfield);

    // An illustrative landscape. No mountains are used as astronomical evidence.
    const ground = new THREE.Group();
    scene.add(ground);
    for (let layer = 0; layer < 3; layer++) {
      const verts: number[] = [],
        indices: number[] = [];
      const count = 1440,
        radius = 1800 + layer * 900;
      for (let i = 0; i <= count; i++) {
        const a = (i / count) * Math.PI * 2;
        const peak = Math.pow(
          Math.abs(Math.sin(a * 4 + layer) * Math.cos(a * 7 - layer)),
          1.5,
        );
        const detail =
          Math.sin(a * 43 + layer) * 8 +
          Math.sin(a * 99) * 4 +
          Math.sin(a * 211) * 2;
        const height =
          -50 + peak * (100 + layer * 65) + Math.sin(a * 3) * 45 + detail;
        verts.push(
          Math.sin(a) * radius,
          height,
          Math.cos(a) * radius,
          Math.sin(a) * radius,
          -1200,
          Math.cos(a) * radius,
        );
        if (i < count)
          indices.push(
            i * 2,
            i * 2 + 1,
            i * 2 + 2,
            i * 2 + 1,
            i * 2 + 3,
            i * 2 + 2,
          );
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(verts, 3),
      );
      geometry.setIndex(indices);
      ground.add(
        new THREE.Mesh(
          geometry,
          new THREE.MeshBasicMaterial({
            color: ["#0a141b", "#11202a", "#182a35"][layer],
            side: THREE.DoubleSide,
          }),
        ),
      );
    }
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(6000, 80),
      new THREE.MeshBasicMaterial({ color: "#080f15", side: THREE.DoubleSide }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -80;
    ground.add(floor);

    const orbits = new THREE.Group();
    scene.add(orbits);
    for (const body of knownBodies.filter((b) => b.type === "Planet")) {
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= 180; i++)
        points.push(
          calculateBodyPositions((i / 180) * body.orbitPeriodDays * 24, bodies)[
            body.name
          ],
        );
      const g = new THREE.BufferGeometry().setFromPoints(points);
      orbits.add(
        new THREE.Line(
          g,
          new THREE.LineBasicMaterial({
            color: body.name === "Sebaka" ? "#ae9464" : "#365361",
            transparent: true,
            opacity: body.name === "Sebaka" ? 0.7 : 0.36,
          }),
        ),
      );
    }
    const orbitGuide = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const sightline = new THREE.Line(
      orbitGuide,
      new THREE.LineDashedMaterial({
        color: "#e0bf7e",
        dashSize: 5,
        gapSize: 4,
        transparent: true,
        opacity: 0.6,
      }),
    );
    orbits.add(sightline);
    const sphere = new THREE.SphereGeometry(1, 72, 48);
    const loader = new THREE.TextureLoader();
    const meshes: Record<string, THREE.Mesh> = {};
    const materials: THREE.ShaderMaterial[] = [];
    const textures: THREE.Texture[] = [];
    let ring: THREE.Mesh | undefined;
    for (const body of knownBodies) {
      const material = new THREE.ShaderMaterial({
        vertexShader: planetVertex,
        fragmentShader: planetFragment,
        uniforms: {
          surface: { value: null },
          hasTexture: { value: 0 },
          tint: { value: new THREE.Color(fieldNotes[body.name].color) },
          sunA: { value: new THREE.Vector3() },
          sunB: { value: new THREE.Vector3() },
          star: { value: body.type === "Star" ? 1 : 0 },
          cycle: { value: 0 },
        },
      });
      materials.push(material);
      if (body.type === "Planet") {
        loader.load(`/observatory/${body.name}.webp`, (texture) => {
          if (disposed) {
            texture.dispose();
            return;
          }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(
            4,
            renderer.capabilities.getMaxAnisotropy(),
          );
          textures.push(texture);
          material.uniforms.surface.value = texture;
          material.uniforms.hasTexture.value = 1;
          invalidated = true;
        });
      }
      const mesh = new THREE.Mesh(sphere, material);
      mesh.name = body.name;
      meshes[body.name] = mesh;
      scene.add(mesh);
      if (body.name === "Spectris") {
        const ringMaterial = new THREE.ShaderMaterial({
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
          vertexShader: `varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
          fragmentShader: `varying vec3 p;void main(){float r=length(p.xy);float b=.55+.18*sin(r*18.)+.08*sin(r*37.);float gap=smoothstep(1.72,1.76,r)*(1.-smoothstep(1.81,1.85,r));gl_FragColor=vec4(mix(vec3(.40,.53,.58),vec3(.86,.78,.61),b),(.3+b*.35)*(1.-gap));}`,
        });
        ring = new THREE.Mesh(
          new THREE.RingGeometry(1.3, 2.2, 128, 16),
          ringMaterial,
        );
        ring.rotation.x = 1.05;
        mesh.add(ring);
      }
    }
    // A lightweight glow sprite is a display cue for stars, never a physical disc.
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 128;
    const ctx = glowCanvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, "rgba(255,245,220,1)");
    gradient.addColorStop(0.06, "rgba(255,238,208,.8)");
    gradient.addColorStop(0.2, "rgba(244,216,172,.15)");
    gradient.addColorStop(1, "rgba(240,210,160,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    const glowTexture = new THREE.CanvasTexture(glowCanvas);
    textures.push(glowTexture);
    const glows: Record<string, THREE.Sprite> = {};
    for (const name of ["Alpha", "Twilight", "Beacon"]) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: fieldNotes[name].color,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      scene.add(sprite);
      glows[name] = sprite;
    }

    let yaw = 0,
      pitch = 0.2,
      dragging = false,
      lastX = 0,
      lastY = 0,
      moved = 0;
    let lastFocus = -1,
      lastMode = "",
      lastSelected = "",
      lastAspect = 0;
    const pointerDown = (e: PointerEvent) => {
      if (latest.current.mode !== "sky") return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      moved = 0;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const pointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX,
        dy = e.clientY - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      yaw -= dx * 0.003;
      pitch = THREE.MathUtils.clamp(pitch + dy * 0.003, -0.25, 1.45);
      lastX = e.clientX;
      lastY = e.clientY;
      invalidated = true;
    };
    const pointerUp = (e: PointerEvent) => {
      dragging = false;
      if (moved > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects(
        Object.values(meshes).filter((m) => m.visible),
        false,
      )[0];
      if (hit) latest.current.onSelect(hit.object.name);
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    renderer.domElement.addEventListener("pointercancel", () => {
      dragging = false;
    });
    const keyLook = (e: KeyboardEvent) => {
      if (
        latest.current.mode !== "sky" ||
        !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      )
        return;
      e.preventDefault();
      yaw += e.key === "ArrowLeft" ? -0.07 : e.key === "ArrowRight" ? 0.07 : 0;
      pitch = THREE.MathUtils.clamp(
        pitch +
          (e.key === "ArrowUp" ? 0.05 : e.key === "ArrowDown" ? -0.05 : 0),
        -0.25,
        1.45,
      );
      invalidated = true;
    };
    renderer.domElement.addEventListener("keydown", keyLook);
    const resize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      invalidated = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();
    const projected = new THREE.Vector3();
    let animation = 0,
      frames = 0,
      metricStart = performance.now(),
      lastDraw = 0,
      lastSignature = "";
    function render(now: number) {
      animation = requestAnimationFrame(render);
      if (document.hidden || now - lastDraw < 15) return;
      const p = latest.current;
      if (p.mode === "orbit") controls.update();
      const signature = [
        p.clock.current,
        p.mode,
        p.selected,
        p.focusKey,
        p.weave,
        p.latitude,
        p.longitude,
        p.labels,
        p.fov,
      ].join("|");
      if (signature === lastSignature && !invalidated) return;
      if (now - lastDraw > 250) {
        metricStart = now;
        frames = 0;
      }
      invalidated = false;
      lastSignature = signature;
      lastDraw = now;
      const state = observe(p.clock.current, p.latitude, p.longitude, p.weave);
      const isSky = p.mode === "sky";
      const changedMode = lastMode !== p.mode;
      controls.enabled = !isSky;
      if (changedMode || (!isSky && lastAspect !== camera.aspect)) {
        if (!isSky) {
          camera.position
            .set(580, 820, 1080)
            .normalize()
            .multiplyScalar(
              Math.max(2300, 1100 / (Math.tan(rad(p.fov / 2)) * camera.aspect)),
            );
          controls.target.set(0, 0, 0);
        } else camera.position.set(0, 0, 0);
        lastMode = p.mode;
      }
      if (isSky) {
        if (
          changedMode ||
          lastFocus !== p.focusKey ||
          lastSelected !== p.selected ||
          lastAspect !== camera.aspect
        ) {
          const target =
            state.sky.find((b) => b.name === p.selected) ??
            state.sky.find((b) => b.name === "Aetheris")!;
          yaw =
            Math.atan2(target.local.x, -target.local.z) -
            (camera.aspect < 0.8 ? 0.035 : 0.15);
          pitch = Math.max(0.06, Math.asin(target.local.y)) - 0.065;
          pitch = THREE.MathUtils.clamp(pitch, -0.15, 1.3);
        }
        camera.position.set(0, 0, 0);
        camera.up.set(0, 1, 0);
        camera.lookAt(
          Math.sin(yaw) * Math.cos(pitch),
          Math.sin(pitch),
          -Math.cos(yaw) * Math.cos(pitch),
        );
        camera.fov = p.fov;
      } else {
        camera.fov = p.fov;
        controls.update();
      }
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      lastFocus = p.focusKey;
      lastSelected = p.selected;
      lastAspect = camera.aspect;
      ground.visible = isSky;
      orbits.visible = !isSky;
      skyMaterial.uniforms.daylight.value = THREE.MathUtils.clamp(
        (state.solarAltitude + 18) / 30,
        0,
        1,
      );
      skyMaterial.uniforms.orbital.value = isSky ? 0 : 1;
      starMaterial.opacity = isSky
        ? THREE.MathUtils.clamp((-state.solarAltitude + 2) / 15, 0.025, 1)
        : 0.65;
      if (isSky) {
        const m = new THREE.Matrix4().set(
          state.frame.east.x,
          state.frame.east.y,
          state.frame.east.z,
          0,
          state.frame.up.x,
          state.frame.up.y,
          state.frame.up.z,
          0,
          state.frame.north.x,
          state.frame.north.y,
          state.frame.north.z,
          0,
          0,
          0,
          0,
          1,
        );
        starfield.quaternion.setFromRotationMatrix(m);
      } else starfield.quaternion.identity();
      for (const body of knownBodies) {
        const mesh = meshes[body.name],
          skyBody = state.sky.find((b) => b.name === body.name);
        mesh.visible =
          !isSky ||
          (!!skyBody && skyBody.altitude + skyBody.apparentDiameter / 2 > 0);
        if (!isSky && body.name === "Beacon") mesh.visible = false; // Off-chart at 100 AU; indicated explicitly in the UI.
        if (isSky && skyBody) {
          // Equal projection shell, angular radii from the observer model.
          // Distance ordering is retained so an apparent overlap occludes correctly.
          const shell = 6500 + Math.min(skyBody.distanceAU, 100) * 10;
          mesh.position.copy(skyBody.local).multiplyScalar(shell);
          mesh.scale.setScalar(
            Math.tan(rad(skyBody.apparentDiameter / 2)) * shell,
          );
        } else {
          mesh.position.copy(state.positions[body.name]);
          mesh.scale.setScalar(
            body.type === "Star" ? 5 : body.name === "Aetheris" ? 14 : 6,
          );
        }
        mesh.rotation.y =
          (p.clock.current / (body.rotationPeriodHours || 600)) * Math.PI * 2;
        mesh.rotation.z = rad(parseFloat(body.axialTilt || "0"));
        const material = mesh.material as THREE.ShaderMaterial;
        const illumination = (name: string) =>
          isSky
            ? state
                .local(
                  state.positions[name]
                    .clone()
                    .sub(state.positions[body.name])
                    .normalize(),
                )
                .multiplyScalar(100000)
                .add(mesh.position)
            : state.positions[name];
        material.uniforms.sunA.value.copy(illumination("Alpha"));
        material.uniforms.sunB.value.copy(illumination("Twilight"));
        material.uniforms.cycle.value =
          body.name === "Viridis"
            ? 0.5 + 0.5 * Math.cos((p.clock.current / (27 * 24)) * Math.PI * 2)
            : 0;
        if (glows[body.name]) {
          const g = glows[body.name];
          g.position.copy(mesh.position);
          g.visible = mesh.visible;
          const s = isSky ? (body.name === "Beacon" ? 55 : 200) : 38;
          g.scale.set(s, s, 1);
        }
        const label = labelRefs.current[body.name];
        if (label) {
          projected.copy(mesh.position).project(camera);
          const visible =
            p.labels &&
            mesh.visible &&
            projected.z > -1 &&
            projected.z < 1 &&
            Math.abs(projected.x) < 0.94 &&
            Math.abs(projected.y) < 0.87;
          label.style.display = visible ? "flex" : "none";
          if (visible) {
            label.style.left = `${(projected.x * 0.5 + 0.5) * 100}%`;
            label.style.top = `${(-projected.y * 0.5 + 0.5) * 100}%`;
            label.style.transform =
              !isSky && body.name === "Alpha"
                ? "translate(12px,-25px)"
                : !isSky && body.name === "Twilight"
                  ? "translate(-65px,15px)"
                  : "translate(20px,18px)";
          }
        }
      }
      const line = orbitGuide.getAttribute("position");
      line.setXYZ(
        0,
        ...(state.positions.Sebaka.toArray() as [number, number, number]),
      );
      line.setXYZ(
        1,
        ...(state.positions[p.selected].toArray() as [number, number, number]),
      );
      line.needsUpdate = true;
      sightline.computeLineDistances();
      sightline.visible = p.selected !== "Beacon" && p.selected !== "Sebaka";
      renderer.render(scene, camera);
      renderer.domElement.dataset.renderCount = String(
        Number(renderer.domElement.dataset.renderCount || 0) + 1,
      );
      frames++;
      if (now - metricStart > 2000) {
        latest.current.onPerformance(
          Math.round((frames * 1000) / (now - metricStart)),
        );
        frames = 0;
        metricStart = now;
      }
    }
    animation = requestAnimationFrame(render);
    latest.current.onReady();
    return () => {
      disposed = true;
      cancelAnimationFrame(animation);
      observer.disconnect();
      controls.dispose();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("pointerup", pointerUp);
      renderer.domElement.removeEventListener("keydown", keyLook);
      const geometries = new Set<THREE.BufferGeometry>(),
        mats = new Set<THREE.Material>();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) geometries.add(mesh.geometry);
        if (mesh.material)
          (Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material]
          ).forEach((m) => mats.add(m));
      });
      geometries.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div ref={host} className="sky-canvas">
      {error && (
        <div className="scene-error">
          <h2>The sky needs WebGL</h2>
          <p>
            Your browser could not start the 3D view. Try enabling hardware
            acceleration, then reload. The calendar and observing data remain
            available.
          </p>
        </div>
      )}
      {knownBodies.map((body) => (
        <button
          key={body.name}
          ref={(el) => {
            labelRefs.current[body.name] = el;
          }}
          className={`body-label ${props.selected === body.name ? "selected" : ""}`}
          onClick={() => props.onSelect(body.name)}
          style={{ display: "none" }}
        >
          <span />
          {body.name}
        </button>
      ))}
    </div>
  );
}
