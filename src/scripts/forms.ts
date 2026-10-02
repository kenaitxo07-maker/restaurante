/**
 * Formularios: reserva rápida, reserva completa y solicitud de eventos.
 * Si en site.json no hay endpoint configurado, el envío funciona en modo
 * demostración (no se envía nada) para poder revisar el recorrido completo.
 */
import site from '../data/site.json';

const DAY = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const LONG = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseIso = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const longDate = (s: string) => {
  const t = LONG.format(parseIso(s));
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Próximos días con servicio (se saltan los días de cierre). */
function openDays(count: number) {
  const closed = new Set<number>(site.closedWeekdays);
  const out: Date[] = [];
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  while (out.length < count) {
    if (!closed.has(d.getDay())) out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).replace('.', '');
}

/* ---------- Reserva rápida (home) ---------- */
function initQuick() {
  document.querySelectorAll<HTMLSelectElement>('[data-date-select]').forEach((sel) => {
    for (const d of openDays(45)) sel.add(new Option(cap(DAY.format(d)), iso(d)));
  });
}

/* ---------- Validación ---------- */
const MESSAGES: Record<string, string> = {
  valueMissing: 'Este dato es necesario.',
  typeMismatch: 'Revise el formato.',
  patternMismatch: 'Revise el formato.',
  tooShort: 'Es demasiado corto.',
};

function validate(form: HTMLFormElement) {
  let first: HTMLElement | null = null;
  form.querySelectorAll<HTMLElement>('.field, .check, [data-group]').forEach((f) => {
    f.classList.remove('is-invalid');
    f.querySelector('.error')?.remove();
  });
  const controls = Array.from(form.elements).filter(
    (el): el is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
      el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement,
  );
  const seen = new Set<string>();
  for (const c of controls) {
    if (c.type === 'radio') {
      if (seen.has(c.name)) continue;
      seen.add(c.name);
    }
    if (c.validity.valid) continue;
    const wrap = c.closest<HTMLElement>('[data-group], .field, .check');
    if (!wrap) continue;
    wrap.classList.add('is-invalid');
    const key = Object.keys(MESSAGES).find((k) => c.validity[k as keyof ValidityState]);
    const msg = c.dataset.error || (key ? MESSAGES[key] : 'Revise este dato.');
    if (!wrap.querySelector('.error')) {
      const p = document.createElement('p');
      p.className = 'error';
      p.id = `${c.name}-error`;
      p.textContent = msg;
      wrap.append(p);
      c.setAttribute('aria-describedby', p.id);
    }
    c.setAttribute('aria-invalid', 'true');
    first ??= c;
  }
  first?.focus();
  return !first;
}

async function send(endpoint: string, data: Record<string, unknown>) {
  if (!endpoint) {
    // Modo demostración: sin motor de reservas configurado todavía.
    await new Promise((r) => setTimeout(r, 900));
    console.info('[Áurea] Modo demostración. Datos que se enviarían:', data);
    return true;
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(data),
  });
  return res.ok;
}

function setBusy(btn: HTMLButtonElement | null, busy: boolean, label: string) {
  if (!btn) return;
  btn.disabled = busy;
  btn.dataset.label ??= btn.textContent ?? '';
  btn.firstChild!.textContent = busy ? label : btn.dataset.label;
}

