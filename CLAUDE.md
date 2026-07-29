# REDLABS — guía del proyecto

Sitio estático (sin build): `index.html`, `style.css`, `main.js`, `hero3d.js`,
`assets/`. Se deploya solo en Vercel (proyecto **red-labs**, dominio
**redlabs.digital**) con cada push. La identidad es intocable: **logo R+chevron**
y **rojo `#EE2B24`**.

---

## Estándares OBLIGATORIOS para páginas web ("definición de terminado")

Aplicar SIEMPRE, sin que haga falta pedirlo, en cualquier trabajo de sitio o
landing. Antes de dar algo por terminado, tiene que cumplir todo esto.

### 1. Consistencia entre sistemas (Windows / Mac / Linux)
- El layout **no debe depender de la fuente del sistema**. Para tablas/planillas
  o cualquier componente con texto técnico usar `table-layout: fixed` con anchos
  por columna; nunca confiar en el ancho de la monoespaciada (SF Mono en Mac vs
  Consolas/Cascadia en Windows), porque descuadra.
- Tener en cuenta la **barra de scroll de Windows** (~15px, no-overlay): usar
  `scrollbar-gutter: stable` cuando corresponda; no asumir viewport-overlay.
- Verificar en Windows y Mac (o simular anchos de fuente distintos).

### 2. Responsive
- Mobile-first. Probar como mínimo a **390px** (mobile) y **1440px** (desktop);
  ideal también 768 y 1100.
- **Nunca overflow horizontal** (`documentElement.scrollWidth <= innerWidth`).
- Secciones full-height: `svh`/`dvh` con cuidado por la **barra dinámica** del
  navegador móvil. Si un sticky puede quedar más corto que el viewport real,
  pintar el fondo de la sección padre para que no aparezcan franjas de otro color.
- Touch targets cómodos; menús mobile que entren sin apretarse ni chocar el header.

### 3. Seguridad
- **Nada de secretos privados en el cliente** (tokens/API keys privadas NO). Las
  claves públicas de servicios tipo Web3Forms sí pueden ir en el HTML.
- Links externos con `target="_blank"` **siempre** con `rel="noopener"`.
- Formularios: honeypot anti-bot, validación de campos, servicio de envío
  confiable, y una salida de respaldo (ej. WhatsApp) si el envío falla.
- **Sanitizar** cualquier dato de usuario que se inserte en el DOM (evitar
  `innerHTML` con contenido no confiable).
- Todo por **HTTPS**.

### 4. Accesibilidad
- HTML semántico, `alt` en imágenes, `aria-label` donde haga falta, foco visible
  (`:focus-visible`).
- Respetar `prefers-reduced-motion`: fallback estático para animaciones,
  scroll-stories y 3D.

### 5. Performance / assets
- **Cache-busting** con `?v=<versión>` en CSS/JS, y **subir el número** cada vez
  que cambian, porque los estáticos se cachean fuerte (si no, "no se ven los
  cambios").
- Media pesada: lazy y reproducir **solo en viewport** (IntersectionObserver);
  videos `muted autoplay loop playsinline preload="none"` + `poster`; preload de
  fuentes críticas.
- Fallback si WebGL / features no están disponibles.

### 6. Verificación antes de terminar
- **Sin errores de consola.**
- **Sin overflow horizontal.**
- Probado en **desktop y mobile** (Playwright con `reducedMotion:'no-preference'`
  para no desactivar animaciones/3D).
- Cache-busting actualizado si cambió CSS/JS.

---

## Flujo de trabajo
- Desarrollar en la rama designada; PR **draft**; verificar con Playwright
  (Chromium en `/opt/pw-browsers/chromium`) antes de commitear.
- Servidor local para pruebas: `python3 -m http.server 8000`.
- El proxy del entorno bloquea `*.vercel.app` y hosts externos (403): las pruebas
  end-to-end de deploy/form las confirma el usuario en el sitio real.

> Nota: estos estándares valen para todas las páginas web. Si arranco otro
> proyecto web (otro repo), conviene copiar este mismo `CLAUDE.md`.
