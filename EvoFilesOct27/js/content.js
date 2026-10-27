/* ============================================================
   EvoLuzon — content.js
   Renders every data-driven section (Explore, Fossil Gallery,
   Timeline, Learning Modules, Compare, Reflection) from the
   content defined in data.js.
   ============================================================ */

/* ============================================================
   EXPLORE — now powered by the first-person 3D cave.
   See js/explore3d.js for the Three.js scene itself. What
   stays here is the shared "info card" opener that both the
   3D hotspots and (previously) the 2D scene use, so there's
   only ever one popup component on the whole site.
   ============================================================ */
function openInfoOverlay({ eyebrow, title, body, prompt }){
  const overlay = document.getElementById("info-card-overlay");
  const card = document.getElementById("info-card-content");
  card.innerHTML = `
    <button class="close-btn" aria-label="Close">✕</button>
    ${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}
    <h3>${title}</h3>
    <p>${body}</p>
    ${prompt ? `<div class="reflect-prompt"><strong>Think about it:</strong> ${prompt}</div>` : ""}
  `;
  overlay.classList.add("is-open");
  card.querySelector(".close-btn").addEventListener("click", closeInfoOverlay);
  document.getElementById("info-card").focus();
}

function closeInfoOverlay(){
  document.getElementById("info-card-overlay").classList.remove("is-open");
  // The 3D cave unlocks pointer controls before showing this overlay
  // (so the cursor is actually visible/usable) — re-lock on close.
  if(typeof Explore3D !== "undefined" && Explore3D.modalOpen){
    Explore3D.modalOpen = false;
    Explore3D.controls?.lock();
  }
}

/* ============================================================
   SHARED FOSSIL PROGRESS
   One source of truth for "has this fossil been examined,"
   used by the Fossil Gallery flip cards AND by artifact
   inspection inside the 3D cave — so XP and the Researcher
   badge can never be double-tracked or fall out of sync.
   ============================================================ */
function markFossilSeen(id, opts = {}){
  if(EvoState.seenFossils.has(id)) return false;
  EvoState.seenFossils.add(id);
  addXP(opts.xp ?? 8, opts.reason ?? "Examined a fossil");
  updateFossilCardVisual(id);
  if(EvoState.seenFossils.size === EVOLUZON_DATA.fossils.length){
    awardBadge("researcher");
  }
  saveProgress();
  return true;
}

function updateFossilCardVisual(id){
  const card = document.querySelector(`.fossil-card[data-id="${id}"]`);
  if(card) card.classList.add("is-known");
}

/* ============================================================
   FOSSIL GALLERY — flip cards
   ============================================================ */
function renderFossilGallery(){
  const grid = document.getElementById("fossil-grid");
  if(!grid) return;

  grid.innerHTML = EVOLUZON_DATA.fossils.map(f => `
    <div class="fossil-card reveal ${EvoState.seenFossils.has(f.id) ? "is-known" : ""}" data-id="${f.id}" tabindex="0" role="button"
         aria-label="Flip card: ${f.name}">
      <div class="fossil-card-inner">
        <div class="fossil-face fossil-face-front">
          <div class="fossil-icon" aria-hidden="true">${f.icon}</div>
          <h3>${f.name}</h3>
          <p class="flip-hint">Click or press Enter to examine →</p>
          <span class="known-ribbon">✓ Examined in cave</span>
        </div>
        <div class="fossil-face fossil-face-back">
          <h4>Description</h4><p>${f.description}</p>
          <h4>Scientific Importance</h4><p>${f.importance}</p>
          <h4>Discovery</h4><p>${f.discovery}</p>
          <h4>Function</h4><p>${f.function}</p>
        </div>
      </div>
    </div>
  `).join("");

  grid.querySelectorAll(".fossil-card").forEach(card => {
    const flip = () => {
      card.classList.toggle("is-flipped");
      markFossilSeen(card.dataset.id);
    };
    card.addEventListener("click", flip);
    card.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); flip(); }
    });
  });
}

/* ============================================================
   EVOLUTION TIMELINE
   ============================================================ */
