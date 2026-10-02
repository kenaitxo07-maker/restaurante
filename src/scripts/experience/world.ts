/**
 * Arranque de la experiencia 3D desde la página.
 * Si el navegador lo permite, el render vive en un Web Worker con
 * OffscreenCanvas: la compilación de shaders y el dibujo ocurren fuera del
 * hilo principal y el scroll nunca se congela. Si no, se carga el mismo
 * núcleo en la página. Three.js solo se descarga en el camino que se use.
 */
import { onFrame, type ScrollState } from '../scroll';
import type { FrameInput, SceneName, World, WorldOptions } from './core';

export type { SceneName };

export function start(container: HTMLElement, sceneName: SceneName): boolean {
  const mobile = window.matchMedia('(max-width: 760px)').matches || window.matchMedia('(pointer: coarse)').matches;
  const base = {
    scene: sceneName,
    mobile,
    snap: /[?&]snap\b/.test(location.search),
    dev: import.meta.env.DEV,
    width: container.clientWidth,
    height: container.clientHeight,
    dpr: window.devicePixelRatio || 1,
  };
  const ready = () => requestAnimationFrame(() => container.classList.add('is-ready'));
  const lost = () => container.classList.remove('is-ready');

  /* ---------- Estado que se envía al render en cada fotograma ---------- */

  let pointer: [number, number] | null = null;
  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      pointer = [(e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)];
    },
    { passive: true },
  );

  // Secciones opacas: si una tapa todo el lienzo, no se dibuja.
  const covers = Array.from(document.querySelectorAll<HTMLElement>('.section--light, .section--alt, .menu-sheet'));
  let spans: [number, number][] = [];
  const measureCovers = () => {
    spans = covers.map((el) => {
      const r = el.getBoundingClientRect();
      return [r.top + window.scrollY, r.bottom + window.scrollY];
    });
  };
  measureCovers();
  window.addEventListener('load', measureCovers);
  new ResizeObserver(measureCovers).observe(document.querySelector('main') ?? document.documentElement);

  const snapshot = (s: ScrollState): FrameInput => ({
    y: s.y,
    vh: s.vh,
    max: s.max,
    velocity: s.velocity,
    page: s.page,
    shots: s.shots.map(({ id, top, height, pinned, center, pin }) => ({ id, top, height, pinned, center, pin })),
    pointer,
    covered: spans.some(([a, b]) => a <= s.y && b >= s.y + s.vh),
  });

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  /* ---------- Camino preferido: Web Worker + OffscreenCanvas ---------- */

  const workerAllowed = 'transferControlToOffscreen' in canvas && typeof Worker !== 'undefined' && !/[?&]noworker\b/.test(location.search);
  if (workerAllowed) {
    try {
      const offscreen = canvas.transferControlToOffscreen();
      const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e: MessageEvent<{ type: string; message?: string }>) => {
        if (e.data.type === 'ready') ready();
        else if (e.data.type === 'lost') lost();
        else if (e.data.type === 'error') {
          console.warn('[Áurea] Escena 3D no disponible:', e.data.message);
          document.documentElement.classList.add('no-3d');
        }
      };
      worker.postMessage({ type: 'init', canvas: offscreen, opts: base }, [offscreen]);
      onFrame((s) => worker.postMessage({ type: 'frame', input: snapshot(s) }));
      window.addEventListener('resize', () =>
        worker.postMessage({ type: 'resize', width: container.clientWidth, height: container.clientHeight, dpr: window.devicePixelRatio || 1 }),
      );
      document.addEventListener('visibilitychange', () => worker.postMessage({ type: 'pause', paused: document.hidden }));
      return true;
    } catch (err) {
      console.warn('[Áurea] Sin worker 3D, se usa la página:', err);
      canvas.remove();
    }
  }

  /* ---------- Alternativa: el mismo núcleo en la página ---------- */

  const inline = document.createElement('canvas');
  container.appendChild(inline);
  let world: World | null = null;
  import('./core')
    .then(({ createWorld }) => {
      const opts: WorldOptions = { ...base, onReady: ready, onLost: lost };
      world = createWorld(inline, opts);
      window.addEventListener('resize', () => world?.resize(container.clientWidth, container.clientHeight, window.devicePixelRatio || 1));
    })
    .catch((err) => {
      console.warn('[Áurea] Escena 3D no disponible:', err);
      document.documentElement.classList.add('no-3d');
    });
  onFrame((s, time, dt) => world?.frame(snapshot(s), time, dt));
  return true;
}
