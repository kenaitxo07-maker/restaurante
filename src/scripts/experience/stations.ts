/**
 * Las «estaciones» del recorrido 3D. Todo es geometría procedural:
 * anillos de oro, una mesa con plato, copa y vela, el reloj de los pases
 * y el polvo dorado que flota en la sala.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { flameTexture, glowTexture, shadowTexture, woodTexture } from './textures';

export const TABLE_POS = new THREE.Vector3(0, -1.2, -16);
export const ORBIT_POS = new THREE.Vector3(0, -1.2, -40);
export const FINAL_POS = new THREE.Vector3(0, 0, -64);

export interface Quality {
  mobile: boolean;
  transmission: boolean;
  dust: number;
}

/* ---------- Materiales compartidos ---------- */

export function createMaterials(q: Quality) {
  const gold = new THREE.MeshStandardMaterial({ color: 0xcfa86a, metalness: 1, roughness: 0.26 });
  const goldSatin = new THREE.MeshStandardMaterial({ color: 0xb8935a, metalness: 1, roughness: 0.42 });
  const ceramic = new THREE.MeshPhysicalMaterial({
    side: THREE.DoubleSide,
    color: 0xefe7da,
    roughness: 0.32,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
  });
  const stone = new THREE.MeshStandardMaterial({ color: 0x2b2522, roughness: 0.8 });
  const glass = q.transmission
    ? new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.04,
        transmission: 1,
        thickness: 0.06,
        ior: 1.5,
        specularIntensity: 1,
        envMapIntensity: 1.4,
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0xfff8ee,
        roughness: 0.02,
        metalness: 0.1,
        clearcoat: 1,
        clearcoatRoughness: 0.02,
        transparent: true,
        opacity: 0.14,
        envMapIntensity: 3.2,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
  const wine = new THREE.MeshPhysicalMaterial({
    color: 0x6b0f1e,
    roughness: 0.06,
    clearcoat: 1,
    emissive: 0x2a0207,
    emissiveIntensity: 0.6,
  });
  const wax = new THREE.MeshStandardMaterial({
    color: 0xf1e6d2,
    roughness: 0.55,
    emissive: 0xffa040,
    emissiveIntensity: 0.06,
  });
  return { gold, goldSatin, ceramic, stone, glass, wine, wax };
}
export type Materials = ReturnType<typeof createMaterials>;

const textures = {
  glow: null as THREE.Texture | null,
  shadow: null as THREE.Texture | null,
};
const glowTex = () => (textures.glow ??= glowTexture());
const shadowTex = () => (textures.shadow ??= shadowTexture());

function glowSprite(color: number, size: number, opacity = 1) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex(),
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  s.scale.setScalar(size);
  return s;
}

function contactShadow(size: number, opacity = 0.8) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.002;
  m.renderOrder = 1;
  return m;
}

const v2 = (pts: number[][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));

/* ---------- Anillos de oro (astrolabio) ---------- */

