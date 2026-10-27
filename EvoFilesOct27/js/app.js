/* ============================================================
   EvoLuzon — app.js
   Core shell behaviour: navigation, hero particle field,
   scroll reveals, XP / badge tracking, and accessibility
   toggles (torch mode, sound). Content-specific rendering
   lives in content.js and quiz.js.
   ============================================================ */

const EvoState = {
  xp: 0,
  badges: new Set(),
  visitedHotspots: new Set(),   // 3D cave hotspot ids (Phase 2)
  seenCaveExtras: new Set(),    // non-gallery cave artifacts (skull, tool)
  seenEvolutionWall: false,
  caveDrawingCompleted: false,  // one-time XP guard for the cave-drawing activity
  seenFossils: new Set(),
  seenTimelineNodes: new Set(),
  soundOn: false
};

/* ---------- Persistence (this is a standalone local site, not
   a hosted Claude artifact, so localStorage is appropriate here) ---------- */
const STORAGE_KEY = "evoluzon_progress_v1";

function loadProgress(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return;
    const saved = JSON.parse(raw);
    EvoState.xp = saved.xp || 0;
    EvoState.badges = new Set(saved.badges || []);
    EvoState.visitedHotspots = new Set(saved.visitedHotspots || []);
    EvoState.seenCaveExtras = new Set(saved.seenCaveExtras || []);
    EvoState.seenEvolutionWall = saved.seenEvolutionWall || false;
    EvoState.caveDrawingCompleted = saved.caveDrawingCompleted || false;
    EvoState.seenFossils = new Set(saved.seenFossils || []);
    EvoState.seenTimelineNodes = new Set(saved.seenTimelineNodes || []);
  }catch(e){ console.warn("Progress could not be restored:", e); }
}

function saveProgress(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      xp: EvoState.xp,
      badges: [...EvoState.badges],
      visitedHotspots: [...EvoState.visitedHotspots],
      seenCaveExtras: [...EvoState.seenCaveExtras],
      seenEvolutionWall: EvoState.seenEvolutionWall,
      caveDrawingCompleted: EvoState.caveDrawingCompleted,
      seenFossils: [...EvoState.seenFossils],
      seenTimelineNodes: [...EvoState.seenTimelineNodes]
    }));
  }catch(e){ /* private-browsing or storage disabled: fail silently */ }
}

function addXP(amount, reason){
  EvoState.xp += amount;
  document.getElementById("xp-count").textContent = EvoState.xp;
  showToast(`+${amount} XP — ${reason}`);
  saveProgress();
}

function awardBadge(id){
  if(EvoState.badges.has(id)) return;
  EvoState.badges.add(id);
  const badge = EVOLUZON_DATA.badges.find(b => b.id === id);
  if(badge){ showToast(`Badge unlocked: ${badge.icon} ${badge.name}`); }
  renderBadgeTracker();
  saveProgress();
}

function showToast(message){
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function renderBadgeTracker(){
  const wrap = document.getElementById("badge-tracker");
  if(!wrap) return;
  wrap.innerHTML = EVOLUZON_DATA.badges.map(b => {
    const earned = EvoState.badges.has(b.id);
    return `<div class="badge-pill ${earned ? "" : "is-locked"}" title="${b.desc}">
      <span>${b.icon}</span><span>${b.name}</span>
    </div>`;
  }).join("");
}

/* ============================================================
   NAVIGATION
   ============================================================ */
function initNav(){
  const toggle = document.getElementById("nav-toggle");
  const links = document.getElementById("nav-links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });

  links.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => links.classList.remove("is-open"));
  });

  // Active-link highlighting via IntersectionObserver
  const sections = document.querySelectorAll("main section[id]");
  const navAnchors = [...links.querySelectorAll("a")];
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        navAnchors.forEach(a => a.classList.toggle(
          "is-active", a.getAttribute("href") === `#${entry.target.id}`
        ));
      }
    });
  }, { rootMargin: "-45% 0px -50% 0px" });
  sections.forEach(s => obs.observe(s));
}

/* ============================================================
   TORCH MODE (light / high-contrast toggle) & SOUND
   ============================================================ */
function initToggles(){
  const torchBtn = document.getElementById("torch-toggle");
  torchBtn.addEventListener("click", () => {
    const on = document.body.classList.toggle("torch-mode");
    torchBtn.setAttribute("aria-pressed", on ? "true" : "false");
    torchBtn.textContent = on ? "🔥" : "🌙";
  });

  const soundBtn = document.getElementById("sound-toggle");
  const ambience = document.getElementById("cave-ambience");
  soundBtn.addEventListener("click", () => {
    EvoState.soundOn = !EvoState.soundOn;
    soundBtn.setAttribute("aria-pressed", EvoState.soundOn ? "true" : "false");
    soundBtn.textContent = EvoState.soundOn ? "🔊" : "🔈";
    if(EvoState.soundOn){
      // NOTE: replace assets/audio/cave-ambience.mp3 with a real
      // royalty-free ambient cave-drip / wind recording.
      ambience.play().catch(() => {
        showToast("Add an ambience file at assets/audio/cave-ambience.mp3");
      });
    } else {
      ambience.pause();
    }
  });
}

