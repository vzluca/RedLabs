/* =============================================================
   REDLABS — hero3d.js · Canvas de workflow
   El hero es un flujo de automatización vivo, al estilo n8n:
   nodos-tarjeta conectados por cables bézier, con el isotipo
   como nodo "cerebro" en el centro. Cada tanto una señal roja
   recorre el grafo — dispara desde un trigger, pasa por el
   cerebro y ejecuta una acción — encendiendo cada nodo a su paso.
   Todo con física de resorte; parallax al cursor.
   ============================================================= */

import * as THREE from './vendor/three.module.min.js';

const RED = 0xEE2B24;
const INK = 0x050404;
const PAPER = 0xFBFAF9;

function spring(obj, key, target, k, d, dt) {
  const velKey = '_v_' + key;
  const v = obj[velKey] || 0;
  const acc = -k * (obj[key] - target) - d * v;
  obj[velKey] = v + acc * dt;
  obj[key] += obj[velKey] * dt;
}
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function extrude(shape, depth, bevel = .012) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 });
}

/* tarjeta con el corte diagonal de marca (esquina sup-izq) */
function cardShape(w, h, cut) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + cut, h / 2);
  s.lineTo(w / 2, h / 2);
  s.lineTo(w / 2, -h / 2);
  s.lineTo(-w / 2, -h / 2);
  s.lineTo(-w / 2, h / 2 - cut);
  s.lineTo(-w / 2 + cut, h / 2);
  return s;
}

/* isotipo: los dos polígonos exactos del logo */
const R_POLY = [[728, 120], [283, 120], [121, 339], [120, 1208], [361, 1208], [361, 341], [574, 331]];
const C_POLY = [[814, 120], [432, 647], [817, 1208], [1079, 1208], [695, 652], [1072, 120]];
function markShape(poly) {
  const s = 3.0 / 1329, cx = 600, cy = 664;
  const shape = new THREE.Shape();
  poly.forEach(([x, y], i) => {
    const px = (x - cx) * s, py = -(y - cy) * s;
    i === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py);
  });
  return shape;
}