export function createAstrolabe(mat: Materials) {
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);

  const ring = (r: number, tube: number, m: THREE.Material, seg = 256) => {
    const pivot = new THREE.Group();
    pivot.add(new THREE.Mesh(new THREE.TorusGeometry(r, tube, 20, seg), m));
    tilt.add(pivot);
    return pivot;
  };

  const outer = ring(2.2, 0.016, mat.gold);
  const middle = ring(1.78, 0.011, mat.gold);
  const inner = ring(1.36, 0.028, mat.goldSatin);

  // Bisel con marcas de reloj en el anillo exterior
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.09, 0.006), mat.gold, 120);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const long = i % 10 === 0 ? 1.9 : 1;
    m4.compose(
      new THREE.Vector3(Math.cos(a) * 2.06, Math.sin(a) * 2.06, 0),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a - Math.PI / 2),
      new THREE.Vector3(1, long, 1),
    );
    ticks.setMatrixAt(i, m4);
  }
  outer.add(ticks);

  // Un aro ecuatorial muy fino que cruza a los demás
  const meridian = ring(2.0, 0.006, mat.gold);
  meridian.rotation.x = Math.PI / 2;

  // Núcleo de luz
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 32, 32),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0xfff1d6).multiplyScalar(1.6), toneMapped: false, fog: false }),
  );
  const halo = glowSprite(0xffc27a, 3.2, 0.85);
  const halo2 = glowSprite(0xb8935a, 9, 0.25);
  const light = new THREE.PointLight(0xffc58a, 14, 14, 1.6);
  root.add(core, halo, halo2, light);

  middle.rotation.x = 1.1;
  inner.rotation.y = 0.9;

  return {
    root,
    update(time: number, spin: number, pointer: THREE.Vector2, expand: number, camDist: number, ease: number) {
      outer.rotation.z = time * 0.05 + spin * 0.4;
      middle.rotation.y = time * 0.11 + spin * 0.8;
      middle.rotation.z = time * 0.03;
      inner.rotation.x = time * 0.08 + spin;
      inner.rotation.z = -time * 0.06;
      meridian.rotation.y = time * 0.04 - spin * 0.3;
      tilt.rotation.x += (pointer.y * 0.35 - tilt.rotation.x) * ease * 0.6;
      tilt.rotation.y += (pointer.x * 0.45 - tilt.rotation.y) * ease * 0.6;
      tilt.scale.setScalar(1 + expand * 0.9);
      // Al acercarnos, el núcleo se apaga para no deslumbrar
      const near = THREE.MathUtils.smoothstep(camDist, 1.2, 4.2);
      const pulse = 1 + Math.sin(time * 1.3) * 0.05;
      halo.scale.setScalar(3.2 * pulse);
      (halo.material as THREE.SpriteMaterial).opacity = 0.85 * near;
      (halo2.material as THREE.SpriteMaterial).opacity = 0.25 * near;
      core.visible = near > 0.05;
      light.intensity = 14 * pulse * (0.3 + 0.7 * near);
    },
  };
}

/* ---------- Dos anillos entrelazados (cierre: «Su mesa le espera») ---------- */

export function createPair(mat: Materials) {
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);
  const a = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.03, 32, 200), mat.gold);
  const b = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.03, 32, 200), mat.goldSatin);
  a.position.x = -0.5;
  b.position.x = 0.5;
  b.rotation.y = Math.PI / 2;
  tilt.add(a, b);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.005, 12, 300), mat.gold);
  tilt.add(halo);
  root.add(glowSprite(0xffc27a, 4.5, 0.55));
  const light = new THREE.PointLight(0xffc58a, 10, 12, 1.6);
  light.position.set(0, 0.6, 1.4);
  root.add(light);
  return {
    root,
    update(time: number, pointer: THREE.Vector2, p: number, ease: number) {
      tilt.rotation.y += (pointer.x * 0.5 + time * 0.25 - tilt.rotation.y) * ease;
      tilt.rotation.x += (pointer.y * 0.3 + Math.sin(time * 0.3) * 0.15 - tilt.rotation.x) * ease;
      a.rotation.x = time * 0.2;
      b.rotation.x = -time * 0.2 + Math.PI / 2;
      halo.rotation.x = Math.PI / 2 + Math.sin(time * 0.2) * 0.2;
      tilt.scale.setScalar(0.85 + p * 0.15);
    },
  };
}

/* ---------- Plato con filo de oro ---------- */

const plateProfile = v2([
  [0.0, 0.004],
  [0.36, 0.004],
  [0.4, 0.0],
  [0.44, 0.012],
  [0.86, 0.06],
  [0.925, 0.082],
  [0.932, 0.092],
  [0.92, 0.097],
  [0.86, 0.078],
  [0.46, 0.034],
  [0.4, 0.026],
  [0.0, 0.026],
]).reverse();

let plateGeo: THREE.LatheGeometry | null = null;

