/* ============================================================
   EvoLuzon — explore3d.js  (Phase 2)
   First-person Three.js museum cave. Three.js itself is only
   fetched via dynamic import() once the visitor clicks
   "Enter Callao Cave" — the page never pays that cost if a
   visitor never opens Explore. Everything here is a classic
   (non-module) script so it shares globals with app.js /
   content.js exactly like the rest of the site.

   Falls back to procedural geometry for any .glb that hasn't
   been supplied yet (see assets/models/README.txt), so the
   cave is fully walkable and interactive with zero external
   assets, and upgrades automatically once real files land.
   ============================================================ */

const Explore3D = {
  booted: false,
  THREE: null, PointerLockControls: null, GLTFLoader: null,
  CSS2DRenderer: null, CSS2DObject: null,
  scene: null, camera: null, renderer: null, labelRenderer: null,
  controls: null, clock: null, raycaster: null, velocity: null,
  flashlight: null,
  container: null,
  viewportObserver: null,
  artifactMeshes: [],   // { root, mesh, data, isPlaceholder, label }
  hotspotMeshes: [],    // { sprite, data, label }
  dust: null,
  mist: null,
  streamMesh: null,
  swayingVines: [],
  dripStations: [],
  bats: [],
  insects: [],
  insectMesh: null,
  interactTarget: null, // { kind: "artifact"|"hotspot", ref }
  inspecting: false,
  modalOpen: false, // true while a hotspot info card or the Evolution Wall is open
  inspectState: null,
  move: { forward: false, back: false, left: false, right: false },
  // Six narrative areas along -Z, each a control point the tunnel
  // geometry AND the movement clamp both read from — so the visual
  // shape and the walkable footprint can never drift out of sync.
  // z: control point position. halfWidth: passage half-width at
  // that point. ceiling: ceiling height above floor (y=0) at that
  // point. name: which of the six requested areas this represents.
  zones: [
    { z:  9,  halfWidth: 9.0, ceiling: 7.0, name: "entrance" },
    { z:  4,  halfWidth: 4.4, ceiling: 4.1, name: "passage" },
    { z: -2,  halfWidth: 3.6, ceiling: 3.6, name: "passage" },
    { z: -9,  halfWidth: 8.4, ceiling: 6.4, name: "main-chamber" },
    { z: -18, halfWidth: 7.6, ceiling: 6.0, name: "exhibit-zone" },
    { z: -24, halfWidth: 7.0, ceiling: 5.2, name: "narrowing" },
    { z: -30, halfWidth: 7.2, ceiling: 5.6, name: "deep-chamber" },
    { z: -37, halfWidth: 5.0, ceiling: 4.4, name: "evolution-alcove" }
  ],
  rafId: null,
  visibleInViewport: true,
  lastFootstep: 0
};

// The CDN version lives in exactly one place: the <script type="importmap">
// in index.html's <head>. These bare specifiers ("three", "three/addons/...")
// are resolved through that map — see the comment there for why it's needed.

// Proximity-reveal thresholds (meters). Used consistently by
// updateLabelProximity() (distance-only: shows name/location) and
// updateInteractTarget() (distance + raycast line-of-sight: shows
// the "press E" prompt) — see the comment on updateLabelProximity
// for why these two are deliberately separate checks.
//
// Proximity-reveal thresholds (meters). Used consistently by
// updateLabelProximity() (distance-only: shows name/location) and
// updateInteractTarget() (distance + raycast line-of-sight: shows
// the "press E" prompt) — see the comment on updateLabelProximity
// for why these two are deliberately separate checks.
//
// Set to 2.8 (not the cave's earlier 5.5) specifically so all 14
// interactive points fit with zero overlap risk inside the
// ORIGINAL, unchanged 46-unit cave footprint — this is a label
// behavior change, not a cave-size change. See the position table
// in data.js and the spacing note in README.md for the math this
// has to satisfy.
const LABEL_SHOW_DISTANCE = 2.8;
const INTERACT_DISTANCE = 1.9;

/* Short reflective prompts shown inside the inspection panel —
   kept local to this file (rather than added to data.js) since
   they're presentation detail specific to the 3D viewer. */
const CAVE_REFLECTION_PROMPTS = {
  "teeth": "Teeth are some of the most common hominin fossils. Why might that be true — what makes teeth more likely to survive than other bones?",
  "finger-bones": "Curved finger bones suggest climbing ability. What would it mean for a hominin to be equally comfortable in trees and on the ground?",
  "toe-bones": "This was the very first fossil found here, back in 2007. Why might a single bone be enough to justify years of further excavation?",
  "femur": "Body size is estimated from a single partial bone. What are the risks of estimating an entire animal from one fragment?",
  "hands": "Hands this capable of both grasping and fine manipulation raise a question: what tasks do you think this hand was built for?",
  "species-comparison-skull": "No Homo luzonensis skull has ever been found. What questions would a skull answer that hand and foot bones alone cannot?",
  "possible-tool": "This object suggests, but doesn't prove, tool use. What would count as definitive proof to you?"
};

/* ============================================================
   CAVE SHAPE HELPERS
   Both the tunnel geometry (buildProceduralCave) and the movement
   collision clamp (updateMovement) read from Explore3D.zones, so
   the walls the player sees and the invisible walls that stop
   them are always the same shape — never a mismatch where the
   cave "looks" wide but the player can't actually walk there.
   ============================================================ */
function findZonePair(z){
  const zones = Explore3D.zones;
  if(z >= zones[0].z) return [zones[0], zones[0]];
  if(z <= zones[zones.length - 1].z) return [zones[zones.length - 1], zones[zones.length - 1]];
  for(let i = 0; i < zones.length - 1; i++){
    if(z <= zones[i].z && z >= zones[i + 1].z) return [zones[i], zones[i + 1]];
  }
  return [zones[zones.length - 1], zones[zones.length - 1]];
}

function lerpZoneField(z, field){
  const [a, b] = findZonePair(z);
  if(a === b) return a[field];
  const t = (a.z - z) / (a.z - b.z); // 0 at a, 1 at b
  return a[field] + (b[field] - a[field]) * t;
}

function getCaveHalfWidthAtZ(z){ return lerpZoneField(z, "halfWidth"); }
function getCaveCeilingAtZ(z){ return lerpZoneField(z, "ceiling"); }

/* ============================================================
   BOOTSTRAP — cheap on page load, does the heavy lifting lazily
   ============================================================ */
function initExplore3D(){
  const btn = document.getElementById("enter-cave-btn");
  if(!btn) return;
  btn.disabled = false;
  btn.textContent = "Enter Callao Cave";
  btn.addEventListener("click", startExploring, { once: true });

  document.getElementById("resume-cave-btn")?.addEventListener("click", () => {
    Explore3D.controls?.lock();
  });

  document.getElementById("evowall-close")?.addEventListener("click", closeEvolutionWall);
  document.getElementById("evowall-overlay")?.addEventListener("click", (e) => {
    if(e.target.id === "evowall-overlay") closeEvolutionWall();
  });

  // Pause the render loop off-screen — protects the rest of the
  // page's frame rate and respects the "60 FPS" budget. Stored on
  // Explore3D so teardownExplore3D() can disconnect it later.
  const section = document.getElementById("explore");
  if(section){
    Explore3D.viewportObserver = new IntersectionObserver((entries) => {
      Explore3D.visibleInViewport = entries[0].isIntersecting;
      if(Explore3D.visibleInViewport && Explore3D.booted && !Explore3D.rafId) animateExplore3D();
    }, { threshold: 0.05 });
    Explore3D.viewportObserver.observe(section);
  }
  document.addEventListener("visibilitychange", onExplore3DVisibilityChange);

  scheduleDrip();
}

function onExplore3DVisibilityChange(){
  if(document.hidden && Explore3D.rafId){
    cancelAnimationFrame(Explore3D.rafId);
    Explore3D.rafId = null;
  } else if(!document.hidden && Explore3D.booted && Explore3D.visibleInViewport && !Explore3D.rafId){
    animateExplore3D();
  }
}

async function startExploring(){
  const btn = document.getElementById("enter-cave-btn");
  const fill = document.getElementById("load-bar-fill");
  btn.disabled = true;
  btn.textContent = "Loading the cave…";

  try{
    const [THREE, controlsMod, gltfMod, css2dMod] = await Promise.all([
      import(/* webpackIgnore: true */ "three"),
      import(/* webpackIgnore: true */ "three/addons/controls/PointerLockControls.js"),
      import(/* webpackIgnore: true */ "three/addons/loaders/GLTFLoader.js"),
      import(/* webpackIgnore: true */ "three/addons/renderers/CSS2DRenderer.js")
    ]);
    Explore3D.THREE = THREE;
    Explore3D.PointerLockControls = controlsMod.PointerLockControls;
    Explore3D.GLTFLoader = gltfMod.GLTFLoader;
    Explore3D.CSS2DRenderer = css2dMod.CSS2DRenderer;
    Explore3D.CSS2DObject = css2dMod.CSS2DObject;

    await buildScene((pct) => { if(fill) fill.style.width = pct + "%"; });

    document.getElementById("explore3d-start").classList.add("is-hidden");
    Explore3D.booted = true;
    Explore3D.controls.lock();
    animateExplore3D();
  }catch(err){
    console.error("EvoLuzon: the 3D cave failed to load:", err);
    btn.disabled = false;
    btn.textContent = "Retry Loading the Cave";
    showToast("The cave couldn't load — check your connection and try again.");
    btn.addEventListener("click", startExploring, { once: true });
  }
}

/* ============================================================
   SCENE CONSTRUCTION
   ============================================================ */
