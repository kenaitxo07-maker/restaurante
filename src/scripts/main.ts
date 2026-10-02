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
/**
 * Solo cargamos la escena si hay WebGL con aceleración por hardware.
 * Con renderizado por software (equipos sin GPU, máquinas virtuales) la
 * escena iría a saltos y bloquearía la página: mejor el fondo estático.
 * Añada ?3d a la URL para forzarla al revisar.
 */
function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    if (/[?&](3d|snap)\b/.test(location.search)) return true;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}

const stage = document.querySelector<HTMLElement>('[data-stage]');
const sceneName = document.body.dataset.scene as 'home' | 'table' | 'orbit' | 'rings' | 'none' | undefined;

const without3d = () => document.documentElement.classList.add('no-3d');

if (stage && sceneName && sceneName !== 'none' && !reducedMotion && !saveData && supportsWebGL()) {
  const load = () =>
    import('./experience/world')
      .then((m) => m.start(stage, sceneName) || without3d())
      .catch((err) => {
        without3d();
        console.warn('[Áurea] Escena 3D no disponible:', err);
      });
  const idle = (cb: () => void) =>
    typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(cb, { timeout: 1500 }) : setTimeout(cb, 300);
  if (document.readyState === 'complete') idle(load);
  else window.addEventListener('load', () => idle(load), { once: true });
} else {
  without3d();
}
