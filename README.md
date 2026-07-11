# REDLABS — Landing page

Sitio estático, sin build step. Todo lo que necesita está en este repo
(fuentes y librería 3D incluidas): se despliega subiendo la carpeta tal cual
a cualquier hosting estático.

## Concepto — "El flujo"

La página está pensada como un **canvas de automatización vivo**, en la
misma línea de lo que hace REDLABS con n8n: nodos, cables y señales.
El hero es un workflow en 3D (nodos-tarjeta conectados al isotipo, que
oficia de nodo "cerebro", con señales que lo recorren) y un **riel de
flujo** lateral marca el avance por las secciones. Tipografía: titulares
en Instrument Sans (liviana, editorial) y Tomorrow reservada para la
"chrome" técnica (labels, números, botones).

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | La página completa |
| `style.css` | Sistema de marca (rojo `#EE2B24`, tinta `#0B0908`, papel `#FBFAF9`) + riel de flujo |
| `main.js` | Nav, riel de flujo + progreso de scroll, scroll-storytelling, demo de chat, ensamblado del isotipo |
| `hero3d.js` | Hero WebGL: canvas de workflow (nodos-tarjeta + cables bézier + isotipo "cerebro" + señales que recorren el grafo). Carga diferida; fallback estático si no hay WebGL o hay `prefers-reduced-motion` |
| `vendor/three.module.min.js` | Three.js 0.170 venderizado |
| `assets/fonts/` | Tomorrow 500–800 e Instrument Sans 400–700, self-hosted (woff2) |
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