async function buildScene(onProgress){
  const THREE = Explore3D.THREE;
  const container = document.getElementById("explore3d-viewport");
  Explore3D.container = container;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0b0f14, 0.035);
  Explore3D.scene = scene;

  const camera = new THREE.PerspectiveCamera(68, container.clientWidth / container.clientHeight, 0.1, 200);
  camera.position.set(0, 1.6, 6);
  Explore3D.camera = camera;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.domElement.className = "explore3d-canvas";
  container.prepend(renderer.domElement);
  Explore3D.renderer = renderer;

  const labelRenderer = new Explore3D.CSS2DRenderer();
  labelRenderer.setSize(container.clientWidth, container.clientHeight);
  labelRenderer.domElement.className = "explore3d-labels";
  container.appendChild(labelRenderer.domElement);
  Explore3D.labelRenderer = labelRenderer;

  // ---------- Ambient cave lighting: cool blue hemisphere wash +
  // a faint "daylight from the entrance" directional light for
  // depth. Warm pedestal spotlights are added per-artifact below,
  // and the player's own flashlight is added right after this. ----------
  // NOTE ON INTENSITIES: Three.js removed "legacy" lighting in r155+,
  // so all light intensities are now physically-based (candela for
  // point/spot, irradiance-like for hemisphere/directional/ambient).
  // Values that looked reasonable under the old model render as
  // near-black under this one — these numbers are deliberately much
  // higher than they'd have been pre-r155. AmbientLight is added as
  // a flat, guaranteed-visible floor regardless of exact calibration.
  scene.add(new THREE.AmbientLight(0x18222c, 1.1));
  scene.add(new THREE.HemisphereLight(0x2c4258, 0x05070a, 2.2));

  // Daylight at the mouth of the cave: a SpotLight (not the earlier
  // DirectionalLight) specifically because DirectionalLights are
  // "infinite sun rays" with no distance falloff — they can't fade
  // with depth. A positioned SpotLight with a real distance/decay
  // naturally gives "bright at the entrance, dark by the main
  // chamber" for free, matching the requested layered lighting.
  const entranceLight = new THREE.SpotLight(0x9fd8ff, 140, 26, 0.85, 0.6, 1.5);
  entranceLight.position.set(0, 6.5, 9);
  const entranceLightTarget = new THREE.Object3D();
  entranceLightTarget.position.set(0, 1, -6);
  scene.add(entranceLightTarget);
  entranceLight.target = entranceLightTarget;
  scene.add(entranceLight);

  // ---------- Flashlight, attached to the camera ----------
  // A SpotLight parented to the camera (not the scene) so its
  // position/rotation update for free every frame as the player
  // moves and looks around — no manual per-frame sync needed.
  // castShadow is deliberately OFF: a shadow-casting light that
  // moves every frame would force an expensive shadow-map
  // recompute every frame too; the static pedestal spotlights
  // carry the shadow work instead.
  const flashlight = new THREE.SpotLight(0xfff1d6, 70, 18, Math.PI / 8, 0.4, 1.4);
  flashlight.castShadow = false;
  flashlight.position.set(0, 0, 0);
  camera.add(flashlight);
  const flashlightTarget = new THREE.Object3D();
  flashlightTarget.position.set(0, 0, -5); // always straight ahead of the camera
  camera.add(flashlightTarget);
  flashlight.target = flashlightTarget;
  Explore3D.flashlight = flashlight;

  onProgress(8);
  await loadCaveEnvironment(scene, onProgress);

  onProgress(50);
  await loadArtifacts(scene);

  onProgress(80);
  buildHotspots(scene);
  buildDustParticles(scene);

  onProgress(92);
  const controls = new Explore3D.PointerLockControls(camera, renderer.domElement);
  scene.add(controls.getObject()); // this is `camera` itself in modern three.js — also brings the flashlight along as its child
  Explore3D.controls = controls;

  controls.addEventListener("lock", () => {
    document.getElementById("explore3d-start").classList.add("is-hidden");
    document.getElementById("explore3d-pause").classList.remove("is-visible");
  });
  controls.addEventListener("unlock", () => {
    if(!Explore3D.inspecting && !Explore3D.modalOpen) document.getElementById("explore3d-pause").classList.add("is-visible");
  });

  Explore3D.velocity = new THREE.Vector3();
  Explore3D.clock = new THREE.Clock();
  Explore3D.raycaster = new THREE.Raycaster();

  bindExplore3DInput();
  window.addEventListener("resize", onExplore3DResize);
  updateExploreProgress3D();
  onProgress(100);
}

/* ---------- Cave shell: real GLB if present, else procedural ---------- */
function loadCaveEnvironment(scene, onProgress){
  const THREE = Explore3D.THREE;
  return new Promise((resolve) => {
    const loader = new Explore3D.GLTFLoader();
    loader.load(
      "assets/models/callao-cave.glb",
      (gltf) => {
        const cave = gltf.scene;
        cave.traverse((node) => { if(node.isMesh){ node.castShadow = true; node.receiveShadow = true; } });
        scene.add(cave);
        resolve();
      },
      (xhr) => { if(xhr.lengthComputable) onProgress(8 + (xhr.loaded / xhr.total) * 35); },
      () => { buildProceduralCave(scene); resolve(); } // no callao-cave.glb yet — automatic fallback
    );
  });
}

/* Procedural cave shell: one continuous "lofted" tunnel mesh
   (floor + walls + ceiling as a single connected surface, not
   separate box segments) generated by sweeping an irregular
   cross-section profile along Z, reading width/ceiling height
   from Explore3D.zones at every point — so the visible shape and
   the walkable footprint (see updateMovement) can never disagree.
   Rock formations are InstancedMesh groups (one draw call per
   formation type, regardless of instance count) to keep this
   cheap on a school laptop. Replacing this with a real
   callao-cave.glb later just means re-tuning Explore3D.zones to
   match its actual footprint. */
function buildProceduralCave(scene){
  const THREE = Explore3D.THREE;
  buildCaveShell(scene, THREE);
  buildRockFormations(scene, THREE);
  buildVegetationGradient(scene, THREE);
  buildRootsAndVines(scene, THREE);
  buildFloorDebris(scene, THREE);
  buildWaterFeatures(scene, THREE);
  buildDripStations(scene, THREE);
  buildCreatures(scene, THREE);
  buildAtmosphere(scene, THREE);
  buildGradientFillLights(scene, THREE);
  buildExcavationGrid(scene, THREE);
}

// Normalized cross-section profile, swept along Z. Each point is
// [xFrac, yFrac]: xFrac scales by the zone's halfWidth (-1..1),
// yFrac scales by the zone's ceiling height (0 = floor, 1 =
// ceiling apex). 16 points (up from an earlier 11) — the extra
// wall/ceiling subdivisions are what let flatShading read as
// "many small rough facets" instead of a few large smooth panels;
// this is the main lever for fixing "looks like flat polygons."
// The extra floor points give the ground a gentle visual dip —
// movement still clamps to a flat eye height, so this is purely a
// look, never something the player can get stuck in.
const CAVE_PROFILE = [
  [-1.00, 0.00], [-0.55, -0.035], [0.00, -0.05], [0.55, -0.035], [1.00, 0.00],
  [1.00, 0.22], [0.95, 0.42], [0.82, 0.62], [0.6, 0.80], [0.3, 0.98],
  [0.0, 1.06],
  [-0.3, 0.98], [-0.6, 0.80], [-0.82, 0.62], [-0.95, 0.42], [-1.00, 0.22]
];

function buildCaveShell(scene, THREE){
  const zones = Explore3D.zones;
  const zStart = zones[0].z, zEnd = zones[zones.length - 1].z;
  const sliceCount = 56; // finer than an earlier 42 — more facets = rougher-reading rock
  const ringSize = CAVE_PROFILE.length;

  const positions = [];
  const colors = [];
  const indices = [];

  // Two limestone palettes — dry (entrance, warm/pale) and wet
  // (deep cave, cool/dark) — blended by depth below, rather than
  // one flat color for the whole tunnel.
  const dryFloor = new THREE.Color(0x4a3f2e), dryFloorLight = new THREE.Color(0x5c4f3a);
  const wetFloor = new THREE.Color(0x1c1712), wetFloorLight = new THREE.Color(0x241d16);
  const dryWallCool = new THREE.Color(0x4a4640), dryWallWarm = new THREE.Color(0x554d3e);
  const wetWallCool = new THREE.Color(0x1a1e22), wetWallWarm = new THREE.Color(0x201c18);
  const dryCeiling = new THREE.Color(0x38342c), wetCeiling = new THREE.Color(0x0e1013);
  const mineralFleck = new THREE.Color(0x6a5f4c);  // lighter limestone edge / mineral deposit
  const dampPatch = new THREE.Color(0x0a0d0f);      // darker, damp-looking patch
  const tmp = new THREE.Color(), tmpA = new THREE.Color(), tmpB = new THREE.Color();

  for(let s = 0; s < sliceCount; s++){
    const t = s / (sliceCount - 1);
    const z = zStart + (zEnd - zStart) * t;
    const halfWidth = getCaveHalfWidthAtZ(z);
    const ceiling = getCaveCeilingAtZ(z);
    const depthT = Math.min(1, Math.max(0, (zStart - z) / (zStart - zEnd))); // 0 entrance -> 1 deepest

    for(let p = 0; p < ringSize; p++){
      const [xFrac, yFrac] = CAVE_PROFILE[p];
      const isFloor = yFrac <= 0.02;
      const isCeiling = yFrac >= 0.95;

      // Coherent, multi-frequency displacement instead of pure
      // per-vertex noise: a large slow wave (broad rock swells) plus
      // a smaller faster wave (crack/protrusion-scale bumps), so
      // neighboring vertices displace together like real eroded
      // rock rather than looking like uncorrelated static.
      const bigWave = Math.sin(z * 0.22 + p * 0.9) * 0.5 + Math.sin(z * 0.11 - p * 0.5 + 3) * 0.5;
      const smallWave = (Math.random() - 0.5) * 2;
      const wallJitter = isFloor ? 0.045 : 0.11 + Math.abs(bigWave) * 0.10;
      const jx = (bigWave * 0.6 + smallWave * 0.4) * halfWidth * wallJitter * 0.5;
      const jy = (bigWave * 0.6 + smallWave * 0.4) * ceiling * (isFloor ? 0.045 : wallJitter) * 0.5;

      const x = xFrac * halfWidth + jx;
      const y = Math.max(-0.35, yFrac * ceiling + jy);
      positions.push(x, y, z);

      // Base tone: dry near the entrance, wet deep in.
      let dryBase = isFloor ? (Math.random() < 0.5 ? dryFloor : dryFloorLight)
        : isCeiling ? dryCeiling
        : (Math.random() < 0.5 ? dryWallCool : dryWallWarm);
      let wetBase = isFloor ? (Math.random() < 0.5 ? wetFloor : wetFloorLight)
        : isCeiling ? wetCeiling
        : (Math.random() < 0.5 ? wetWallCool : wetWallWarm);
      tmpA.copy(dryBase); tmpB.copy(wetBase);
      tmp.copy(tmpA).lerp(tmpB, depthT);

      // Low-frequency "streak" pattern — simulates mineral
      // streaking / erosion channels running along the tunnel,
      // rather than salt-and-pepper per-vertex randomness.
      const streak = (Math.sin(z * 0.35 + p * 1.7) + 1) / 2;
      if(streak > 0.78) tmp.lerp(mineralFleck, 0.4);

      // Damp patches get more common with depth, matching "moisture
      // gradually introduced deeper in" rather than appearing at
      // a fixed rate everywhere.
      const dampChance = 0.05 + depthT * 0.22;
      if(Math.random() < dampChance) tmp.lerp(dampPatch, 0.5 + depthT * 0.3);

      const variance = 0.85 + Math.random() * 0.3;
      colors.push(tmp.r * variance, tmp.g * variance, tmp.b * variance);
    }
  }

  // Stitch consecutive rings into quads (two triangles each).
  for(let s = 0; s < sliceCount - 1; s++){
    const ringA = s * ringSize, ringB = (s + 1) * ringSize;
    for(let p = 0; p < ringSize; p++){
      const pNext = (p + 1) % ringSize;
      const a = ringA + p, b = ringA + pNext, c = ringB + p, d = ringB + pNext;
      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  // DoubleSide is a deliberate safety net: getting hand-rolled
  // triangle winding perfectly consistent across a swept tunnel is
  // easy to get subtly wrong, and a one-sided material would risk
  // invisible walls from certain angles. The extra cost is one
  // mesh's worth, not per-instance, so it's cheap insurance.
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.94, metalness: 0.02, flatShading: true, side: THREE.DoubleSide
  });
  const shell = new THREE.Mesh(geometry, material);
  shell.receiveShadow = true;
  shell.castShadow = true;
  scene.add(shell);

  // Cap the deepest end (the evolution alcove) so the tunnel
  // doesn't look like it opens into empty space.
  const lastZone = zones[zones.length - 1];
  const backWall = new THREE.Mesh(
    new THREE.CircleGeometry(lastZone.halfWidth * 1.05, 16),
    new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 1, flatShading: true })
  );
  backWall.position.set(0, lastZone.ceiling * 0.45, zEnd - 0.4);
  backWall.receiveShadow = true;
  scene.add(backWall);
}