function renderTimeline(){
  const scroller = document.getElementById("timeline-scroller");
  const detail = document.getElementById("timeline-detail");
  if(!scroller) return;

  scroller.innerHTML = EVOLUZON_DATA.timeline.map((t, i) => `
    ${i > 0 ? '<div class="timeline-connector" aria-hidden="true" style="align-self:center; width:40px;"></div>' : ""}
    <div class="timeline-node reveal" data-id="${t.id}" tabindex="0" role="button" aria-expanded="false">
      <span class="t-years">${t.years}</span>
      <h3>${t.name}</h3>
      <p class="t-region">${t.region}</p>
    </div>
  `).join("");

  const nodes = scroller.querySelectorAll(".timeline-node");
  nodes.forEach(node => {
    const open = () => {
      nodes.forEach(n => n.classList.remove("is-active"));
      node.classList.add("is-active");
      const t = EVOLUZON_DATA.timeline.find(x => x.id === node.dataset.id);
      detail.innerHTML = `
        <span class="eyebrow">${t.years}</span>
        <h3>${t.name}</h3>
        <p>${t.summary}</p>
        <p><strong style="color:var(--gold)">Migration &amp; range:</strong> ${t.migration}</p>
        ${rangeChartHTML(t.id)}
      `;
      detail.classList.add("is-open");

      if(!EvoState.seenTimelineNodes.has(t.id)){
        EvoState.seenTimelineNodes.add(t.id);
        addXP(6, `Studied ${t.name}`);
        if(EvoState.seenTimelineNodes.size === EVOLUZON_DATA.timeline.length){
          awardBadge("archaeologist");
        }
      }
    };
    node.addEventListener("click", open);
    node.addEventListener("keydown", (e) => {
      if(e.key === "Enter" || e.key === " "){ e.preventDefault(); open(); }
    });
  });
}

/* ============================================================
   LEARNING MODULES — accordion
   ============================================================ */
function renderModules(){
  const wrap = document.getElementById("modules-accordion");
  if(!wrap) return;

  wrap.innerHTML = EVOLUZON_DATA.modules.map((m, i) => `
    <div class="accordion-item reveal" data-index="${i}">
      <button class="accordion-trigger" aria-expanded="false">
        <span>${m.title}</span>
        <span class="plus" aria-hidden="true">+</span>
      </button>
      <div class="accordion-panel">
        <div class="accordion-panel-inner module-split"><div class="module-visual">${moduleVisual(i)}</div><p>${m.body}</p></div>
      </div>
    </div>
  `).join("");

  wrap.querySelectorAll(".accordion-item").forEach(item => {
    const trigger = item.querySelector(".accordion-trigger");
    const panel = item.querySelector(".accordion-panel");
    trigger.addEventListener("click", () => {
      const isOpen = item.classList.contains("is-open");
      wrap.querySelectorAll(".accordion-item").forEach(other => {
        other.classList.remove("is-open");
        other.querySelector(".accordion-trigger").setAttribute("aria-expanded", "false");
        other.querySelector(".accordion-panel").style.maxHeight = null;
      });
      if(!isOpen){
        item.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = panel.scrollHeight + "px";
      }
    });
  });
}

/* ============================================================
   COMPARE — Homo sapiens vs Homo luzonensis slider
   ============================================================ */
function renderCompare(){
  const wrap = document.getElementById("compare-wrap");
  if(!wrap) return;
  const { left, right } = EVOLUZON_DATA.compare;
  const rows = ["height","brain","hands","feet","diet","toolUse"];
  const rowLabels = { height:"Body height", brain:"Cranial capacity", hands:"Hands", feet:"Feet", diet:"Diet", toolUse:"Tool use" };

  wrap.innerHTML = `
    <div class="compare-header">
      <h3 class="name-left">${left.name}</h3>
      <input type="range" min="0" max="100" value="50" class="compare-slider" id="compare-slider" aria-label="Comparison emphasis slider">
      <h3 class="name-right">${right.name}</h3>
    </div>
    <div class="compare-rows">
      ${rows.map(r => `
        <div class="compare-row">
          <div class="compare-cell left">${left[r]}</div>
          <span class="compare-row-label">${rowLabels[r]}</span>
          <div class="compare-cell right">${right[r]}</div>
        </div>
      `).join("")}
    </div>
  `;

  const slider = document.getElementById("compare-slider");
  const leftCells = wrap.querySelectorAll(".compare-cell.left");
  const rightCells = wrap.querySelectorAll(".compare-cell.right");
  slider.addEventListener("input", () => {
    const v = Number(slider.value) / 100;
    leftCells.forEach(c => c.style.opacity = String(0.35 + (1 - v) * 0.65));
    rightCells.forEach(c => c.style.opacity = String(0.35 + v * 0.65));
  });
}

/* ============================================================
   REFLECTION JOURNAL (Reflective Observation)
   Saved to localStorage — this is a downloadable local site,
   not a Claude-hosted artifact, so browser storage is fine here.
   ============================================================ */
