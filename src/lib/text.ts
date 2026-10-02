/**
 * Utilidades de texto.
 * Los datos pendientes de confirmar van entre corchetes en site.json / menus.json
 * ([Ciudad], [XX] €…). `mark` los envuelve en <span class="ph"> para que se vean
 * como marcadores mientras el restaurante no facilite el dato real.
 */
const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function mark(text: string): string {
  return escape(text).replace(/\[([^\]]+)\]/g, '<span class="ph">[$1]</span>');
}

/** Texto plano sin corchetes, para atributos (alt, meta) cuando conviene. */
export function plain(text: string): string {
  return text.replace(/\[([^\]]+)\]/g, '$1');
}

/** Rellena una plantilla con {clave} usando los datos del sitio. */
export function fill(template: string, data: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(data[k] ?? `{${k}}`));
}