/* Stalactites, stalagmites, boulders, columns, and wall
   protrusions — all built as InstancedMesh, so dozens of
   decorative rocks per formation type cost exactly one draw call
   each, not one per rock. Two geometry variants per formation type
   (not one repeated shape) avoid the "obviously the same rock
   copy-pasted" look the brief specifically flagged. Placement is
   weighted toward the main chamber / exhibit / deep-chamber zones
   (the tight entrance passage stays clear), and kept off the
   central walking strip — there's no per-object collision here,
   only the zone-width clamp in updateMovement, so keeping clutter
   out of the direct line of travel matters more than usual. */
function buildRockFormations(scene, THREE){
  const zones = Explore3D.zones;
  const m = new THREE.Matrix4();
  const palette = [0x2c2a26, 0x22282f, 0x322c22, 0x1c1f22, 0x3a352c];

  function randomChamberZ(){
    // Bias toward the wider named chambers, skip plain transition
    // corridors — matched by name rather than array index, so this
    // keeps working correctly no matter how Explore3D.zones changes.
    const wideZones = zones.filter(z => z.name !== "narrowing" && z.name !== "passage");
    const zone = wideZones[Math.floor(Math.random() * wideZones.length)];
    return zone.z + (Math.random() - 0.5) * 5;
  }
  function placeOffPath(halfWidth, spread = 1){
    const side = Math.random() < 0.5 ? -1 : 1;
    return side * (halfWidth * 0.55 + Math.random() * halfWidth * 0.4) * spread;
  }
  function colorInstances(mesh, count){
    const c = new THREE.Color();
    for(let i = 0; i < count; i++){
      c.set(palette[Math.floor(Math.random() * palette.length)]);
      c.multiplyScalar(0.8 + Math.random() * 0.4);
      mesh.setColorAt(i, c);
    }
    mesh.instanceColor.needsUpdate = true;
  }
  // Split one InstancedMesh's instance count across two geometry
  // variants by building two smaller InstancedMeshes that share a
  // placement loop — cheap (still just 2 draw calls, not N) and
  // avoids "every stalactite is visibly the same cone" repetition.
  function buildVariantPair(geoA, geoB, mat, countA, countB, placeFn){
    const meshA = new THREE.InstancedMesh(geoA, mat, countA);
    const meshB = new THREE.InstancedMesh(geoB, mat.clone(), countB);
    meshA.castShadow = meshB.castShadow = true;
    for(let i = 0; i < countA; i++) placeFn(meshA, i);
    for(let i = 0; i < countB; i++) placeFn(meshB, i);
    colorInstances(meshA, countA);
    colorInstances(meshB, countB);
    scene.add(meshA, meshB);
  }

  // ---------- Stalactites (hang from the ceiling) ----------
  const stalactiteTotal = 58;
  buildVariantPair(
    new THREE.ConeGeometry(0.28, 1, 6),
    new THREE.ConeGeometry(0.22, 1, 5), // slimmer, more angular variant
    new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
    Math.round(stalactiteTotal * 0.6), Math.round(stalactiteTotal * 0.4),
    (mesh, i) => {
      const z = randomChamberZ();
      const halfWidth = getCaveHalfWidthAtZ(z);
      const ceiling = getCaveCeilingAtZ(z);
      const x = placeOffPath(halfWidth, 0.7);
      const scale = 0.5 + Math.random() * 1.5;
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.PI, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4)
      );
      m.compose(new THREE.Vector3(x, ceiling - 0.05, z), q, new THREE.Vector3(scale * 0.65, scale * (1.1 + Math.random() * 1.1), scale * 0.65));
      mesh.setMatrixAt(i, m);
    }
  );

  // ---------- Stalagmites (rise from the floor) ----------
  const stalagmiteTotal = 44;
  buildVariantPair(
    new THREE.ConeGeometry(0.32, 1, 6),
    new THREE.ConeGeometry(0.4, 0.8, 5), // squatter, broader variant
    new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
    Math.round(stalagmiteTotal * 0.6), Math.round(stalagmiteTotal * 0.4),
    (mesh, i) => {
      const z = randomChamberZ();
      const halfWidth = getCaveHalfWidthAtZ(z);
      const x = placeOffPath(halfWidth);
      const scale = 0.4 + Math.random() * 1.2;
      mesh.receiveShadow = true;
      m.compose(new THREE.Vector3(x, scale * 0.5 - 0.15, z), new THREE.Quaternion(), new THREE.Vector3(scale * 0.8, scale, scale * 0.8));
      mesh.setMatrixAt(i, m);
    }
  );

  // ---------- Boulders / loose rock debris (whole tunnel) ----------
  const boulderTotal = 50;
  const zStart = zones[0].z, zEnd = zones[zones.length - 1].z;
  buildVariantPair(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.DodecahedronGeometry(1, 0), // different silhouette, avoids "every boulder is an icosahedron"
    new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
    Math.round(boulderTotal * 0.65), Math.round(boulderTotal * 0.35),
    (mesh, i) => {
      const z = zStart + Math.random() * (zEnd - zStart);
      const halfWidth = getCaveHalfWidthAtZ(z);
      const x = placeOffPath(halfWidth);
      const scale = 0.28 + Math.random() * 0.75;
      mesh.receiveShadow = true;
      m.compose(
        new THREE.Vector3(x, scale * 0.4, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5)),
        new THREE.Vector3(scale, scale * 0.7, scale)
      );
      mesh.setMatrixAt(i, m);
    }
  );

  // ---------- Cave columns (floor-to-ceiling) ----------
  const columnCount = 7;
  const columns = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.35, 0.5, 1, 8),
    new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true, color: 0x2a2622 }),
    columnCount
  );
  columns.castShadow = true;
  columns.receiveShadow = true;
  for(let i = 0; i < columnCount; i++){
    const z = randomChamberZ();
    const halfWidth = getCaveHalfWidthAtZ(z);
    const ceiling = getCaveCeilingAtZ(z);
    const x = placeOffPath(halfWidth, 0.85);
    m.compose(new THREE.Vector3(x, ceiling / 2, z), new THREE.Quaternion(), new THREE.Vector3(1, ceiling, 1));
    columns.setMatrixAt(i, m);
  }
  scene.add(columns);

  // ---------- Wall protrusions / shelves / cavities ----------
  // Small rock outcrops stuck flush to the walls at varied heights
  // — this is what makes the tunnel read as "eroded rock" instead
  // of "smooth swept surface" up close, without adding anything
  // the player can get physically stuck on (they hug the wall,
  // well clear of the walkable center).
  const protrusionCount = 30;
  const protrusions = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true, color: 0x2e2a24 }),
    protrusionCount
  );
  protrusions.castShadow = true;
  protrusions.receiveShadow = true;
  for(let i = 0; i < protrusionCount; i++){
    const z = zStart + Math.random() * (zEnd - zStart);
    const halfWidth = getCaveHalfWidthAtZ(z);
    const ceiling = getCaveCeilingAtZ(z);
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (halfWidth - 0.15);
    const y = 0.5 + Math.random() * (ceiling * 0.7);
    const scale = 0.25 + Math.random() * 0.5;
    m.compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.6)),
      new THREE.Vector3(scale * 0.8, scale, scale * 0.6)
    );
    protrusions.setMatrixAt(i, m);
  }
  scene.add(protrusions);
}

