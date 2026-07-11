/* =============================================================
   REDLABS — hero3d.js
   Escena WebGL del hero: herramientas cotidianas flotando en un
   espacio oscuro, conectadas por líneas finas que convergen en el
   isotipo. Todo se mueve con física de resorte, nada es lineal.
   ============================================================= */

import * as THREE from './vendor/three.module.min.js';

const RED = 0xEE2B24;
const INK = 0x060505;

/* resorte sub-amortiguado genérico */
function spring(obj, key, target, k, d, dt) {
  const velKey = '_v_' + key;
  const v = obj[velKey] || 0;
  const acc = -k * (obj[key] - target) - d * v;
  obj[velKey] = v + acc * dt;
  obj[key] += obj[velKey] * dt;
}

const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* --------- geometrías con la lógica angular de la marca --------- */
function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return s;
}
function docShape(w, h, cut) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(w / 2, h / 2 - cut);
  s.lineTo(w / 2 - cut, h / 2);
  s.lineTo(-w / 2, h / 2);
  return s;
}
function triShape(sz) {
  const s = new THREE.Shape();
  s.moveTo(0, sz * .62);
  s.lineTo(sz * .58, -sz * .38);
  s.lineTo(-sz * .58, -sz * .38);
  return s;
}

function extrude(shape, depth) {
  return new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 1,
  });
}

function mat(color, rough = .55) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: .05, transparent: true, opacity: 0 });
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

