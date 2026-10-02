/**
 * Punto de entrada de todas las páginas.
 */
import { initScroll } from './scroll';
import { initCtaTracking, initCursor, initHeader, initIntro, initMagnetic, initPhotos, initReveals, initTilt } from './ui';
import { initHome } from './home';
import { initCookies } from './cookies';
import { initForms } from './forms';
import { reducedMotion, saveData } from './env';

initIntro();
initScroll();
initHeader();
initReveals();
initCursor();
initMagnetic();
initTilt();
initPhotos();
initHome();
initCookies();
initForms();
initCtaTracking();

/* ---------- Escena 3D: se carga cuando la página ya está pintada ---------- */
function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

const stage = document.querySelector<HTMLElement>('[data-stage]');
const sceneName = document.body.dataset.scene as 'home' | 'table' | 'orbit' | 'rings' | 'none' | undefined;

if (stage && sceneName && sceneName !== 'none' && !reducedMotion && !saveData && supportsWebGL()) {
  const load = () =>
    import('./experience/world')
      .then((m) => m.start(stage, sceneName))
      .catch((err) => console.warn('[Áurea] Escena 3D no disponible:', err));
  const idle = (cb: () => void) =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 300);
  if (document.readyState === 'complete') idle(load);
  else window.addEventListener('load', () => idle(load), { once: true });
}