/* A light touch of vegetation right at the cave mouth — a
   handful of green-tinted low-poly shapes, nothing elaborate —
   so the entrance visually reads as "outside meeting underground"
   without costing more than one extra draw call. */
/* ============================================================
   VEGETATION — custom blade/frond geometries (not spheres or
   flat quads), instanced, with density that declines by depth:
   ferns and grass cluster near the entrance where light reaches;
   moss persists further in but thins toward the deep cave; almost
   nothing grows past the deep chamber. Colors stay in muted
   green/brown/yellow-green tones — no neon.
   ============================================================ */
function buildFernGeometry(THREE){
  // A handful of thin triangular fronds radiating from a base
  // point, arced outward and up — reads as "fern," not "cone."
  const positions = [], indices = [];
  const frondCount = 6;
  for(let f = 0; f < frondCount; f++){
    const angle = (f / frondCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dirX = Math.cos(angle), dirZ = Math.sin(angle);
    const len = 0.32 + Math.random() * 0.22;
    const tilt = 0.55 + Math.random() * 0.35;
    const base = positions.length / 3;
    positions.push(-dirZ * 0.02, 0.01, dirX * 0.02);
    positions.push(dirZ * 0.02, 0.01, -dirX * 0.02);
    positions.push(dirX * len * tilt, len, dirZ * len * tilt);
    indices.push(base, base + 1, base + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildGrassGeometry(THREE){
  // A small cluster of narrow blades, varied height/lean —
  // deliberately irregular rather than a uniform tuft.
  const positions = [], indices = [];
  const bladeCount = 6;
  for(let b = 0; b < bladeCount; b++){
    const baseX = (Math.random() - 0.5) * 0.14, baseZ = (Math.random() - 0.5) * 0.14;
    const lean = (Math.random() - 0.5) * 0.18;
    const height = 0.16 + Math.random() * 0.22;
    const base = positions.length / 3;
    positions.push(baseX - 0.012, 0, baseZ);
    positions.push(baseX + 0.012, 0, baseZ);
    positions.push(baseX + lean, height, baseZ + lean * 0.5);
    indices.push(base, base + 1, base + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function buildVegetationGradient(scene, THREE){
  const zones = Explore3D.zones;
  const zStart = zones[0].z, zEnd = zones[zones.length - 1].z;
  const greenPalette = [0x3a4a2a, 0x2e3d22, 0x4a5a30, 0x4f4a26]; // green, dark green, muted, yellow-green — no neon
  const m = new THREE.Matrix4();
  const c = new THREE.Color();

  function colorInstances(mesh, count){
    for(let i = 0; i < count; i++){
      c.set(greenPalette[Math.floor(Math.random() * greenPalette.length)]);
      c.multiplyScalar(0.75 + Math.random() * 0.4);
      mesh.setColorAt(i, c);
    }
    mesh.instanceColor.needsUpdate = true;
  }

  // depthBiasedZ(exponent): higher exponent = more concentrated
  // near the entrance (z near zStart). Random()^exponent skews
  // toward 0, and t=0 maps to zStart here.
  function depthBiasedZ(exponent){
    const t = Math.pow(Math.random(), exponent);
    return zStart - t * (zStart - zEnd);
  }

  // ---------- Ferns — entrance-heavy, essentially gone by mid-cave ----------
  const fernCount = 16;
  const ferns = new THREE.InstancedMesh(
    buildFernGeometry(THREE),
    new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }),
    fernCount
  );
  for(let i = 0; i < fernCount; i++){
    const z = depthBiasedZ(3.2);
    const halfWidth = getCaveHalfWidthAtZ(z);
    const x = (Math.random() - 0.5) * halfWidth * 1.7;
    const scale = 0.7 + Math.random() * 0.8;
    m.compose(
      new THREE.Vector3(x, 0, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0)),
      new THREE.Vector3(scale, scale, scale)
    );
    ferns.setMatrixAt(i, m);
  }
  colorInstances(ferns, fernCount);
  scene.add(ferns);

  // ---------- Grass tufts — entrance-heavy, slightly less steep falloff than ferns ----------
  const grassCount = 22;
  const grass = new THREE.InstancedMesh(
    buildGrassGeometry(THREE),
    new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide }),
    grassCount
  );
  for(let i = 0; i < grassCount; i++){
    const z = depthBiasedZ(2.6);
    const halfWidth = getCaveHalfWidthAtZ(z);
    const x = (Math.random() - 0.5) * halfWidth * 1.75;
    const scale = 0.8 + Math.random() * 0.7;
    m.compose(
      new THREE.Vector3(x, 0, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0)),
      new THREE.Vector3(scale, scale, scale)
    );
    grass.setMatrixAt(i, m);
  }
  colorInstances(grass, grassCount);
  scene.add(grass);

  // ---------- Moss — present entrance through mid-cave, thin but
  // not absent in the deep chamber (a milder falloff than ferns/
  // grass, matching "moisture-loving growth persists longer than
  // light-dependent plants") ----------
  const mossCount = 34;
  const moss = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.32, 7),
    new THREE.MeshStandardMaterial({ color: 0x354a2c, roughness: 1, side: THREE.DoubleSide }),
    mossCount
  );
  moss.receiveShadow = true;
  for(let i = 0; i < mossCount; i++){
    const z = depthBiasedZ(1.3);
    const halfWidth = getCaveHalfWidthAtZ(z);
    const x = (Math.random() - 0.5) * halfWidth * 1.8;
    const scale = 0.55 + Math.random() * 0.85;
    m.compose(
      new THREE.Vector3(x, 0.025, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.random() * Math.PI)),
      new THREE.Vector3(scale, scale, scale)
    );
    moss.setMatrixAt(i, m);
  }
  colorInstances(moss, mossCount);
  scene.add(moss);
}

/* Roots and thin hanging vines near the entrance/upper walls —
   built with TubeGeometry along a short organic curve. Each curve
   is defined in LOCAL space (relative to its own attachment point
   at the origin), and the mesh is then positioned at the world
   attachment point — that way, gently rotating the mesh sways it
   from where it hangs, not around the world origin. A handful are
   tracked in Explore3D.swayingVines for that subtle per-frame sway. */
function buildRootsAndVines(scene, THREE){
  const vineCount = 9;
  const mat = new THREE.MeshStandardMaterial({ color: 0x3d3626, roughness: 0.9 });
  Explore3D.swayingVines = [];
  const halfWidth = getCaveHalfWidthAtZ(7);
  const ceiling = getCaveCeilingAtZ(7);
  for(let i = 0; i < vineCount; i++){
    const worldX = (Math.random() - 0.5) * halfWidth * 1.5;
    const worldZ = 4.5 + Math.random() * 4;
    const worldY = ceiling * (0.75 + Math.random() * 0.2);
    const length = 0.5 + Math.random() * 0.9;
    const mid = new THREE.Vector3((Math.random() - 0.5) * 0.3, -length * 0.5, (Math.random() - 0.5) * 0.3);
    const end = new THREE.Vector3((Math.random() - 0.5) * 0.55, -length, (Math.random() - 0.5) * 0.55);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), mid, end]);
    const geo = new THREE.TubeGeometry(curve, 8, 0.012 + Math.random() * 0.015, 4, false);
    const vine = new THREE.Mesh(geo, mat);
    vine.position.set(worldX, worldY, worldZ);
    vine.castShadow = true;
    scene.add(vine);
    Explore3D.swayingVines.push({ mesh: vine, phase: Math.random() * Math.PI * 2, amplitude: 0.015 + Math.random() * 0.02 });
  }
}

/* Small rocks, pebbles, and rubble across the floor — visual only.
   They sit essentially flush with the ground (never real
   obstacles, since there's no per-object collision to catch on
   anyway) so movement stays smooth while the floor reads as
   natural rather than swept clean. */
function buildFloorDebris(scene, THREE){
  const zones = Explore3D.zones;
  const zStart = zones[0].z, zEnd = zones[zones.length - 1].z;
  const count = 70;
  const debris = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.07, 0),
    new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }),
    count
  );
  debris.receiveShadow = true;
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  for(let i = 0; i < count; i++){
    const z = zStart + Math.random() * (zEnd - zStart);
    const halfWidth = getCaveHalfWidthAtZ(z);
    const x = (Math.random() - 0.5) * halfWidth * 1.75;
    const scale = 0.35 + Math.random() * 1.7;
    m.compose(
      new THREE.Vector3(x, 0.015, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)),
      new THREE.Vector3(scale, scale * 0.6, scale)
    );
    debris.setMatrixAt(i, m);
    c.setHSL(0.08 + Math.random() * 0.06, 0.15 + Math.random() * 0.15, 0.16 + Math.random() * 0.14);
    debris.setColorAt(i, c);
  }
  debris.instanceColor.needsUpdate = true;
  scene.add(debris);
}

/* ============================================================
   WATER — small, scattered, natural. Puddles (instanced) plus one
   gently winding stream ribbon; both use restrained dark
   gray/brown-gray tones with a touch of specular sheen from low
   roughness, never a bright blue "glowing river."
   ============================================================ */
function buildWaterFeatures(scene, THREE){
  const zones = Explore3D.zones;
  const zStart = zones[0].z, zEnd = zones[zones.length - 1].z;

  const puddleCount = 16;
  const puddles = new THREE.InstancedMesh(
    new THREE.CircleGeometry(0.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x0c1418, roughness: 0.15, metalness: 0.2 }),
    puddleCount
  );
  const m = new THREE.Matrix4();
  for(let i = 0; i < puddleCount; i++){
    const z = zStart + Math.random() * (zEnd - zStart);
    const halfWidth = getCaveHalfWidthAtZ(z);
    const x = (Math.random() - 0.5) * halfWidth * 1.6;
    const scale = 0.35 + Math.random() * 0.95;
    m.compose(
      new THREE.Vector3(x, 0.012, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.random() * Math.PI)),
      new THREE.Vector3(scale, scale * 0.75, 1)
    );
    puddles.setMatrixAt(i, m);
  }
  scene.add(puddles);

  const streamZones = zones.filter(z => z.name === "exhibit-zone" || z.name === "deep-chamber");
  const streamZone = streamZones[Math.floor(Math.random() * streamZones.length)] || zones[3];
  buildStreamRibbon(scene, THREE, streamZone.z, 6);
}

