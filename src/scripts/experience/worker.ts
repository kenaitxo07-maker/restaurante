/**
 * Hilo del render 3D. Recibe un OffscreenCanvas y, en cada fotograma, el estado
 * del scroll y del cursor. Compilar shaders o dibujar aquí no detiene nunca el
 * scroll ni las animaciones de la página.
 */
import { createWorld, type FrameInput, type World, type WorldOptions } from './core';

type InitMessage = { type: 'init'; canvas: OffscreenCanvas; opts: Omit<WorldOptions, 'onReady' | 'onLost'> };
type Message =
  | InitMessage
  | { type: 'frame'; input: FrameInput }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'pause'; paused: boolean };

type WorkerScope = {
  postMessage(message: unknown): void;
  onmessage: ((e: MessageEvent<Message>) => void) | null;
  requestAnimationFrame?: (cb: (t: number) => void) => number;
};
const scope = self as unknown as WorkerScope;
let world: World | null = null;
let latest: FrameInput | null = null;
let paused = false;
let last = 0;

const raf: (cb: (t: number) => void) => void =
  typeof scope.requestAnimationFrame === 'function'
    ? (cb) => scope.requestAnimationFrame!(cb)
    : (cb) => setTimeout(() => cb(performance.now()), 16);

function loop() {
  const now = performance.now();
  const dt = Math.min(0.1, (now - (last || now)) / 1000);
  last = now;
  if (world && latest && !paused) world.frame(latest, now / 1000, dt);
  raf(loop);
}

scope.onmessage = (e: MessageEvent<Message>) => {
  const m = e.data;
  if (m.type === 'init') {
    try {
      world = createWorld(m.canvas, {
        ...m.opts,
        onReady: () => scope.postMessage({ type: 'ready' }),
        onLost: () => scope.postMessage({ type: 'lost' }),
      });
      raf(loop);
    } catch (err) {
      scope.postMessage({ type: 'error', message: String(err) });
    }
  } else if (m.type === 'frame') {
    latest = m.input;
  } else if (m.type === 'resize') {
    world?.resize(m.width, m.height, m.dpr);
  } else if (m.type === 'pause') {
    paused = m.paused;
    last = 0;
  }
};
