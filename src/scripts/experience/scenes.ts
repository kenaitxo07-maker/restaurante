/**
 * Guion de cámara de cada página. Cada «plano» se ancla a una sección
 * ([data-shot]) y a un punto de su progreso; la cámara interpola entre ellos
 * siguiendo el scroll.
 */
import { FINAL_POS as F, ORBIT_POS as O, TABLE_POS as T } from './stations';

export type V3 = [number, number, number];
export interface Pose {
  pos: V3;
  look: V3;
  /** Desplazamiento del encuadre (fracción de pantalla) para dejar sitio al texto. */
  shift?: [number, number];
}
export interface Anchor {
  shot: string;
  p: number;
  pose: Pose;
  mobile?: Partial<Pose>;
}

const t = (x: number, y: number, z: number): V3 => [T.x + x, T.y + y, T.z + z];
const o = (x: number, y: number, z: number): V3 => [O.x + x, O.y + y, O.z + z];
const f = (x: number, y: number, z: number): V3 => [F.x + x, F.y + y, F.z + z];

/* Puntos de interés en la mesa */
const PLATE = t(0, 0.08, 0);
const CANDLE = t(-1.0, 0.5, -1.0);
const GLASS = t(0.95, 0.75, -0.78);

export const HOME: Anchor[] = [
  // Hero: los anillos, a la derecha del titular
  { shot: 'hero', p: 0, pose: { pos: [0, 0, 9.2], look: [0, 0, 0], shift: [0.22, 0.02] }, mobile: { pos: [0, 0, 16], shift: [0, -0.32] } },
  { shot: 'hero', p: 1, pose: { pos: [0, 0, 6.4], look: [0, 0, 0], shift: [0.1, 0] }, mobile: { pos: [0, 0, 10], shift: [0, -0.2] } },
  // La promesa: atravesamos el anillo y entramos en la sala
  { shot: 'promesa', p: 0, pose: { pos: [0, 0, 6.6], look: [0, 0, 0], shift: [0.3, 0] }, mobile: { pos: [0, 0, 9], shift: [0, -0.28] } },
  { shot: 'promesa', p: 0.62, pose: { pos: [0.4, 0.2, 4.4], look: [0, 0, 0], shift: [0.3, 0] }, mobile: { pos: [0.2, 0.1, 7], shift: [0, -0.28] } },
  { shot: 'promesa', p: 0.86, pose: { pos: [1.15, 0.45, -0.2], look: [0.4, -0.6, -16], shift: [0, 0] }, mobile: { pos: [1.15, 0.45, -0.2], shift: [0, 0] } },
  { shot: 'promesa', p: 1, pose: { pos: [0.3, 1.8, -8.2], look: t(0, 0, 0), shift: [0.1, 0] } },
  // Tres pilares: producto (plato), sala (vela), servicio (copa)
  { shot: 'pilares', p: 0, pose: { pos: t(0, 3.2, 4.4), look: t(0, 0, 0), shift: [0.2, 0] }, mobile: { pos: t(0, 4.4, 5.6), shift: [0, -0.18] } },
  { shot: 'pilares', p: 0.12, pose: { pos: t(0.6, 1.9, 2.9), look: PLATE, shift: [0.24, 0] }, mobile: { pos: t(0.4, 2.3, 2.9), shift: [0, -0.2] } },
  { shot: 'pilares', p: 0.3, pose: { pos: t(-0.3, 1.7, 2.8), look: PLATE, shift: [0.24, 0] }, mobile: { pos: t(-0.3, 2.1, 2.8), shift: [0, -0.2] } },
  { shot: 'pilares', p: 0.45, pose: { pos: t(-2.4, 0.95, 0.9), look: CANDLE, shift: [0.22, 0] }, mobile: { pos: t(-2.2, 1.4, 1.8), shift: [0, -0.22] } },
  { shot: 'pilares', p: 0.62, pose: { pos: t(-2.0, 0.85, 1.2), look: CANDLE, shift: [0.22, 0] }, mobile: { pos: t(-2.0, 1.3, 2.1), shift: [0, -0.22] } },
  { shot: 'pilares', p: 0.78, pose: { pos: t(2.3, 1.0, 1.4), look: GLASS, shift: [0.22, 0] }, mobile: { pos: t(2.3, 1.4, 2.4), shift: [0, -0.22] } },
  { shot: 'pilares', p: 1, pose: { pos: t(2.0, 1.1, 1.7), look: GLASS, shift: [0.22, 0] }, mobile: { pos: t(2.0, 1.5, 2.7), shift: [0, -0.22] } },
  // Hacia el recorrido de pases
  { shot: 'tasting', p: 0.02, pose: { pos: [0, 2.6, -24], look: o(0, 0, 0), shift: [0, 0] } },
  { shot: 'menu', p: 0, pose: { pos: o(0, 3.4, 8.2), look: o(0, 0, 1.2), shift: [0, 0.06] }, mobile: { pos: o(0, 5.4, 9.6) } },
  { shot: 'menu', p: 0.1, pose: { pos: o(0, 2.9, 6.6), look: o(0, 0.1, 1.6), shift: [0, 0.06] }, mobile: { pos: o(0, 4.6, 8.4), shift: [0, 0] } },
  { shot: 'menu', p: 1, pose: { pos: o(0.4, 2.6, 6.2), look: o(0, 0.1, 1.8), shift: [0, 0.06] }, mobile: { pos: o(0.3, 4.4, 8), shift: [0, 0] } },
  // Chef, galería, ocasiones: la sala en penumbra, solo el polvo dorado
  { shot: 'chef', p: 0.5, pose: { pos: [0, 3.2, -46], look: f(0, 2, 0), shift: [0, 0] } },
  { shot: 'galeria', p: 0.5, pose: { pos: [0, 1.8, -51], look: f(0, 0.6, 0), shift: [0, 0] } },
  { shot: 'ocasiones', p: 0.5, pose: { pos: [0, 0.6, -55.5], look: f(0, 0, 0), shift: [0, 0] } },
  // Cierre: dos anillos entrelazados detrás de «Su mesa le espera»
  { shot: 'final', p: 0.35, pose: { pos: f(0, 0.3, 9.6), look: f(0, 0.3, 0), shift: [0, 0] }, mobile: { pos: f(0, 0, 17), shift: [0, -0.36] } },
  { shot: 'final', p: 1, pose: { pos: f(0, 0.1, 8), look: f(0, 0.3, 0), shift: [0, 0] }, mobile: { pos: f(0, -0.2, 15), shift: [0, -0.36] } },
];