function buildStreamRibbon(scene, THREE, centerZ, length){
  const segments = 7;
  const positions = [], indices = [];
  let cx = (Math.random() - 0.5) * 2;
  for(let s = 0; s <= segments; s++){
    const z = centerZ - length / 2 + (length * s) / segments;
    cx += (Math.random() - 0.5) * 0.4;
    const halfW = 0.1 + Math.random() * 0.08;
    positions.push(cx - halfW, 0.008, z);
    positions.push(cx + halfW, 0.008, z);
  }
  for(let s = 0; s < segments; s++){
    const a = s * 2, b = s * 2 + 1, c = (s + 1) * 2, d = (s + 1) * 2 + 1;
    indices.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const stream = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: 0x0e1a1e, roughness: 0.18, metalness: 0.15, side: THREE.DoubleSide })
  );
  scene.add(stream);
  Explore3D.streamMesh = stream; // animated in the render loop — see updateStreamFlow
}

/* Dripping water: droplets fall from a sampled few points near
   the ceiling, land in a small puddle, and produce a brief
   expanding-then-fading ripple — occasionally, not constantly.
   State lives in Explore3D.dripStations and is advanced by
   updateDripStations() every frame (see animateExplore3D). */
function buildDripStations(scene, THREE){
  Explore3D.dripStations = [];
  const stationCount = 5;
  const dropletGeo = new THREE.SphereGeometry(0.025, 6, 6);
  const dropletMat = new THREE.MeshStandardMaterial({ color: 0x8fa8b0, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });
  const puddleGeo = new THREE.CircleGeometry(0.3, 10);
  const puddleMat = new THREE.MeshStandardMaterial({ color: 0x0a1216, roughness: 0.1, metalness: 0.25 });
  const rippleGeo = new THREE.RingGeometry(0.05, 0.08, 12);

  const zones = Explore3D.zones;
  const wideZones = zones.filter(z => z.name !== "narrowing" && z.name !== "passage" && z.name !== "entrance");
  for(let i = 0; i < stationCount; i++){
    const zone = wideZones[Math.floor(Math.random() * wideZones.length)];
    const z = zone.z + (Math.random() - 0.5) * 4;
    const halfWidth = getCaveHalfWidthAtZ(z);
    const ceiling = getCaveCeilingAtZ(z);
    const x = (Math.random() - 0.5) * halfWidth * 1.2;

    const puddle = new THREE.Mesh(puddleGeo, puddleMat.clone());
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, 0.016, z);
    scene.add(puddle);

    const droplet = new THREE.Mesh(dropletGeo, dropletMat.clone());
    droplet.position.set(x, ceiling - 0.1, z);
    droplet.visible = false;
    scene.add(droplet);

    const ripple = new THREE.Mesh(rippleGeo, new THREE.MeshBasicMaterial({ color: 0x9fc0c8, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.set(x, 0.02, z);
    ripple.scale.setScalar(0.01);
    scene.add(ripple);

    Explore3D.dripStations.push({
      topY: ceiling - 0.1, bottomY: 0.02,
      droplet, ripple,
      state: "waiting",
      fallProgress: 0, rippleProgress: 0,
      timer: Math.random() * 5
    });
  }
}

/* ============================================================
   CREATURES — subtle, rare, never distracting. A couple of bats
   looping slowly through the deeper chambers; a handful of tiny
   insects drifting near vegetation/water toward the entrance.
   ============================================================ */
function buildCreatures(scene, THREE){
  Explore3D.bats = [];
  const batGeo = new THREE.ConeGeometry(0.16, 0.04, 4); // crude flattened wing silhouette, kept deliberately simple
  const batMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 0.9 });
  const zones = Explore3D.zones;
  const deepZ = zones.find(z => z.name === "deep-chamber")?.z ?? zones[zones.length - 2].z;
  for(let i = 0; i < 2; i++){
    const bat = new THREE.Mesh(batGeo, batMat);
    scene.add(bat);
    Explore3D.bats.push({
      mesh: bat,
      centerZ: deepZ + (Math.random() - 0.5) * 6,
      radiusX: 2.5 + Math.random() * 1.8,
      radiusZ: 3 + Math.random() * 2,
      height: 3.2 + Math.random() * 1.2,
      speed: 0.12 + Math.random() * 0.08,
      phase: Math.random() * Math.PI * 2
    });
  }

  const insectCount = 10;
  const insects = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.02, 5, 5),
    new THREE.MeshStandardMaterial({ color: 0x1a1a14, roughness: 0.6 }),
    insectCount
  );
  const zStart = zones[0].z, zEnd = zones[zones.length - 1].z;
  Explore3D.insects = [];
  for(let i = 0; i < insectCount; i++){
    const z = zStart - Math.random() * (zStart - zEnd) * 0.55; // near entrance/vegetation/water, not scattered everywhere
    const halfWidth = getCaveHalfWidthAtZ(z);
    Explore3D.insects.push({
      baseX: (Math.random() - 0.5) * halfWidth * 1.2,
      baseY: 0.4 + Math.random() * 0.8,
      baseZ: z,
      phase: Math.random() * Math.PI * 2,
      index: i
    });
  }
  Explore3D.insectMesh = insects;
  scene.add(insects);
}

/* ============================================================
   ATMOSPHERE — soft light shafts near the entrance, and a thin
   drift of mist concentrated near the stream/puddle area. Both
   additive-blended and low-opacity so they read as ambience, not
   as fog thick enough to hurt readability.
   ============================================================ */
function buildAtmosphere(scene, THREE){
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0xdcefff, transparent: true, opacity: 0.05,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
  });
  for(let i = 0; i < 3; i++){
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 6), shaftMat.clone());
    shaft.position.set((Math.random() - 0.5) * 4, 3.5, 7 + Math.random() * 1.5);
    shaft.rotation.set(0.15, (Math.random() - 0.5) * 0.3, 0.25 + Math.random() * 0.15);
    scene.add(shaft);
  }

  const mistCount = 40;
  const zones = Explore3D.zones;
  const streamZ = zones.find(z => z.name === "exhibit-zone")?.z ?? zones[3].z;
  const positions = new Float32Array(mistCount * 3);
  for(let i = 0; i < mistCount; i++){
    const z = streamZ + (Math.random() - 0.5) * 10;
    const halfWidth = getCaveHalfWidthAtZ(z);
    positions[i * 3] = (Math.random() - 0.5) * halfWidth;
    positions[i * 3 + 1] = Math.random() * 1.2;
    positions[i * 3 + 2] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  Explore3D.mist = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xaebfc4, size: 0.18, transparent: true, opacity: 0.12,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(Explore3D.mist);
}

/* A gentle, non-shadow-casting brightness step between the
   entrance's real falloff-lit zone and the deep chamber's
   near-total flashlight dependence — without this, "moderate
   lighting, flashlight becomes useful" (mid-cave) and "mostly
   flashlight" (deep-cave) could blur into feeling the same. */
function buildGradientFillLights(scene, THREE){
  const zones = Explore3D.zones;
  const midZone = zones.find(z => z.name === "exhibit-zone") || zones[4];
  const deepZone = zones.find(z => z.name === "deep-chamber") || zones[6];

  const midLight = new THREE.PointLight(0x8fa8b8, 18, 14, 1.8);
  midLight.position.set(0, getCaveCeilingAtZ(midZone.z) * 0.6, midZone.z);
  scene.add(midLight);

  const deepLight = new THREE.PointLight(0x4a5866, 10, 12, 1.8);
  deepLight.position.set(0, getCaveCeilingAtZ(deepZone.z) * 0.5, deepZone.z);
  scene.add(deepLight);
}

/* A simple archaeological survey grid painted flat on the ground
   near the excavation-site hotspot — real digs are marked out
   exactly this way, so it's a scientifically honest detail. Built
   as a canvas texture at runtime; no external image file needed. */
function buildExcavationGrid(scene, THREE){
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(229,199,107,0.55)";
  ctx.lineWidth = 2;
  const step = size / 6;
  for(let i = 0; i <= 6; i++){
    ctx.beginPath(); ctx.moveTo(i * step, 0); ctx.lineTo(i * step, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * step); ctx.lineTo(size, i * step); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(229,199,107,0.85)";
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 3.2),
    new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, roughness: 1 })
  );
  grid.rotation.x = -Math.PI / 2;
  grid.position.set(6, 0.02, -9.5); // beside the excavation-site hotspot / stonetool exhibit
  grid.receiveShadow = true;
  scene.add(grid);
}

/* ---------- Artifact pedestals: teeth, finger/toe bones, femur,
   hands, plus the comparative skull and possible-tool extras ---------- */
