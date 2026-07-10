/* =============================================================
   REDLABS — main.js
   Nav, revelado, scroll-story, demo de chat, ensamblado del
   isotipo y carga diferida de la escena 3D del hero.
   ============================================================= */

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/* ---------- NAV ---------- */
const nav = document.getElementById('nav');
addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', scrollY > 30);
}, { passive: true });

const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobile-menu');

function setMenu(open) {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  if (open) mobileMenu.hidden = false;
  requestAnimationFrame(() => mobileMenu.classList.toggle('open', open));
  document.body.style.overflow = open ? 'hidden' : '';
  if (!open) setTimeout(() => { mobileMenu.hidden = true; }, 380);
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
mobileMenu.querySelectorAll('.mobile-link').forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => {
  if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') setMenu(false);
});

/* ---------- Revelado al entrar (progresivo: sin JS no pasa nada) ---------- */
if (!reduced) {
  const targets = document.querySelectorAll(
    '.qh-title, .qh-card, .demo-title, .demo-lead, .demo-grid > *, ' +
    '.casos-title, .casos-lead, .caso-card, .cta-title, .cta-sub, .cta-actions'
  );
  targets.forEach(el => el.classList.add('rv'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const sibs = [...en.target.parentElement.children].filter(c => c.classList.contains('rv') && !c.classList.contains('in'));
      const idx = Math.max(0, sibs.indexOf(en.target));
      setTimeout(() => en.target.classList.add('in'), Math.min(idx * 80, 320));
      io.unobserve(en.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => io.observe(el));
}

/* =============================================================
   CÓMO TRABAJAMOS — historia guiada por scroll
   (fondo oscuro → papel, línea que se dibuja, pasos que avanzan)
   ============================================================= */
const ct = document.getElementById('como-trabajamos');
const ctSticky = document.getElementById('ct-sticky');
const ctNum = document.getElementById('ct-num');
const ctPath = document.getElementById('ct-path-fill');
const ctSteps = [...document.querySelectorAll('.ct-step')];
const ctNodes = [0, 1, 2].map(i => document.getElementById('ct-node-' + i));

if (!reduced && ctPath) {
  const pathLen = ctPath.getTotalLength();
  ctPath.style.strokeDasharray = pathLen;
  ctPath.style.strokeDashoffset = pathLen;
  const nodeAt = [.09, .42, .82];

  // tinta #151110 → papel #FBFAF9
  const c0 = [21, 17, 15], c1 = [251, 250, 249];
  let lastStep = -1;

  const update = () => {
    const rect = ct.getBoundingClientRect();
    const total = ct.offsetHeight - innerHeight;
    const p = clamp(-rect.top / total, 0, 1);

    const mix = c0.map((c, i) => Math.round(c + (c1[i] - c) * p));
    ctSticky.style.backgroundColor = `rgb(${mix.join(',')})`;
    ctSticky.classList.toggle('light', p > .42);

    ctPath.style.strokeDashoffset = pathLen * (1 - p);
    ctNodes.forEach((n, i) => n.classList.toggle('on', p >= nodeAt[i]));

    const step = clamp(Math.floor(p * 3), 0, 2);
    ctSteps.forEach((s, i) => {
      s.classList.toggle('active', i === step);
      s.classList.toggle('passed', i < step);
    });
    if (step !== lastStep) {
      lastStep = step;
      ctNum.textContent = '0' + (step + 1);
      ctNum.classList.remove('tick');
      void ctNum.offsetWidth;
      ctNum.classList.add('tick');
    }
  };
  addEventListener('scroll', update, { passive: true });
  addEventListener('resize', update, { passive: true });
  update();
} else {
  // versión estática: todos los pasos visibles (CSS reduced-motion los apila)
  ctSteps.forEach(s => s.classList.add('active'));
  ctSticky.style.backgroundColor = '#FBFAF9';
  ctSticky.classList.add('light');
}

/* =============================================================
   DEMO — chat simulado + "detrás de escena"
   ============================================================= */
const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatText = document.getElementById('chat-text');
const feed = document.getElementById('backstage-feed');
const sheetBody = document.getElementById('sheet-body');

const INTENTS = [
  {
    match: /turno|reserva|agenda|cita|hora/i,
    reply: 'Perfecto 👍 Tengo lugar el jueves a las 15:30. Te lo dejo reservado y te llega la confirmación al toque.',
    motivo: 'Turno', estado: 'Confirmado',
    steps: ['Mensaje recibido', 'Turno detectado en la agenda', 'Fila agregada a tu planilla', 'Confirmación enviada por mail'],
  },
  {
    match: /precio|sale|cuesta|cu[aá]nto|vale|tarifa/i,
    reply: 'Te paso el detalle de precios ahora mismo. Si querés, también te reservo un lugar para esta semana.',
    motivo: 'Consulta de precio', estado: 'Respondido',
    steps: ['Mensaje recibido', 'Consulta de precio detectada', 'Respuesta enviada al instante', 'Consulta registrada en tu planilla'],
  },
  {
    match: /pedido|pedir|comprar|encargar|quiero/i,
    reply: '¡Buenísimo! Decime qué necesitás y lo dejo cargado. Tu pedido queda registrado apenas lo confirmes.',
    motivo: 'Pedido', estado: 'Cargado',
    steps: ['Mensaje recibido', 'Pedido detectado', 'Fila agregada a tu planilla', 'Aviso enviado a tu equipo'],
  },
  {
    match: /horario|abren|cierran|d[ií]as/i,
    reply: 'Atendemos de lunes a sábado, de 9 a 19. ¿Querés que te reserve un lugar?',
    motivo: 'Horarios', estado: 'Respondido',
    steps: ['Mensaje recibido', 'Consulta de horarios detectada', 'Respuesta enviada al instante'],
  },
];
const FALLBACK = {
  reply: 'Anotado ✋ Guardé tu consulta y ya le avisé al equipo: te responden en minutos. Mientras, ¿te muestro horarios o precios?',
  motivo: 'Consulta', estado: 'Derivado',
  steps: ['Mensaje recibido', 'Consulta registrada en tu planilla', 'Aviso enviado a tu equipo'],
};

function addMsg(text, who) {
  const div = document.createElement('div');
  div.className = 'msg msg-' + who;
  div.textContent = text;
  chatLog.appendChild(div);
  requestAnimationFrame(() => requestAnimationFrame(() => div.classList.add('in')));
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  return div;
}

function addTyping() {
  const div = document.createElement('div');
  div.className = 'msg msg-bot msg-typing in';
  div.setAttribute('aria-hidden', 'true');
  div.innerHTML = '<i></i><i></i><i></i>';
  chatLog.appendChild(div);
  chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  return div;
}

function nowHM() {
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function runBackstage(intent) {
  feed.innerHTML = '';
  intent.steps.forEach((label, i) => {
    const li = document.createElement('li');
    li.className = 'bs-item';
    const t = (0.2 + i * 0.3).toFixed(1).replace('.', ',');
    li.innerHTML = `<span class="bs-item-sq"></span><span></span><time>${t} s</time>`;
    li.children[1].textContent = label;
    feed.appendChild(li);
    setTimeout(() => li.classList.add('in'), 350 + i * 420);
  });
  // fila en la planilla
  setTimeout(() => {
    const tr = document.createElement('tr');
    tr.className = 'sheet-row-new';
    tr.innerHTML = `<td>${nowHM()}</td><td>Vos</td><td></td><td><span class="tag-done"></span></td>`;
    tr.children[2].textContent = intent.motivo;
    tr.querySelector('.tag-done').textContent = intent.estado;
    sheetBody.appendChild(tr);
    while (sheetBody.children.length > 4) sheetBody.removeChild(sheetBody.firstChild);
  }, 350 + Math.min(2, intent.steps.length - 1) * 420);
}

let busy = false;
let greetTimers = [];
function handleMessage(text) {
  if (busy || !text.trim()) return;
  busy = true;
  // si el usuario se adelanta al saludo, no intercalamos mensajes
  greetTimers.forEach(clearTimeout);
  greetTimers = [];
  addMsg(text.trim(), 'user');
  chatText.value = '';
  const intent = INTENTS.find(i => i.match.test(text)) || FALLBACK;

  setTimeout(() => {
    const typing = addTyping();
    runBackstage(intent);
    setTimeout(() => {
      typing.remove();
      addMsg(intent.reply, 'bot');
      busy = false;
    }, reduced ? 60 : 900 + Math.random() * 500);
  }, reduced ? 30 : 350);
}

chatForm.addEventListener('submit', e => {
  e.preventDefault();
  handleMessage(chatText.value);
});
document.querySelectorAll('.sug').forEach(btn => {
  btn.addEventListener('click', () => handleMessage(btn.dataset.msg));
});

// saludo inicial cuando la demo entra en pantalla
let greeted = false;
new IntersectionObserver((entries, obs) => {
  if (!entries[0].isIntersecting || greeted) return;
  greeted = true;
  obs.disconnect();
  setTimeout(() => addMsg('¡Hola! Soy el asistente de REDLABS. Estoy acá para automatizar las tareas repetitivas de tu negocio.', 'bot'), reduced ? 0 : 500);
  greetTimers.push(setTimeout(() => addMsg('Escribime como si fueras un cliente: pedí un turno, preguntá un precio, hacé un pedido.', 'bot'), reduced ? 0 : 1600));
}, { threshold: .35 }).observe(chatLog);

/* =============================================================
   CTA — el isotipo se ensambla: dos piezas que se conectan
   ============================================================= */
const ctaMark = document.getElementById('cta-mark');
if (ctaMark && !reduced) {
  const pieceR = ctaMark.querySelector('.cta-piece-r');
  const pieceC = ctaMark.querySelector('.cta-piece-chev');
  const pieces = [
    { el: pieceR, x: -420, v: 0 },
    { el: pieceC, x: 420, v: 0 },
  ];
  pieces.forEach(p => {
    p.el.style.transform = `translateX(${p.x}px)`;
    p.el.style.opacity = '0';
  });

  let playing = false;
  const play = () => {
    if (playing) return;
    playing = true;
    let last = performance.now();
    const tick = now => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      let done = true;
      pieces.forEach((p, i) => {
        // resorte sub-amortiguado: se pasa un poco y vuelve
        const k = 52, d = 7.5;
        const acc = -k * p.x - d * p.v;
        p.v += acc * dt;
        p.x += p.v * dt;
        p.el.style.transform = `translateX(${p.x}px)`;
        p.el.style.opacity = String(clamp(1 - Math.abs(p.x) / 380, 0, 1));
        if (Math.abs(p.x) > .5 || Math.abs(p.v) > .5) done = false;
      });
      if (!done) requestAnimationFrame(tick);
      else pieces.forEach(p => { p.el.style.transform = ''; p.el.style.opacity = ''; });
    };
    // la pieza del chevrón arranca con un pelín de retardo
    pieces[1].v = -60;
    requestAnimationFrame(tick);
  };

  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { play(); obs.disconnect(); }
  }, { threshold: .45 }).observe(ctaMark);
}

/* =============================================================
   HERO 3D — carga diferida, con fallback estático
   ============================================================= */
const hero = document.querySelector('.hero');
const heroChips = document.getElementById('hero-chips');

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

if (reduced || !supportsWebGL()) {
  hero.classList.add('no3d');
} else {
  import('./hero3d.js')
    .then(m => m.initHero(document.getElementById('hero-canvas')))
    .catch(() => hero.classList.add('no3d'));
}

/* chips de "automatización real" que emite la escena 3D */
let chipTimer = null;
addEventListener('rl:pulse', e => {
  const { label, x, y } = e.detail;
  heroChips.innerHTML = '';
  clearTimeout(chipTimer);
  const chip = document.createElement('span');
  chip.className = 'hero-chip';
  chip.textContent = label;
  chip.style.left = clamp(x, 110, heroChips.clientWidth - 110) + 'px';
  chip.style.top = clamp(y, 90, heroChips.clientHeight - 60) + 'px';
  heroChips.appendChild(chip);
  requestAnimationFrame(() => requestAnimationFrame(() => chip.classList.add('show')));
  chipTimer = setTimeout(() => {
    chip.classList.remove('show');
    setTimeout(() => chip.remove(), 400);
  }, 2600);
});
