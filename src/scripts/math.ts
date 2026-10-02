/** Utilidades numéricas sin dependencias del DOM (se usan también en el worker 3D). */
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Interpola de forma suave entre dos valores dentro de un rango de progreso. */
export const range = (p: number, from: number, to: number) => clamp((p - from) / (to - from));
export const smooth = (t: number) => t * t * (3 - 2 * t);