function loadArtifacts(scene){
  const THREE = Explore3D.THREE;
  const pedestalMat = new THREE.MeshStandardMaterial({ color: 0x243447, roughness: 0.55, metalness: 0.15 });
  const pedestalGeo = new THREE.CylinderGeometry(0.42, 0.5, 1, 20);
  const loader = new Explore3D.GLTFLoader();

  const entries = [
    ...EVOLUZON_DATA.caveArtifacts.map(a => ({ ...a, kind: "fossil" })),
    ...EVOLUZON_DATA.caveExtras.map(e => ({ ...e, kind: "extra" }))
  ];

  const jobs = entries.map((entry) => new Promise((resolve) => {
    const { x, y, z } = entry.position;

    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(x, 0.5, z);
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Warm museum spotlight, one per pedestal, static — these are
    // the shadow-casting lights (see the flashlight comment above).
    const spot = new THREE.SpotLight(0xffcf8a, 220, 9, Math.PI / 6, 0.5, 1.4);
    spot.position.set(x, 3.4, z + 0.6);
    spot.target.position.set(x, y, z);
    spot.castShadow = true;
    spot.shadow.mapSize.set(512, 512);
    scene.add(spot, spot.target);

    const name = entry.kind === "fossil"
      ? EVOLUZON_DATA.fossils.find(f => f.id === entry.fossilId)?.name
      : entry.name; // "Comparative Hominin Cranium" / "Possible Tool-Use Evidence" — never labeled as a luzonensis fossil unless it is one
    const sub = entry.kind === "fossil" ? "Callao Cave" : entry.location;

    const labelDiv = document.createElement("div");
    labelDiv.className = "pedestal-label";
    labelDiv.innerHTML = `<strong>${name}</strong><span>${sub}</span><em>Press E to Inspect</em>`;
    const label = new Explore3D.CSS2DObject(labelDiv);
    label.position.set(x, y + 0.9, z);
    scene.add(label);

    const root = new THREE.Group();
    root.position.set(x, y, z);
    scene.add(root);

    const finish = (mesh, isPlaceholder) => {
      mesh.traverse?.(n => { if(n.isMesh){ n.castShadow = true; n.receiveShadow = true; } });
      if(mesh.isMesh){ mesh.castShadow = true; mesh.receiveShadow = true; }
      root.add(mesh);
      Explore3D.artifactMeshes.push({ root, mesh, data: entry, isPlaceholder, label: labelDiv });
      resolve();
    };

    if(entry.glb){
      // GLTFLoader with automatic fallback: tooth.glb, fingerbone.glb,
      // footbone.glb, stonetool.glb, skull.glb are all requested here;
      // any that 404s (not supplied yet) silently falls back below.
      loader.load(entry.glb,
        (gltf) => {
          const model = gltf.scene;
          model.scale.setScalar(entry.scale || 1);
          finish(model, false);
        },
        undefined,
        () => finish(buildPlaceholderMesh(entry.fallback), true)
      );
    } else {
      finish(buildPlaceholderMesh(entry.fallback), true);
    }
  }));

  return Promise.all(jobs);
}

function buildPlaceholderMesh(kind){
  const THREE = Explore3D.THREE;
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xd8cdb5, roughness: 0.6 });
  switch(kind){
    case "tooth":
      return new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.28, 10), boneMat);
    case "bone":
      return new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 4, 8), boneMat);
    case "femur":
      return new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.55, 4, 8), boneMat);
    case "skull": {
      // Deliberately generic — no Homo luzonensis cranium has ever
      // been found, so this placeholder (and its real skull.glb
      // replacement) is always framed as a comparative reference.
      const group = new THREE.Group();
      const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), boneMat);
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.18), boneMat);
      jaw.position.set(0, -0.18, 0.05);
      group.add(cranium, jaw);
      return group;
    }
    case "tool":
      return new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), new THREE.MeshStandardMaterial({ color: 0x6b6459, roughness: 0.9 }));
    default:
      return new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), boneMat);
  }
}

/* ---------- Hotspots (shared glow-sprite texture + material) ---------- */
function buildHotspots(scene){
  const THREE = Explore3D.THREE;
  const glowTexture = makeGlowTexture();
  const baseMat = new THREE.SpriteMaterial({
    map: glowTexture, color: 0x00e5ff, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending
  });

  EVOLUZON_DATA.caveHotspots3D.forEach((h) => {
    const sprite = new THREE.Sprite(baseMat.clone());
    sprite.position.set(h.position.x, h.position.y, h.position.z);
    sprite.scale.set(0.6, 0.6, 0.6);
    scene.add(sprite);

    const labelDiv = document.createElement("div");
    labelDiv.className = "hotspot-label3d";
    labelDiv.innerHTML = `<span>${h.label}</span><em>E / Click — Explore</em>`;
    const label = new Explore3D.CSS2DObject(labelDiv);
    label.position.set(h.position.x, h.position.y + 0.35, h.position.z);
    scene.add(label);

    Explore3D.hotspotMeshes.push({ sprite, data: h, label: labelDiv });
  });
}

function makeGlowTexture(){
  const THREE = Explore3D.THREE;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/* ---------- Floating cave dust ---------- */
function buildDustParticles(scene){
  const THREE = Explore3D.THREE;
  const count = 320;
  const zStart = Explore3D.zones[0].z, zEnd = Explore3D.zones[Explore3D.zones.length - 1].z;
  const positions = new Float32Array(count * 3);
  for(let i = 0; i < count; i++){
    const z = zStart + Math.random() * (zEnd - zStart);
    const halfWidth = getCaveHalfWidthAtZ(z);
    positions[i*3]   = (Math.random() - 0.5) * halfWidth * 1.8;
    positions[i*3+1] = Math.random() * 4;
    positions[i*3+2] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0x9fd8ff, size: 0.03, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending
  });
  Explore3D.dust = new THREE.Points(geo, mat);
  scene.add(Explore3D.dust);
}

/* ============================================================
   INPUT
   All listeners here are bound exactly once per successful
   boot (startExploring only ever runs to completion once).
   teardownExplore3D() below removes every one of them by name,
   should the cave ever need to be torn down.
   ============================================================ */
function bindExplore3DInput(){
  document.addEventListener("keydown", onExplore3DKeyDown);
  document.addEventListener("keyup", onExplore3DKeyUp);
  // Registered ONCE here (not per-inspection) — this previously
  // re-added itself inside buildInspectViewer() every time an
  // artifact was opened, leaking a listener per inspection.
  window.addEventListener("pointerup", onInspectPointerUp);

  Explore3D.container.addEventListener("click", () => {
    if(Explore3D.inspecting) return;
    if(!Explore3D.controls.isLocked){ Explore3D.controls.lock(); return; }
    if(Explore3D.interactTarget) triggerInteract(Explore3D.interactTarget);
  });
}

function onExplore3DKeyDown(e){
  if(!Explore3D.controls?.isLocked) return;
  switch(e.key){
    case "w": case "W": case "ArrowUp":    Explore3D.move.forward = true; break;
    case "s": case "S": case "ArrowDown":  Explore3D.move.back = true; break;
    case "a": case "A": case "ArrowLeft":  Explore3D.move.left = true; break;
    case "d": case "D": case "ArrowRight": Explore3D.move.right = true; break;
    case "e": case "E":
      if(Explore3D.interactTarget) triggerInteract(Explore3D.interactTarget);
      break;
  }
}
function onExplore3DKeyUp(e){
  switch(e.key){
    case "w": case "W": case "ArrowUp":    Explore3D.move.forward = false; break;
    case "s": case "S": case "ArrowDown":  Explore3D.move.back = false; break;
    case "a": case "A": case "ArrowLeft":  Explore3D.move.left = false; break;
    case "d": case "D": case "ArrowRight": Explore3D.move.right = false; break;
  }
}

function onExplore3DResize(){
  if(!Explore3D.camera || !Explore3D.container) return;
  const w = Explore3D.container.clientWidth, h = Explore3D.container.clientHeight;
  Explore3D.camera.aspect = w / h;
  Explore3D.camera.updateProjectionMatrix();
  Explore3D.renderer.setSize(w, h);
  Explore3D.labelRenderer.setSize(w, h);
}

/* Optional teardown — not called automatically anywhere on this
   single-page site, but provided so the cave can be fully and
   cleanly unbound (e.g. if EvoLuzon is ever embedded inside a
   larger app that mounts/unmounts sections). */
function teardownExplore3D(){
  document.removeEventListener("keydown", onExplore3DKeyDown);
  document.removeEventListener("keyup", onExplore3DKeyUp);
  document.removeEventListener("visibilitychange", onExplore3DVisibilityChange);
  window.removeEventListener("resize", onExplore3DResize);
  window.removeEventListener("pointerup", onInspectPointerUp);
  Explore3D.viewportObserver?.disconnect();
  if(Explore3D.rafId) cancelAnimationFrame(Explore3D.rafId);
  Explore3D.rafId = null;
  if(Explore3D.inspectState) closeArtifactInspection();
  Explore3D.renderer?.dispose();
}

/* ============================================================
   RENDER LOOP
   ============================================================ */