/* --------- herramientas: color y silueta, sin logos --------- */
function buildTools(mobile) {
  const defs = [
    {
      id: 'wa', label: 'Respondido al instante',
      pos: mobile ? [-1.15, 5.0, -1.1] : [-5.2, 2.7, -1.4],
      build() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(extrude(roundedRectShape(.92, .78, .22), .14), mat(0x2F9C60, .5));
        const tail = new THREE.Mesh(extrude(triShape(.2), .1), mat(0x2F9C60, .5));
        tail.position.set(-.42, -.5, 0); tail.rotation.z = .6;
        g.add(body, tail);
        return g;
      },
    },
    {
      id: 'sh', label: 'Fila agregada a tu planilla',
      pos: mobile ? [1.2, 5.4, -1.5] : [-1.6, 3.1, -2.2],
      build() {
        const g = new THREE.Group();
        const doc = new THREE.Mesh(extrude(docShape(.78, 1.02, .24), .1), mat(0x2E7D53, .5));
        for (let i = 0; i < 3; i++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(.44, .06, .03), mat(0xCFE3D6, .6));
          bar.position.set(-.06, .26 - i * .24, .09);
          g.add(bar);
        }
        g.add(doc);
        return g;
      },
    },
    {
      id: 'gm', label: 'Confirmación enviada',
      pos: mobile ? [-1.2, 3.3, -.9] : [2.3, -2.8, -1],
      build() {
        const g = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(1.06, .72, .1), mat(0xD8D1C4, .45));
        const f1 = new THREE.Mesh(new THREE.BoxGeometry(.6, .05, .02), mat(0xA79F90, .5));
        const f2 = new THREE.Mesh(new THREE.BoxGeometry(.6, .05, .02), mat(0xA79F90, .5));
        f1.position.set(-.26, .12, .06); f1.rotation.z = -.5;
        f2.position.set(.26, .12, .06); f2.rotation.z = .5;
        g.add(body, f1, f2);
        return g;
      },
    },
    {
      id: 'fo', label: 'Respuesta registrada',
      pos: [6.3, 2.2, -1.7],
      build() {
        const g = new THREE.Group();
        const doc = new THREE.Mesh(extrude(docShape(.78, 1.02, .24), .1), mat(0x6E5F9E, .5));
        for (let i = 0; i < 3; i++) {
          const dot = new THREE.Mesh(new THREE.BoxGeometry(.08, .08, .03), mat(0xD9D4E6, .6));
          dot.position.set(-.26, .28 - i * .25, .09);
          const bar = new THREE.Mesh(new THREE.BoxGeometry(.34, .055, .03), mat(0xD9D4E6, .6));
          bar.position.set(.02, .28 - i * .25, .09);
          g.add(dot, bar);
        }
        g.add(doc);
        return g;
      },
    },
    {
      id: 'dr', label: 'Archivo ordenado',
      pos: [6.1, -2, -1.2],
      build() {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(extrude(triShape(.85), .12), mat(0xC2A344, .5)));
        return g;
      },
    },
  ];
  return mobile ? defs.slice(0, 3) : defs;
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
  scene.fog = new THREE.Fog(INK, 13.5, 24);
  const t0 = performance.now();

  const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, .1, 40);
  camera.position.set(0, 0, 13);

  scene.add(new THREE.AmbientLight(0xFFF6EE, .5));
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.7);
  key.position.set(4, 6, 8);
  scene.add(key);
  const warm = new THREE.PointLight(RED, 2.2, 9, 1.6);
  scene.add(warm);

  /* ---- isotipo: dos piezas que se ensamblan al cargar ---- */
  const markMat = new THREE.MeshStandardMaterial({
    color: RED, roughness: .38, metalness: .08,
    emissive: RED, emissiveIntensity: .12, transparent: true, opacity: 0,
  });
  const pieceR = new THREE.Mesh(extrude(markShape(R_POLY), .34), markMat);
  const pieceC = new THREE.Mesh(extrude(markShape(C_POLY), .34), markMat.clone());
  const markGroup = new THREE.Group();
  markGroup.add(pieceR, pieceC);
  const markBase = mobile ? { x: .2, y: 3.6, s: .62 } : { x: 2.7, y: .15, s: 1 };
  markGroup.position.set(markBase.x, markBase.y, 0);
  markGroup.scale.setScalar(markBase.s);
  scene.add(markGroup);
  warm.position.set(markBase.x, markBase.y, 2);

  // estado de ensamblado (resortes)
  const asm = { rx: -2.2, cx: 2.2, started: false };
  setTimeout(() => { asm.started = true; }, 350);

  /* ---- herramientas ---- */
  const toolDefs = buildTools(mobile);
  const tools = toolDefs.map((def, i) => {
    const group = def.build();
    group.position.fromArray(def.pos);
    scene.add(group);
    return {
      def, group,
      base: new THREE.Vector3().fromArray(def.pos),
      cur: new THREE.Vector3().fromArray(def.pos),
      vel: new THREE.Vector3(),
      phase: Math.random() * Math.PI * 2,
      rotAmp: .12 + Math.random() * .1,
      fadeAt: 900 + i * 160,
      opacity: 0,
    };
  });

  /* ---- líneas: curvas suaves que convergen en el isotipo ---- */
  const LINE_PTS = 36;
  const lines = tools.map(t => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_PTS * 3), 3));
    const m = new THREE.LineBasicMaterial({ color: 0xFBFAF9, transparent: true, opacity: 0 });
    const line = new THREE.Line(geo, m);
    line.frustumCulled = false;
    scene.add(line);
    return { line, geo, m, tool: t, baseOpacity: .11, glow: 0 };
  });

  /* pulso de automatización */
  const pulseMesh = new THREE.Mesh(
    new THREE.SphereGeometry(.055, 10, 10),
    new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0 })
  );
  scene.add(pulseMesh);
  const pulse = { active: false, t: 0, idx: 0, fired: false };
  let emissiveBlip = 0;

  function startPulse() {
    if (pulse.active || document.hidden || !running) return;
    pulse.active = true;
    pulse.t = 0;
    pulse.fired = false;
    pulse.idx = Math.floor(Math.random() * tools.length);
  }
  setTimeout(startPulse, 2600);
  const pulseTimer = setInterval(() => {
    if (!pulse.active) startPulse();
  }, 5200);

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
  const tmpDrift = new THREE.Vector3();
  const convergeTarget = new THREE.Vector3();

  let last = performance.now();
  function tick(now) {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const t = now / 1000;

    /* ensamblado inicial del isotipo */
    if (asm.started) {
      spring(asm, 'rx', 0, 46, 7, dt);
      spring(asm, 'cx', 0, 46, 6.5, dt);
    }
    pieceR.position.x = asm.rx;
    pieceC.position.x = asm.cx;
    const asmProg = 1 - Math.min(1, (Math.abs(asm.rx) + Math.abs(asm.cx)) / 4.4);
    pieceR.material.opacity = Math.min(1, asmProg * 1.6 + (asm.started ? .12 : 0));
    pieceC.material.opacity = pieceR.material.opacity;

    /* isotipo: flota y mira suavemente al cursor */
    markGroup.position.y = markBase.y + Math.sin(t * .55) * .07;
    spring(markGroup.rotation, 'y', mouse.x * .24, 30, 8, dt);
    spring(markGroup.rotation, 'x', mouse.y * .12, 30, 8, dt);

    emissiveBlip *= Math.pow(.028, dt); // decae rápido
    pieceR.material.emissiveIntensity = .12 + emissiveBlip * .55;
    pieceC.material.emissiveIntensity = pieceR.material.emissiveIntensity;

    /* convergencia por scroll */
    const conv = easeInOut(scrollP) * .6;

    tools.forEach((tool, i) => {
      if (tool.opacity < 1 && now - t0 > tool.fadeAt) {
        tool.opacity = Math.min(1, tool.opacity + dt * 1.4);
        tool.group.traverse(o => { if (o.material) o.material.opacity = tool.opacity; });
      }
      // objetivo: posición base + deriva + atracción hacia el isotipo + parallax
      convergeTarget.copy(markGroup.position);
      tmpDrift.set(
        Math.sin(t * .5 + tool.phase) * .16 + mouse.x * (.3 + tool.base.z * -.15),
        Math.cos(t * .42 + tool.phase * 1.3) * .14 - mouse.y * (.22 + tool.base.z * -.1),
        0
      );
      tmpV.copy(tool.base).lerp(convergeTarget, conv).add(tmpDrift);
      // resorte 3D hacia el objetivo
      const k = 26, d = 7;
      tool.vel.addScaledVector(tmpV.sub(tool.cur).multiplyScalar(k).addScaledVector(tool.vel, -d), dt);
      tool.cur.addScaledVector(tool.vel, dt);
      tool.group.position.copy(tool.cur);
      tool.group.rotation.y = Math.sin(t * .4 + tool.phase) * tool.rotAmp + mouse.x * .18;
      tool.group.rotation.x = Math.cos(t * .35 + tool.phase) * tool.rotAmp * .6;
    });

    /* líneas que convergen (curvas, nunca ángulos de 90°) */
    lines.forEach((L, i) => {
      const a = L.tool.cur;
      const b = markGroup.position;
      const mid = tmpV.copy(a).add(b).multiplyScalar(.5);
      mid.y += (i % 2 ? -.55 : .5);
      mid.z += -.6;
      const pos = L.geo.attributes.position.array;
      for (let j = 0; j < LINE_PTS; j++) {
        const u = j / (LINE_PTS - 1);
        const iu = 1 - u;
        // bezier cuadrática
        const x = iu * iu * a.x + 2 * iu * u * mid.x + u * u * b.x;
        const y = iu * iu * a.y + 2 * iu * u * mid.y + u * u * b.y;
        const z = iu * iu * a.z + 2 * iu * u * mid.z + u * u * b.z;
        pos[j * 3] = x; pos[j * 3 + 1] = y; pos[j * 3 + 2] = z;
      }
      L.geo.attributes.position.needsUpdate = true;
      L.glow *= Math.pow(.05, dt);
      const target = (L.baseOpacity + conv * .25) * L.tool.opacity + L.glow;
      L.m.opacity += (target - L.m.opacity) * Math.min(1, dt * 8);
    });

    /* pulso: una línea se activa sola */
    if (pulse.active) {
      pulse.t += dt / 1.25;
      const L = lines[pulse.idx];
      L.glow = .4;
      if (pulse.t >= 1) {
        pulse.active = false;
        pulseMesh.material.opacity = 0;
        emissiveBlip = 1;
      } else {
        const u = easeInOut(pulse.t);
        const a = L.tool.cur, b = markGroup.position;
        const mid = tmpV.copy(a).add(b).multiplyScalar(.5);
        mid.y += (pulse.idx % 2 ? -.55 : .5);
        mid.z += -.6;
        const iu = 1 - u;
        pulseMesh.position.set(
          iu * iu * a.x + 2 * iu * u * mid.x + u * u * b.x,
          iu * iu * a.y + 2 * iu * u * mid.y + u * u * b.y,
          iu * iu * a.z + 2 * iu * u * mid.z + u * u * b.z
        );
        pulseMesh.material.opacity = Math.min(1, pulse.t * 6) * (1 - Math.max(0, pulse.t - .85) / .15);
        // aviso al DOM cuando el pulso está llegando
        if (!pulse.fired && pulse.t > .12) {
          pulse.fired = true;
          const sp = L.tool.cur.clone().project(camera);
          dispatchEvent(new CustomEvent('rl:pulse', {
            detail: {
              label: L.tool.def.label,
              x: (sp.x * .5 + .5) * container.clientWidth,
              y: (-sp.y * .5 + .5) * container.clientHeight,
            },
          }));
        }
      }
    }

    /* cámara */
    spring(cam, 'x', mouse.x * .5, 20, 7, dt);
    spring(cam, 'y', -mouse.y * .32, 20, 7, dt);
    spring(cam, 'z', 13 - easeInOut(scrollP) * 1.4, 20, 7, dt);
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(mobile ? 0 : 1.1, mobile ? 1.6 : 0, 0);

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
