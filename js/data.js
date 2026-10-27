/* ============================================================
   EvoLuzon — data.js
   All educational content lives here, separated from render
   logic, so the science can be reviewed/updated without
   touching the interaction code. Content is written for a
   Grade 11 audience: accurate, but deliberately concise.
   ============================================================ */

const EVOLUZON_DATA = {

  /* ----------------------------------------------------------
     EXPLORE — Callao Cave hotspots
     Each hotspot sits on the illustrated cave cross-section
     (see #cave-scene in index.html) at an x/y percentage.
  ---------------------------------------------------------- */
  hotspots: [
    {
      id: "intro",
      label: "Entrance Chamber",
      x: 10, y: 62,
      depth: "SURFACE",
      title: "Welcome to Callao Cave",
      body: "You're standing at the mouth of a limestone cave system in Peñablanca, Cagayan — northern Luzon. Sunlight still reaches here, but the chambers ahead grow darker and older with every step in.",
      prompt: "Before you move further in — what do you already know about how fossils end up buried in caves?"
    },
    {
      id: "discovery",
      label: "The 2007 Find",
      x: 26, y: 48,
      depth: "LAYER 1",
      title: "A Single Foot Bone Changes Everything",
      body: "In 2007, Filipino archaeologist Dr. Armand Salvador Mijares and his team recovered a small foot bone from this chamber's floor. It didn't match Homo sapiens. That one bone was the first clue that something else had lived here.",
      prompt: "Why might a single bone be enough to justify years of further excavation?"
    },
    {
      id: "cave-geology",
      label: "Callao Cave System",
      x: 46, y: 40,
      depth: "LAYER 2",
      title: "Reading the Rock",
      body: "Callao Cave has multiple chambers carved by water over hundreds of thousands of years. Sediment layers here act like pages in a book — deeper layers are generally older, letting researchers estimate the age of what's found inside them.",
      prompt: "How does knowing which layer a fossil came from help scientists date it?"
    },
    {
      id: "artifacts",
      label: "Associated Finds",
      x: 62, y: 55,
      depth: "LAYER 2",
      title: "What Else Was Found Nearby",
      body: "Alongside the hominin remains, researchers recovered bones of deer, rats, and monitor lizards — some bearing cut marks, hinting at butchery. These finds help reconstruct the environment and diet of the cave's ancient occupants.",
      prompt: "What might cut marks on animal bones tell us, even without finding a single tool?"
    },
    {
      id: "excavation",
      label: "Excavation Trench",
      x: 74, y: 68,
      depth: "LAYER 3",
      title: "Careful, Slow, Deliberate",
      body: "Excavation is done in thin horizontal spits, each mapped in 3D before removal. Between 2007 and 2015, further digging recovered more teeth and hand and foot bones — enough to eventually describe a new species.",
      prompt: "Why do you think archaeologists remove soil in thin layers instead of digging quickly?"
    },
    {
      id: "researchers",
      label: "The Research Team",
      x: 88, y: 46,
      depth: "LAYER 3",
      title: "Filipino-Led Discovery",
      body: "The excavation was led by Dr. Armand Salvador Mijares of the University of the Philippines, working with an international team including French paleoanthropologist Florent Détroit. The species was formally named and described in 2019.",
      prompt: "Why does it matter that this discovery was led by Filipino scientists on Filipino soil?"
    },
    {
      id: "timeline-hotspot",
      label: "Dating the Find",
      x: 95, y: 30,
      depth: "LAYER 4",
      title: "At Least 50,000–67,000 Years Old",
      body: "Uranium-series dating of the fossils places them at a minimum of 50,000 to 67,000 years old — meaning Homo luzonensis lived in the Philippines long before modern humans are known to have arrived.",
      prompt: "What questions does this raise about how hominins first reached an island like Luzon?"
    }
  ],

  /* ----------------------------------------------------------
     FOSSIL GALLERY
  ---------------------------------------------------------- */
  fossils: [
    {
      id: "teeth",
      name: "Teeth",
      icon: "🦷",
      description: "Several premolars and molars recovered from the cave show a mix of features — some proportions resemble early Homo species, while others sit closer to modern humans.",
      importance: "Teeth preserve extremely well and carry strong taxonomic signals, making them some of the most valuable evidence for identifying a new hominin species.",
      discovery: "Recovered across multiple excavation seasons between 2007 and 2015 from the same sediment layers as the foot and hand bones.",
      function: "Chewing surfaces and root structure suggest a diet requiring more grinding than slicing, consistent with other small-bodied hominins."
    },
    {
      id: "finger-bones",
      name: "Finger Bones (Phalanges)",
      icon: "🖐️",
      description: "Curved hand phalanges were recovered, a shape more associated with older, tree-adapted hominins like Australopithecus than with modern humans.",
      importance: "Curvature in finger bones is a strong indicator of grasping ability, useful for climbing — a trait rarely seen this late in the hominin fossil record.",
      discovery: "Found in the same trench as the foot bones, reinforcing that they likely belong to the same population.",
      function: "Suggests Homo luzonensis retained some climbing ability, even while other traits point to a more human-like lifestyle."
    },
    {
      id: "toe-bones",
      name: "Toe Bones",
      icon: "🦶",
      description: "Strongly curved toe bones were among the very first fossils found in 2007, and remain some of the most distinctive evidence for the species.",
      importance: "Toe curvature this pronounced is unusual for a hominin capable of walking upright, making this one of the clearest examples of a 'mosaic' skeleton.",
      discovery: "The original 2007 foot bone (third metatarsal) was the very first physical evidence of Homo luzonensis.",
      function: "Points toward retained arboreal (tree-climbing) behavior alongside upright walking on the ground."
    },
    {
      id: "femur",
      name: "Partial Femur",
      icon: "🦴",
      description: "A small thigh bone fragment helped researchers estimate the body size of Homo luzonensis as notably small, similar in scale to Homo floresiensis of Flores, Indonesia.",
      importance: "Body size estimates are central to understanding whether small stature evolved independently on different islands — a pattern called island dwarfism.",
      discovery: "Recovered alongside teeth and hand/foot bones in the cave's deeper excavation layers.",
      function: "Indicates a small-statured hominin, likely under 1.2 meters tall, adapted to a limited island environment."
    },
    {
      id: "hands",
      name: "Hand Bones",
      icon: "✋",
      description: "Alongside the finger phalanges, additional hand elements show a combination of primitive curvature and more modern proportions.",
      importance: "Hand anatomy helps reconstruct manipulation ability — whether the species could make and use tools with precision.",
      discovery: "Recovered from Callao Cave's Chamber 2 excavation area over multiple field seasons.",
      function: "Suggests a hand capable of both careful manipulation and strong grasping, a mosaic shared with several other archaic hominins."
    }
  ],

  /* ----------------------------------------------------------
     EVOLUTION TIMELINE
  ---------------------------------------------------------- */
  timeline: [
    {
      id: "australopithecus",
      name: "Australopithecus",
      years: "~4.2–2 million years ago",
      region: "Eastern & Southern Africa",
      summary: "An early hominin genus that walked upright but retained curved fingers and toes suited for climbing — a mosaic body plan later echoed in Homo luzonensis.",
      migration: "Confined to Africa; no evidence of migration beyond the continent."
    },
    {
      id: "habilis",
      name: "Homo habilis",
      years: "~2.4–1.4 million years ago",
      region: "Eastern & Southern Africa",
      summary: "Often called 'handy man,' associated with some of the earliest stone tool industries. Brain size larger than Australopithecus, but still small by later human standards.",
      migration: "Remained within Africa during its known existence."
    },
    {
      id: "erectus",
      name: "Homo erectus",
      years: "~1.9 million–110,000 years ago",
      region: "Africa, then Asia and possibly Europe",
      summary: "The first hominin known to leave Africa in large numbers, reaching as far as Southeast Asia and China. Used more advanced tools and controlled fire.",
      migration: "Spread across the 'Southern Route' through Asia — a possible ancestral candidate for island-isolated descendants like H. floresiensis and H. luzonensis."
    },
    {
      id: "floresiensis",
      name: "Homo floresiensis",
      years: "~700,000–50,000 years ago",
      region: "Flores Island, Indonesia",
      summary: "Nicknamed the 'hobbit' for its small stature (~1.1 m), discovered in Liang Bua cave in 2003. Shows that hominins reached remote Southeast Asian islands and evolved small body size in isolation.",
      migration: "Reached Flores by crossing open water, likely via unintentional rafting on natural debris."
    },
    {
      id: "luzonensis",
      name: "Homo luzonensis",
      years: "At least 50,000–67,000 years ago",
      region: "Callao Cave, Luzon, Philippines",
      summary: "Described in 2019 from teeth, hand, and foot bones showing a mosaic of primitive (climbing-adapted) and modern traits. Small estimated body size, echoing the pattern seen in H. floresiensis.",
      migration: "Reaching Luzon required crossing deep ocean channels — even during ice-age low sea levels, Luzon was never connected to the Asian mainland by land."
    },
    {
      id: "sapiens",
      name: "Homo sapiens",
      years: "~300,000 years ago–present",
      region: "Originated in Africa; now worldwide",
      summary: "Modern humans, distinguished by a large brain relative to body size, complex language, and symbolic culture. Arrived in the Philippines by at least ~35,000–40,000 years ago at known sites.",
      migration: "Dispersed out of Africa in multiple waves, eventually reaching every habitable continent and most islands, including the Philippine archipelago."
    }
  ],

  /* ----------------------------------------------------------
     LEARNING MODULES (Abstract Conceptualization)
  ---------------------------------------------------------- */
  modules: [
    {
      title: "What Makes a New Species?",
      body: "Scientists compare bone shape, size, and proportions against known species. When a fossil consistently falls outside every known range — as Homo luzonensis teeth and bones did — researchers propose a new species name, subject to peer review and debate."
    },
    {
      title: "What Is a 'Mosaic' Skeleton?",
      body: "A mosaic skeleton mixes traits from different points in evolutionary history — for example, climbing-adapted curved toes next to more modern tooth shapes. Mosaics show evolution doesn't move in a straight line toward 'more human'; traits can persist long after they'd be expected to disappear."
    },
    {
      title: "Island Dwarfism",
      body: "When large mammals are isolated on small islands with limited food, they often evolve smaller body sizes over generations. Homo floresiensis and the small estimated stature of Homo luzonensis are two possible hominin examples of this pattern."
    },
    {
      title: "Dating Fossils Without a Time Machine",
      body: "Researchers can't watch fossils form, so they rely on methods like uranium-series dating, which measures the radioactive decay of uranium trapped in fossil material and cave formations to estimate minimum ages."
    },
    {
      title: "Why the Philippines Matters",
      body: "Before 2019, most known hominin fossils outside Africa clustered around mainland Asia. Homo luzonensis showed that hominins reached, and survived on, isolated Southeast Asian islands far earlier and more successfully than previously assumed."
    }
  ],

  /* ----------------------------------------------------------
     COMPARE — Homo sapiens vs Homo luzonensis
  ---------------------------------------------------------- */
  compare: {
    left: {
      name: "Homo sapiens",
      height: "~150–180 cm",
      brain: "~1,300–1,400 cm³",
      hands: "Straight phalanges; precision grip",
      feet: "Arched, adapted fully for walking/running",
      diet: "Broad, cooked and processed foods",
      toolUse: "Advanced, symbolic and complex technology"
    },
    right: {
      name: "Homo luzonensis",
      height: "Estimated under ~120 cm",
      brain: "Unknown — no cranium recovered yet",
      hands: "Curved phalanges; strong grasping ability",
      feet: "Curved toes; possible retained climbing ability",
      diet: "Likely mixed, based on associated butchered fauna",
      toolUse: "Unclear; no definitive stone tools yet linked to the species"
    }
  },

  /* ----------------------------------------------------------
     BADGES — awarded as students complete sections
  ---------------------------------------------------------- */
  badges: [
    { id: "explorer", name: "Explorer", icon: "🔦", desc: "Visited every hotspot in Callao Cave", section: "explore" },
    { id: "researcher", name: "Researcher", icon: "🔬", desc: "Examined every fossil in the gallery", section: "gallery" },
    { id: "archaeologist", name: "Archaeologist", icon: "⛏️", desc: "Completed the evolution timeline", section: "timeline" },
    { id: "evolution-expert", name: "Evolution Expert", icon: "🧬", desc: "Passed the final assessment", section: "quiz" },
    { id: "cave-artist", name: "Cave Artist", icon: "🎨", desc: "Completed a Callao Cave reconstruction drawing", section: "infographics" }
  ],

  /* ----------------------------------------------------------
     FINAL QUIZ — mixed item types
     type: "mcq" | "truefalse" | "matching" | "order"
  ---------------------------------------------------------- */
  quiz: [
    {
      type: "mcq",
      question: "Where was Homo luzonensis discovered?",
      options: ["Liang Bua Cave, Flores", "Callao Cave, Luzon", "Olduvai Gorge, Tanzania", "Zhoukoudian Cave, China"],
      answer: 1
    },
    {
      type: "mcq",
      question: "Which trait gives Homo luzonensis its 'mosaic' classification?",
      options: [
        "A skeleton entirely identical to Homo sapiens",
        "Curved, climbing-adapted toe and finger bones alongside more modern teeth",
        "A brain larger than any known hominin",
        "Fossils made entirely of stone tools"
      ],
      answer: 1
    },
    {
      type: "truefalse",
      question: "Homo luzonensis fossils were dated to be at least 50,000–67,000 years old.",
      answer: true
    },
    {
      type: "truefalse",
      question: "Luzon was connected to mainland Asia by a land bridge during the Ice Age, so no water crossing was needed.",
      answer: false
    },
    {
      type: "mcq",
      question: "Who led the excavation team that discovered Homo luzonensis?",
      options: ["Dr. Armand Salvador Mijares", "Charles Darwin", "Louis Leakey", "Donald Johanson"],
      answer: 0
    },
    {
      type: "matching",
      question: "Match each fossil type to what it best reveals about Homo luzonensis.",
      pairs: [
        { left: "Curved toe bones", right: "Possible retained climbing ability" },
        { left: "Teeth", right: "Species identification and diet clues" },
        { left: "Partial femur", right: "Estimated small body size" },
        { left: "Butchered animal bones nearby", right: "Evidence of diet and tool use" }
      ]
    },
    {
      type: "order",
      question: "Arrange these hominins from oldest to most recent first appearance.",
      items: ["Australopithecus", "Homo habilis", "Homo erectus", "Homo luzonensis", "Homo sapiens"]
    },
    {
      type: "mcq",
      question: "Homo luzonensis is most often compared to which other 'small-bodied' hominin?",
      options: ["Homo neanderthalensis", "Homo floresiensis", "Homo heidelbergensis", "Paranthropus boisei"],
      answer: 1
    }
  ],

  /* ----------------------------------------------------------
     PHASE 2 — 3D MUSEUM CAVE (explore3d.js)
     World units are metres. The tunnel runs along -Z from the
     entrance (z ≈ 8) back to the rear chamber (z ≈ -35).
     Each entry's `fossilId` links back to the `fossils` array
     above so XP, "seen" state, and the Fossil Gallery stay in
     sync instead of tracking progress twice.
  ---------------------------------------------------------- */
  caveArtifacts: [
    {
      fossilId: "teeth",
      glb: "assets/models/tooth.glb",
      position: { x: -6.3, y: 1.1, z: -12.6 },
      scale: 6,
      fallback: "tooth",
      reflectPrompt: "If you'd found only these teeth and nothing else, would you have guessed this was a new species? Why or why not?"
    },
    {
      fossilId: "finger-bones",
      glb: "assets/models/fingerbone.glb",
      position: { x: -6.3, y: 1.1, z: -19.5 },
      scale: 4,
      fallback: "bone",
      reflectPrompt: "What does a curved finger bone suggest about how this individual may have moved through its environment?"
    },
    {
      fossilId: "toe-bones",
      glb: "assets/models/footbone.glb",
      position: { x: 6.3, y: 1.1, z: -21.8 },
      scale: 4,
      fallback: "bone",
      reflectPrompt: "Curved toes are unusual in a hominin that could also walk upright — what does that tell you about evolution not moving in a straight line?"
    },
    {
      fossilId: "femur",
      glb: "assets/models/femur.glb",
      position: { x: -6.3, y: 1.1, z: -26.4 },
      scale: 2.2,
      fallback: "femur",
      reflectPrompt: "How confident should scientists be estimating body size from one partial bone? What else would you want to check first?"
      /* No femur.glb was supplied — this pedestal renders a
         procedural placeholder until one is added. */
    },
    {
      fossilId: "hands",
      glb: "assets/models/hands.glb",
      position: { x: 6.3, y: 1.1, z: -28.7 },
      scale: 3,
      fallback: "bone",
      reflectPrompt: "What would you need to see in a hand bone to be confident it belonged to a tool-user rather than just a climber?"
      /* No hands.glb was supplied — procedural placeholder. */
    }
  ],

  /* Extra cave-only artifacts that are NOT Fossil Gallery items —
     each is deliberately labelled to stay scientifically honest
     about what has and hasn't actually been recovered. */
  caveExtras: [
    {
      id: "species-comparison-skull",
      name: "Comparative Hominin Cranium",
      icon: "💀",
      glb: "assets/models/skull.glb",
      position: { x: -6.3, y: 1.1, z: -32.2 },
      scale: 2.4,
      fallback: "skull",
      age: "Reference specimen — not from Callao Cave",
      location: "Comparative cast, species unspecified",
      note: "No cranium has ever been recovered for Homo luzonensis. This model is a general comparative reference used only to discuss skull anatomy across hominin species — it is not a Luzonensis fossil.",
      importance: "Useful for discussing what a cranium *would* reveal (brain size, face shape) and why its absence from the Callao Cave assemblage limits what we currently know about Homo luzonensis.",
      significance: "Cranial anatomy is one of the most information-dense parts of a hominin skeleton — its absence here is itself a teaching point about the limits of the fossil record.",
      reflectPrompt: "Why might the absence of a skull be just as informative to scientists as its presence would be?"
    },
    {
      id: "possible-tool",
      name: "Possible Tool-Use Evidence",
      icon: "🔨",
      glb: "assets/models/stonetool.glb",
      position: { x: 6.3, y: 1.1, z: -14.9 },
      scale: 3,
      fallback: "tool",
      age: "Same sediment layers as the hominin remains",
      location: "Callao Cave, Chamber 2",
      note: "No stone tool has been definitively attributed to Homo luzonensis. What was recovered nearby are animal bones bearing possible cut marks — suggestive of tool use, but not conclusive proof of who made or used any tool.",
      importance: "Shows how archaeologists reason from indirect evidence (cut marks) rather than assuming a find automatically confirms a behavior.",
      significance: "A reminder that absence of a smoking-gun artifact doesn't mean absence of behavior — it means the question stays open for future excavation.",
      reflectPrompt: "Does indirect evidence, like cut marks, deserve the same confidence as directly recovering a tool? Why or why not?"
    }
  ],

  /* Seven glowing hotspots placed through the cave, opening the
     shared info-card-overlay component (same one used elsewhere
     on the site — not a duplicate system). */
  caveHotspots3D: [
    {
      id: "excavation-site",
      label: "Excavation Site",
      position: { x: 6.3, y: 1.6, z: -8.0 },
      depth: "LAYER 3",
      title: "The Excavation Trench",
      body: "This marks a real excavation trench inside Callao Cave, dug in thin horizontal spits between 2007 and 2015. Each spit was mapped in 3D before removal, preserving the exact position of every find.",
      prompt: "Why might removing soil in thin, mapped layers matter more than digging quickly?"
    },
    {
      id: "dating-station",
      label: "Dating Station",
      position: { x: 0, y: 1.6, z: -10.3 },
      depth: "LAYER 3",
      title: "Dating the Sediment",
      body: "Researchers used uranium-series dating on both the fossils and surrounding flowstone to estimate a minimum age of 50,000 to 67,000 years — long before modern humans are known to have reached Luzon.",
      prompt: "Why is a 'minimum age' a more honest claim than a single exact date?"
    },
    {
      id: "callao-chamber",
      label: "Callao Chamber",
      position: { x: 0, y: 1.6, z: -17.2 },
      depth: "LAYER 2",
      title: "Deep Inside Callao Chamber",
      body: "Callao Cave's chambers formed over hundreds of thousands of years as water dissolved the limestone. Chamber 2 — where you're standing — held the richest concentration of hominin remains.",
      prompt: "How does a cave's own geology help or complicate the work of archaeologists inside it?"
    },
    {
      id: "research-notes",
      label: "Research Notes",
      position: { x: 0, y: 1.6, z: -24.1 },
      depth: "LAYER 3",
      title: "From the Field Notebook",
      body: "Dr. Armand Salvador Mijares and an international team, including Florent Détroit, spent over a decade cross-checking finds before formally describing Homo luzonensis in 2019.",
      prompt: "Why do you think it took years between the first bone (2007) and the species being named (2019)?"
    },
    {
      id: "evolution-wall",
      label: "Evolution Wall",
      position: { x: 0, y: 2.2, z: -37 },
      depth: "LAYER 4",
      title: "The Family Tree Isn't a Ladder",
      body: "This glowing wall maps how hominin species actually relate to one another — as branches, not a single line marching toward Homo sapiens.",
      prompt: "Open the Evolution Wall to see why Homo luzonensis is a branch, not a stepping stone.",
      opensEvolutionWall: true
    },
    {
      id: "species-comparison",
      label: "Species Comparison",
      position: { x: 0, y: 1.6, z: -30.5 },
      depth: "LAYER 4",
      title: "What We Don't Have — Yet",
      body: "No skull has ever been found for Homo luzonensis. The reference cranium nearby lets us talk through what a skull would tell scientists, and why its absence still leaves real questions open.",
      prompt: "What would finding a Homo luzonensis cranium change about what we know?"
    },
    {
      id: "timeline-hotspot",
      label: "Timeline Marker",
      position: { x: 0, y: 1.6, z: -3 },
      depth: "LAYER 1",
      title: "A Single Point on a Much Longer Story",
      body: "Homo luzonensis lived at least 50,000–67,000 years ago — one marker on a much longer evolutionary story. When you're done exploring, scroll down to the <a href=\"#timeline\" style=\"color:var(--cyan)\">Evolution Timeline</a> to see how it fits alongside Australopithecus, Homo erectus, and Homo sapiens.",
      prompt: "Why is it misleading to think of any single fossil as 'the missing link'?"
    }
  ],

  /* ----------------------------------------------------------
     EVOLUTION WALL — branching (non-linear) tree data
     Deliberately modelled as a branching graph, not a line, to
     avoid implying Homo luzonensis is a direct human ancestor.
  ---------------------------------------------------------- */
  evolutionBranches: {
    nodes: [
      { id: "australopithecus", name: "Australopithecus", years: "~4.2–2 Mya", x: 8,  y: 92 },
      { id: "habilis",          name: "H. habilis",        years: "~2.4–1.4 Mya", x: 24, y: 74 },
      { id: "erectus",          name: "H. erectus",        years: "~1.9 Mya–110 kya", x: 42, y: 56 },
      { id: "floresiensis",     name: "H. floresiensis",   years: "~700–50 kya", x: 66, y: 34 },
      { id: "luzonensis",       name: "H. luzonensis",     years: "~50–67 kya", x: 66, y: 74 },
      { id: "neanderthalensis", name: "H. neanderthalensis", years: "~430–40 kya", x: 82, y: 30 },
      { id: "sapiens",          name: "H. sapiens",        years: "~300 kya–present", x: 92, y: 56 }
    ],
    /* Edges express a plausible-ancestor relationship, not a
       confirmed lineage — several links in the real record
       remain debated, which the overlay text says explicitly. */
    edges: [
      ["australopithecus", "habilis"],
      ["habilis", "erectus"],
      ["erectus", "floresiensis"],
      ["erectus", "luzonensis"],
      ["erectus", "neanderthalensis"],
      ["erectus", "sapiens"]
    ],
    caption: "Homo floresiensis and Homo luzonensis both branch off from an early-dispersing Homo erectus population, isolated on separate islands. Neither is on the direct line to Homo sapiens — they're side branches, dead ends in the sense that they left no known descendants, not 'earlier drafts' of modern humans."
  }
};