export function createPlate(mat: Materials) {
  const g = new THREE.Group();
  if (!plateGeo) {
    plateGeo = new THREE.LatheGeometry(plateProfile, 96);
    plateGeo.computeVertexNormals();
  }
  const plate = new THREE.Mesh(plateGeo, mat.ceramic);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.926, 0.005, 8, 160), mat.gold);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.093;
  g.add(plate, rim, contactShadow(2.4, 0.9));
  return g;
}

/* ---------- Composiciones de plato (abstractas, como un dibujo de cocina) ---------- */

const std = (color: number, roughness = 0.45, extra: THREE.MeshPhysicalMaterialParameters = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness, ...extra });

function pool(color: number, r: number, x = 0, z = 0, sx = 1.3) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.006, 48), std(color, 0.08, { clearcoat: 1 }));
  m.position.set(x, 0.032, z);
  m.scale.x = sx;
  return m;
}
function ball(color: number, r: number, x: number, y: number, z: number, rough = 0.4) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), std(color, rough));
  m.position.set(x, y, z);
  return m;
}
function block(color: number, w: number, h: number, d: number, x: number, z: number, ry = 0) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.3), std(color, 0.5));
  m.position.set(x, 0.03 + h / 2, z);
  m.rotation.y = ry;
  return m;
}
function leaf(color: number, x: number, y: number, z: number, r = 0) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), std(color, 0.6, { side: THREE.DoubleSide }));
  m.scale.set(0.5, 1, 1);
  m.position.set(x, y, z);
  m.rotation.set(-Math.PI / 2 + 0.4, 0, r);
  return m;
}
function disc(color: number, r: number, x: number, y: number, z: number, rx = -Math.PI / 2, rough = 0.3, opacity = 1) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(r, 32),
    std(color, rough, { side: THREE.DoubleSide, transparent: opacity < 1, opacity, clearcoat: 0.6 }),
  );
  m.position.set(x, y, z);
  m.rotation.x = rx;
  return m;
}