/** Páginas internas con los anillos (eventos, reservas, contacto, legales). */
export const RINGS: Anchor[] = [
  { shot: 'hero', p: 0, pose: { pos: [0, 0, 10.5], look: [0, 0, 0], shift: [0.3, 0.02] }, mobile: { pos: [0, 0, 12.5], shift: [0, -0.24] } },
  { shot: 'hero', p: 1, pose: { pos: [0, -0.6, 13], look: [0, 0.4, 0], shift: [0.26, 0] }, mobile: { pos: [0, -0.6, 15], shift: [0, -0.2] } },
  // Mientras se lee o se rellena un formulario, los anillos se retiran a la penumbra
  { shot: 'hero', p: 2, pose: { pos: [0, -1, 24], look: [0, 0.4, 0], shift: [0.26, 0] }, mobile: { pos: [0, -1, 26], shift: [0, -0.2] } },
  { shot: 'closing', p: 0, pose: { pos: [0, -1, 24], look: [0, 0.4, 0], shift: [0, 0] } },
  { shot: 'closing', p: 0.5, pose: { pos: [0, 0, 6.2], look: [0, 0, 0], shift: [0, 0] }, mobile: { pos: [0, 0, 9] } },
];

/** La experiencia: la cámara recorre la mesa capítulo a capítulo. */
export const TABLE: Anchor[] = [
  { shot: 'hero', p: 0, pose: { pos: t(0.6, 2.6, 5.2), look: t(0.2, 0.2, -0.6), shift: [0.26, -0.04] }, mobile: { pos: t(0, 4.2, 6.4), shift: [0, -0.24] } },
  { shot: 'hero', p: 1, pose: { pos: t(0.8, 1.8, 3.2), look: PLATE, shift: [0.24, 0] }, mobile: { pos: t(0.6, 2.8, 4.2), shift: [0, -0.2] } },
  { shot: 'cocina', p: 0.5, pose: { pos: t(0.4, 1.2, 1.8), look: PLATE, shift: [-0.2, 0] }, mobile: { pos: t(0.4, 2.2, 2.8), shift: [0, 0] } },
  { shot: 'sala', p: 0.5, pose: { pos: t(-2.2, 0.9, 1.1), look: CANDLE, shift: [0.2, 0] }, mobile: { pos: t(-2.2, 1.4, 2), shift: [0, 0] } },
  { shot: 'servicio', p: 0.5, pose: { pos: t(2.2, 1.0, 1.5), look: GLASS, shift: [-0.2, 0] }, mobile: { pos: t(2.2, 1.4, 2.5), shift: [0, 0] } },
  { shot: 'bodega', p: 0.5, pose: { pos: t(1.4, 0.9, 0.6), look: GLASS, shift: [0.2, 0] }, mobile: { pos: t(1.6, 1.3, 1.6), shift: [0, 0] } },
  { shot: 'closing', p: 0.5, pose: { pos: t(0, 3.4, 4.6), look: t(0, 0, -0.3), shift: [0, 0] }, mobile: { pos: t(0, 4.6, 6) } },
];

/** Menús y bodega: el reloj de pases, girando lentamente. */
export const ORBIT: Anchor[] = [
  { shot: 'hero', p: 0, pose: { pos: o(0, 5.6, 11.5), look: o(0, -0.4, 0), shift: [0.3, 0] }, mobile: { pos: o(0, 9, 14), shift: [0, -0.24] } },
  { shot: 'hero', p: 1, pose: { pos: o(0, 8.5, 8.5), look: o(0, 0, 0), shift: [0.3, 0] }, mobile: { pos: o(0, 11, 11), shift: [0, -0.22] } },
  { shot: 'closing', p: 0.5, pose: { pos: o(0, 3.6, 7.4), look: o(0, 0, 0.6), shift: [0, 0] }, mobile: { pos: o(0, 6, 10) } },
];
