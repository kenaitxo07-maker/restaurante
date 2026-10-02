# Áurea · Web del restaurante

Web de **Áurea**, restaurante de alta cocina. Concepto visual «Noche dorada»: fondos oscuros y cálidos, mucho aire, detalles en oro apagado y una **experiencia 3D guiada por el scroll** que cuenta la noche del comensal, de la entrada a la sobremesa.

- **Stack:** [Astro](https://astro.build) (HTML estático), [Three.js](https://threejs.org) para la escena 3D, [Lenis](https://lenis.darkroom.engineering) para el desplazamiento suave. Sin frameworks de CSS.
- **Salida:** carpeta `dist/` con HTML, CSS y JS estáticos. Válida para Hostinger, Netlify o Cloudflare Pages.

## Puesta en marcha

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # genera dist/
npm run preview   # sirve dist/ en local
npm run check     # comprobación de tipos
```

Requiere Node 22 o superior.

## Dónde se cambia cada cosa

| Qué | Dónde |
| --- | --- |
| Nombre, ciudad, dirección, teléfono, horario, chef, aforo, políticas | `src/data/site.json` |
| Menú degustación, mediodía, maridajes, bodega, alergias | `src/data/menus.json` |
| Paleta, tipografía, espaciados, movimiento | `src/styles/tokens.css` |
| Textos de cada página | `src/pages/*.astro` |
| Guion de cámara 3D de cada página | `src/scripts/experience/scenes.ts` |
| Objetos 3D (anillos, mesa, copa, vela, platos) | `src/scripts/experience/stations.ts` |

Todo lo que va **entre corchetes** (`[Ciudad]`, `[XX] €`, `[Nombre del chef]`…) es un dato que debe confirmar el restaurante. En la web se muestran subrayados con puntos para que sean fáciles de localizar. Al sustituirlos en los JSON, el subrayado desaparece solo.

> La URL pública está en `site.json` → `url`. Cámbiela por el dominio real: se usa en canonical, Open Graph, JSON-LD y sitemap. Actualice también la línea `Sitemap:` de `public/robots.txt`.

## Experiencia 3D y scroll

La escena WebGL vive en un lienzo fijo detrás del contenido y la cámara sigue un guion anclado a las secciones (`data-shot`):

| Página | Escena | Relato |
| --- | --- | --- |
| Inicio | Recorrido completo | Anillos de oro → la cámara atraviesa el anillo y entra en la sala → mesa (producto, sala con la vela, servicio con la copa que se llena) → reloj de pases del menú degustación con la hora de la noche → dos anillos entrelazados en «Su mesa le espera». |
| La experiencia | Mesa | La cámara recorre plato, vela y copa capítulo a capítulo. |
| Menús y bodega | Reloj de pases | Los platos giran lentamente. |
| Eventos, reservas, contacto | Anillos | Detrás de la cabecera y del cierre. |
| Legales | Ninguna | Fondo crema para lectura. |

Reacciona en tiempo real al cursor (anillos, mesa y llama), a la velocidad del scroll (polvo dorado) y al progreso de cada sección.

**Rendimiento y accesibilidad**

- La escena se descarga **después** de pintar la página (`requestIdleCallback`), así no afecta al LCP. Three.js va en un fragmento aparte (~145 kB gzip); el JS de la página pesa ~13 kB gzip.
- Con `prefers-reduced-motion`, ahorro de datos o sin WebGL **no se carga** la escena: se muestra un fondo cálido estático y todo el contenido funciona igual.
- Calidad adaptativa: si el equipo no llega a 35 fps se reduce la resolución del lienzo. En móvil hay menos partículas y sin antialias.
- Para revisar encuadres sin suavizado añada `?snap` a la URL.

## Fotografía

Mientras no haya fotos reales, cada hueco muestra un marcador con dibujo de línea dorada y la indicación de la foto que va ahí (por ejemplo «Foto 4:5 · Retrato del chef en cocina, luz lateral»). Para poner la foto real, pase `src` al componente `Photo`:

```astro
<Photo ratio="4:5" src="/img/chef.webp" srcset="/img/chef-800.webp 800w, /img/chef-1600.webp 1600w"
  sizes="(max-width: 900px) 100vw, 40vw" width={1600} height={2000}
  alt="Chef de Áurea en la cocina" brief="" />
```

Proporciones: 3:2 sala, 4:5 platos, 1:1 galería. Formatos WebP/AVIF. Encargo recomendado: 12 platos, 6 de sala, 4 de equipo, 3 de bodega.

`public/og-image.jpg` (1200×630) es provisional: sustitúyala por una foto del plato o la sala con el logotipo discreto.

## Reservas y formularios

Los formularios de `/reservas` y `/eventos` envían JSON a los endpoints de `site.json` → `forms`:

```json
"forms": {
  "reservationEndpoint": "https://formspree.io/f/xxxx",
  "eventsEndpoint": "https://formspree.io/f/yyyy"
}
```

Si están vacíos, funcionan en **modo demostración**: validan, muestran el mensaje de éxito y no envían nada (lo indican en la consola).

- **Opción recomendada:** motor de reservas (CoverManager, TheFork Manager, Resy o Tock) incrustado en `/reservas` con el tema de la paleta. En ese caso, cárguelo solo tras el consentimiento de terceros (ver `src/scripts/cookies.ts`).
- **Opción simple:** formulario propio + Formspree/Resend. No hay confirmación automática: cambie la intro de `/reservas` («Confirmamos al instante por correo») por «Le confirmaremos la reserva por correo».

La reserva rápida de la home (día, hora, comensales) lleva a `/reservas` con esos datos ya elegidos. Las tarjetas «En pareja» preseleccionan la ocasión.

## Cookies y analítica

Banner con tres botones de igual peso (Aceptar, Rechazar, Configurar) y enlace «Configurar cookies» en el pie. Nada de terceros se carga sin consentimiento:

- **Mapa** (OpenStreetMap) en `/contacto`: solo con consentimiento de terceros.
- **Analítica:** Plausible si se rellena `site.json` → `analytics.plausibleDomain`. Cada clic en «Reservar mesa» y «Llamar» envía un evento (`data-cta`).

## Opiniones

El bloque «Lo que dicen de Áurea» **no se muestra** mientras `site.json` → `reviews` esté vacío. Añada solo reseñas reales y verificables:

```json
"reviews": [{ "quote": "…", "name": "Nombre", "source": "Google", "url": "https://…" }],
"awards": [{ "name": "Guía …", "logo": "/img/guia.svg" }]
```

## SEO

- Title y description por página según el documento de marca; un único H1 por página (en la home incluye marca y ciudad).
- Canonical, Open Graph (`restaurant.restaurant` en la home), Twitter `summary_large_image`.
- JSON-LD `Restaurant` en la home y `BreadcrumbList` en las internas.
- `sitemap-index.xml` (automático) y `robots.txt`.

## Publicación

- **Hostinger:** suba el contenido de `dist/` a `public_html`. El `.htaccess` incluido sirve URLs limpias (`/experiencia` → `experiencia.html`), fuerza HTTPS, comprime y cachea.
- **Netlify / Cloudflare Pages:** comando `npm run build`, carpeta `dist`. `_headers` define la caché de los recursos.

## Lista de entrega

- [ ] Datos reales del restaurante (nombre, dirección, teléfono, horarios, razón social, NIF) en `site.json`.
- [ ] Fotografía profesional (y vídeo, si se quiere) y `og-image.jpg` definitiva.
- [ ] Menús reales con precios y alérgenos en `menus.json`.
- [ ] Motor de reservas elegido y configurado.
- [ ] Textos legales revisados por un profesional.
- [ ] Dominio, SSL, redirección www y ficha de Google Business Profile con los mismos datos.
- [ ] Pruebas en móvil, tablet y escritorio, y Lighthouse.
