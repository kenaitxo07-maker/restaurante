/**
 * Relato de la página de inicio: la promesa que se ilumina palabra a palabra,
 * los tres pilares, el reloj de la noche del menú degustación y la galería
 * horizontal. Funciona con o sin la escena 3D.
 */
import { onFrame, scrollTo, state } from './scroll';
import { clamp, range } from './env';

function wrapWords(el: HTMLElement) {
  const out: HTMLElement[] = [];
  const nodes = Array.from(el.childNodes);
  el.textContent = '';
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = (node.textContent ?? '').split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) el.append(part);
        else {
          const s = document.createElement('span');
          s.className = 'sw';
          s.textContent = part;
          el.append(s);
          out.push(s);
        }
      }
    } else {
      const s = document.createElement('span');
      s.className = 'sw';
      s.append(node);
      el.append(s);
      out.push(s);
    }
  }
  return out;
}

function initPromise() {
  const el = document.querySelector<HTMLElement>('[data-scrub-words]');
  if (!el) return;
  const words = wrapWords(el);
  // «Pocas, a propósito.» se queda en oro: es la frase que explica la casa.
  const i = words.findIndex((w) => w.textContent === 'Pocas,');
  if (i >= 0) words.slice(i, i + 3).forEach((w) => w.classList.add('hl'));
  let lit = -1;
  onFrame((s) => {
    const shot = s.get('promesa');
    if (!shot) return;
    const n = Math.round(range(shot.pin, 0.02, 0.72) * words.length);
    if (n === lit) return;
    lit = n;
    words.forEach((w, k) => w.classList.toggle('on', k < n));
  });
}

function initPillars() {
  const items = document.querySelectorAll<HTMLElement>('[data-pillar]');
  const dots = document.querySelectorAll<HTMLElement>('[data-pillar-dot]');
  if (!items.length) return;
  let active = -1;
  onFrame((s) => {
    const p = s.get('pilares')?.pin ?? 0;
    const idx = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
    dots.forEach((d, k) => d.style.setProperty('--fill', clamp((p - k / 3) * 3).toFixed(3)));
    if (idx === active) return;
    active = idx;
    items.forEach((it, k) => {
      it.classList.toggle('is-active', k === idx);
      it.classList.toggle('is-past', k < idx);
      it.setAttribute('aria-hidden', String(k !== idx));
    });
    dots.forEach((d, k) => d.classList.toggle('is-active', k === idx));
  });
}

const toMin = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(Math.floor(m % 60)).padStart(2, '0')}`;

/** Márgenes del recorrido dentro de la sección fijada del menú. */
export const MENU_IN = 0.04;
export const MENU_OUT = 0.94;

function initMenu() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-course]'));
  if (!buttons.length) return;
  const clock = document.querySelector<HTMLElement>('[data-clock]')!;
  const passN = document.querySelector<HTMLElement>('[data-pass-n]')!;
  const name = document.querySelector<HTMLElement>('[data-course-name]')!;
  const desc = document.querySelector<HTMLElement>('[data-course-desc]')!;
  const box = name.parentElement!;
  const n = buttons.length;
  const times = buttons.map((b) => toMin(b.dataset.courseTime!));
  times.push(times[n - 1] + 25);
  buttons[0].closest('ol')?.style.setProperty('--n', String(n));

  let active = -1;
  let lastClock = '';
  let swap = 0;

  onFrame((s) => {
    const shot = s.get('menu');
    if (!shot) return;
    const f = range(shot.pin, MENU_IN, MENU_OUT) * n;
    const idx = Math.min(n - 1, Math.floor(f));
    const frac = clamp(f - idx);
    const t = fmt(times[idx] + (times[idx + 1] - times[idx]) * frac);
    if (t !== lastClock) clock.textContent = lastClock = t;
    if (idx === active) return;
    active = idx;
    passN.textContent = String(idx + 1).padStart(2, '0');
    buttons.forEach((b, k) => {
      b.classList.toggle('is-active', k === idx);
      b.classList.toggle('is-done', k < idx);
      b.setAttribute('aria-current', k === idx ? 'step' : 'false');
    });
    box.classList.add('is-changing');
    clearTimeout(swap);
    swap = window.setTimeout(() => {
      const b = buttons[idx];
      name.textContent = b.dataset.courseN!;
      desc.innerHTML = b.dataset.courseD!.replace(/\[([^\]]+)\]/g, '<span class="ph">[$1]</span>');
      box.classList.remove('is-changing');
    }, 280);
  });

  buttons.forEach((b, k) =>
    b.addEventListener('click', () => {
      const shot = state.get('menu');
      if (!shot) return;
      const p = MENU_IN + ((k + 0.5) / n) * (MENU_OUT - MENU_IN);
      scrollTo(shot.top + p * (shot.height - state.vh));
    }),
  );
}

function initGallery() {
  const track = document.querySelector<HTMLElement>('[data-gallery-track]');
  if (!track) return;
  const count = document.querySelector<HTMLElement>('[data-gallery-count]');
  const bar = document.querySelector<HTMLElement>('[data-gallery-bar]');
  const mq = window.matchMedia('(max-width: 760px)');
  const items = track.children.length;
  let width = 0;
  const measure = () => (width = Math.max(0, track.scrollWidth - window.innerWidth));
  measure();
  window.addEventListener('resize', measure);
  window.addEventListener('load', measure);
  let last = -1;
  onFrame((s) => {
    if (mq.matches) {
      track.style.transform = '';
      return;
    }
    const p = s.get('galeria')?.pin ?? 0;
    const e = range(p, 0.05, 0.95);
    track.style.transform = `translate3d(${(-e * width).toFixed(1)}px, 0, 0)`;
    bar?.style.setProperty('--p', e.toFixed(3));
    const c = Math.min(items, 1 + Math.floor(e * items));
    if (c !== last && count) count.textContent = String((last = c)).padStart(2, '0');
  });
}

export function initHome() {
  initPromise();
  initPillars();
  initMenu();
  initGallery();
}
