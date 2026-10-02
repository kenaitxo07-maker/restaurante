/**
 * Consentimiento de cookies (LSSI-CE / RGPD).
 * Guarda la elección y avisa al resto de la web con el evento «aurea:consent».
 * Mapa, analítica y motor de reservas solo se cargan con consentimiento.
 */
import site from '../data/site.json';

export interface Consent {
  analytics: boolean;
  thirdParty: boolean;
  date: string;
}
const KEY = 'aurea-consent';

export function getConsent(): Consent | null {
  try {
    return JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch {
    return null;
  }
}

function save(c: Omit<Consent, 'date'>) {
  const full = { ...c, date: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(full));
  } catch {}
  apply(full);
  window.dispatchEvent(new CustomEvent('aurea:consent', { detail: full }));
}

let analyticsLoaded = false;
function apply(c: Consent) {
  if (c.analytics && !analyticsLoaded && site.analytics.plausibleDomain) {
    analyticsLoaded = true;
    const s = document.createElement('script');
    s.defer = true;
    s.dataset.domain = site.analytics.plausibleDomain;
    s.src = site.analytics.plausibleSrc;
    document.head.appendChild(s);
  }
}

/** Mapa de OpenStreetMap: solo con consentimiento de terceros. */
function initMap() {
  const map = document.querySelector<HTMLElement>('[data-map]');
  if (!map) return;
  const load = () => {
    if (map.querySelector('iframe')) return;
    const f = document.createElement('iframe');
    f.src = map.dataset.src!;
    f.title = 'Mapa con la ubicación de Áurea';
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer-when-downgrade';
    map.querySelector('[data-map-placeholder]')?.remove();
    map.append(f);
  };
  if (getConsent()?.thirdParty) load();
  window.addEventListener('aurea:consent', (e) => {
    if ((e as CustomEvent<Consent>).detail.thirdParty) load();
  });
  map.querySelector('[data-map-accept]')?.addEventListener('click', () => {
    save({ analytics: getConsent()?.analytics ?? false, thirdParty: true });
    document.querySelector('[data-cookies]')?.classList.remove('is-open');
  });
}

export function initCookies() {
  initMap();
  const box = document.querySelector<HTMLElement>('[data-cookies]');
  if (!box) return;
  const prefs = box.querySelector<HTMLElement>('[data-cookie-prefs]')!;
  const analytics = box.querySelector<HTMLInputElement>('input[name="analytics"]')!;
  const third = box.querySelector<HTMLInputElement>('input[name="thirdParty"]')!;
  const configBtn = box.querySelector<HTMLButtonElement>('[data-cookie="config"]')!;

  const open = () => {
    const c = getConsent();
    analytics.checked = !!c?.analytics;
    third.checked = !!c?.thirdParty;
    box.classList.add('is-open');
  };
  const close = () => {
    box.classList.remove('is-open');
    prefs.hidden = true;
    configBtn.textContent = 'Configurar';
  };

  const current = getConsent();
  if (current) apply(current);
  else window.setTimeout(open, 1800);

  box.addEventListener('click', (e) => {
    const action = (e.target as HTMLElement).closest<HTMLElement>('[data-cookie]')?.dataset.cookie;
    if (action === 'accept') {
      save({ analytics: true, thirdParty: true });
      close();
    } else if (action === 'reject') {
      save({ analytics: false, thirdParty: false });
      close();
    } else if (action === 'config') {
      if (prefs.hidden) {
        prefs.hidden = false;
        configBtn.textContent = 'Guardar';
      } else {
        save({ analytics: analytics.checked, thirdParty: third.checked });
        close();
      }
    }
  });

  document.querySelectorAll('[data-cookie-open]').forEach((b) =>
    b.addEventListener('click', () => {
      open();
      prefs.hidden = false;
      configBtn.textContent = 'Guardar';
    }),
  );
}
