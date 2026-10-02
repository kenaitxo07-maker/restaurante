/** Preferencias del dispositivo que deciden cuánto movimiento mostramos. */
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(pointer: fine)').matches;
export const isMobile = window.matchMedia('(max-width: 760px)').matches;

type NetworkInformation = { saveData?: boolean; effectiveType?: string };
const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
export const saveData = !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '');

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Interpola de forma suave entre dos valores dentro de un rango de progreso. */
export const range = (p: number, from: number, to: number) => clamp((p - from) / (to - from));
export const smooth = (t: number) => t * t * (3 - 2 * t);
