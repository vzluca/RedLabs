/* =============================================================
   REDLABS — hero3d.js · El isotipo como objeto físico
   Una sola pieza roja, con luz de estudio, que se ensambla al
   cargar y flota en un espacio casi vacío. Se puede AGARRAR y
   girar con el cursor o el dedo; al soltar, sigue con inercia y
   retoma un giro lento. Menos escena, más objeto — puro aire.
   ============================================================= */

import * as THREE from './vendor/three.module.min.js';

const RED = 0xEE2B24;
const INK = 0x050403;
const PAPER = 0xFAF9F7;

function spring(obj, key, target, k, d, dt) {
  const velKey = '_v_' + key;
  const v = obj[velKey] || 0;
  const acc = -k * (obj[key] - target) - d * v;
  obj[velKey] = v + acc * dt;
  obj[key] += obj[velKey] * dt;
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

function extrude(shape, depth) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2 });
}
const R_POLY = [[728, 120], [283, 120], [121, 339], [120, 1208], [361, 1208], [361, 341], [574, 331]];
const C_POLY = [[814, 120], [432, 647], [817, 1208], [1079, 1208], [695, 652], [1072, 120]];
function markShape(poly) {
  const s = 3.4 / 1329, cx = 600, cy = 664;
  const shape = new THREE.Shape();
  poly.forEach(([x, y], i) => {
    const px = (x - cx) * s, py = -(y - cy) * s;
    i === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py);
  });
  return shape;
}