/* ---------- Reserva completa ---------- */
function initReservation() {
  const form = document.querySelector<HTMLFormElement>('[data-reservation-form]');
  if (!form) return;
  const params = new URLSearchParams(location.search);

  // Días disponibles como fichas
  const chips = form.querySelector<HTMLElement>('[data-date-chips]');
  const wanted = params.get('fecha');
  if (chips) {
    const days = openDays(28);
    chips.innerHTML = '';
    days.forEach((d, i) => {
      const value = iso(d);
      const label = document.createElement('label');
      label.className = 'day';
      const parts = DAY.formatToParts(d);
      const wd = parts.find((p) => p.type === 'weekday')?.value ?? '';
      const day = parts.find((p) => p.type === 'day')?.value ?? '';
      const mo = parts.find((p) => p.type === 'month')?.value ?? '';
      label.innerHTML = `<input type="radio" name="fecha" value="${value}" ${i === 0 ? 'required data-error="Elija un día."' : ''} /><span><small>${cap(wd)}</small><b>${day}</b><small>${mo.replace('.', '')}</small></span>`;
      chips.append(label);
    });
    const match = wanted && chips.querySelector<HTMLInputElement>(`input[value="${wanted}"]`);
    if (match) {
      match.checked = true;
      requestAnimationFrame(() => match.parentElement?.scrollIntoView({ block: 'nearest', inline: 'center' }));
    }
  }

  const setRadio = (name: string, v: string | null) => {
    if (!v) return;
    const el = form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${CSS.escape(v)}"]`);
    if (el) el.checked = true;
  };
  setRadio('hora', params.get('hora'));
  setRadio('ocasion', params.get('ocasion'));

  // Comensales
  const pax = form.querySelector<HTMLInputElement>('input[name="comensales"]')!;
  const max = Number(pax.max) || site.onlineMaxGuests;
  const fromUrl = Number(params.get('comensales'));
  if (fromUrl >= 1 && fromUrl <= max) pax.value = String(fromUrl);
  form.querySelectorAll<HTMLButtonElement>('[data-step]').forEach((b) =>
    b.addEventListener('click', () => {
      const v = Math.min(max, Math.max(1, Number(pax.value) + Number(b.dataset.step)));
      pax.value = String(v);
      pax.dispatchEvent(new Event('input', { bubbles: true }));
    }),
  );

  // Alergias: si se indican, hace falta el consentimiento de datos de salud
  const allergies = form.querySelector<HTMLTextAreaElement>('textarea[name="alergias"]');
  const health = form.querySelector<HTMLInputElement>('input[name="consentimientoSalud"]');
  const healthWrap = health?.closest<HTMLElement>('.check');
  const syncHealth = () => {
    if (!allergies || !health || !healthWrap) return;
    const on = allergies.value.trim().length > 0;
    health.required = on;
    healthWrap.hidden = !on;
  };
  allergies?.addEventListener('input', syncHealth);
  syncHealth();

  // Resumen en vivo
  const summary = document.querySelector<HTMLElement>('[data-summary]');
  const update = () => {
    if (!summary) return;
    const fd = new FormData(form);
    const f = fd.get('fecha') as string | null;
    const h = fd.get('hora') as string | null;
    const n = Number(fd.get('comensales') || 2);
    const o = (fd.get('ocasion') as string) || '';
    summary.querySelector('[data-sum-date]')!.textContent = f ? longDate(f) : 'Elija un día';
    summary.querySelector('[data-sum-time]')!.textContent = h ? `${h} h` : 'Elija una hora';
    summary.querySelector('[data-sum-pax]')!.textContent = `${n} ${n === 1 ? 'persona' : 'personas'}`;
    const occ = summary.querySelector<HTMLElement>('[data-sum-occasion]')!;
    occ.textContent = o;
    occ.parentElement!.hidden = !o;
    form.querySelector<HTMLElement>('[data-pax-out]')!.textContent = String(n);
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  update();

  const ok = document.querySelector<HTMLElement>('[data-success]')!;
  const ko = document.querySelector<HTMLElement>('[data-failure]')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ko.hidden = true;
    if (!validate(form)) return;
    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    setBusy(btn, true, 'Confirmando…');
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      if (!(await send(site.forms.reservationEndpoint, { tipo: 'reserva', ...data }))) throw new Error('send');
      ok.querySelector('[data-ok-email]')!.textContent = String(data.correo);
      ok.querySelector('[data-ok-date]')!.textContent = longDate(String(data.fecha)).toLowerCase();
      ok.querySelector('[data-ok-time]')!.textContent = String(data.hora);
      form.hidden = true;
      form.closest('.booking__grid')?.classList.add('is-done');
      ok.hidden = false;
      ok.focus();
      ok.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      ko.hidden = false;
      ko.focus();
    } finally {
      setBusy(btn, false, '');
    }
  });
}

/* ---------- Solicitud de eventos ---------- */
function initEvents() {
  const form = document.querySelector<HTMLFormElement>('[data-events-form]');
  if (!form) return;
  const ok = form.parentElement!.querySelector<HTMLElement>('[data-success]')!;
  const ko = form.parentElement!.querySelector<HTMLElement>('[data-failure]')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ko.hidden = true;
    if (!validate(form)) return;
    const btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    setBusy(btn, true, 'Enviando…');
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      if (!(await send(site.forms.eventsEndpoint, { tipo: 'evento', ...data }))) throw new Error('send');
      form.hidden = true;
      ok.hidden = false;
      ok.focus();
    } catch {
      ko.hidden = false;
      ko.focus();
    } finally {
      setBusy(btn, false, '');
    }
  });
}

export function initForms() {
  initQuick();
  initReservation();
  initEvents();
}