function animateExplore3D(){
  Explore3D.rafId = requestAnimationFrame(animateExplore3D);
  const delta = Math.min(Explore3D.clock.getDelta(), 0.1);

  if(Explore3D.controls?.isLocked && !Explore3D.inspecting){
    updateMovement(delta);
    updateLabelProximity();
    updateInteractTarget();
  }

  // Slow museum-style idle rotation for every artifact not
  // currently open in the inspection viewer.
  Explore3D.artifactMeshes.forEach(a => {
    if(!(Explore3D.inspecting && Explore3D.inspectState?.entry === a.data)){
      a.root.rotation.y += delta * 0.18;
    }
  });

  const t = performance.now() * 0.001;
  Explore3D.hotspotMeshes.forEach((h, i) => {
    const s = 0.55 + Math.sin(t * 2 + i) * 0.08;
    h.sprite.scale.set(s, s, s);
  });

  if(Explore3D.dust){
    const pos = Explore3D.dust.geometry.attributes.position;
    for(let i = 0; i < pos.count; i++){
      let y = pos.getY(i) + delta * 0.05;
      if(y > 4) y = 0;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  }

  updateDripStations(delta);
  updateCreatures(t);
  updateVineSway(t);
  updateStreamFlow(t);
  updateMistDrift(delta);

  Explore3D.renderer.render(Explore3D.scene, Explore3D.camera);
  Explore3D.labelRenderer.render(Explore3D.scene, Explore3D.camera);
}

/* ---------- Environmental animation ----------
   All of these are deliberately cheap: a handful of tracked
   objects with simple trig/lerp math each frame, no physics, no
   per-vertex work beyond the ~16-vertex stream ribbon and the
   already-existing dust loop above. */
function updateDripStations(delta){
  const stations = Explore3D.dripStations;
  if(!stations) return;
  stations.forEach(s => {
    if(s.state === "waiting"){
      s.timer -= delta;
      if(s.timer <= 0){
        s.state = "falling";
        s.fallProgress = 0;
        s.droplet.visible = true;
        s.droplet.position.y = s.topY;
      }
    } else if(s.state === "falling"){
      s.fallProgress += delta * 0.9; // roughly a 1.1s fall
      const t = Math.min(1, s.fallProgress);
      s.droplet.position.y = s.topY + (s.bottomY - s.topY) * t;
      if(t >= 1){
        s.droplet.visible = false;
        s.state = "rippling";
        s.rippleProgress = 0;
      }
    } else if(s.state === "rippling"){
      s.rippleProgress += delta * 1.6;
      const t = Math.min(1, s.rippleProgress);
      s.ripple.scale.setScalar(0.05 + t * 1.1);
      s.ripple.material.opacity = (1 - t) * 0.5;
      if(t >= 1){
        s.state = "waiting";
        s.timer = 3 + Math.random() * 5; // occasional, not constant
      }
    }
  });
}

function updateCreatures(t){
  Explore3D.bats?.forEach(b => {
    const angle = t * b.speed + b.phase;
    b.mesh.position.set(
      Math.cos(angle) * b.radiusX,
      b.height + Math.sin(angle * 2.3) * 0.3,
      b.centerZ + Math.sin(angle) * b.radiusZ
    );
    b.mesh.rotation.y = -angle;
  });

  if(Explore3D.insectMesh && Explore3D.insects){
    const THREE = Explore3D.THREE;
    const m = new THREE.Matrix4();
    Explore3D.insects.forEach(ins => {
      const wob = t * 1.3 + ins.phase;
      m.setPosition(
        ins.baseX + Math.sin(wob) * 0.15,
        ins.baseY + Math.sin(wob * 1.7) * 0.08,
        ins.baseZ + Math.cos(wob * 0.8) * 0.15
      );
      Explore3D.insectMesh.setMatrixAt(ins.index, m);
    });
    Explore3D.insectMesh.instanceMatrix.needsUpdate = true;
  }
}

function updateVineSway(t){
  Explore3D.swayingVines?.forEach(v => {
    v.mesh.rotation.z = Math.sin(t + v.phase) * v.amplitude;
    v.mesh.rotation.x = Math.cos(t * 0.7 + v.phase) * v.amplitude * 0.6;
  });
}

function updateStreamFlow(t){
  const mesh = Explore3D.streamMesh;
  if(!mesh) return;
  const pos = mesh.geometry.attributes.position;
  for(let i = 0; i < pos.count; i++){
    pos.setY(i, 0.008 + Math.sin(t * 2 + i * 0.7) * 0.004);
  }
  pos.needsUpdate = true;
}

function updateMistDrift(delta){
  if(!Explore3D.mist) return;
  const pos = Explore3D.mist.geometry.attributes.position;
  for(let i = 0; i < pos.count; i++){
    let x = pos.getX(i) + Math.sin(i) * delta * 0.02;
    let y = pos.getY(i) + delta * 0.03;
    if(y > 1.4) y = 0;
    pos.setX(i, x);
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
}

/* ---------- Movement + collision detection ----------
   Simplified but airtight: rather than testing every footstep
   against cave mesh triangles, the player's position is clamped
   every frame to the tunnel's known footprint (Explore3D.zones —
   the same table buildCaveShell() reads to draw the walls).
   This is cheap, has zero edge cases (no falling through gaps,
   no getting stuck on geometry), and is easy to re-tune once a
   real callao-cave.glb defines the exact walkable footprint. */
function updateMovement(delta){
  const THREE = Explore3D.THREE;
  const v = Explore3D.velocity;
  const damping = 8, accel = 40;
  v.x -= v.x * damping * delta;
  v.z -= v.z * damping * delta;

  const dir = new THREE.Vector3(
    Number(Explore3D.move.right) - Number(Explore3D.move.left),
    0,
    Number(Explore3D.move.forward) - Number(Explore3D.move.back)
  );
  if(dir.lengthSq() > 0) dir.normalize();

  if(Explore3D.move.forward || Explore3D.move.back) v.z -= dir.z * accel * delta;
  if(Explore3D.move.left || Explore3D.move.right) v.x -= dir.x * accel * delta;

  Explore3D.controls.moveRight(-v.x * delta);
  Explore3D.controls.moveForward(-v.z * delta);

  // --- Collision detection: clamp to the tunnel's actual shape ---
  // getCaveHalfWidthAtZ reads the SAME Explore3D.zones table the
  // visible geometry was built from (see buildCaveShell), so the
  // walkable footprint always matches what's on screen — a wide
  // chamber lets you wander further sideways than the narrow
  // entrance passage did. Y stays a fixed eye height regardless of
  // the floor's visual undulation — full mesh collision would cost
  // far more than this scene can spare on a school laptop, and a
  // flat clamp has zero edge cases (no getting stuck on geometry).
  const obj = Explore3D.controls.getObject();
  const halfWidth = getCaveHalfWidthAtZ(obj.position.z) - 0.6; // small margin so the camera doesn't clip through walls
  obj.position.x = THREE.MathUtils.clamp(obj.position.x, -halfWidth, halfWidth);
  obj.position.z = THREE.MathUtils.clamp(obj.position.z, Explore3D.zones[Explore3D.zones.length - 1].z + 1, Explore3D.zones[0].z);
  obj.position.y = 1.6; // fixed eye height — no flying, no falling

  if(Explore3D.move.forward || Explore3D.move.back || Explore3D.move.left || Explore3D.move.right) playFootstep();
}

/* ============================================================
   LABEL PROXIMITY (distance-only — no raycast)
   Every artifact and hotspot label starts invisible (opacity:0
   is the CSS default) and only gains the .is-near class — which
   fades it in — once the player is within LABEL_SHOW_DISTANCE.
   This runs independently of updateInteractTarget() on purpose:
   "can the player see the name" (pure distance, works even when
   looking elsewhere) and "can the player interact right now"
   (distance AND actually looking at it) are different questions,
   and conflating them was the root of the original bug — every
   label was effectively always "near" because nothing ever
   checked distance at all, only raycast hits toggled anything.
   ============================================================ */
function updateLabelProximity(){
  const camPos = Explore3D.camera.position;

  Explore3D.artifactMeshes.forEach(a => {
    if(!a.label) return;
    const dist = camPos.distanceTo(a.root.position);
    a.label.classList.toggle("is-near", dist <= LABEL_SHOW_DISTANCE);
  });

  Explore3D.hotspotMeshes.forEach(h => {
    if(!h.label) return;
    const dist = camPos.distanceTo(h.sprite.position);
    h.label.classList.toggle("is-near", dist <= LABEL_SHOW_DISTANCE);

    // Subtle glow the player can notice from further away than the
    // label itself reveals from, without shouting "UI marker" —
    // brightens gradually as they approach rather than snapping on.
    const t = Explore3D.THREE.MathUtils.clamp(1 - dist / (LABEL_SHOW_DISTANCE * 2.4), 0, 1);
    h.sprite.material.opacity = 0.3 + t * 0.65;
  });
}

function updateInteractTarget(){
  Explore3D.raycaster.setFromCamera({ x: 0, y: 0 }, Explore3D.camera);
  const artifactRoots = Explore3D.artifactMeshes.map(a => a.root);
  const hotspotSprites = Explore3D.hotspotMeshes.map(h => h.sprite);
  const hits = Explore3D.raycaster.intersectObjects([...artifactRoots, ...hotspotSprites], true);

  const prompt = document.getElementById("interact-prompt");
  Explore3D.artifactMeshes.forEach(a => a.label?.classList.remove("is-hovered"));
  Explore3D.hotspotMeshes.forEach(h => h.label?.classList.remove("is-hovered"));

  if(hits.length && hits[0].distance < INTERACT_DISTANCE){
    let hitObj = hits[0].object;
    while(hitObj.parent && !artifactRoots.includes(hitObj) && !hotspotSprites.includes(hitObj)){
      hitObj = hitObj.parent;
    }
    const artifact = Explore3D.artifactMeshes.find(a => a.root === hitObj);
    const hotspot = Explore3D.hotspotMeshes.find(h => h.sprite === hitObj);

    if(artifact){
      Explore3D.interactTarget = { kind: "artifact", ref: artifact };
      const name = artifact.data.kind === "fossil"
        ? EVOLUZON_DATA.fossils.find(f => f.id === artifact.data.fossilId)?.name
        : artifact.data.name;
      prompt.textContent = `Press E — ${name}`;
      prompt.classList.add("is-visible");
      artifact.label?.classList.add("is-hovered");
      return;
    }
    if(hotspot){
      Explore3D.interactTarget = { kind: "hotspot", ref: hotspot };
      prompt.textContent = `Press E — ${hotspot.data.label}`;
      prompt.classList.add("is-visible");
      hotspot.label?.classList.add("is-hovered");
      return;
    }
  }

  Explore3D.interactTarget = null;
  prompt.classList.remove("is-visible");
}

function triggerInteract(target){
  if(target.kind === "artifact") openArtifactInspection(target.ref);
  else if(target.kind === "hotspot") openCaveHotspot(target.ref.data);
}

/* ============================================================
   HOTSPOTS → shared info-card-overlay (see content.js)
   Includes the Evolution Wall hotspot (opens the branching
   visualization) and the Timeline hotspot (cross-links to the
   site's existing 2D Evolution Timeline section, rather than
   duplicating that content inside the cave).
   ============================================================ */
function openCaveHotspot(h){
  // Unlock the pointer while any modal is open — the cave's own
  // pointer-lock controls otherwise trap the mouse, leaving the
  // close button unreachable. closeInfoOverlay() (content.js) and
  // closeEvolutionWall() below both check Explore3D.modalOpen to
  // re-lock automatically once the visitor closes the card.
  Explore3D.controls?.unlock();
  Explore3D.modalOpen = true;

  if(h.opensEvolutionWall){
    openEvolutionWall();
  } else {
    if(h.scrollTo){
      // Scroll now, while the info card overlay is covering the
      // viewport — by the time the visitor closes the card, the
      // page is already positioned at the linked section.
      document.querySelector(h.scrollTo)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    openInfoOverlay({ eyebrow: h.depth, title: h.title, body: h.body, prompt: h.prompt });
  }

  if(!EvoState.visitedHotspots.has(h.id)){
    EvoState.visitedHotspots.add(h.id);
    addXP(10, `Explored: ${h.label}`);
    if(EvoState.visitedHotspots.size === EVOLUZON_DATA.caveHotspots3D.length) awardBadge("explorer");
  }
  updateExploreProgress3D();
}

function updateExploreProgress3D(){
  const el = document.getElementById("explore-progress");
  if(!el) return;
  el.textContent = `${EvoState.visitedHotspots.size} / ${EVOLUZON_DATA.caveHotspots3D.length} SITES LOGGED · `
    + `${EvoState.seenFossils.size} / ${EVOLUZON_DATA.fossils.length} ARTIFACTS EXAMINED`;
}

/* ============================================================
   EVOLUTION WALL — branching (non-linear) family tree
   ============================================================ */
function openEvolutionWall(){
  const overlay = document.getElementById("evowall-overlay");
  const svg = document.getElementById("evowall-svg");
  const caption = document.getElementById("evowall-caption");
  const { nodes, edges, caption: cap } = EVOLUZON_DATA.evolutionBranches;
  const byId = Object.fromEntries(nodes.map(n => [n.id, n]));

  const edgePaths = edges.map(([a, b]) => {
    const from = byId[a], to = byId[b];
    const midX = (from.x + to.x) / 2;
    return `<path class="evo-edge" d="M ${from.x} ${from.y} Q ${midX} ${from.y} ${to.x} ${to.y}"></path>`;
  }).join("");

  const nodeDots = nodes.map(n => `
    <g class="evo-node" transform="translate(${n.x} ${n.y})">
      <circle r="2.2"></circle>
      <text x="0" y="-4.5" text-anchor="middle">${n.name}</text>
      <text x="0" y="6.5" text-anchor="middle" class="evo-years">${n.years}</text>
    </g>
  `).join("");

  // Edges + nodes are redrawn fresh each open — cheap (≈7 nodes,
  // ≈6 edges) and keeps this function stateless and reusable.
  svg.innerHTML = edgePaths + nodeDots;
  caption.textContent = cap; // explicitly states luzonensis/floresiensis are side branches, not ancestors
  overlay.classList.add("is-open");

  if(!EvoState.seenEvolutionWall){
    EvoState.seenEvolutionWall = true;
    addXP(12, "Studied the Evolution Wall");
    saveProgress();
  }
}

function closeEvolutionWall(){
  document.getElementById("evowall-overlay").classList.remove("is-open");
  if(Explore3D.modalOpen){
    Explore3D.modalOpen = false;
    Explore3D.controls?.lock();
  }
}

/* ============================================================
   ARTIFACT INSPECTION
   Rather than dollying the world camera through cave geometry
   (fragile without live browser testing), inspection opens a
   small, independently-lit mini-scene showing an enlarged,
   rotating clone of the artifact. The player's position in the
   cave is never touched, so "return to exactly where you were
   standing" is automatic rather than something to re-derive.
   ============================================================ */
function openArtifactInspection(artifact){
  Explore3D.inspecting = true;
  Explore3D.controls.unlock();
  document.getElementById("interact-prompt").classList.remove("is-visible");

  const entry = artifact.data;
  const isFossil = entry.kind === "fossil";
  const fossilData = isFossil ? EVOLUZON_DATA.fossils.find(f => f.id === entry.fossilId) : null;
  const name = isFossil ? fossilData.name : entry.name;
  const reflectKey = isFossil ? entry.fossilId : entry.id;
  const reflectPrompt = CAVE_REFLECTION_PROMPTS[reflectKey]
    || "What does this piece of evidence tell you that a written description alone couldn't?";

  const overlay = document.getElementById("inspect-overlay");
  const info = document.getElementById("inspect-info");
  info.innerHTML = `
    <span class="eyebrow">${isFossil ? "Fossil Gallery Artifact" : "Cave Exhibit"}</span>
    <h3>${name}</h3>
    ${isFossil ? `
      <p>${fossilData.description}</p>
      <h4>Scientific Importance</h4><p>${fossilData.importance}</p>
      <h4>Discovery</h4><p>${fossilData.discovery}</p>
      <h4>Function</h4><p>${fossilData.function}</p>
    ` : `
      <p><strong>Age:</strong> ${entry.age}</p>
      <p><strong>Location:</strong> ${entry.location}</p>
      <p>${entry.note}</p>
      <h4>Why It Matters</h4><p>${entry.importance}</p>
      <h4>Significance</h4><p>${entry.significance}</p>
    `}
    <div class="reflect-prompt"><strong>Reflect:</strong> ${reflectPrompt}</div>
    <div class="inspect-actions">
      <button class="btn btn-ghost" id="inspect-rotate">⟳ Rotate: On</button>
      <button class="btn btn-ghost" id="inspect-reset">Reset</button>
      <button class="btn btn-primary" id="inspect-return">Return to Cave</button>
    </div>
  `;
  overlay.classList.add("is-open");
  buildInspectViewer(artifact);

  document.getElementById("inspect-rotate").addEventListener("click", (e) => {
    Explore3D.inspectState.autoRotate = !Explore3D.inspectState.autoRotate;
    e.target.textContent = `⟳ Rotate: ${Explore3D.inspectState.autoRotate ? "On" : "Off"}`;
  });
  document.getElementById("inspect-reset").addEventListener("click", () => {
    Explore3D.inspectState.clone.rotation.set(0, 0, 0);
  });
  document.getElementById("inspect-return").addEventListener("click", closeArtifactInspection);

  // XP + persistence — reuses the exact same functions the
  // Fossil Gallery uses, so nothing is tracked twice.
  if(isFossil){
    markFossilSeen(entry.fossilId, { reason: `Examined in cave: ${name}` });
  } else if(!EvoState.seenCaveExtras.has(entry.id)){
    EvoState.seenCaveExtras.add(entry.id);
    addXP(6, `Examined: ${name}`);
    saveProgress();
  }
  updateExploreProgress3D();
}

function buildInspectViewer(artifact){
  const THREE = Explore3D.THREE;
  const canvas = document.getElementById("inspect-canvas");
  const w = canvas.clientWidth || 380, h = canvas.clientHeight || 380;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1620);
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.05, 20);
  camera.position.set(0, 0, 2.6);

  const key = new THREE.DirectionalLight(0xffe3b0, 1.4);
  key.position.set(2, 3, 3);
  const rim = new THREE.DirectionalLight(0x8ad0ff, 0.6);
  rim.position.set(-3, 1, 2);
  scene.add(key, rim, new THREE.AmbientLight(0x223344, 0.6));

  // Clone the display hierarchy; only materials are deep-cloned.
  // Geometry stays shared with the cave-scene mesh — it is never
  // disposed here, so the pedestal back in the cave keeps working
  // after this inspection closes.
  const clone = artifact.mesh.clone(true);
  clone.traverse(n => { if(n.isMesh && n.material) n.material = n.material.clone(); });

  const box = new THREE.Box3().setFromObject(clone);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scaleFactor = 1.4 / maxDim;
  clone.scale.multiplyScalar(scaleFactor);
  const center = new THREE.Vector3();
  box.getCenter(center);
  clone.position.sub(center.multiplyScalar(scaleFactor));
  scene.add(clone);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);

  Explore3D.inspectState = { scene, camera, renderer, clone, autoRotate: true, entry: artifact.data, dragging: false, lastX: 0, rafId: null };

  // Manual drag-to-rotate (mousedown handlers are plain property
  // assignments, so each new inspection simply replaces the last
  // one instead of accumulating listeners).
  canvas.onpointerdown = (e) => { Explore3D.inspectState.dragging = true; Explore3D.inspectState.lastX = e.clientX; };
  canvas.onpointermove = (e) => {
    const st = Explore3D.inspectState;
    if(!st?.dragging) return;
    st.clone.rotation.y += (e.clientX - st.lastX) * 0.01;
    st.lastX = e.clientX;
  };

  runInspectLoop();
}

