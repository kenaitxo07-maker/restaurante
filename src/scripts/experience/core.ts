/**
 * Núcleo de la experiencia 3D de Áurea, sin dependencias del DOM.
 * Se ejecuta en un Web Worker con OffscreenCanvas (la compilación de shaders y
 * el dibujo no bloquean el scroll) o, si el navegador no lo permite, en la
 * propia página. La cámara sigue un guion anclado al scroll y la escena
 * reacciona al cursor y a la velocidad del desplazamiento.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import menus from '../../data/menus.json';
import { clamp, range, smooth } from '../math';
import { MENU_IN, MENU_OUT } from './constants';
import {
  createAstrolabe, createDust, createMaterials, createOrbit, createPair, createTable,
  FINAL_POS, ORBIT_POS, TABLE_POS, type Quality,
} from './stations';
import { HOME, ORBIT, RINGS, TABLE, type Anchor, type Pose, type V3 } from './scenes';

export type SceneName = 'home' | 'table' | 'orbit' | 'rings';

/** Progreso de una sección [data-shot], copiado desde la página en cada fotograma. */
export interface ShotSnap {
  id: string;
  top: number;
  height: number;
  pinned: boolean;
  center: number;
  pin: number;
}

export interface FrameInput {
  y: number;
  vh: number;
  max: number;
  velocity: number;
  page: number;
  shots: ShotSnap[];
  /** Cursor normalizado (-1…1) o null si no hay ratón. */
  pointer: [number, number] | null;
  /** Una sección opaca tapa todo el lienzo: no hace falta dibujar. */
  covered: boolean;
}

export interface WorldOptions {
  scene: SceneName;
  mobile: boolean;
  snap: boolean;
  dev: boolean;
  width: number;
  height: number;
  dpr: number;
  onReady(): void;
  onLost(): void;
}

export interface World {
  frame(input: FrameInput, time: number, dt: number): void;
  resize(width: number, height: number, dpr: number): void;
}

const SCRIPTS: Record<SceneName, Anchor[]> = { home: HOME, table: TABLE, orbit: ORBIT, rings: RINGS };

interface Station {
  root: THREE.Object3D;
  center: THREE.Vector3;
  radius: number;
  /** Mallas, sprites y puntos: lo único que se oculta al alejarse (las luces no). */
  items: THREE.Object3D[];
  /** Shaders compilados y texturas en la GPU: ya se puede mostrar sin tirones. */
  ready: boolean;
  shown: boolean;
}

/** Capa de la cámara para lo visible; la 1 guarda lo que está lejos. */
const SHOWN = 0;
const HIDDEN = 1;

const idle = (cb: () => void) =>
  typeof requestIdleCallback === 'function' ? requestIdleCallback(cb, { timeout: 800 }) : setTimeout(cb, 30);