export function initHero(container) {
  const mobile = matchMedia('(max-width: 720px)').matches;
  const hero = container.closest('.hero');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setClearColor(INK, 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.6 : 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(INK, 12, 30);
  const camera = new THREE.PerspectiveCamera(34, container.clientWidth / container.clientHeight, .1, 50);
  camera.position.set(0, 0, 12);

  scene.add(new THREE.AmbientLight(0xFFF4EA, .5));
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.7);
  key.position.set(4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0xFF6A5A, .9);
  rim.position.set(-5, 2, -6); scene.add(rim);
  const fill = new THREE.DirectionalLight(0xAFC0FF, .28);
  fill.position.set(-4, -4, 5); scene.add(fill);

  /* ---- isotipo (dos piezas, una sola voluntad) ---- */
  const markMat = new THREE.MeshStandardMaterial({ color: RED, roughness: .33, metalness: .22, emissive: RED, emissiveIntensity: .1, transparent: true, opacity: 0 });
  const pieceR = new THREE.Mesh(extrude(markShape(R_POLY), .4), markMat);
  const pieceC = new THREE.Mesh(extrude(markShape(C_POLY), .4), markMat.clone());
  const spin = new THREE.Group();           // recibe la rotación interactiva
  spin.add(pieceR, pieceC);
  const mark = new THREE.Group();            // posición/flotación
  mark.add(spin);
  const base = mobile ? { x: 0, y: 2.7, s: .86 } : { x: 2.7, y: .05, s: 1.12 };
  mark.position.set(base.x, base.y, 0);
  mark.scale.setScalar(base.s);
  scene.add(mark);

  const asm = { rx: -2.6, cx: 2.6, started: false };
  setTimeout(() => { asm.started = true; }, 300);

  /* ---- campo de puntos tenue (solo profundidad) ---- */
  const N = mobile ? 40 : 70;
  const pArr = new Float32Array(N * 3), pBase = new Float32Array(N * 3), pPh = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = (Math.random() - .5) * 20, y = (Math.random() - .5) * 12, z = (Math.random() - .5) * 8 - 3;
    pArr[i * 3] = pBase[i * 3] = x; pArr[i * 3 + 1] = pBase[i * 3 + 1] = y; pArr[i * 3 + 2] = pBase[i * 3 + 2] = z;
    pPh[i] = Math.random() * Math.PI * 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
  const pMat = new THREE.PointsMaterial({ color: PAPER, size: .022, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false });
  const pts = new THREE.Points(pGeo, pMat); pts.frustumCulled = false; scene.add(pts);

  /* ---- rotación interactiva con inercia ---- */
  const rot = { y: -.35, x: .05, vy: 0, vx: 0 };
  const AUTOSPIN = 0.0026, SENS = 0.0085;    // giro constante, siempre igual
  const lean = { x: 0, z: 0 };                // inclinación hacia el cursor
  let dragging = false, lastX = 0, lastY = 0, everDragged = false;
  const canvas = renderer.domElement;

  function down(e) {
    dragging = true;
    everDragged = true;
    container.classList.add('grabbing');
    lastX = e.clientX; lastY = e.clientY;
    rot.vy = rot.vx = 0;
    emissive = 1;
    dispatchEvent(new CustomEvent('rl:herodrag'));
  }
  function move(e) {
    if (!dragging) { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; return; }
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    rot.y += dx * SENS; rot.vy = dx * SENS;
    rot.x = clamp(rot.x + dy * SENS, -1.0, 1.0); rot.vx = dy * SENS;
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    container.classList.remove('grabbing');
  }
  canvas.addEventListener('pointerdown', down);
  addEventListener('pointermove', move, { passive: true });
  addEventListener('pointerup', up, { passive: true });

  const mouse = { x: 0, y: 0 };
  let emissive = 0;

  let scrollP = 0;
  const onScroll = () => { scrollP = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * .9))); };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  let running = true, rafId = 0;
  new IntersectionObserver(es => {
    const vis = es[0].isIntersecting;
    if (vis && !running) { running = true; last = performance.now(); rafId = requestAnimationFrame(tick); }
    running = vis;
    if (!vis) cancelAnimationFrame(rafId);
  }).observe(container);

  addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }, { passive: true });

  const cam = { x: 0, y: 0, z: 12 };
  let last = performance.now();

  function tick(now) {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const t = now / 1000;

    /* ensamblado */
    if (asm.started) { spring(asm, 'rx', 0, 42, 7, dt); spring(asm, 'cx', 0, 42, 6.5, dt); }
    pieceR.position.x = asm.rx; pieceC.position.x = asm.cx;
    const asmProg = 1 - Math.min(1, (Math.abs(asm.rx) + Math.abs(asm.cx)) / 5.2);
    pieceR.material.opacity = pieceC.material.opacity = Math.min(1, asmProg * 1.6 + (asm.started ? .12 : 0));

    /* rotación: arrastre directo, o inercia + giro constante */
    if (!dragging) {
      rot.y += rot.vy + AUTOSPIN;
      rot.vy *= 0.95;
      rot.x += rot.vx; rot.vx *= 0.9;
      rot.x += (0 - rot.x) * 0.018;   // vuelve suave al nivel
    }
    spin.rotation.y = rot.y;
    spin.rotation.x = rot.x;

    /* además de girar, el objeto se inclina hacia el cursor */
    const lx = dragging ? 0 : mouse.y * .2, lz = dragging ? 0 : -mouse.x * .16;
    spring(lean, 'x', lx, 24, 8, dt);
    spring(lean, 'z', lz, 24, 8, dt);
    mark.rotation.x = lean.x;
    mark.rotation.z = lean.z;

    /* flotación + brillo de feedback */
    mark.position.y = base.y + Math.sin(t * .5) * .09;
    emissive = Math.max(0, emissive - dt * 1.4);
    pieceR.material.emissiveIntensity = pieceC.material.emissiveIntensity = .1 + emissive * .5 + Math.abs(rot.vy) * 6;

    /* puntos tenues */
    const reveal = asm.started ? Math.min(1, pMat.opacity / .24 + dt * .5) : 0;
    pMat.opacity = reveal * .24;
    for (let i = 0; i < N; i++) {
      pArr[i * 3] = pBase[i * 3] + Math.sin(t * .16 + pPh[i]) * .1 + (dragging ? 0 : mouse.x * .25);
      pArr[i * 3 + 1] = pBase[i * 3 + 1] + Math.cos(t * .13 + pPh[i]) * .1 - (dragging ? 0 : mouse.y * .18);
      pArr[i * 3 + 2] = pBase[i * 3 + 2];
    }
    pGeo.attributes.position.needsUpdate = true;

    /* cámara: parallax sutil (solo sin arrastrar) + dolly al scroll */
    const mx = dragging ? 0 : mouse.x, my = dragging ? 0 : mouse.y;
    spring(cam, 'x', mx * .4, 18, 7, dt);
    spring(cam, 'y', -my * .26, 18, 7, dt);
    spring(cam, 'z', 12 - scrollP * 1.4, 18, 7, dt);
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(mobile ? 0 : base.x * .5, mobile ? 1.2 : 0, 0);

    renderer.render(scene, camera);
  }

  container.classList.add('on');
  setTimeout(() => dispatchEvent(new CustomEvent('rl:heroready')), 900);
  rafId = requestAnimationFrame(tick);

  addEventListener('pagehide', () => { clearInterval(boostTimer); cancelAnimationFrame(rafId); renderer.dispose(); }, { once: true });
}
