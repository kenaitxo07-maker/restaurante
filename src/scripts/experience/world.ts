/**
 * Experiencia 3D de Áurea.
 * Un único lienzo WebGL fijo detrás del contenido. La cámara sigue un guion
 * anclado al scroll y la escena reacciona al cursor y a la velocidad del
 * desplazamiento. Se carga después del contenido para no frenar la página.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import menus from '../../data/menus.json';
import { onFrame, state, type ScrollState } from '../scroll';
import { clamp, range, smooth } from '../env';
import { MENU_IN, MENU_OUT } from '../home';
import {
  createAstrolabe, createDust, createMaterials, createOrbit, createPair, createTable,
  FINAL_POS, ORBIT_POS, TABLE_POS, type Quality,
} from './stations';
import { HOME, ORBIT, RINGS, TABLE, type Anchor, type Pose, type V3 } from './scenes';

export type SceneName = 'home' | 'table' | 'orbit' | 'rings';

const SCRIPTS: Record<SceneName, Anchor[]> = { home: HOME, table: TABLE, orbit: ORBIT, rings: RINGS };

interface Station {
  root: THREE.Object3D;
  center: THREE.Vector3;
  radius: number;
}

export function start(container: HTMLElement, sceneName: SceneName): boolean {
  const mobile = window.matchMedia('(max-width: 760px)').matches || window.matchMedia('(pointer: coarse)').matches;
  const q: Quality = { mobile, transmission: false, dust: mobile ? 700 : 1800 };

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: !mobile, powerPreference: 'high-performance', alpha: false });
  } catch {
    return false;
  }
  let pixelRatio = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x14110f, 1);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x14110f, 0.068);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  scene.add(new THREE.HemisphereLight(0x5a4632, 0x0a0806, 0.6));

  const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 80);
  const mat = createMaterials(q);
  const stations: Station[] = [];
  const pointer = new THREE.Vector2();
  const pointerTarget = new THREE.Vector2();
  let hasPointer = false;

  /* ---------- Escena según la página ---------- */

  const isHome = sceneName === 'home';
  const astrolabe = isHome || sceneName === 'rings' ? createAstrolabe(mat) : null;
  const table = isHome || sceneName === 'table' ? createTable(mat) : null;
  const orbit = isHome || sceneName === 'orbit' ? createOrbit(mat, menus.tasting.courses.map((c) => c.dish)) : null;
  const pair = isHome ? createPair(mat) : null;

  if (astrolabe) {
    scene.add(astrolabe.root);
    stations.push({ root: astrolabe.root, center: new THREE.Vector3(), radius: 4 });
  }
  if (table) {
    table.root.position.copy(TABLE_POS);
    scene.add(table.root);
    stations.push({ root: table.root, center: TABLE_POS.clone(), radius: 5 });
  }
  if (orbit) {
    orbit.root.position.copy(ORBIT_POS);
    scene.add(orbit.root);
    stations.push({ root: orbit.root, center: ORBIT_POS.clone(), radius: 6 });
  }
  if (pair) {
    pair.root.position.copy(FINAL_POS);
    scene.add(pair.root);
    stations.push({ root: pair.root, center: FINAL_POS.clone(), radius: 4 });
  }

  const dustZ = isHome ? { z0: 10, z1: -72 } : sceneName === 'table' ? { z0: -6, z1: -26 } : sceneName === 'orbit' ? { z0: -30, z1: -50 } : { z0: 10, z1: -14 };
  const dust = createDust(isHome ? q.dust : Math.round(q.dust * 0.5), dustZ);
  scene.add(dust.root);

  /* ---------- Guion de cámara ---------- */

  const anchors = SCRIPTS[sceneName];
  const tmpB = new THREE.Vector3();
  const goal = { pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: new THREE.Vector2() };
  const cur = { pos: new THREE.Vector3(), look: new THREE.Vector3(), shift: new THREE.Vector2() };

  const poseOf = (a: Anchor): Required<Pose> => {
    const m = mobile ? a.mobile ?? {} : {};
    return { pos: m.pos ?? a.pose.pos, look: m.look ?? a.pose.look, shift: m.shift ?? (mobile ? [0, 0] : a.pose.shift ?? [0, 0]) };
  };

  function resolveGoal(s: ScrollState) {
    const pts: { y: number; pose: Required<Pose> }[] = [];
    for (const a of anchors) {
      const shot = s.get(a.shot);
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
    goal.shift.set(A.pose.shift[0], A.pose.shift[1]).lerp(new THREE.Vector2(B.pose.shift[0], B.pose.shift[1]), t);
  }

  /* ---------- Tamaño y encuadre ---------- */

  let w = 0;
  let h = 0;
  function resize() {
    w = container.clientWidth;
    h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.8 ? 52 : 34;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      hasPointer = true;
      pointerTarget.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    },
    { passive: true },
  );

  /* ---------- Bucle ---------- */

  resolveGoal(state);
  cur.pos.copy(goal.pos);
  cur.look.copy(goal.look);
  cur.shift.copy(goal.shift);

  const snap = /[?&]snap\b/.test(location.search);
  let spin = 0;
  let running = true;
  let frames = 0;
  let slowFrames = 0;
  let firstFrame = true;
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();

  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    container.classList.remove('is-ready');
  });
  renderer.domElement.addEventListener('webglcontextrestored', () => (running = true));

  onFrame((s, time, dt) => {
    if (!running) return;

    // Cursor (en táctil, una deriva lenta para que la escena respire)
    if (!hasPointer) pointerTarget.set(Math.sin(time * 0.3) * 0.35, Math.cos(time * 0.23) * 0.2);
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

    // Solo se dibuja lo que está cerca de la cámara
    for (const st of stations) st.root.visible = st.center.distanceTo(camera.position) < st.radius + 16;

    // Estado de cada estación según el relato
    spin += s.velocity * dt * 0.05;
    if (astrolabe) {
      const expand = isHome ? range(s.get('promesa')?.pin ?? 0, 0.55, 0.9) : s.page * 0.25;
      astrolabe.update(time, spin, pointer, expand, camera.position.length(), ease);
    }
    if (table) {
      let wine = 0;
      let dim = 0;
      if (isHome) {
        const p = s.get('pilares')?.pin ?? 0;
        wine = smooth(range(p, 0.68, 0.94)) * 0.92;
        dim = Math.sin(range(p, 0.34, 0.7) * Math.PI);
      } else {
        const sv = s.get('servicio')?.center ?? 0;
        const sala = s.get('sala')?.center ?? 0;
        wine = smooth(range(sv, 0.15, 0.75)) * 0.92;
        dim = Math.sin(sala * Math.PI);
      }
      table.update(time, pointer, { wine, dim, sway: s.velocity }, ease);
    }
    if (orbit) {
      if (isHome) orbit.update(time, range(s.get('menu')?.pin ?? 0, MENU_IN, MENU_OUT) * menus.tasting.courses.length, pointer, ease);
      else orbit.update(time, -1, pointer, ease);
    }
    if (pair) pair.update(time, pointer, s.get('final')?.center ?? 0, ease);
    dust.update(time, s.velocity, pixelRatio);

    renderer.render(scene, camera);

    if (firstFrame) {
      firstFrame = false;
      requestAnimationFrame(() => container.classList.add('is-ready'));
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
  });

  return true;
}