function cubicAt(a, c1, c2, b, t, out) {
  const it = 1 - t, it2 = it * it, t2 = t * t;
  const w0 = it2 * it, w1 = 3 * it2 * t, w2 = 3 * it * t2, w3 = t2 * t;
  out.set(
    w0 * a.x + w1 * c1.x + w2 * c2.x + w3 * b.x,
    w0 * a.y + w1 * c1.y + w2 * c2.y + w3 * b.y,
    w0 * a.z + w1 * c1.z + w2 * c2.z + w3 * b.z
  );
  return out;
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
  scene.fog = new THREE.Fog(INK, 13, 30);
  const camera = new THREE.PerspectiveCamera(36, container.clientWidth / container.clientHeight, .1, 50);
  camera.position.set(0, 0, 13.5);

  scene.add(new THREE.AmbientLight(0xFFF4EA, .6));
  const key = new THREE.DirectionalLight(0xFFFFFF, 1.5);
  key.position.set(5, 7, 9); scene.add(key);
  const fill = new THREE.DirectionalLight(0xB9C6FF, .3);
  fill.position.set(-6, -3, 5); scene.add(fill);
  const warm = new THREE.PointLight(RED, 2.2, 12, 1.8);
  scene.add(warm);

  /* grupo del grafo (se inclina y hace parallax como una sola pieza) */
  const graph = new THREE.Group();
  graph.rotation.x = -.04;
  scene.add(graph);

  /* ---- grid de puntos (papel cuadriculado del canvas) ---- */
  const gx = mobile ? 9 : 13, gy = 9, gstep = 1.05;
  const gpos = [];
  for (let x = -gx; x <= gx; x++) for (let y = -gy; y <= gy; y++) gpos.push(x * gstep, y * gstep, -3.2);
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gpos), 3));
  const gMat = new THREE.PointsMaterial({ color: PAPER, size: mobile ? .022 : .026, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false });
  const grid = new THREE.Points(gGeo, gMat);
  grid.frustumCulled = false;
  graph.add(grid);

  /* ---- nodos ---- */
  const CW = 1.55, CH = .98, CCUT = .16, CD = .12, brainHalf = 1.5;
  const layout = mobile ? {
    brain: [0, 3.2, 0],
    triggers: [[-1.9, 5.5, .1], [1.9, 5.5, -.1]],
    actions: [[-1.9, 1.1, .1], [1.9, 1.1, -.1]],
    scale: .78,
  } : {
    brain: [0, .1, 0],
    triggers: [[-5.3, 1.95, .2], [-5.3, -1.95, -.15]],
    actions: [[5.3, 2.35, .15], [5.3, 0, -.1], [5.3, -2.35, .2]],
    scale: 1,
  };
  graph.scale.setScalar(layout.scale);
  const gShift = mobile ? 0 : 1.8;   // corre el grafo a la derecha; el texto respira a la izquierda
  graph.position.x = gShift;

  const cardMat = () => new THREE.MeshStandardMaterial({ color: 0x1B1512, roughness: .62, metalness: .1, emissive: RED, emissiveIntensity: 0, transparent: true, opacity: 0 });

  function buildCard(dotColor) {
    const g = new THREE.Group();
    const card = new THREE.Mesh(extrude(cardShape(CW, CH, CCUT), CD), cardMat());
    g.add(card);
    // punto de app (esquina sup-izq)
    const dot = new THREE.Mesh(new THREE.BoxGeometry(.15, .15, .05), new THREE.MeshBasicMaterial({ color: dotColor, transparent: true, opacity: 0 }));
    dot.position.set(-CW / 2 + .3, CH / 2 - .28, CD + .02);
    g.add(dot);
    // barras tipo "campos" del nodo
    for (let i = 0; i < 2; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(.62, .07, .03), new THREE.MeshStandardMaterial({ color: 0x3A322E, roughness: .8, transparent: true, opacity: 0 }));
      bar.position.set(.02, -.02 - i * .24, CD + .01);
      g.add(bar);
    }
    return { g, card, dot, bars: [g.children[2], g.children[3]] };
  }

  const nodes = [];
  function addNode(pos, dotColor, type) {
    const built = buildCard(dotColor);
    built.g.position.fromArray(pos);
    graph.add(built.g);
    const n = {
      ...built, type,
      base: new THREE.Vector3().fromArray(pos),
      phase: Math.random() * Math.PI * 2,
      hi: 0, opacity: 0, riseFrom: pos[1] - .9, appearAt: 0,
    };
    nodes.push(n);
    return n;
  }

  const triggerDots = [0x3FA26C, 0x7A6FA3];
  const actionDots = [0x2E7D53, 0xE9E4DC, 0x4A7BC4];
  const triggers = layout.triggers.map((p, i) => addNode(p, triggerDots[i % triggerDots.length], 'trigger'));
  const actions = layout.actions.map((p, i) => addNode(p, actionDots[i % actionDots.length], 'action'));
  triggers.forEach((n, i) => n.appearAt = 500 + i * 130);
  actions.forEach((n, i) => n.appearAt = 760 + i * 130);

  /* ---- cerebro: isotipo que se ensambla ---- */
  const markMat = new THREE.MeshStandardMaterial({ color: RED, roughness: .34, metalness: .12, emissive: RED, emissiveIntensity: .12, transparent: true, opacity: 0 });
  const pieceR = new THREE.Mesh(extrude(markShape(R_POLY), .3), markMat);
  const pieceC = new THREE.Mesh(extrude(markShape(C_POLY), .3), markMat.clone());
  const brain = new THREE.Group();
  brain.add(pieceR, pieceC);
  brain.position.fromArray(layout.brain);
  graph.add(brain);
  warm.position.set(layout.brain[0] + gShift, layout.brain[1], 2.2);
  const brainNode = { g: brain, base: new THREE.Vector3().fromArray(layout.brain), hi: 0 };
  const asm = { rx: -2.4, cx: 2.4, started: false };
  setTimeout(() => { asm.started = true; }, 300);

  /* ---- cables (bézier cúbica, estilo n8n) ---- */
  const WIRE_PTS = 46, HANDLE = mobile ? 1.1 : 1.9;
  function makeWire(from, to) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(WIRE_PTS * 3), 3));
    const m = new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0 });
    const line = new THREE.Line(geo, m);
    line.frustumCulled = false;
    graph.add(line);
    return { from, to, geo, m, glow: 0, a: new THREE.Vector3(), c1: new THREE.Vector3(), c2: new THREE.Vector3(), b: new THREE.Vector3() };
  }
  // triggers → cerebro → actions
  const wires = [];
  triggers.forEach(t => wires.push(makeWire(t, brainNode)));
  actions.forEach(a => wires.push(makeWire(brainNode, a)));

  // geometría del cable a partir de posiciones actuales
  const tmpV = new THREE.Vector3();
  function updateWire(W, brainCenter) {
    const fromR = W.from === brainNode, toR = W.to === brainNode;
    const fx = W.from.g.position.x + (fromR ? brainHalf : CW / 2);
    const tx = W.to.g.position.x - (toR ? brainHalf : CW / 2);
    W.a.set(fx, W.from.g.position.y, W.from.g.position.z);
    W.b.set(tx, W.to.g.position.y, W.to.g.position.z);
    const dir = Math.sign(tx - fx) || 1;
    W.c1.set(W.a.x + dir * HANDLE, W.a.y, W.a.z);
    W.c2.set(W.b.x - dir * HANDLE, W.b.y, W.b.z);
    const pos = W.geo.attributes.position.array;
    for (let j = 0; j < WIRE_PTS; j++) {
      cubicAt(W.a, W.c1, W.c2, W.b, j / (WIRE_PTS - 1), tmpV);
      pos[j * 3] = tmpV.x; pos[j * 3 + 1] = tmpV.y; pos[j * 3 + 2] = tmpV.z;
    }
    W.geo.attributes.position.needsUpdate = true;
  }

  /* pulso: señal que recorre trigger → cerebro → acción */
  const sig = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 12), new THREE.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0 }));
  graph.add(sig);
  const run = { active: false, seg: 0, t: 0, path: [], lastNode: null };

  function fire() {
    if (run.active || document.hidden || !running) return;
    const trig = triggers[Math.floor(Math.random() * triggers.length)];
    const act = actions[Math.floor(Math.random() * actions.length)];
    const w1 = wires.find(w => w.from === trig && w.to === brainNode);
    const w2 = wires.find(w => w.from === brainNode && w.to === act);
    if (!w1 || !w2) return;
    run.active = true; run.seg = 0; run.t = 0; run.path = [w1, w2];
    trig.hi = 1;
  }
  setTimeout(fire, 2200);
  const fireTimer = setInterval(() => { if (!run.active) fire(); }, 3600);

  /* ---- interacción ---- */
  const mouse = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    mouse.x = (e.clientX / innerWidth) * 2 - 1;
    mouse.y = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

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

  const cam = { x: 0, y: 0, z: 13.5 };
  const t0 = performance.now();
  let last = performance.now();

  function tick(now) {
    if (!running) return;
    rafId = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    const t = now / 1000;
    const since = now - t0;

    /* cerebro: ensamblado */
    if (asm.started) { spring(asm, 'rx', 0, 44, 7, dt); spring(asm, 'cx', 0, 44, 6.5, dt); }
    pieceR.position.x = asm.rx; pieceC.position.x = asm.cx;
    const asmProg = 1 - Math.min(1, (Math.abs(asm.rx) + Math.abs(asm.cx)) / 4.8);
    pieceR.material.opacity = pieceC.material.opacity = Math.min(1, asmProg * 1.6 + (asm.started ? .12 : 0));
    brain.position.y = brainNode.base.y + Math.sin(t * .5) * .06;
    brainNode.hi = Math.max(0, brainNode.hi - dt * 1.8);
    pieceR.material.emissiveIntensity = pieceC.material.emissiveIntensity = .12 + brainNode.hi * .7;
    brain.scale.setScalar(1 + brainNode.hi * .05);
    warm.intensity = 2.2 + brainNode.hi * 3;

    /* fade global */
    const reveal = asm.started ? Math.min(1, (gMat.opacity / .5) + dt * .6) : 0;
    gMat.opacity = reveal * .5;

    /* nodos: aparición + bob + highlight */
    nodes.forEach(n => {
      if (n.opacity < 1 && since > n.appearAt) n.opacity = Math.min(1, n.opacity + dt * 2);
      const op = n.opacity;
      n.card.material.opacity = op;
      n.dot.material.opacity = op;
      n.bars.forEach(b => b.material.opacity = op * .9);
      // subir al aparecer + flotar
      const rise = (1 - op) * -.9;
      n.g.position.set(n.base.x, n.base.y + rise + Math.sin(t * .6 + n.phase) * .07, n.base.z);
      n.hi = Math.max(0, n.hi - dt * 1.8);
      n.card.material.emissiveIntensity = n.hi * .5;
      const sc = 1 + n.hi * .06;
      n.g.scale.setScalar(sc);
      n.dot.material.color.setHex(n.hi > .05 ? RED : n.dotBase ?? (n.dotBase = n.dot.material.color.getHex()));
    });

    /* cables */
    wires.forEach(W => {
      updateWire(W, brainNode.g.position);
      W.glow = Math.max(0, W.glow - dt * 1.6);
      const target = (.1 + easeInOut(scrollP) * .18) * reveal * Math.min(W.from.opacity ?? 1, W.to.opacity ?? 1) + W.glow;
      W.m.opacity += (target - W.m.opacity) * Math.min(1, dt * 8);
    });

    /* señal recorriendo el grafo */
    if (run.active) {
      run.t += dt / .95;
      const W = run.path[run.seg];
      W.glow = .5;
      if (run.t >= 1) {
        // llegó al final del segmento → enciende el nodo destino
        W.to.hi = 1;
        run.seg++; run.t = 0;
        if (run.seg >= run.path.length) { run.active = false; sig.material.opacity = 0; }
      } else {
        const u = easeInOut(run.t);
        cubicAt(W.a, W.c1, W.c2, W.b, u, sig.position);
        sig.material.opacity = Math.min(1, run.t * 6) * (1 - Math.max(0, run.t - .82) / .18);
      }
    }

    /* parallax del grafo + grid */
    spring(graph.rotation, 'y', mouse.x * .1, 26, 8, dt);
    spring(graph.rotation, 'x', -.04 - mouse.y * .05, 26, 8, dt);
    grid.position.x = mouse.x * .3;
    grid.position.y = -mouse.y * .2;

    /* cámara */
    spring(cam, 'x', mouse.x * .45, 20, 7, dt);
    spring(cam, 'y', -mouse.y * .28, 20, 7, dt);
    spring(cam, 'z', 13.5 - easeInOut(scrollP) * 1.6, 20, 7, dt);
    camera.position.set(cam.x, cam.y, cam.z);
    camera.lookAt(mobile ? 0 : gShift * 0.5, mobile ? 1.2 : 0, 0);

    renderer.render(scene, camera);
  }

  container.classList.add('on');
  rafId = requestAnimationFrame(tick);

  addEventListener('pagehide', () => { clearInterval(fireTimer); cancelAnimationFrame(rafId); renderer.dispose(); }, { once: true });
}