// Registered exactly once in bindExplore3DInput(), not per-inspection.
function onInspectPointerUp(){
  if(Explore3D.inspectState) Explore3D.inspectState.dragging = false;
}

function runInspectLoop(){
  const st = Explore3D.inspectState;
  if(!st) return;
  if(st.autoRotate && !st.dragging) st.clone.rotation.y += 0.006;
  st.renderer.render(st.scene, st.camera);
  st.rafId = requestAnimationFrame(runInspectLoop);
}

function closeArtifactInspection(){
  const st = Explore3D.inspectState;
  const canvas = document.getElementById("inspect-canvas");
  if(st){
    cancelAnimationFrame(st.rafId);
    // Dispose only the cloned materials — geometry is shared
    // with the pedestal mesh still standing in the cave.
    st.clone.traverse(n => { if(n.isMesh && n.material) n.material.dispose?.(); });
    st.renderer.dispose();
  }
  if(canvas){ canvas.onpointerdown = null; canvas.onpointermove = null; }
  Explore3D.inspectState = null;
  document.getElementById("inspect-overlay").classList.remove("is-open");
  Explore3D.inspecting = false;
  Explore3D.controls.lock(); // resumes exploration exactly where the player was standing
}

/* ============================================================
   AMBIENT AUDIO HOOKS
   Cave ambience itself is the existing <audio id="cave-ambience">
   element wired to the nav sound-toggle (app.js) — not duplicated
   here. Footsteps/drips are optional extras that silently no-op
   until real files are added under assets/audio/.
   ============================================================ */
function playFootstep(){
  if(!EvoState.soundOn) return;
  const now = performance.now();
  if(now - Explore3D.lastFootstep < 380) return;
  Explore3D.lastFootstep = now;
  const audio = document.getElementById("footstep-sfx");
  if(!audio) return;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function scheduleDrip(){
  const delay = 9000 + Math.random() * 9000;
  setTimeout(() => {
    if(EvoState.soundOn && Explore3D.booted && !Explore3D.inspecting){
      document.getElementById("drip-sfx")?.play().catch(() => {});
    }
    scheduleDrip();
  }, delay);
}