function initReflection(){
  const wrap = document.getElementById("reflection-journal");
  if(!wrap) return;
  const prompts = [
    "What surprised you most about Homo luzonensis?",
    "What fossil evidence best supports this being a distinct species?",
    "Why does reaching an island like Luzon matter for the story of human migration?"
  ];
  const KEY = "evoluzon_reflections_v1";
  let saved = {};
  try{ saved = JSON.parse(localStorage.getItem(KEY) || "{}"); }catch(e){ saved = {}; }

  wrap.innerHTML = prompts.map((q, i) => `
    <div class="reflect-q reveal">
      <label for="reflect-${i}">${q}</label>
      <textarea id="reflect-${i}" placeholder="Type your thoughts…">${saved[i] || ""}</textarea>
      <div class="save-note" id="reflect-note-${i}"></div>
    </div>
  `).join("");

  prompts.forEach((_, i) => {
    const textarea = document.getElementById(`reflect-${i}`);
    const note = document.getElementById(`reflect-note-${i}`);
    let timer;
    textarea.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        saved[i] = textarea.value;
        try{ localStorage.setItem(KEY, JSON.stringify(saved)); }catch(e){}
        note.textContent = "Saved ✓";
        if(textarea.value.trim().length > 0) addXP(2, "Reflected on the evidence");
        clearTimeout(note._fade);
        note._fade = setTimeout(() => note.textContent = "", 1800);
      }, 700);
    });
  });
}

/* ============================================================
   CAVE DRAWING STATION (Abstract Conceptualization)
   Replaces the former Infographics & Maps section with a
   freehand Canvas 2D reconstruction activity. Reuses the site's
   existing XP (addXP), badge (awardBadge), and localStorage-
   autosave pattern (see initReflection above) rather than
   building a parallel system. The one genuinely new piece of
   storage is DRAWING_STORAGE_KEY below — the raw image + checklist
   data is large/binary-ish (a PNG data URL) and doesn't belong
   mixed into the same small JSON blob as XP/badge progress, so it
   gets its own key, exactly the way the reflection journal already
   keeps its own separate key rather than reusing STORAGE_KEY.
   ============================================================ */
const DRAWING_STORAGE_KEY = "evoluzon_cave_drawing_v1";
const DRAWING_REFLECTION_KEY = "evoluzon_drawing_reflections_v1";

const CaveDrawing = {
  canvas: null, ctx: null,
  cssWidth: 0, cssHeight: 0,
  drawing: false,
  lastPos: null,
  tool: "brush", // "brush" | "eraser" | "stamp"
  activeStamp: null,
  color: "#5c4f3a",
  brushSize: 6,
  history: [],
  historyIndex: -1,
  maxHistory: 20,
  backgroundColor: "#ece1c8"
};

// Muted, earthy palette — no neon — matching the museum's visual language.
const DRAW_SWATCHES = ["#3d3626", "#5c4f3a", "#7a6b4f", "#4a6741", "#3a5a45", "#6b6459", "#8fa8b0", "#0c1418", "#c94f3a", "#e5c76b", "#f5f0e0"];

// Simple emoji stamps rather than detailed illustrations, per the brief —
// low implementation risk, consistent with the icon language already
// used throughout the Fossil Gallery and hotspot system.
const DRAW_STAMPS = [
  { id: "rock", label: "Rock", glyph: "🪨" },
  { id: "fossil", label: "Fossil / Bone", glyph: "🦴" },
  { id: "tooth", label: "Tooth", glyph: "🦷" },
  { id: "hominin", label: "Homo luzonensis", glyph: "🧍" },
  { id: "plant", label: "Plant", glyph: "🌱" },
  { id: "fern", label: "Fern", glyph: "🌿" },
  { id: "moss", label: "Moss", glyph: "🍀" },
  { id: "water", label: "Water", glyph: "💧" },
  { id: "entrance", label: "Cave Entrance", glyph: "⛰️" }
];

const DRAW_CHECKLIST = [
  { id: "entrance", label: "Cave entrance" },
  { id: "rocks", label: "Rock formations" },
  { id: "vegetation", label: "Vegetation" },
  { id: "water", label: "Water / damp areas" },
  { id: "fossils", label: "Fossil evidence" },
  { id: "hominin", label: "Homo luzonensis" },
  { id: "deep", label: "Deeper cave area" }
];

function initCaveDrawing(){
  const canvas = document.getElementById("cave-canvas");
  if(!canvas) return;

  setupCanvasHiDPI(canvas);
  CaveDrawing.canvas = canvas;
  CaveDrawing.ctx = canvas.getContext("2d");

  renderDrawSwatches();
  renderDrawStamps();
  renderDrawChecklist();
  bindDrawToolbar();
  bindCanvasInput();

  const restored = loadDrawingFromStorage();
  if(restored && restored.image){
    const img = new Image();
    img.onload = () => {
      CaveDrawing.ctx.drawImage(img, 0, 0, CaveDrawing.cssWidth, CaveDrawing.cssHeight);
      pushHistory(); // seed the undo stack with the restored state
    };
    img.src = restored.image;
  } else {
    pushHistory(); // seed the undo stack with a blank canvas
  }
  if(restored && restored.checklist) applyChecklistState(restored.checklist);

  initDrawingReflection();
}

