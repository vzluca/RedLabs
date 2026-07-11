/* =============================================================
   REDLABS — hero3d.js
   Escena WebGL del hero. El isotipo se ensambla desde sus dos
   piezas y flota en un campo de puntos finos; unas pocas líneas
   convergen en la marca y, cada tanto, una señal viaja por una
   de ellas — la metáfora de la automatización, sin ruido visual.
   Todo con física de resorte; nada lineal.
   ============================================================= */

import * as THREE from './vendor/three.module.min.js';

const RED = 0xEE2B24;
const INK = 0x060505;
const PAPER = 0xFBFAF9;

/* resorte sub-amortiguado genérico */
function spring(obj, key, target, k, d, dt) {
  const velKey = '_v_' + key;
  const v = obj[velKey] || 0;
  const acc = -k * (obj[key] - target) - d * v;
  obj[velKey] = v + acc * dt;
  obj[key] += obj[velKey] * dt;
}

const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function extrude(shape, depth) {
  return new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: .014, bevelSize: .014, bevelSegments: 1,
  });
}

/* isotipo: los dos polígonos exactos del logo, extruidos */
const R_POLY = [[728, 120], [283, 120], [121, 339], [120, 1208], [361, 1208], [361, 341], [574, 331]];
const C_POLY = [[814, 120], [432, 647], [817, 1208], [1079, 1208], [695, 652], [1072, 120]];