export function createDish(type: string, mat: Materials) {
  const d = new THREE.Group();
  switch (type) {
    case 'snack': {
      const slate = new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.04, 0.4, 2, 0.015), mat.stone);
      slate.position.y = 0.05;
      d.add(slate);
      [[-0.25, 0xc89b5a], [0, 0xe9dcc4], [0.25, 0x5f7a35]].forEach(([x, c]) => d.add(ball(c, 0.06, x, 0.13, 0)));
      break;
    }
    case 'verdura': {
      d.add(pool(0x8a5a22, 0.3, 0, 0, 1));
      [[0x6b2a3a, -0.12, 0.05], [0xd7792a, 0.06, -0.08], [0x6f8a3a, 0.14, 0.1], [0xc9a35a, -0.02, 0.14]].forEach(([c, x, z]) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.03, 24), std(c, 0.5));
        m.position.set(x, 0.05, z);
        m.rotation.z = 0.3;
        d.add(m);
      });
      d.add(leaf(0x7f9b45, 0.05, 0.08, 0.02, 0.6));
      break;
    }
    case 'crudo': {
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.36;
        d.add(disc(0xe48a7c, 0.1, Math.cos(a) * 0.14, 0.036 + i * 0.002, Math.sin(a) * 0.14, -Math.PI / 2, 0.15, 0.92));
      }
      [[0.1, -0.12], [-0.16, 0.1], [0.18, 0.12]].forEach(([x, z]) => d.add(ball(0xf2c94c, 0.018, x, 0.05, z, 0.2)));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        d.add(leaf(0xf6efe6, Math.cos(a) * 0.03, 0.07, Math.sin(a) * 0.03, a));
      }
      break;
    }
    case 'huevo': {
      d.add(disc(0xf3ead8, 0.22, 0, 0.034, 0, -Math.PI / 2, 0.4));
      const yolk = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        std(0xf0a21e, 0.08, { clearcoat: 1 }),
      );
      yolk.position.y = 0.035;
      d.add(yolk);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const t = disc(0x231a14, 0.045, Math.cos(a) * 0.16, 0.06 + (i % 3) * 0.01, Math.sin(a) * 0.16, -Math.PI / 2 + 0.5, 0.7);
        t.rotation.z = a;
        d.add(t);
      }
      break;
    }
    case 'pescado': {
      d.add(pool(0xb98a3c, 0.26));
      d.add(block(0xf1e8da, 0.34, 0.09, 0.15, 0, 0, 0.35));
      const sear = block(0xb07a3f, 0.33, 0.012, 0.14, 0, 0, 0.35);
      sear.position.y = 0.13;
      d.add(sear);
      d.add(ball(0x6f8a3a, 0.02, 0.18, 0.05, 0.1), ball(0xd9822b, 0.016, -0.2, 0.045, -0.06), leaf(0x7f9b45, 0.05, 0.15, 0.01, 0.4));
      break;
    }
    case 'cordero': {
      d.add(pool(0x3a160f, 0.26));
      d.add(block(0x5a2a1c, 0.3, 0.1, 0.16, -0.03, 0, -0.3));
      d.add(block(0x7a3a26, 0.14, 0.08, 0.12, 0.17, 0.08, 0.5));
      [[0.16, -0.14], [-0.2, 0.13], [0.22, -0.02]].forEach(([x, z]) => d.add(ball(0xa3243a, 0.022, x, 0.05, z, 0.15)));
      break;
    }
    case 'prepostre': {
      d.add(ball(0xf6f1e8, 0.085, 0, 0.11, 0, 0.6));
      d.add(disc(0xa9c46c, 0.04, 0.05, 0.19, 0.02, -Math.PI / 2 + 0.6, 0.5));
      d.add(pool(0xe8d7a8, 0.14, 0, 0, 1));
      break;
    }
    case 'postre': {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 48), std(0x2a1610, 0.25, { clearcoat: 0.8 }));
      c.position.y = 0.07;
      d.add(c);
      const gl = disc(0xd8b16a, 0.04, 0.02, 0.112, -0.01, -Math.PI / 2 + 0.1, 0.2);
      (gl.material as THREE.MeshPhysicalMaterial).metalness = 1;
      d.add(gl);
      d.add(ball(0x8c1c2c, 0.02, 0.2, 0.05, 0.08, 0.2), ball(0x8c1c2c, 0.016, 0.24, 0.045, 0.02, 0.2));
      break;
    }
    case 'cafe': {
      const cupProfile = v2([[0, 0], [0.1, 0], [0.12, 0.02], [0.13, 0.1], [0.125, 0.11], [0.115, 0.1], [0.105, 0.02], [0, 0.02]]);
      const cup = new THREE.Mesh(new THREE.LatheGeometry(cupProfile, 48), mat.ceramic);
      cup.position.set(-0.08, 0.03, 0);
      const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.11, 32), std(0x2b160b, 0.1, { clearcoat: 1 }));
      coffee.rotation.x = -Math.PI / 2;
      coffee.position.set(-0.08, 0.12, 0);
      d.add(cup, coffee);
      [[0.16, -0.08, 0xd8b16a], [0.2, 0.06, 0x3a1f14], [0.08, 0.16, 0xe9dcc4]].forEach(([x, z, c]) =>
        d.add(block(c, 0.06, 0.04, 0.06, x, z, x * 4)),
      );
      break;
    }
  }
  return d;
}

/* ---------- La mesa: plato, copa, vela y cubiertos ---------- */

/** Suaviza un perfil de torno con una curva para que la copa no se vea facetada. */
function smoothProfile(pts: number[][], divisions = 64) {
  const curve = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return curve.getSpacedPoints(divisions).map((p) => [Math.max(0, p.x), p.y]);
}