/* HiDPI setup: the internal pixel buffer is sized to the device
   pixel ratio (capped at 2x — no need to go higher for line art),
   while every drawing call below works in CSS-pixel coordinates
   via a matching context transform. cssWidth/cssHeight are stored
   so getCanvasPos() and clearRect() stay correct even if the
   canvas's displayed size differs from the size measured at setup
   (e.g. a later window resize). */
function setupCanvasHiDPI(canvas){
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const cssWidth = canvas.clientWidth || 900;
  const cssHeight = Math.round(cssWidth * (10 / 16)); // matches the CSS aspect-ratio:16/10
  canvas.width = Math.round(cssWidth * ratio);
  canvas.height = Math.round(cssHeight * ratio);
  canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
  CaveDrawing.cssWidth = cssWidth;
  CaveDrawing.cssHeight = cssHeight;
}

/* ---------- Toolbar rendering ---------- */
function renderDrawSwatches(){
  const wrap = document.getElementById("draw-swatches");
  if(!wrap) return;
  wrap.innerHTML = DRAW_SWATCHES.map(hex =>
    `<button class="draw-swatch" style="background:${hex}" data-color="${hex}" title="${hex}" aria-label="Color ${hex}"></button>`
  ).join("");
  wrap.querySelectorAll(".draw-swatch").forEach(btn => {
    btn.addEventListener("click", () => {
      wrap.querySelectorAll(".draw-swatch").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      CaveDrawing.color = btn.dataset.color;
      document.getElementById("draw-color").value = btn.dataset.color;
      setDrawToolToBrush();
    });
  });
}

function renderDrawStamps(){
  const grid = document.getElementById("draw-stamp-grid");
  if(!grid) return;
  grid.innerHTML = DRAW_STAMPS.map(s =>
    `<button class="draw-stamp-btn" data-stamp="${s.glyph}" title="${s.label}" aria-label="Stamp: ${s.label}">${s.glyph}</button>`
  ).join("");
  grid.querySelectorAll(".draw-stamp-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      grid.querySelectorAll(".draw-stamp-btn").forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      document.querySelectorAll(".draw-tool-btn").forEach(b => b.classList.remove("is-active"));
      CaveDrawing.tool = "stamp";
      CaveDrawing.activeStamp = btn.dataset.stamp;
    });
  });
}

function renderDrawChecklist(){
  const list = document.getElementById("draw-checklist-list");
  if(!list) return;
  list.innerHTML = DRAW_CHECKLIST.map(item => `
    <li data-id="${item.id}" role="checkbox" aria-checked="false" tabindex="0">
      <span class="check-box">✓</span><span>${item.label}</span>
    </li>
  `).join("");
  list.querySelectorAll("li").forEach(li => {
    const toggle = () => {
      li.classList.toggle("is-checked");
      li.setAttribute("aria-checked", li.classList.contains("is-checked") ? "true" : "false");
      persistDrawingLocally();
    };
    li.addEventListener("click", toggle);
    li.addEventListener("keydown", (e) => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); toggle(); } });
  });
}

function getChecklistState(){
  const state = {};
  document.querySelectorAll("#draw-checklist-list li").forEach(li => {
    state[li.dataset.id] = li.classList.contains("is-checked");
  });
  return state;
}
function applyChecklistState(state){
  document.querySelectorAll("#draw-checklist-list li").forEach(li => {
    if(state[li.dataset.id]){
      li.classList.add("is-checked");
      li.setAttribute("aria-checked", "true");
    }
  });
}

function setDrawToolToBrush(){
  CaveDrawing.tool = "brush";
  CaveDrawing.activeStamp = null;
  document.querySelectorAll(".draw-tool-btn").forEach(b => b.classList.toggle("is-active", b.dataset.tool === "brush"));
  document.querySelectorAll(".draw-stamp-btn").forEach(b => b.classList.remove("is-active"));
}

function bindDrawToolbar(){
  document.getElementById("tool-brush").addEventListener("click", setDrawToolToBrush);
  document.getElementById("tool-eraser").addEventListener("click", () => {
    CaveDrawing.tool = "eraser";
    CaveDrawing.activeStamp = null;
    document.querySelectorAll(".draw-tool-btn").forEach(b => b.classList.toggle("is-active", b.dataset.tool === "eraser"));
    document.querySelectorAll(".draw-stamp-btn").forEach(b => b.classList.remove("is-active"));
  });

  const colorInput = document.getElementById("draw-color");
  colorInput.addEventListener("input", () => {
    CaveDrawing.color = colorInput.value;
    document.querySelectorAll(".draw-swatch").forEach(b => b.classList.remove("is-active"));
    setDrawToolToBrush();
  });

  const sizeInput = document.getElementById("draw-size");
  const sizeValue = document.getElementById("draw-size-value");
  sizeInput.addEventListener("input", () => {
    CaveDrawing.brushSize = Number(sizeInput.value);
    sizeValue.textContent = sizeInput.value;
  });

  document.getElementById("draw-undo").addEventListener("click", undoDrawing);
  document.getElementById("draw-redo").addEventListener("click", redoDrawing);

  const confirmBox = document.getElementById("draw-clear-confirm");
  document.getElementById("draw-clear").addEventListener("click", () => confirmBox.classList.add("is-visible"));
  document.getElementById("draw-clear-cancel").addEventListener("click", () => confirmBox.classList.remove("is-visible"));
  document.getElementById("draw-clear-yes").addEventListener("click", () => {
    clearDrawingCanvas();
    confirmBox.classList.remove("is-visible");
  });

  document.getElementById("draw-save").addEventListener("click", handleSaveDrawing);
}