export function createWorld(canvas: HTMLCanvasElement | OffscreenCanvas, opts: WorldOptions): World {
  const { mobile, snap } = opts;
  const q: Quality = { mobile, transmission: false, dust: mobile ? 700 : 1800 };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance', alpha: false });
  let dpr = opts.dpr;
  let pixelRatio = Math.min(dpr || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  // Comprobar errores de shader obliga al navegador a esperar a cada compilación
  // (getShaderInfoLog / getProgramInfoLog): era la tarea larga de varios segundos.
  renderer.debug.checkShaderErrors = opts.dev;
  renderer.setClearColor(0x14110f, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x14110f, 0.068);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environmentIntensity = 0.42;
  scene.add(new THREE.HemisphereLight(0x5a4632, 0x0a0806, 0.6));

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
  const mat = createMaterials(q);
  const stations: Station[] = [];
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();

  /* ---------- Escena según la página ---------- */

  const sceneName = opts.scene;
  const isHome = sceneName === 'home';
  const astrolabe = isHome || sceneName === 'rings' ? createAstrolabe(mat) : null;
  const table = isHome || sceneName === 'table' ? createTable(mat) : null;
  const orbit = isHome || sceneName === 'orbit' ? createOrbit(mat, menus.tasting.courses.map((c) => c.dish)) : null;
  const pair = isHome ? createPair(mat) : null;

  const addStation = (root: THREE.Object3D, center: THREE.Vector3, radius: number) => {
    root.position.copy(center);
    scene.add(root);
    const items: THREE.Object3D[] = [];
    root.traverse((o) => {
      const d = o as THREE.Mesh & { isSprite?: boolean; isPoints?: boolean };
      if (d.isMesh || d.isSprite || d.isPoints) {
        o.layers.set(HIDDEN);
        items.push(o);
      }
    });
    stations.push({ root, center: center.clone(), radius, items, ready: false, shown: false });
  };
  if (astrolabe) addStation(astrolabe.root, new THREE.Vector3(), 4);
  if (table) addStation(table.root, TABLE_POS, 5);
  if (orbit) addStation(orbit.root, ORBIT_POS, 6);
  if (pair) addStation(pair.root, FINAL_POS, 4);

  /*
   * Ocultar una estación cambiando su capa (y no `visible`) mantiene sus luces
   * en la escena. Así el número de luces no cambia nunca y Three.js no tiene que
   * recompilar todos los shaders cuando aparece la mesa o el reloj de pases.
   */
  const show = (st: Station, on: boolean) => {
    if (st.shown === on) return;
    st.shown = on;
    for (const o of st.items) o.layers.set(on ? SHOWN : HIDDEN);
  };

  const dustZ = isHome ? { z0: 10, z1: -72 } : sceneName === 'table' ? { z0: -6, z1: -26 } : sceneName === 'orbit' ? { z0: -30, z1: -50 } : { z0: 10, z1: -14 };
  const dust = createDust(isHome ? q.dust : Math.round(q.dust * 0.5), dustZ);
  scene.add(dust.root);

  /* ---------- Guion de cámara ---------- */

  const anchors = SCRIPTS[sceneName];
  const tmpB = new THREE.Vector3();
  const tmpShift = new THREE.Vector2();
  const goal = { pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: new THREE.Vector2() };
  const cur = { pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: new THREE.Vector2() };
  const shots = new Map<string, ShotSnap>();

  const poseOf = (a: Anchor): Required<Pose> => {
    const m = mobile ? a.mobile ?? {} : {};
    return { pos: m.pos ?? a.pose.pos, look: m.look ?? a.pose.look, shift: m.shift ?? (mobile ? [0, 0] : a.pose.shift ?? [0, 0]) };
  };

  function resolveGoal(s: FrameInput) {
    const pts: { y: number; pose: Required<Pose> }[] = [];
    for (const a of anchors) {
      const shot = shots.get(a.shot);
      if (!shot) continue;
      const y = shot.pinned ? shot.top + a.p * (shot.height - s.vh) : shot.top + a.p * shot.height - s.vh / 2;
      pts.push({ y: clamp(y, 0, s.max), pose: poseOf(a) });
    }
    if (!pts.length) return;
    pts.sort((a, b) => a.y - b.y);
    let i = 0;
    while (i < pts.length - 1 && s.y >= pts[i + 1].y) i++;
    const A = pts[i];
    const B = pts[Math.min(i + 1, pts.length - 1)];
    const t = A === B || B.y === A.y ? (s.y >= A.y ? 1 : 0) : smooth(clamp((s.y - A.y) / (B.y - A.y)));
    const set = (out: THREE.Vector3, a: V3, b: V3) => out.set(a[0], a[1], a[2]).lerp(tmpB.set(b[0], b[1], b[2]), t);
    set(goal.pos, A.pose.pos, B.pose.pos);
    set(goal.look, A.pose.look, B.pose.look);
    goal.shift.set(A.pose.shift[0], A.pose.shift[1]).lerp(tmpShift.set(B.pose.shift[0], B.pose.shift[1]), t);
  }

  /* ---------- Tamaño y encuadre ---------- */

  let w = opts.width;
  let h = opts.height;
  function resize(width = w, height = h, ratio = dpr) {
    w = width;
    h = height;
    if (ratio !== dpr) {
      dpr = ratio;
      pixelRatio = Math.min(dpr || 1, mobile ? 1.5 : 1.75);
      renderer.setPixelRatio(pixelRatio);
    }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 52 : 34;
    camera.updateProjectionMatrix();
  }
  resize();

  /* ---------- Precarga: shaders y texturas antes de mostrar nada ---------- */

  let warmed = false;
  let started = false;
  const uploaded = new Set<THREE.Texture>();
  const uploadTextures = (root: THREE.Object3D) =>
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material & { map?: THREE.Texture | null };
      if (m && !Array.isArray(m) && m.map && !uploaded.has(m.map)) {
        uploaded.add(m.map);
        renderer.initTexture(m.map);
      }
    });
  const nextIdle = () => new Promise<void>((r) => idle(r));
  const linked = new Set<unknown>();
  type ProgramLike = { getUniforms(): unknown; getAttributes(): unknown };

  // Compila un subárbol fuera de la escena para no contar dos veces sus luces.
  // Con KHR_parallel_shader_compile el enlace sucede sin bloquear; sin ella, el
  // navegador termina de enlazar cada programa la primera vez que se consulta:
  // lo hacemos aquí, de uno en uno, antes de que el subárbol se vea.
  const parallel = renderer.extensions.has('KHR_parallel_shader_compile');
  async function warm(root: THREE.Object3D) {
    const parent = root.parent;
    parent?.remove(root);
    const done = parallel ? renderer.compileAsync(root, camera, scene) : Promise.resolve(renderer.compile(root, camera, scene));
    parent?.add(root);
    await done;
    const materials = new Set<THREE.Material>();
    root.traverse((o) => {
      const m = (o as THREE.Mesh).material;
      if (m && !Array.isArray(m)) materials.add(m);
    });
    for (const m of materials) {
      const program = (renderer.properties.get(m) as { currentProgram?: ProgramLike }).currentProgram;
      if (!program || linked.has(program)) continue;
      linked.add(program);
      await nextIdle();
      program.getUniforms();
      program.getAttributes();
    }
    uploadTextures(root);
  }

  // Primero lo que se ve al llegar; el resto, por orden de cercanía.
  function startWarmup() {
    started = true;
    const order = [...stations].sort((a, b) => a.center.distanceTo(cur.pos) - b.center.distanceTo(cur.pos));
    (async () => {
      await warm(dust.root);
      for (const st of order) {
        await warm(st.root);
        st.ready = true;
        warmed = true;
        await nextIdle();
      }
    })().catch((err) => console.warn('[Áurea] Precarga 3D:', err));
  }

  /* ---------- Pérdida de contexto ---------- */

  let running = true;
  const target = canvas as EventTarget;
  target.addEventListener?.('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    opts.onLost();
  });
  target.addEventListener?.('webglcontextrestored', () => (running = true));

  /* ---------- Fotograma ---------- */

  let spin = 0;
  let frames = 0;
  let slowFrames = 0;
  let firstFrame = true;
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();

  function frame(s: FrameInput, time: number, dt: number) {
    shots.clear();
    for (const shot of s.shots) if (!shots.has(shot.id)) shots.set(shot.id, shot);
    const get = (id: string) => shots.get(id);

    if (!started) {
      resolveGoal(s);
      cur.pos.copy(goal.pos);
      cur.look.copy(goal.look);
      cur.shift.copy(goal.shift);
      startWarmup();
    }
    if (!running || !warmed || s.covered) return;

    // Cursor (en táctil, una deriva lenta para que la escena respire)
    if (s.pointer) pointerTarget.set(s.pointer[0], s.pointer[1]);
    else pointerTarget.set(Math.sin(time * 0.3) * 0.35, Math.cos(time * 0.23) * 0.2);
    pointer.lerp(pointerTarget, snap ? 1 : 1 - Math.exp(-dt * 3));
    const ease = snap ? 1 : 1 - Math.exp(-dt * 5);

    // Cámara
    resolveGoal(s);
    const k = snap ? 1 : 1 - Math.exp(-dt * 3.2);
    cur.pos.lerp(goal.pos, k);
    cur.look.lerp(goal.look, k);
    cur.shift.lerp(goal.shift, k);
    camera.position.copy(cur.pos);
    camera.lookAt(cur.look);
    camera.updateMatrixWorld();
    right.setFromMatrixColumn(camera.matrixWorld, 0);
    up.setFromMatrixColumn(camera.matrixWorld, 1);
    camera.position.addScaledVector(right, pointer.x * 0.22).addScaledVector(up, pointer.y * 0.14);
    camera.lookAt(cur.look);
    camera.setViewOffset(w, h, -cur.shift.x * w, -cur.shift.y * h, w, h);

    // Solo se dibuja lo que está cerca de la cámara y ya está precargado
    for (const st of stations) show(st, st.ready && st.center.distanceTo(camera.position) < st.radius + 16);

    // Estado de cada estación según el relato
    spin += s.velocity * dt * 0.05;
    if (astrolabe) {
      const expand = isHome ? range(get('promesa')?.pin ?? 0, 0.55, 0.9) : s.page * 0.25;
      astrolabe.update(time, spin, pointer, expand, camera.position.length(), ease);
    }
    if (table) {
      let wine = 0;
      let dim = 0;
      if (isHome) {
        const p = get('pilares')?.pin ?? 0;
        wine = smooth(range(p, 0.68, 0.94)) * 0.92;
        dim = Math.sin(range(p, 0.34, 0.7) * Math.PI);
      } else {
        const sv = get('servicio')?.center ?? 0;
        const sala = get('sala')?.center ?? 0;
        wine = smooth(range(sv, 0.15, 0.75)) * 0.92;
        dim = Math.sin(sala * Math.PI);
      }
      table.update(time, pointer, { wine, dim, sway: s.velocity }, ease);
    }
    if (orbit) {
      if (isHome) orbit.update(time, range(get('menu')?.pin ?? 0, MENU_IN, MENU_OUT) * menus.tasting.courses.length, pointer, ease);
      else orbit.update(time, -1, pointer, ease);
    }
    if (pair) pair.update(time, pointer, get('final')?.center ?? 0, ease);
    dust.update(time, s.velocity, pixelRatio);

    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      opts.onReady();
    }

    // Calidad adaptativa: si el equipo sufre, bajamos la resolución
    frames++;
    if (frames > 30 && frames < 240) {
      slowFrames = dt > 0.028 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames > 40 && pixelRatio > 1) {
        pixelRatio = Math.max(1, pixelRatio - 0.35);
        renderer.setPixelRatio(pixelRatio);
        resize();
        slowFrames = 0;
      }
    }
  }

  return { frame, resize: (width, height, ratio) => resize(width, height, ratio) };
}