const glassOuterRaw = [
  [0.0, 0.0], [0.27, 0.0], [0.28, 0.012], [0.05, 0.03], [0.022, 0.07], [0.02, 0.5], [0.05, 0.58],
  [0.18, 0.65], [0.29, 0.78], [0.33, 0.93], [0.315, 1.08], [0.275, 1.2],
];
const glassOuter = [...glassOuterRaw.slice(0, 6), ...smoothProfile(glassOuterRaw.slice(5), 48).slice(1)];
const glassInner = smoothProfile(
  [[0.268, 1.2], [0.307, 1.08], [0.322, 0.93], [0.282, 0.785], [0.175, 0.66], [0.05, 0.6], [0.0, 0.595]],
  48,
);
const innerRadiusAt = (y: number) => {
  const pts = [...glassInner].reverse(); // ascendente en y
  for (let i = 0; i < pts.length - 1; i++) {
    const [r0, y0] = pts[i];
    const [r1, y1] = pts[i + 1];
    if (y >= y0 && y <= y1) return r0 + ((y - y0) / (y1 - y0)) * (r1 - r0);
  }
  return 0;
};
function wineGeometry(level: number) {
  const top = 0.6 + level * 0.42;
  const pts: number[][] = [[0, 0.602]];
  for (const [r, y] of [...glassInner].reverse()) if (y > 0.602 && y < top) pts.push([r - 0.006, y]);
  pts.push([innerRadiusAt(top) - 0.006, top], [0, top]);
  return new THREE.LatheGeometry(v2(pts), 64);
}

