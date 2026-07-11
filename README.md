# REDLABS — Landing page

Sitio estático, sin build step. Todo lo que necesita está en este repo
(fuentes y librería 3D incluidas): se despliega subiendo la carpeta tal cual
a cualquier hosting estático.

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | La página completa |
| `style.css` | Sistema de marca (rojo `#EE2B24`, tinta `#151110`, papel `#FBFAF9`) |
| `main.js` | Nav, scroll-storytelling, demo de chat, ensamblado del isotipo |
| `hero3d.js` | Escena WebGL del hero (carga diferida; fallback estático si no hay WebGL o hay `prefers-reduced-motion`) |
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

## Pendientes

- [ ] Cargar los casos reales en la sección **Resultados** cuando haya
      métricas (están marcados como `[CASO 1]`, `[CASO 2]`, `[CASO 3]`).
- [ ] Opcional: agregar una imagen `og:image` para compartir en redes.
