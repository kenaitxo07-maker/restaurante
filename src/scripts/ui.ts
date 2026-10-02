/**
 * Interacciones de interfaz: apariciones, cabecera, menú móvil, cursor,
 * botones magnéticos, tarjetas con relieve y fotos con paralaje.
 */
import { onFrame, lock, state } from './scroll';
import { clamp, finePointer, reducedMotion } from './env';

/* ---------- Apariciones al entrar en pantalla ---------- */
export function initReveals() {
  const targets = document.querySelectorAll<HTMLElement>('[data-reveal], [data-photo], .split');
  if (!('IntersectionObserver' in window) || reducedMotion) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  targets.forEach((el) => io.observe(el));
}

/* ---------- Cabecera, menú móvil y barra inferior ---------- */
export function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const bar = document.querySelector<HTMLElement>('[data-mobile-bar]');
  const burger = document.querySelector<HTMLButtonElement>('[data-burger]');
  const panel = document.querySelector<HTMLElement>('[data-menu-panel]');
  const isHome = document.body.dataset.scene === 'home';

  let scrolled = false;
  let barOn = false;
  onFrame((s) => {
    const sc = s.y > 40;
    if (sc !== scrolled) header?.classList.toggle('is-scrolled', (scrolled = sc));
    const on = s.y > (isHome ? s.vh * 0.6 : 80);
    if (on !== barOn) bar?.classList.toggle('is-visible', (barOn = on));
  });

  if (!burger || !panel) return;
  const label = burger.querySelector('.sr-only');
  const setOpen = (open: boolean) => {
    burger.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open);
    if (label) label.textContent = open ? 'Cerrar menú' : 'Abrir menú';
    lock(open);
    if (open) panel.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
  };
  burger.addEventListener('click', () => setOpen(burger.getAttribute('aria-expanded') !== 'true'));
  panel.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel.classList.contains('is-open')) {
      setOpen(false);
      burger.focus();
    }
  });
}

/* ---------- Cursor dorado ---------- */
export function initCursor() {
  const cursor = document.querySelector<HTMLElement>('[data-cursor]');
  if (!cursor || !finePointer) return;
  const ring = cursor.querySelector<HTMLElement>('.cursor__ring')!;
  const dot = cursor.querySelector<HTMLElement>('.cursor__dot')!;
  const labelEl = cursor.querySelector<HTMLElement>('[data-cursor-label]')!;
  let x = -100, y = -100, rx = -100, ry = -100;

  window.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    cursor.classList.remove('is-hidden');
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.add('is-hidden'));

  document.addEventListener('pointerover', (e) => {
    const t = e.target as HTMLElement;
    const labelled = t.closest<HTMLElement>('[data-cursor-label]');
    const link = t.closest('a, button, select, label, input, textarea');
    cursor.classList.toggle('is-link', !!link);
    const text = !link && labelled ? labelled.dataset.cursorLabel ?? '' : '';
    cursor.classList.toggle('has-label', !!text);
    labelEl.textContent = text;
  });

  onFrame(() => {
    rx += (x - rx) * 0.16;
    ry += (y - ry) * 0.16;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
  });
}

/* ---------- Botones magnéticos ---------- */
export function initMagnetic() {
  if (!finePointer || reducedMotion) return;
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    el.style.transition += ', transform 600ms cubic-bezier(.16,1,.3,1)';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.style.transform = `translate3d(${dx * 10}px, ${dy * 8}px, 0)`;
    });
    el.addEventListener('pointerleave', () => (el.style.transform = ''));
  });
}

/* ---------- Tarjetas con relieve (siguen al cursor) ---------- */
export function initTilt() {
  if (!finePointer || reducedMotion) return;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${(px - 0.5) * 8}deg`);
      el.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    });
  });
}

/* ---------- Fotos: paralaje y zoom lento (1.00 → 1.05) ---------- */
export function initPhotos() {
  if (reducedMotion) return;
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-photo][data-parallax]'));
  if (!items.length) return;
  const visible = new Set<HTMLElement>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) e.isIntersecting ? visible.add(e.target as HTMLElement) : visible.delete(e.target as HTMLElement);
  });
  items.forEach((el) => io.observe(el));
  onFrame((s) => {
    for (const el of visible) {
      const r = el.getBoundingClientRect();
      const p = clamp((s.vh - r.top) / (s.vh + r.height));
      const media = el.firstElementChild as HTMLElement;
      media.style.setProperty('--py', `${((p - 0.5) * -r.height * 0.1).toFixed(1)}px`);
      media.style.setProperty('--zoom', (1 + p * 0.05).toFixed(4));
    }
  });
}

/* ---------- Telón de entrada ---------- */
export function initIntro() {
  const intro = document.querySelector<HTMLElement>('div[data-intro]');
  if (!intro) return;
  if (!document.documentElement.classList.contains('first-visit')) {
    intro.remove();
    return;
  }
  try { sessionStorage.setItem('aurea-intro', '1'); } catch {}
  window.setTimeout(() => {
    intro.classList.add('is-done');
    window.setTimeout(() => intro.remove(), 1400);
  }, reducedMotion ? 0 : 1500);
}

/* ---------- Analítica: clic en «Reservar mesa» ---------- */
export function initCtaTracking() {
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-cta]');
    if (!el) return;
    const w = window as Window & { plausible?: (ev: string, o?: object) => void; gtag?: (...a: unknown[]) => void };
    const props = { cta: el.dataset.cta, page: location.pathname };
    const call = el.dataset.cta === 'call';
    w.plausible?.(call ? 'Llamar' : 'Reservar mesa', { props });
    w.gtag?.('event', call ? 'llamar' : 'reservar_mesa', props);
  });
}

export { state };