export function createTable(mat: Materials) {
  const root = new THREE.Group();
  const tilt = new THREE.Group();
  root.add(tilt);

  const wood = new THREE.MeshStandardMaterial({ color: 0x5a4334, map: woodTexture(), roughness: 0.58, metalness: 0, envMapIntensity: 0.25 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.08, 160), wood);
  top.position.y = -0.04;
  tilt.add(top);

  // Plato con el pase del día
  const plate = createPlate(mat);
  plate.add(createDish('pescado', mat));
  tilt.add(plate);

  // Cubiertos de oro
  const knife = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.012, 0.7, 2, 0.005), mat.goldSatin);
  knife.position.set(1.18, 0.008, 0.05);
  const fork = new THREE.Group();
  const handle = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.012, 0.5, 2, 0.005), mat.goldSatin);
  handle.position.z = 0.12;
  fork.add(handle);
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.2), mat.goldSatin);
    t.position.set(-0.024 + i * 0.016, 0, -0.22);
    fork.add(t);
  }
  fork.position.set(-1.18, 0.008, 0.05);
  tilt.add(knife, fork, contactShadow(0.5, 0.5).translateX(1.18), contactShadow(0.5, 0.5).translateX(-1.18));

  // Copa
  const glassGroup = new THREE.Group();
  glassGroup.position.set(0.95, 0, -0.78);
  const glass = new THREE.Mesh(new THREE.LatheGeometry(v2([...glassOuter, ...glassInner]), 96), mat.glass);
  glass.renderOrder = 2;
  const wine = new THREE.Mesh(wineGeometry(0.001), mat.wine);
  wine.visible = false;
  glassGroup.add(wine, glass, contactShadow(0.9, 0.55));
  tilt.add(glassGroup);

  // Vela con candelero de oro
  const candle = new THREE.Group();
  candle.position.set(-1.0, 0, -1.0);
  const holder = new THREE.Mesh(
    new THREE.LatheGeometry(v2([[0, 0], [0.16, 0], [0.16, 0.02], [0.06, 0.04], [0.05, 0.1], [0.1, 0.12], [0.1, 0.14], [0, 0.14]]), 48),
    mat.gold,
  );
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.072, 0.46, 40), mat.wax);
  wax.position.y = 0.14 + 0.23;
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.04, 6), new THREE.MeshBasicMaterial({ color: 0x1a1210 }));
  wick.position.y = 0.62;
  const flame = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: flameTexture(), color: 0xffe0a8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  flame.scale.set(0.08, 0.17, 1);
  flame.position.y = 0.7;
  const flameHalo = glowSprite(0xff9a40, 1.3, 0.55);
  flameHalo.position.y = 0.7;
  const candleLight = new THREE.PointLight(0xffa24f, 3.2, 7, 1.8);
  candleLight.position.y = 0.78;
  candle.add(holder, wax, wick, flame, flameHalo, candleLight, contactShadow(0.7, 0.6));
  tilt.add(candle);

  // Luz cenital sobre el plato: un círculo de luz en la penumbra
  const spot = new THREE.SpotLight(0xffe2bd, 60, 14, 0.36, 0.85, 1.5);
  spot.position.set(0.3, 4.4, 0.9);
  spot.target = plate;
  root.add(spot);
  const rim = new THREE.PointLight(0xb8935a, 4, 8, 1.6);
  rim.position.set(-2.2, 1.2, -2.4);
  root.add(rim);

  let level = -1;
  let flick = 1;

  return {
    root,
    candleWorld: () => candle.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.55, 0)),
    update(time: number, pointer: THREE.Vector2, o: { wine: number; dim: number; sway: number }, ease: number) {
      tilt.rotation.y += (pointer.x * 0.16 - tilt.rotation.y) * ease * 0.5;
      tilt.rotation.x += (pointer.y * 0.04 - tilt.rotation.x) * ease * 0.5;
      // Llama: parpadeo natural y se inclina con el movimiento
      const n = Math.sin(time * 9.1) * 0.5 + Math.sin(time * 14.3 + 1.3) * 0.3 + Math.sin(time * 3.7) * 0.2;
      flick += (1 + n * 0.08 - flick) * 0.4;
      flame.scale.set(0.08 * (1 + n * 0.04), 0.17 * flick, 1);
      flame.material.rotation = THREE.MathUtils.clamp(-o.sway * 0.25 - pointer.x * 0.08, -0.4, 0.4);
      flameHalo.material.opacity = 0.45 + n * 0.06 + o.dim * 0.2;
      candleLight.intensity = (3.2 + o.dim * 3.5) * flick;
      spot.intensity = 60 * (1 - o.dim * 0.55);
      // El vino sube cuando el servicio se anticipa
      const l = Math.round(o.wine * 200) / 200;
      if (l !== level) {
        level = l;
        wine.visible = l > 0.004;
        if (wine.visible) {
          wine.geometry.dispose();
          wine.geometry = wineGeometry(l);
        }
      }
    },
  };
}

/* ---------- El recorrido de pases: un reloj de platos ---------- */

