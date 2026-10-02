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
  rotationHours,
  type RotationState,
} from "@/lib/observatory";
import { calculateBodyPositions } from "@/components/CelestialSymphony/utils/calculateBodyPositions";
import {
  surfaceVertex,
  surfaceFragment,
  ringVertex,
  ringFragment,
  starPointVertex,
  starPointFragment,
} from "./appearance";
import type { CameraCommand, OrbitTarget } from "./NavigationDock";

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
  rotation: RotationState;
  orbitTarget: OrbitTarget;
  tracking: boolean;
  orbitStyle: "iridescent" | "plain" | "hidden";
  rings: boolean;
  volcanism: boolean;
  landscape: boolean;
  authorAtlas: boolean;
  reducedMotion: boolean;
  command: CameraCommand;
  onMove: (north: number, east: number) => void;
  onZoom: (delta: number) => void;
  onSelect: (name: string) => void;
  onReady: () => void;
  onPerformance: (fps: number) => void;
}

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
    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minDistance = 10;
    controls.maxDistance = 45000;
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
      starColors: number[] = [],
      starMagnitudes: number[] = [];
    for (let i = 0; i < 6500; i++) {
      const y = random() * 2 - 1,
        a = random() * Math.PI * 2,
        r = Math.sqrt(1 - y * y);
      starPositions.push(
        r * Math.cos(a) * 12000,
        y * 12000,
        r * Math.sin(a) * 12000,
      );
      const magnitude = Math.pow(random(), 5);
      const b = 0.3 + magnitude * 0.7;
      const color = new THREE.Color().setHSL(
        random() < 0.3 ? 0.6 : 0.09,
        0.08 + random() * 0.22,
        0.7,
      );
      starColors.push(color.r * b, color.g * b, color.b * b);
      starMagnitudes.push(magnitude);
    }
    stars.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPositions, 3),
    );
    stars.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(starColors, 3),
    );
    stars.setAttribute(
      "magnitude",
      new THREE.Float32BufferAttribute(starMagnitudes, 1),
    );
    const starMaterial = new THREE.ShaderMaterial({
      vertexShader: starPointVertex,
      fragmentShader: starPointFragment,
      uniforms: {
        visibility: { value: 1 },
        pixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
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
    const outerOrbits = new THREE.Group();
    orbits.add(outerOrbits);
    const orbitLines: THREE.Line[] = [];
    for (const body of bodies.filter((b) => b.type === "Planet")) {
      const points: THREE.Vector3[] = [];
      const outer = ["Gelidis", "Liminis"].includes(body.name);
      for (let i = 0; i <= 180; i++) {
        const at = calculateBodyPositions(
          (i / 180) * body.orbitPeriodDays * 24,
          bodies,
        );
        points.push(
          outer ? at[body.name].clone().sub(at.Beacon) : at[body.name],
        );
      }
      const g = new THREE.BufferGeometry().setFromPoints(points);
      const colors = points.flatMap((_, i) =>
        new THREE.Color().setHSL(0.48 + (0.28 * i) / 180, 0.35, 0.47).toArray(),
      );
      g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      const orbitLine = new THREE.Line(
        g,
        new THREE.LineBasicMaterial({
          color: "#ffffff",
          vertexColors: true,
          transparent: true,
          opacity: body.name === "Sebaka" ? 0.7 : 0.36,
        }),
      );
      (outer ? outerOrbits : orbits).add(orbitLine);
      orbitLines.push(orbitLine);
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
    const pendingTextures = new Map<string, () => void>();
    for (const body of bodies) {
      const material = new THREE.ShaderMaterial({
        vertexShader: surfaceVertex,
        fragmentShader: surfaceFragment,
        uniforms: {
          surface: { value: null },
          hasTexture: { value: 0 },
          tint: { value: new THREE.Color(fieldNotes[body.name].color) },
          sunA: { value: new THREE.Vector3() },
          sunB: { value: new THREE.Vector3() },
          star: { value: body.type === "Star" ? 1 : 0 },
          cycle: { value: 0 },
          time: { value: 0 },
          volcanic: { value: body.name === "Viridis" ? 1 : 0 },
        },
      });
      materials.push(material);
      if (body.type === "Planet") {
        const hidden = ["Gelidis", "Liminis"].includes(body.name);
        const load = () =>
          loader.load(
            hidden
              ? `/maps/${body.name}Texture.png`
              : `/observatory/${body.name}.webp`,
            (texture) => {
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
            },
          );
        if (hidden) pendingTextures.set(body.name, load);
        else load();
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
          vertexShader: ringVertex,
          fragmentShader: ringFragment,
          uniforms: { iridescent: { value: 1 } },
        });
        ring = new THREE.Mesh(
          new THREE.RingGeometry(1.35, 3, 192, 1),
          ringMaterial,
        );
        ring.rotation.x = Math.PI / 2;
        mesh.add(ring);
      }
    }
    // Soft stellar glare. Its extent is a rendering cue, not the measured disc.
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 256;
    const ctx = glowCanvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, "rgba(255,255,255,.40)");
    gradient.addColorStop(0.27, "rgba(255,255,255,.38)");
    gradient.addColorStop(0.34, "rgba(255,255,255,.32)");
    gradient.addColorStop(0.4, "rgba(255,255,255,.10)");
    gradient.addColorStop(0.6, "rgba(255,255,255,.025)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    // Fine, curved coronal streamers share one cached sprite, not CPU-deformed
    // geometry. Seeded variation keeps renders deterministic and cheap.
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = "blur(1px)";
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * Math.PI * 2,
        extent = 53 + random() * 30;
      const x = 128 + Math.cos(a) * extent,
        y = 128 + Math.sin(a) * extent;
      const glow = ctx.createLinearGradient(
        128 + Math.cos(a) * 40,
        128 + Math.sin(a) * 40,
        x,
        y,
      );
      glow.addColorStop(0, "rgba(255,255,255,.12)");
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1 + random();
      ctx.beginPath();
      ctx.moveTo(128 + Math.cos(a) * 40, 128 + Math.sin(a) * 40);
      ctx.quadraticCurveTo(
        128 + Math.cos(a + 0.07) * extent * 0.75,
        128 + Math.sin(a + 0.07) * extent * 0.75,
        x,
        y,
      );
      ctx.stroke();
    }
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
      lastAspect = 0,
      lastTarget = "",
      lastCommand = 0;
    let flight: {
      start: number;
      from: THREE.Vector3;
      to: THREE.Vector3;
      fromTarget: THREE.Vector3;
      toTarget: THREE.Vector3;
    } | null = null;
    let anchor: THREE.Vector3 | null = null;
    const bodyRadius = (name: string) =>
      name === "Aetheris"
        ? 14
        : ["Alpha", "Twilight", "Beacon"].includes(name)
          ? 5
          : 6;
    const pointerDown = (e: PointerEvent) => {
      flight = null;
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
      if (latest.current.mode === "sky") {
        yaw -= dx * 0.003;
        pitch = THREE.MathUtils.clamp(pitch + dy * 0.003, -1.5, 1.5);
      }
      lastX = e.clientX;
      lastY = e.clientY;
      invalidated = true;
    };
    const pointerUp = (e: PointerEvent) => {
      dragging = false;
      if (moved > 6 || e.button !== 0) return;
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
        true,
      )[0];
      if (hit) {
        let body: THREE.Object3D | null = hit.object;
        while (body && !meshes[body.name]) body = body.parent;
        if (body) latest.current.onSelect(body.name);
      }
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("pointerup", pointerUp);
    const pointerCancel = () => {
      dragging = false;
    };
    renderer.domElement.addEventListener("pointercancel", pointerCancel);
    const wheel = (e: WheelEvent) => {
      flight = null;
      if (latest.current.mode !== "sky") return;
      e.preventDefault();
      latest.current.onZoom(Math.sign(e.deltaY) * 2);
    };
    renderer.domElement.addEventListener("wheel", wheel, { passive: false });
    const keyLook = (e: KeyboardEvent) => {
      if (
        latest.current.mode === "sky" &&
        ["w", "a", "s", "d"].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        const k = e.key.toLowerCase(),
          step = e.shiftKey ? 5 : 1;
        latest.current.onMove(
          k === "w" ? step : k === "s" ? -step : 0,
          k === "d" ? step : k === "a" ? -step : 0,
        );
        return;
      }
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
        -1.5,
        1.5,
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
        p.rotation.enabled,
        p.rotation.offset,
        p.rotation.frozenHours,
        p.orbitTarget,
        p.tracking,
        p.orbitStyle,
        p.rings,
        p.volcanism,
        p.landscape,
        p.authorAtlas,
        p.command.id,
      ].join("|");
      if (signature === lastSignature && !invalidated && !flight) return;
      if (now - lastDraw > 250) {
        metricStart = now;
        frames = 0;
      }
      invalidated = false;
      lastSignature = signature;
      lastDraw = now;
      const spinHours = rotationHours(p.clock.current, p.rotation);
      const state = observe(
        p.clock.current,
        p.latitude,
        p.longitude,
        p.weave,
        spinHours,
      );
      const isSky = p.mode === "sky";
      const changedMode = lastMode !== p.mode;
      controls.enabled = !isSky;
      const focusChanged =
        changedMode ||
        lastFocus !== p.focusKey ||
        lastSelected !== p.selected ||
        lastTarget !== p.orbitTarget;
      const target =
        p.orbitTarget === "body"
          ? state.positions[p.selected]
          : p.orbitTarget === "beacon"
            ? state.positions.Beacon
            : new THREE.Vector3();
      if (!isSky) {
        const halfFov = Math.atan(
          Math.tan(rad(p.fov / 2)) * Math.min(1, camera.aspect),
        );
        if (focusChanged || lastAspect !== camera.aspect) {
          const extent =
            p.orbitTarget === "body"
              ? bodyRadius(p.selected) * (p.selected === "Spectris" ? 3 : 1.2)
              : p.orbitTarget === "beacon"
                ? 3500
                : 1100;
          const distance = (extent / Math.sin(halfFov)) * 1.35;
          const direction =
            p.orbitTarget === "body" &&
            !["Alpha", "Twilight", "Beacon"].includes(p.selected)
              ? state.positions[
                  ["Gelidis", "Liminis"].includes(p.selected)
                    ? "Beacon"
                    : "Alpha"
                ]
                  .clone()
                  .sub(target)
                  .normalize()
                  .add(new THREE.Vector3(0.15, 0.55, 0.2))
                  .normalize()
              : new THREE.Vector3(0.65, 0.55, 1).normalize();
          const destination = target
            .clone()
            .addScaledVector(direction, distance);
          controls.minDistance =
            p.orbitTarget === "body" ? bodyRadius(p.selected) * 1.4 : 12;
          camera.near = p.orbitTarget === "body" ? 0.05 : 0.5;
          if (changedMode || p.reducedMotion) {
            camera.position.copy(destination);
            controls.target.copy(target);
            flight = null;
          } else {
            flight = {
              start: now,
              from: camera.position.clone(),
              to: destination,
              fromTarget: controls.target.clone(),
              toTarget: target.clone(),
            };
          }
          anchor = target.clone();
        } else if (p.tracking && anchor) {
          const shift = target.clone().sub(anchor);
          camera.position.add(shift);
          controls.target.add(shift);
          if (flight) {
            flight.to.add(shift);
            flight.toTarget.add(shift);
          }
          anchor.copy(target);
        } else anchor = target.clone();
        if (flight) {
          const t = Math.min(1, (now - flight.start) / 850),
            ease = t * t * (3 - 2 * t);
          camera.position.lerpVectors(flight.from, flight.to, ease);
          controls.target.lerpVectors(flight.fromTarget, flight.toTarget, ease);
          if (t === 1) flight = null;
        }
        if (lastCommand !== p.command.id) {
          flight = null;
          const offset = camera.position.clone().sub(controls.target),
            spherical = new THREE.Spherical().setFromVector3(offset);
          const action = p.command.action;
          if (action === "left" || action === "right")
            spherical.theta += action === "left" ? -0.18 : 0.18;
          if (action === "up" || action === "down")
            spherical.phi += action === "up" ? -0.13 : 0.13;
          if (action === "in" || action === "out")
            spherical.radius = THREE.MathUtils.clamp(
              spherical.radius * (action === "in" ? 0.8 : 1.25),
              controls.minDistance,
              controls.maxDistance,
            );
          spherical.makeSafe();
          camera.position
            .copy(controls.target)
            .add(new THREE.Vector3().setFromSpherical(spherical));
        }
      }
      lastMode = p.mode;
      lastCommand = p.command.id;
      lastTarget = p.orbitTarget;
      if (isSky) {
        flight = null;
        if (focusChanged || p.tracking || lastAspect !== camera.aspect) {
          const target =
            state.sky.find((b) => b.name === p.selected) ??
            state.sky.find((b) => b.name === "Aetheris")!;
          yaw =
            Math.atan2(target.local.x, -target.local.z) -
            (camera.aspect < 0.8 ? 0.035 : 0.15);
          pitch =
            Math.max(p.landscape ? 0.06 : -1.45, Math.asin(target.local.y)) -
            0.065;
          pitch = THREE.MathUtils.clamp(pitch, -1.5, 1.5);
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
      if (!isSky && camera.aspect < 0.8) {
        camera.setViewOffset(
          mount.clientWidth,
          mount.clientHeight,
          0,
          48,
          mount.clientWidth,
          mount.clientHeight,
        );
      } else camera.clearViewOffset();
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      lastFocus = p.focusKey;
      lastSelected = p.selected;
      lastAspect = camera.aspect;
      ground.visible = isSky && p.landscape;
      orbits.visible = !isSky && p.orbitStyle !== "hidden";
      outerOrbits.visible = p.authorAtlas;
      outerOrbits.position.copy(state.positions.Beacon);
      for (const line of orbitLines) {
        const m = line.material as THREE.LineBasicMaterial;
        const colored = p.orbitStyle === "iridescent";
        if (m.vertexColors !== colored) {
          m.vertexColors = colored;
          m.needsUpdate = true;
        }
        m.color.set(colored ? "#ffffff" : "#647d8a");
      }
      if (ring) ring.visible = p.rings;
      if (p.authorAtlas && !isSky) {
        pendingTextures.forEach((load) => load());
        pendingTextures.clear();
      }
      skyMaterial.uniforms.daylight.value = THREE.MathUtils.clamp(
        (state.solarAltitude + 18) / 30,
        0,
        1,
      );
      skyMaterial.uniforms.orbital.value = isSky ? 0 : 1;
      starMaterial.uniforms.visibility.value = isSky
        ? THREE.MathUtils.clamp((-state.solarAltitude + 2) / 15, 0.025, 1)
        : 0.9;
      // Keep the illustrative background infinitely distant when flying to Beacon.
      backdrop.position.copy(camera.position);
      starfield.position.copy(camera.position);
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
      for (const body of bodies) {
        const mesh = meshes[body.name],
          skyBody = state.sky.find((b) => b.name === body.name);
        mesh.visible =
          !isSky ||
          (!!skyBody && skyBody.altitude + skyBody.apparentDiameter / 2 > 0);
        if (!isSky && ["Gelidis", "Liminis"].includes(body.name))
          mesh.visible = p.authorAtlas;
        if (isSky && !p.landscape && skyBody) mesh.visible = true;
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
          mesh.scale.setScalar(bodyRadius(body.name));
        }
        mesh.rotation.y =
          ((body.name === "Sebaka" ? spinHours : p.clock.current) /
            (body.rotationPeriodHours || 600)) *
          Math.PI *
          2;
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
            : state.positions[
                ["Gelidis", "Liminis"].includes(body.name) ? "Beacon" : name
              ];
        material.uniforms.sunA.value.copy(illumination("Alpha"));
        material.uniforms.sunB.value.copy(illumination("Twilight"));
        material.uniforms.time.value =
          p.volcanism || body.name !== "Viridis" ? p.clock.current : 0;
        material.uniforms.volcanic.value =
          body.name === "Viridis" && p.volcanism ? 1 : 0;
        material.uniforms.cycle.value =
          body.name === "Viridis"
            ? 0.5 + 0.5 * Math.cos((p.clock.current / (27 * 24)) * Math.PI * 2)
            : 0;
        if (glows[body.name]) {
          const g = glows[body.name];
          g.position.copy(mesh.position);
          g.visible = mesh.visible;
          const s = Math.max(
            mesh.scale.x * 6,
            isSky ? (body.name === "Beacon" ? 35 : 60) : 0,
          );
          g.scale.set(s, s, 1);
        }
        const label = labelRefs.current[body.name];
        if (label) {
          projected.copy(mesh.position).project(camera);
          const visible =
            p.labels &&
            mesh.visible &&
            !(!isSky && p.orbitTarget === "body" && p.selected === body.name) &&
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
      renderer.domElement.dataset.cameraTarget =
        p.orbitTarget === "body" ? p.selected : p.orbitTarget;
      renderer.domElement.dataset.cameraPosition = camera.position
        .toArray()
        .map((v) => v.toFixed(3))
        .join(",");
      renderer.domElement.dataset.cameraDistance = camera.position
        .distanceTo(controls.target)
        .toFixed(3);
      renderer.domElement.dataset.rotationHours = String(spinHours);
      renderer.domElement.dataset.simulationHours = String(p.clock.current);
      renderer.domElement.dataset.selectedVisible = String(
        meshes[p.selected].visible,
      );
      renderer.domElement.dataset.selectedRotation = String(
        meshes.Sebaka.rotation.y,
      );
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
      renderer.domElement.removeEventListener("pointercancel", pointerCancel);
      renderer.domElement.removeEventListener("wheel", wheel);
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
      {(props.authorAtlas && props.mode === "orbit" ? bodies : knownBodies).map(
        (body) => (
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
        ),
      )}
    </div>
  );
}