/* ============================================================
   SCROLL REVEAL
   Observes every .reveal element so it fades in once scrolled
   into view. Crucially, this ALSO watches for .reveal elements
   added later via innerHTML (fossil cards, timeline nodes,
   accordion items, reflection prompts are all injected by
   content.js after this first runs) — without this, anything
   rendered after the initial querySelectorAll would never be
   observed and would stay stuck at opacity:0 forever, looking
   like "blank" content that's actually just invisible.
   ============================================================ */
function initReveal(){
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("is-visible");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal").forEach(t => obs.observe(t));

  // Backstop: catch any .reveal element added to the DOM afterward,
  // regardless of which function added it or in what order.
  const mo = new MutationObserver((mutations) => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if(node.nodeType !== 1) return;
        if(node.matches?.(".reveal")) obs.observe(node);
        node.querySelectorAll?.(".reveal").forEach(t => obs.observe(t));
      });
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

/* ============================================================
   HERO PARTICLE FIELD (cave dust / fireflies)
   Lightweight canvas — deliberately not Three.js: keeps the
   hero fast and dependency-free while still feeling alive.
   ============================================================ */
function initParticles(){
  const canvas = document.getElementById("particles-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let w, h;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function resize(){
    w = canvas.width = canvas.offsetWidth * devicePixelRatio;
    h = canvas.height = canvas.offsetHeight * devicePixelRatio;
  }

  function makeParticles(){
    const count = Math.min(90, Math.floor((canvas.offsetWidth * canvas.offsetHeight) / 14000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.6 + 0.4) * devicePixelRatio,
      vy: (Math.random() * 0.25 + 0.05) * devicePixelRatio,
      vx: (Math.random() - 0.5) * 0.15 * devicePixelRatio,
      a: Math.random() * 0.5 + 0.15,
      hue: Math.random() > 0.7 ? "gold" : "cyan"
    }));
  }

  function tick(){
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.y -= p.vy;
      p.x += p.vx;
      if(p.y < -10) p.y = h + 10;
      if(p.x < -10) p.x = w + 10;
      if(p.x > w + 10) p.x = -10;
      ctx.beginPath();
      ctx.fillStyle = p.hue === "gold"
        ? `rgba(229,199,107,${p.a})`
        : `rgba(0,229,255,${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    if(!reduceMotion) requestAnimationFrame(tick);
  }

  resize();
  makeParticles();
  tick();
  window.addEventListener("resize", () => { resize(); makeParticles(); });
}

/* ============================================================
   STRATA DIVIDER FACTORY
   Generates the jagged rock-layer SVG divider used between
   major sections, each labelled with a depth/date marker so
   the divider itself teaches stratigraphy.
   ============================================================ */
function strataSVG(label){
  const seedPoints = Array.from({ length: 14 }, (_, i) => {
    const x = (i / 13) * 100;
    const y = 30 + Math.sin(i * 1.7) * 10 + (Math.random() * 8 - 4);
    return `${x},${y}`;
  }).join(" ");
  return `
    <div class="strata" role="presentation">
      <svg viewBox="0 0 100 64" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="0,0 ${seedPoints} 100,0" fill="var(--elevated)" opacity="0.5"></polygon>
        <polyline points="${seedPoints}" fill="none" stroke="var(--gold)" stroke-width="0.4" opacity="0.5"></polyline>
      </svg>
      <span class="strata-label">${label}</span>
    </div>`;
}

function injectStrata(){
  document.querySelectorAll("[data-strata]").forEach(el => {
    el.outerHTML = strataSVG(el.getAttribute("data-strata"));
  });
}

/* ============================================================
   KOLB WHEEL (About section) — positions the four nodes
   around a circle with CSS custom properties.
   ============================================================ */
function initKolbWheel(){
  const wheel = document.getElementById("kolb-wheel");
  if(!wheel) return;
  const nodes = wheel.querySelectorAll(".kolb-node");
  const positions = [
    { x: "50%", y: "6%" },
    { x: "94%", y: "50%" },
    { x: "50%", y: "94%" },
    { x: "6%", y: "50%" }
  ];
  nodes.forEach((n, i) => {
    n.style.setProperty("--x", positions[i].x);
    n.style.setProperty("--y", positions[i].y);
  });
}

/* ============================================================
   INIT
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  loadProgress();
  document.getElementById("xp-count").textContent = EvoState.xp;
  renderBadgeTracker();
  injectStrata();
  initNav();
  initToggles();
  initReveal();
  initParticles();
  initKolbWheel();

  // Content-driven sections (defined in content.js / quiz.js)
  if(typeof initExplore3D === "function") initExplore3D();
  if(typeof renderFossilGallery === "function") renderFossilGallery();
  if(typeof renderTimeline === "function") renderTimeline();
  if(typeof renderModules === "function") renderModules();
  if(typeof renderVisuals === "function") renderVisuals();
  if(typeof initCaveDrawing === "function") initCaveDrawing();
  if(typeof renderCompare === "function") renderCompare();
  if(typeof initReflection === "function") initReflection();
  if(typeof initQuiz === "function") initQuiz();

  document.getElementById("year").textContent = new Date().getFullYear();

  // Dismiss the hotspot info card via backdrop click or Escape
  const overlay = document.getElementById("info-card-overlay");
  overlay.addEventListener("click", (e) => {
    if(e.target === overlay && typeof closeInfoOverlay === "function") closeInfoOverlay();
  });
  document.addEventListener("keydown", (e) => {
    if(e.key === "Escape" && overlay.classList.contains("is-open") && typeof closeInfoOverlay === "function"){
      closeInfoOverlay();
    }
  });
});
