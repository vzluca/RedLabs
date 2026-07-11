# REDLABS — Landing page

Sitio estático, sin build step. Todo lo que necesita está en este repo
(fuentes y librería 3D incluidas): se despliega subiendo la carpeta tal cual
a cualquier hosting estático.

## Concepto — "Atelier"

Dirección editorial-tech: mucho aire, tipografía fina y chica, y una voz
**monoespaciada** (del sistema) para la letra técnica — índices, labels,
nav y botones — que le da el carácter de herramienta. El hero trata al
**isotipo como un objeto físico**: una pieza roja con luz de estudio que
se ensambla al cargar y que se puede **agarrar y girar** con el cursor o
el dedo (inercia + giro lento en reposo). Detalles firma: índice lateral
`00–04`, ticker del stack, e inversión de color tinta→papel en "Proceso".

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | La página completa |
| `style.css` | Sistema de marca (rojo `#EE2B24`, tinta `#0A0908`, papel `#FAF9F7`). Titulares en Instrument Sans; letra técnica en monospace del sistema |
| `main.js` | Nav, índice lateral, progreso de scroll, scroll-storytelling, demo de chat, ensamblado del isotipo del CTA, hint del hero |
| `hero3d.js` | Hero WebGL: el isotipo como objeto físico interactivo (se agarra y gira con inercia). Carga diferida; fallback estático si no hay WebGL o hay `prefers-reduced-motion` |
| `vendor/three.module.min.js` | Three.js 0.170 venderizado |
| `assets/fonts/` | Instrument Sans 400–700, self-hosted (woff2) |
| `assets/isotipo.svg` | Isotipo vectorial trazado del original |

## Probar local

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

(Hace falta un servidor porque `main.js` usa módulos ES; abrir el archivo
directo con `file://` no funciona.)

## Contacto configurado

- WhatsApp: `wa.me/5492216234812`
- Mail: `somosredlabs@gmail.com`
- Instagram: `@somosredlabs`

## Formulario de contacto

El formulario del CTA envía a `somosredlabs@gmail.com` vía
[FormSubmit](https://formsubmit.co) (gratuito, sin backend propio).
**Importante**: la primera vez que alguien envíe el formulario, FormSubmit
manda un mail de activación a esa casilla — hay que hacer clic en el link
una única vez para que empiecen a llegar las consultas.

## Pendientes

- [ ] Sección **Resultados** removida por ahora; volver a agregarla cuando
      haya métricas reales de clientes.
- [ ] Opcional: agregar una imagen `og:image` para compartir en redes.
