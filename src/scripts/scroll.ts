/**
 * Motor de scroll: desplazamiento suave (Lenis), un único bucle de animación
 * y el progreso de cada sección marcada con [data-shot].
 *
 *  - center: 0 → 1 mientras el centro de la pantalla recorre la sección.
 *  - pin:    0 → 1 mientras una sección [data-pin] permanece fijada.
 */
import Lenis from 'lenis';
import { clamp, reducedMotion } from './env';

export interface Shot {
  id: string;
  el: HTMLElement;
  top: number;
  height: number;
  pinned: boolean;
  center: number;
  pin: number;
}

export interface ScrollState {
  y: number;
  vh: number;
  vw: number;
  max: number;
  velocity: number;
  /** Progreso global de la página, 0 → 1. */
  page: number;
  shots: Shot[];
  get(id: string): Shot | undefined;
}

type Listener = (s: ScrollState, time: number, dt: number) => void;

const listeners = new Set<Listener>();
let lenis: Lenis | null = null;
let lastY = window.scrollY;

const shots: Shot[] = [];
const byId = new Map<string, Shot>();

export const state: ScrollState = {
  y: window.scrollY,
  vh: window.innerHeight,
  vw: window.innerWidth,
  max: 1,
  velocity: 0,
  page: 0,
  shots,
  get: (id) => byId.get(id),
};

function measure() {
  state.vh = window.innerHeight;
  state.vw = window.innerWidth;
  state.max = Math.max(1, document.documentElement.scrollHeight - state.vh);
  const y = window.scrollY;
  shots.length = 0;
  byId.clear();
  document.querySelectorAll<HTMLElement>('[data-shot]').forEach((el) => {
    const r = el.getBoundingClientRect();
    const shot: Shot = {
      id: el.dataset.shot!,
      el,
      top: r.top + y,
      height: r.height,
      pinned: el.hasAttribute('data-pin'),
      center: 0,
      pin: 0,
    };
    shots.push(shot);
    if (!byId.has(shot.id)) byId.set(shot.id, shot);
  });
  update(y);
}

function update(y: number) {
  state.y = y;
  state.page = clamp(y / state.max);
  for (const s of shots) {
    s.center = clamp((y + state.vh / 2 - s.top) / s.height);
    s.pin = s.pinned ? clamp((y - s.top) / Math.max(1, s.height - state.vh)) : s.center;
  }
}

export function onFrame(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function scrollTo(target: number | HTMLElement, opts: { offset?: number; immediate?: boolean } = {}) {
  if (lenis) lenis.scrollTo(target, { offset: opts.offset ?? 0, immediate: opts.immediate, duration: 1.6 });
  else {
    const y = typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y + (opts.offset ?? 0), behavior: reducedMotion ? 'auto' : 'smooth' });
  }
}

export function lock(on: boolean) {
  if (lenis) on ? lenis.stop() : lenis.start();
  document.documentElement.style.overflow = on ? 'hidden' : '';
}

export function remeasure() {
  measure();
}

export function initScroll() {
  if (!reducedMotion) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9, anchors: { offset: -80 } });
  }

  measure();
  let raf = 0;
  let prev = performance.now();

  const loop = (time: number) => {
    const dt = Math.min(0.1, (time - prev) / 1000);
    prev = time;
    lenis?.raf(time);
    const y = lenis ? lenis.scroll : window.scrollY;
    const v = lenis ? lenis.velocity : (y - lastY) / Math.max(dt, 0.001) / 60;
    lastY = y;
    state.velocity += (v - state.velocity) * 0.2;
    update(y);
    for (const fn of listeners) fn(state, time / 1000, dt);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  let t: number;
  const onResize = () => {
    clearTimeout(t);
    t = window.setTimeout(measure, 120);
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('load', measure);
  document.fonts?.ready.then(measure);
  new ResizeObserver(onResize).observe(document.querySelector("main") ?? document.documentElement);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else {
      prev = performance.now();
      raf = requestAnimationFrame(loop);
    }
  });
}