export function createOrbit(mat: Materials, dishes: string[]) {
  const root = new THREE.Group();
  const dial = new THREE.Group();
  root.add(dial);
  const n = dishes.length;
  const R = 3.0;

  const face = new THREE.Mesh(new THREE.TorusGeometry(R + 0.95, 0.008, 8, 300), mat.gold);
  face.rotation.x = Math.PI / 2;
  const face2 = new THREE.Mesh(new THREE.TorusGeometry(R - 0.95, 0.005, 8, 240), mat.goldSatin);
  face2.rotation.x = Math.PI / 2;
  dial.add(face, face2);

  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.008, 0.14), mat.gold, 60);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const len = i % 5 === 0 ? 2.2 : 1;
    m4.compose(
      new THREE.Vector3(Math.sin(a) * (R + 0.8), 0, Math.cos(a) * (R + 0.8)),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a),
      new THREE.Vector3(1, 1, len),
    );
    ticks.setMatrixAt(i, m4);
  }
  dial.add(ticks);

  const plates: THREE.Group[] = [];
  dishes.forEach((type, i) => {
    const a = (i / n) * Math.PI * 2;
    const holder = new THREE.Group();
    holder.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    const p = createPlate(mat);
    p.add(createDish(type, mat));
    p.scale.setScalar(0.62);
    p.rotation.y = a;
    holder.add(p);
    dial.add(holder);
    plates.push(holder);
  });

  // Aguja fija: marca el pase que se sirve ahora
  const hand = new THREE.Group();
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, R - 0.9), mat.gold);
  needle.position.z = (R - 0.9) / 2;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 32), mat.gold);
  hand.add(needle, hub);
  root.add(hand);
  root.add(glowSprite(0xffc27a, 2.4, 0.35));

  const spot = new THREE.SpotLight(0xffe2bd, 70, 12, 0.34, 0.9, 1.4);
  spot.position.set(0, 4.5, R + 0.6);
  const target = new THREE.Object3D();
  target.position.set(0, 0, R);
  root.add(spot, target);
  spot.target = target;
  const fill = new THREE.PointLight(0xb8935a, 6, 14, 1.6);
  fill.position.set(0, 2.5, -1);
  root.add(fill);

  let rot = 0;
  return {
    root,
    update(time: number, f: number, pointer: THREE.Vector2, ease: number) {
      // f: posición fraccionaria en el recorrido de pases (0 → n). f < 0: giro libre.
      const free = f < 0;
      const targetRot = free ? -time * 0.06 : -(Math.max(0, Math.min(n - 1, f - 0.5)) / n) * Math.PI * 2;
      rot += (targetRot - rot) * (free ? 1 : ease);
      dial.rotation.y = rot + pointer.x * 0.05;
      const active = free ? -1 : Math.min(n - 1, Math.max(0, Math.floor(f)));
      plates.forEach((p, i) => {
        const on = i === active ? 1 : 0;
        p.position.y += (on * 0.32 + Math.sin(time * 1.2 + i) * 0.02 - p.position.y) * ease;
        const s = 1 + on * 0.14;
        p.scale.x += (s - p.scale.x) * ease;
        p.scale.y = p.scale.z = p.scale.x;
        p.children[0].rotation.y += 0.002 * (1 + on * 2);
      });
    },
  };
}

/* ---------- Polvo dorado ---------- */

export function createDust(count: number, bounds: { z0: number; z1: number }) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const scale = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 2] = bounds.z1 + Math.random() * (bounds.z0 - bounds.z1);
    seed[i] = Math.random();
    scale[i] = 0.35 + Math.pow(Math.random(), 3) * 1.6;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uSize: { value: 26 },
      uWarp: { value: 0 },
      uColor: { value: new THREE.Color(0xe6c48c) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uSize;
      uniform float uWarp;
      attribute float aSeed;
      attribute float aScale;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float t = uTime * (0.6 + aSeed * 0.6);
        p.x += sin(t * 0.21 + aSeed * 6.283) * 0.35;
        p.y += mod(position.y + 6.0 + uTime * 0.05 * aScale, 12.0) - 6.0 - position.y;
        p.z += cos(t * 0.17 + aSeed * 12.0) * 0.3;
        p.y += uWarp * (aSeed - 0.5) * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float depth = -mv.z;
        gl_PointSize = uSize * aScale * uPixelRatio / max(depth, 0.5) * (1.0 + abs(uWarp) * 0.4);
        float tw = 0.5 + 0.5 * sin(uTime * (1.2 + aSeed * 2.0) + aSeed * 40.0);
        vAlpha = (0.25 + tw * 0.75) * smoothstep(26.0, 3.0, depth) * smoothstep(0.3, 1.6, depth);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(uColor, a * a * vAlpha * 0.9);
      }
    `,
  });
  const points = new THREE.Points(geo, material);
  points.frustumCulled = false;
  return {
    root: points,
    update(time: number, velocity: number, pr: number) {
      material.uniforms.uTime.value = time;
      material.uniforms.uPixelRatio.value = pr;
      const w = material.uniforms.uWarp.value as number;
      material.uniforms.uWarp.value = w + (THREE.MathUtils.clamp(velocity * 0.08, -2, 2) - w) * 0.1;
    },
  };
}