function markShape(poly) {
  const s = 3.1 / 1329, cx = 600, cy = 664;
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

  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false });
  renderer.setClearColor(INK, 1);
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(INK, 12, 26);

  const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, .1, 44);
  camera.position.set(0, 0, 13);

  scene.add(new THREE.AmbientLight(0xFFF6EE, .55));
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.55);
  key.position.set(4, 6, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xBFCAFF, .35);
  fill.position.set(-6, -2, 4);
  scene.add(fill);
  const warm = new THREE.PointLight(RED, 2.4, 11, 1.7);
  scene.add(warm);

  /* ---- isotipo: dos piezas que se ensamblan al cargar ---- */
  const markMat = new THREE.MeshStandardMaterial({
    color: RED, roughness: .34, metalness: .12,
    emissive: RED, emissiveIntensity: .1, transparent: true, opacity: 0,
  });
  const pieceR = new THREE.Mesh(extrude(markShape(R_POLY), .32), markMat);
  const pieceC = new THREE.Mesh(extrude(markShape(C_POLY), .32), markMat.clone());
  const markGroup = new THREE.Group();
  markGroup.add(pieceR, pieceC);
  const markBase = mobile ? { x: .1, y: 3.5, s: .66 } : { x: 2.9, y: .1, s: 1.05 };
  markGroup.position.set(markBase.x, markBase.y, 0);
  markGroup.scale.setScalar(markBase.s);
  scene.add(markGroup);
  warm.position.set(markBase.x, markBase.y, 2);

  // estado de ensamblado (resortes): las piezas entran desde los lados
  const asm = { rx: -2.4, cx: 2.4, started: false };
  setTimeout(() => { asm.started = true; }, 320);

  /* ---- campo de puntos finos (profundidad, no relleno) ---- */
  const COUNT = mobile ? 70 : 150;
  const pPos = new Float32Array(COUNT * 3);
  const pBase = new Float32Array(COUNT * 3);
  const pPhase = new Float32Array(COUNT);
  const spreadX = mobile ? 7 : 13, spreadY = 9, spreadZ = 7;
  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * spreadX;
    const y = (Math.random() - 0.5) * spreadY;
    const z = (Math.random() - 0.5) * spreadZ - 1.5;
    pBase[i * 3] = x; pBase[i * 3 + 1] = y; pBase[i * 3 + 2] = z;
    pPos[i * 3] = x; pPos[i * 3 + 1] = y; pPos[i * 3 + 2] = z;
    pPhase[i] = Math.random() * Math.PI * 2;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  const pMat = new THREE.PointsMaterial({
    color: PAPER, size: mobile ? .028 : .034, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  /* ---- anclas + líneas que convergen en el isotipo ---- */
  const ANCHORS = mobile ? 4 : 7;
  const LINE_PTS = 34;
  const lines = [];
  for (let i = 0; i < ANCHORS; i++) {
    const ang = (i / ANCHORS) * Math.PI * 2 + Math.random() * .5;
    const rad = (mobile ? 3.2 : 5.2) + Math.random() * 1.6;
    const anchor = new THREE.Vector3(
      markBase.x + Math.cos(ang) * rad,
      markBase.y + Math.sin(ang) * rad * .72,
      -1 - Math.random() * 2.4
    );
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_PTS * 3), 3));
    const m = new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0 });
    const line = new THREE.Line(geo, m);
    line.frustumCulled = false;
    scene.add(line);
    lines.push({ line, geo, m, anchor, cur: anchor.clone(), phase: Math.random() * Math.PI * 2, baseOpacity: .1, glow: 0 });
  }

  /* pulso de automatización (una señal que viaja por una línea) */
  const pulseMesh = new THREE.Mesh(
    new THREE.SphereGeometry(.05, 12, 12),
    new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0 })
  );
  scene.add(pulseMesh);
  const pulse = { active: false, t: 0, idx: 0 };
  let emissiveBlip = 0;

  function startPulse() {
    if (pulse.active || document.hidden || !running) return;
    pulse.active = true;
    pulse.t = 0;
    pulse.idx = Math.floor(Math.random() * lines.length);
  }
  setTimeout(startPulse, 2400);
  const pulseTimer = setInterval(() => { if (!pulse.active) startPulse(); }, 4200);

  /* ---- interacción ---- */
  const mouse = { x: 0, y: 0 };
  const onMove = e => {
    const px = e.touches ? e.touches[0].clientX : e.clientX;
    const py = e.touches ? e.touches[0].clientY : e.clientY;
    mouse.x = (px / innerWidth) * 2 - 1;
    mouse.y = (py / innerHeight) * 2 - 1;
  };
  addEventListener('pointermove', onMove, { passive: true });

  let scrollP = 0;
  const onScroll = () => {
    scrollP = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight * .9)));
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- visibilidad: pausar cuando el hero no se ve ---- */
  let running = true, rafId = 0;
  new IntersectionObserver(entries => {
    const vis = entries[0].isIntersecting;
    if (vis && !running) { running = true; last = performance.now(); rafId = requestAnimationFrame(tick); }
    running = vis;
    if (!vis) cancelAnimationFrame(rafId);
  }).observe(container);

  const onResize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', onResize, { passive: true });

  /* ---- cámara con resorte ---- */
  const cam = { x: 0, y: 0, z: 13 };
  const tmpV = new THREE.Vector3();
  const midV = new THREE.Vector3();
  const pV = new THREE.Vector3();

  function bezierAt(a, mid, b, u, out) {
    const iu = 1 - u;
    out.set(
      iu * iu * a.x + 2 * iu * u * mid.x + u * u * b.x,
      iu * iu * a.y + 2 * iu * u * mid.y + u * u * b.y,
      iu * iu * a.z + 2 * iu * u * mid.z + u * u * b.z
    );
    return out;
  }

  let last = performance.now();
  function tick(now) {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const t = now / 1000;

    /* ensamblado inicial del isotipo */
    if (asm.started) {
      spring(asm, 'rx', 0, 44, 7, dt);
      spring(asm, 'cx', 0, 44, 6.5, dt);
    }
    pieceR.position.x = asm.rx;
    pieceC.position.x = asm.cx;
    const asmProg = 1 - Math.min(1, (Math.abs(asm.rx) + Math.abs(asm.cx)) / 4.8);
    pieceR.material.opacity = Math.min(1, asmProg * 1.6 + (asm.started ? .12 : 0));
    pieceC.material.opacity = pieceR.material.opacity;

    /* isotipo: flota y mira suavemente al cursor */
    markGroup.position.y = markBase.y + Math.sin(t * .5) * .08;
    spring(markGroup.rotation, 'y', mouse.x * .26, 28, 8, dt);
    spring(markGroup.rotation, 'x', mouse.y * .13, 28, 8, dt);

    emissiveBlip *= Math.pow(.03, dt); // decae rápido
    pieceR.material.emissiveIntensity = .1 + emissiveBlip * .6;
    pieceC.material.emissiveIntensity = pieceR.material.emissiveIntensity;

    /* fade-in global de puntos y líneas */
    const revealed = asm.started ? Math.min(1, pMat.opacity / .55 + dt * .5) : 0;

    /* campo de puntos: deriva lenta + parallax al cursor */
    pMat.opacity = revealed * .55;
    const drift = mobile ? 0 : .35;
    for (let i = 0; i < COUNT; i++) {
      const bx = pBase[i * 3], by = pBase[i * 3 + 1], bz = pBase[i * 3 + 2];
      const ph = pPhase[i];
      const depth = (bz + spreadZ / 2) / spreadZ; // 0 lejos → 1 cerca
      pPos[i * 3]     = bx + Math.sin(t * .18 + ph) * .12 + mouse.x * drift * (.3 + depth);
      pPos[i * 3 + 1] = by + Math.cos(t * .15 + ph) * .12 - mouse.y * drift * (.25 + depth);
      pPos[i * 3 + 2] = bz;
    }
    pGeo.attributes.position.needsUpdate = true;

    /* convergencia por scroll: la marca "traga" las líneas */
    const conv = easeInOut(scrollP) * .55;

    lines.forEach((L, i) => {
      // el ancla respira un poco y se atrae hacia la marca con el scroll
      tmpV.copy(L.anchor);
      tmpV.x += Math.sin(t * .3 + L.phase) * .18 + mouse.x * .3;
      tmpV.y += Math.cos(t * .26 + L.phase) * .16 - mouse.y * .24;
      tmpV.lerp(markGroup.position, conv);
      L.cur.lerp(tmpV, Math.min(1, dt * 3));

      const a = L.cur, b = markGroup.position;
      midV.copy(a).add(b).multiplyScalar(.5);
      midV.y += (i % 2 ? -.5 : .5);
      midV.z += -.5;
      const pos = L.geo.attributes.position.array;
      for (let j = 0; j < LINE_PTS; j++) {
        bezierAt(a, midV, b, j / (LINE_PTS - 1), pV);
        pos[j * 3] = pV.x; pos[j * 3 + 1] = pV.y; pos[j * 3 + 2] = pV.z;
      }
      L.geo.attributes.position.needsUpdate = true;
      L.glow *= Math.pow(.05, dt);
      const target = (L.baseOpacity + conv * .22) * revealed + L.glow;
      L.m.opacity += (target - L.m.opacity) * Math.min(1, dt * 8);
    });

    /* pulso: una señal viaja por una línea hasta la marca */
    if (pulse.active) {
      pulse.t += dt / 1.15;
      const L = lines[pulse.idx];
      L.glow = .38;
      if (pulse.t >= 1) {
        pulse.active = false;
        pulseMesh.material.opacity = 0;
        emissiveBlip = 1; // la marca "recibe" la señal
      } else {
        const u = easeInOut(pulse.t);
        const a = L.cur, b = markGroup.position;
        midV.copy(a).add(b).multiplyScalar(.5);
        midV.y += (pulse.idx % 2 ? -.5 : .5);
        midV.z += -.5;
        bezierAt(a, midV, b, u, pulseMesh.position);
        pulseMesh.material.opacity = Math.min(1, pulse.t * 6) * (1 - Math.max(0, pulse.t - .82) / .18);
      }
    }

    /* cámara */
    spring(cam, 'x', mouse.x * .5, 20, 7, dt);
    spring(cam, 'y', -mouse.y * .32, 20, 7, dt);
    spring(cam, 'z', 13 - easeInOut(scrollP) * 1.5, 20, 7, dt);
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(mobile ? 0 : 1.2, mobile ? 1.5 : 0, 0);

    renderer.render(scene, camera);
  }

  container.classList.add('on');
  rafId = requestAnimationFrame(tick);

  /* limpieza si la página se descarta */
  addEventListener('pagehide', () => {
    clearInterval(pulseTimer);
    cancelAnimationFrame(rafId);
    renderer.dispose();
  }, { once: true });
}