function clearDrawingCanvas(){
  CaveDrawing.ctx.clearRect(0, 0, CaveDrawing.cssWidth, CaveDrawing.cssHeight);
  document.querySelectorAll("#draw-checklist-list li").forEach(li => {
    li.classList.remove("is-checked");
    li.setAttribute("aria-checked", "false");
  });
  pushHistory();
  persistDrawingLocally();
}

/* ---------- Pointer input (mouse, touch, and pen all unify
   through the Pointer Events API — touch-action:none in CSS
   stops the browser from treating strokes as scroll/zoom gestures) ---------- */
function bindCanvasInput(){
  const canvas = CaveDrawing.canvas;
  canvas.addEventListener("pointerdown", onCanvasPointerDown);
  canvas.addEventListener("pointermove", onCanvasPointerMove);
  window.addEventListener("pointerup", onCanvasPointerUp);
  window.addEventListener("pointercancel", onCanvasPointerUp);
}

function getCanvasPos(e){
  const rect = CaveDrawing.canvas.getBoundingClientRect();
  const scaleX = CaveDrawing.cssWidth / rect.width;
  const scaleY = CaveDrawing.cssHeight / rect.height;
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function onCanvasPointerDown(e){
  e.preventDefault();
  const pos = getCanvasPos(e);
  if(CaveDrawing.tool === "stamp" && CaveDrawing.activeStamp){
    placeStamp(pos);
    pushHistory();
    persistDrawingLocally();
    return;
  }
  CaveDrawing.drawing = true;
  CaveDrawing.lastPos = pos;
  drawDot(pos);
}
function onCanvasPointerMove(e){
  if(!CaveDrawing.drawing) return;
  const pos = getCanvasPos(e);
  drawLine(CaveDrawing.lastPos, pos);
  CaveDrawing.lastPos = pos;
}
function onCanvasPointerUp(){
  if(!CaveDrawing.drawing) return;
  CaveDrawing.drawing = false;
  pushHistory();
  persistDrawingLocally();
}

function drawDot(pos){
  const ctx = CaveDrawing.ctx;
  ctx.save();
  ctx.globalCompositeOperation = CaveDrawing.tool === "eraser" ? "destination-out" : "source-over";
  ctx.fillStyle = CaveDrawing.color;
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, CaveDrawing.brushSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
function drawLine(from, to){
  const ctx = CaveDrawing.ctx;
  ctx.save();
  ctx.globalCompositeOperation = CaveDrawing.tool === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = CaveDrawing.color;
  ctx.lineWidth = CaveDrawing.brushSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}
function placeStamp(pos){
  const ctx = CaveDrawing.ctx;
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.font = "34px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(CaveDrawing.activeStamp, pos.x, pos.y);
  ctx.restore();
}

/* ---------- Undo / redo ----------
   dataURL-based snapshots (not raw ImageData): PNG compression
   keeps memory reasonable for sparse line art, capped at 20 steps. */
function pushHistory(){
  const state = CaveDrawing;
  state.history = state.history.slice(0, state.historyIndex + 1); // discard any redo branch
  state.history.push(state.canvas.toDataURL());
  if(state.history.length > state.maxHistory) state.history.shift();
  state.historyIndex = state.history.length - 1;
  updateUndoRedoButtons();
}
function undoDrawing(){
  if(CaveDrawing.historyIndex <= 0) return;
  CaveDrawing.historyIndex--;
  restoreDrawingFromHistory();
}
function redoDrawing(){
  if(CaveDrawing.historyIndex >= CaveDrawing.history.length - 1) return;
  CaveDrawing.historyIndex++;
  restoreDrawingFromHistory();
}
function restoreDrawingFromHistory(){
  const state = CaveDrawing;
  const dataUrl = state.history[state.historyIndex];
  const img = new Image();
  img.onload = () => {
    state.ctx.clearRect(0, 0, state.cssWidth, state.cssHeight);
    state.ctx.drawImage(img, 0, 0, state.cssWidth, state.cssHeight);
    persistDrawingLocally();
  };
  img.src = dataUrl;
  updateUndoRedoButtons();
}
function updateUndoRedoButtons(){
  const undoBtn = document.getElementById("draw-undo");
  const redoBtn = document.getElementById("draw-redo");
  if(undoBtn) undoBtn.disabled = CaveDrawing.historyIndex <= 0;
  if(redoBtn) redoBtn.disabled = CaveDrawing.historyIndex >= CaveDrawing.history.length - 1;
}

/* ---------- Local persistence (autosave, separate from XP/progress) ---------- */
function persistDrawingLocally(){
  try{
    const payload = { image: CaveDrawing.canvas.toDataURL(), checklist: getChecklistState() };
    localStorage.setItem(DRAWING_STORAGE_KEY, JSON.stringify(payload));
  }catch(e){ /* storage full or disabled — fail silently, same as saveProgress() */ }
}
function loadDrawingFromStorage(){
  try{
    const raw = localStorage.getItem(DRAWING_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch(e){ return null; }
}

/* ---------- Save / export / XP ---------- */
function isCaveDrawingBlank(){
  const ctx = CaveDrawing.ctx, canvas = CaveDrawing.canvas;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for(let i = 3; i < data.length; i += 4){
    if(data[i] !== 0) return false; // a non-transparent pixel means something was drawn
  }
  return true;
}

function exportDrawingAsPNG(){
  // The live canvas is transparent so the eraser reveals the CSS
  // parchment background underneath — but a downloaded PNG should
  // look good standalone, so the background gets composited in
  // on an offscreen canvas at export time only.
  const canvas = CaveDrawing.canvas;
  const off = document.createElement("canvas");
  off.width = canvas.width;
  off.height = canvas.height;
  const octx = off.getContext("2d");
  octx.fillStyle = CaveDrawing.backgroundColor;
  octx.fillRect(0, 0, off.width, off.height);
  octx.drawImage(canvas, 0, 0);
  return off.toDataURL("image/png");
}

function downloadCaveDrawing(){
  const link = document.createElement("a");
  link.download = "evoluzon-callao-cave-reconstruction.png";
  link.href = exportDrawingAsPNG();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleSaveDrawing(){
  if(isCaveDrawingBlank()){
    showToast("Draw something first, then save your reconstruction.");
    return;
  }
  persistDrawingLocally();
  downloadCaveDrawing();

  // XP + badge reuse the site's existing systems exactly (addXP,
  // awardBadge) and are guarded by a one-time flag in EvoState so
  // clicking Save again just re-downloads without re-awarding.
  if(!EvoState.caveDrawingCompleted){
    EvoState.caveDrawingCompleted = true;
    addXP(15, "Cave Reconstruction Complete");
    awardBadge("cave-artist");
    saveProgress();
  } else {
    showToast("Drawing saved to your downloads.");
  }
}

/* ---------- Reflection prompts ----------
   Mirrors initReflection()'s exact autosave pattern above, but
   with its own DOM ids and its own localStorage key
   (DRAWING_REFLECTION_KEY) — reusing the numeric-indexed keys
   from the fossil reflection journal would silently overwrite
   its answers, since both sets would collide on indices 0/1/2. */
function initDrawingReflection(){
  const wrap = document.getElementById("drawing-reflection");
  if(!wrap) return;
  const prompts = [
    "What features of your drawing are based on evidence you learned from EvoLuzon?",
    "Where did you place Homo luzonensis or the fossil evidence, and why?",
    "What does your reconstruction tell you about the environment in which the species lived?"
  ];
  let saved = {};
  try{ saved = JSON.parse(localStorage.getItem(DRAWING_REFLECTION_KEY) || "{}"); }catch(e){ saved = {}; }

  wrap.innerHTML = `
    <p class="eyebrow" style="margin-bottom:.8em;">Think About It</p>
    ${prompts.map((q, i) => `
      <div class="reflect-q reveal is-visible">
        <label for="drawing-reflect-${i}">${q}</label>
        <textarea id="drawing-reflect-${i}" placeholder="Type your thoughts…">${saved[i] || ""}</textarea>
        <div class="save-note" id="drawing-reflect-note-${i}"></div>
      </div>
    `).join("")}
  `;

  prompts.forEach((_, i) => {
    const textarea = document.getElementById(`drawing-reflect-${i}`);
    const note = document.getElementById(`drawing-reflect-note-${i}`);
    let timer;
    textarea.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        saved[i] = textarea.value;
        try{ localStorage.setItem(DRAWING_REFLECTION_KEY, JSON.stringify(saved)); }catch(e){}
        note.textContent = "Saved ✓";
        clearTimeout(note._fade);
        note._fade = setTimeout(() => note.textContent = "", 1800);
      }, 700);
    });
  });
}

/* ============================================================
   VISUAL AIDS (advisor revision: more visual, less text-heavy)
   Everything below is ORIGINAL schematic illustration drawn in
   inline SVG — deliberately NOT presented as photographs, and
   labeled "schematic / not to scale" wherever shown. Real photos
   are only used where a verified open license exists (see the
   Image credits in the footer).
   ============================================================ */
const GOLD = "#E5C76B", CYAN = "#00E5FF", DIM = "#9FB3C0", PANEL = "#243447";

function personFigure(scale, fill, markers){
  const m = (markers || []).map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="6.5" fill="${GOLD}" stroke="#0B0F14" stroke-width="1.5"/>`).join("");
  return `<g transform="translate(50 200) scale(${scale}) translate(-50 -200)">
    <circle cx="50" cy="22" r="14" fill="${fill}"/>
    <rect x="36" y="40" width="28" height="62" rx="12" fill="${fill}"/>
    <path d="M36 50 L22 96 M64 50 L78 96" stroke="${fill}" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M44 100 L40 190 M56 100 L60 190" stroke="${fill}" stroke-width="10" stroke-linecap="round" fill="none"/>
    ${m}</g>`;
}

function renderVisuals(){
  const bm = document.getElementById("body-map");
  if(bm){
    bm.innerHTML = `
      <h3>🦴 Where on the body did the evidence come from?</h3>
      <div class="bodymap">
        <svg viewBox="0 0 100 200" role="img" aria-label="Schematic body map showing teeth, hand bones, thigh bone, and foot bones">
          ${personFigure(1, "#3a4c5e", [[50,24],[78,96],[46,125],[40,186]])}
        </svg>
        <ul class="bodymap-legend">
          <li><span class="legend-dot">🦷</span><div><strong>Teeth</strong><span>Key evidence for naming a new species.</span></div></li>
          <li><span class="legend-dot">🖐️</span><div><strong>Hand bones</strong><span>Curved finger bones hint at climbing ability.</span></div></li>
          <li><span class="legend-dot">🦴</span><div><strong>Femur (partial)</strong><span>A thigh-bone fragment: a clue to small body size.</span></div></li>
          <li><span class="legend-dot">🦶</span><div><strong>Foot bones</strong><span>Curved toes — and the 2007 find that started it all.</span></div></li>
        </ul>
      </div>
      <p class="visual-caption">Schematic body map, not to scale. Gold dots mark the kinds of bones recovered; no skull has been found.</p>`;
  }

  const cv = document.getElementById("compare-visual");
  if(cv){
    cv.innerHTML = `
      <h3>📏 Size at a glance</h3>
      <div class="compare-visual">
        <div class="compare-figure">
          <svg viewBox="0 0 100 200" role="img" aria-label="Silhouette of Homo sapiens">${personFigure(1, CYAN, [])}</svg>
          <h4 style="color:${CYAN}">Homo sapiens</h4><p>~150–180 cm</p>
        </div>
        <div class="compare-figure">
          <svg viewBox="0 0 100 200" role="img" aria-label="Smaller silhouette of Homo luzonensis">${personFigure(0.68, GOLD, [])}</svg>
          <h4 style="color:${GOLD}">Homo luzonensis</h4><p>est. under ~120 cm</p>
        </div>
      </div>
      <div class="chip-row">
        <span class="chip">🦷 Small teeth</span><span class="chip">🦶 Curved toes</span>
        <span class="chip">🖐️ Curved fingers</span><span class="chip">🚫 No skull found</span>
      </div>
      <p class="visual-caption">Illustrative scale only. Homo luzonensis body size is inferred from a few bones, not measured from a complete skeleton.</p>`;
  }
}

/* Approximate lifetimes, in millions of years ago (start, end).
   Overlapping bars make the point visually: evolution branches,
   it is not a ladder. Luzonensis/floresiensis bars are thin
   because they're tiny slivers on this scale — that's accurate. */
const SPECIES_RANGES = {
  australopithecus: { name: "Australopithecus", start: 4.2, end: 2.0 },
  habilis:          { name: "H. habilis",        start: 2.4, end: 1.4 },
  erectus:          { name: "H. erectus",        start: 1.9, end: 0.11 },
  floresiensis:     { name: "H. floresiensis",   start: 0.7, end: 0.05 },
  luzonensis:       { name: "H. luzonensis",     start: 0.067, end: 0.05 },
  sapiens:          { name: "H. sapiens",        start: 0.3, end: 0 }
};
function rangeChartHTML(activeId){
  const max = 4.5;
  const rows = Object.entries(SPECIES_RANGES).map(([id, r]) => {
    const left = ((max - r.start) / max) * 100;
    const width = Math.max(((r.start - r.end) / max) * 100, 1.4);
    return `<div class="range-row ${id === activeId ? "is-active" : ""}">
      <span class="range-name">${r.name}</span>
      <div class="range-track"><div class="range-bar" style="left:${left}%; width:${width}%"></div></div></div>`;
  }).join("");
  return `<div class="range-chart" aria-label="When each species lived">${rows}
    <div class="range-axis"><span>4.5 million yrs ago</span><span>today</span></div>
    <p class="visual-caption">Approximate ranges. Overlapping lifetimes show evolution branching — not a ladder.</p></div>`;
}

const MODULE_SVGS = [
  // 0: What makes a new species
  `<svg viewBox="0 0 200 120" role="img" aria-label="Compare bones, check against known species, propose a new species">
    <g font-family="monospace" font-size="9" text-anchor="middle" fill="${DIM}">
      <rect x="4" y="38" width="54" height="44" rx="8" fill="${PANEL}" stroke="${CYAN}"/><text x="31" y="64">Compare</text>
      <rect x="73" y="38" width="54" height="44" rx="8" fill="${PANEL}" stroke="${CYAN}"/><text x="100" y="60">Fits any</text><text x="100" y="72">known?</text>
      <rect x="142" y="38" width="54" height="44" rx="8" fill="${PANEL}" stroke="${GOLD}"/><text x="169" y="60">New</text><text x="169" y="72">species</text>
      <path d="M60 60 H71 M129 60 H140" stroke="${GOLD}" stroke-width="2"/>
      <text x="100" y="104" fill="${GOLD}">then peer review</text></g></svg>`,
  // 1: Mosaic skeleton
  `<svg viewBox="0 0 200 120" role="img" aria-label="A mosaic skeleton mixes older and modern traits">
    <rect x="12" y="34" width="88" height="46" rx="8" fill="rgba(229,199,107,.22)" stroke="${GOLD}"/>
    <rect x="100" y="34" width="88" height="46" rx="8" fill="rgba(0,229,255,.16)" stroke="${CYAN}"/>
    <g font-family="monospace" font-size="9" text-anchor="middle" fill="${DIM}">
      <text x="56" y="54" font-size="16">🦶</text><text x="56" y="72">older traits</text>
      <text x="144" y="54" font-size="16">🦷</text><text x="144" y="72">modern traits</text>
      <text x="100" y="104" fill="${GOLD}">one skeleton, both</text></g></svg>`,
  // 2: Island dwarfism
  `<svg viewBox="0 0 200 120" role="img" aria-label="Large mainland animal and a smaller island descendant">
    <ellipse cx="48" cy="62" rx="34" ry="22" fill="#3a4c5e"/><ellipse cx="156" cy="72" rx="16" ry="11" fill="${GOLD}"/>
    <path d="M84 62 H128" stroke="${CYAN}" stroke-width="2" stroke-dasharray="4 3"/><path d="M124 57 L132 62 L124 67" fill="none" stroke="${CYAN}" stroke-width="2"/>
    <path d="M130 88 q8 -6 16 0 t16 0 t16 0" stroke="${CYAN}" fill="none"/>
    <g font-family="monospace" font-size="9" text-anchor="middle" fill="${DIM}"><text x="48" y="100">mainland</text><text x="156" y="108">small island</text></g></svg>`,
  // 3: Dating
  `<svg viewBox="0 0 200 120" role="img" aria-label="A decay curve representing a radioactive clock">
    <path d="M24 16 V98 H184" stroke="${DIM}" fill="none"/>
    <path d="M26 22 C60 30 80 78 182 92" stroke="${GOLD}" stroke-width="3" fill="none"/>
    <g font-family="monospace" font-size="9" fill="${DIM}"><text x="30" y="14">uranium trapped in rock</text><text x="120" y="112">time →</text></g></svg>`,
  // 4: Why the Philippines matters
  `<svg viewBox="0 0 200 120" role="img" aria-label="Schematic: crossing open water from the mainland to Luzon">
    <rect x="4" y="30" width="56" height="60" rx="10" fill="#3a4c5e"/><ellipse cx="166" cy="62" rx="26" ry="34" fill="${GOLD}"/>
    <path d="M66 50 q8 -6 16 0 t16 0 t16 0 M66 70 q8 -6 16 0 t16 0 t16 0" stroke="${CYAN}" fill="none"/>
    <path d="M62 60 H134" stroke="${GOLD}" stroke-width="2" stroke-dasharray="5 4"/>
    <g font-family="monospace" font-size="9" text-anchor="middle" fill="${DIM}"><text x="32" y="64">mainland</text><text x="166" y="64" fill="#0B0F14">Luzon</text><text x="98" y="108" fill="${GOLD}">open water — never a land bridge</text></g></svg>`
];
function moduleVisual(i){ return MODULE_SVGS[i] || ""; }
