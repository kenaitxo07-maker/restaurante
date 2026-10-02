/** Preferencias del dispositivo que deciden cuánto movimiento mostramos. */
export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = window.matchMedia('(pointer: fine)').matches;
export const isMobile = window.matchMedia('(max-width: 760px)').matches;

type NetworkInformation = { saveData?: boolean; effectiveType?: string };
const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
export const saveData = !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '');

export { clamp, lerp, range, smooth } from './math';
