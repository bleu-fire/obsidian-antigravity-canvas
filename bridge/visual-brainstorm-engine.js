/**
 * visual-brainstorm-engine.js
 * Advanced Visual Brainstorming & Ideation Engine for Antigravity Canvas
 *
 * Implements structured multi-directional ideation across 5 controlled creative dimensions
 * and the 7-Layer Visual Detail Architecture:
 *
 * 5 Creative Dimensions:
 *   - Concept A: Safe / Practical & Direct
 *   - Concept B: Bold & High-Contrast
 *   - Concept C: Experimental / Avant-Garde
 *   - Concept D: Emotional & Character-Centric
 *   - Concept E: Technical / Architecture-Dense
 *
 * 7-Layer Visual Detail Architecture:
 *   - Layer 1: Main Subject (character, product, device, object, environment)
 *   - Layer 2: Secondary Elements (screens, props, architecture, vehicles, tools)
 *   - Layer 3: Material Detail (brushed aluminum, glass, concrete, fabric, carbon fiber)
 *   - Layer 4: Environmental Detail (dust, haze, rain, reflections, scratches, cables)
 *   - Layer 5: Lighting (key light, rim light, volumetric fill, color temp)
 *   - Layer 6: Camera & Lens (angle, focal length: 24mm/35mm/50mm/85mm/macro, DOF)
 *   - Layer 7: Composition (placement, golden ratio, layered depth, negative space)
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { completePrompt } from "./ai-manager.js";
import { buildContextPackage } from "./context-engine.js";
import {
  STYLE_REGISTRY,
  MEDIA_TYPES,
  resolveStyle,
  buildVisualPrompt,
  getStyleById,
  getMediaById,
} from "./style-registry.js";

const CACHE_DIR = path.resolve(".cache/visual-brainstorm");

// ── Controlled Creative Dimensions ─────────────────────────────────────────────

export const CREATIVE_DIMENSIONS = [
  {
    id: "concept-a",
    key: "A",
    name: "Concept A: Safe / Practical & Direct",
    tone: "practical",
    description: "Clear, highly readable, pragmatic visual execution with recognizable forms, intuitive iconography, and grounded composition.",
    cameraDefault: "Eye-level 50mm natural perspective, medium shot",
    lensDefault: "50mm f/2.8, balanced depth of field with gentle subject isolation",
    lightingDefault: "Clean directional 5600K daylight key, soft ambient fill, minimal rim glow",
    compositionDefault: "Balanced rule-of-thirds, clean center-weighted subject, clear negative space",
  },
  {
    id: "concept-b",
    key: "B",
    name: "Concept B: Bold & High-Contrast",
    tone: "bold",
    description: "High drama, stark chiaroscuro, intense complementary color dynamics, powerful silhouettes, and visceral tension.",
    cameraDefault: "Low-angle heroic 35mm wide shot looking upward",
    lensDefault: "35mm anamorphic f/1.8, razor-sharp subject with dramatic anamorphic flare",
    lightingDefault: "High-contrast chiaroscuro, harsh tungsten key light, vivid electric cyan rim halo, deep near-black shadows",
    compositionDefault: "Dynamic diagonal tension, hero subject positioned at golden ratio anchor, deep foreground-background layering",
  },
  {
    id: "concept-c",
    key: "C",
    name: "Concept C: Experimental / Avant-Garde",
    tone: "experimental",
    description: "Non-traditional abstraction, surreal dimensional shifts, impossible geometry, deconstructed forms, and conceptual symbolism.",
    cameraDefault: "Overhead 24mm Dutch-angle isometric perspective",
    lensDefault: "24mm ultra-wide f/4, expansive deep focus capturing surreal spatial warping",
    lightingDefault: "Prismatic refracted lighting, bioluminescent glow, volumetric chromatic aberration, floating caustic highlights",
    compositionDefault: "Asymmetric fractured grid, paradoxical vanishing points, layered dimensional thresholds",
  },
  {
    id: "concept-d",
    key: "D",
    name: "Concept D: Emotional & Character-Centric",
    tone: "emotional",
    description: "Intimate focus on human or sentient agency, evocative narrative vulnerability, expressive atmospheric intimacy, and poignant subtext.",
    cameraDefault: "Intimate 85mm portrait / close-up angle",
    lensDefault: "85mm f/1.4 prime, creamy bokeh, ultra-shallow depth of field highlighting expressive micro-details",
    lightingDefault: "Warm 3200K golden hour rim light, soft candle/ember fill, gentle volumetric dust motes",
    compositionDefault: "Off-center intimate framing, heavy negative space conveying isolation or contemplation, foreground bokeh framing",
  },
  {
    id: "concept-e",
    key: "E",
    name: "Concept E: Technical / Architecture-Dense",
    tone: "technical",
    description: "Intricate engineering schematics, modular subsystems, cross-sectional depth, industrial precision, and telemetry interfaces.",
    cameraDefault: "Precise 3/4 axonometric technical elevation, macro-to-macro multi-plane perspective",
    lensDefault: "90mm macro lens f/8, deep field resolution revealing mechanical tolerance and microscopic micro-surface etching",
    lightingDefault: "Sterile 6500K inspection flood, crisp fiber-optic accent points, laser-plane backlighting",
    compositionDefault: "Multi-layered modular cross-section, exploded axonometric depth, structural grid alignment with telemetry margins",
  },
];

// ── 7-Layer Visual Detail Architecture Definition ─────────────────────────────

export const VISUAL_LAYERS = {
  layer1: { id: "subject", name: "Layer 1: Main Subject", description: "Character, hero product, focal device, primary object, or central entity" },
  layer2: { id: "secondaryElements", name: "Layer 2: Secondary Elements", description: "Supporting screens, background props, secondary architecture, tools, peripheral vehicles" },
  layer3: { id: "materials", name: "Layer 3: Material Detail", description: "Brushed aluminum, tempered glass, weathered concrete, ballistic fabric, carbon fiber weave" },
  layer4: { id: "environment", name: "Layer 4: Environmental Detail", description: "Atmospheric haze, suspended dust motes, rain streaks, wet reflections, surface scratches, bundled cables" },
  layer5: { id: "lighting", name: "Layer 5: Lighting", description: "Key light intensity, rim light angle, volumetric fill, color temperature, bounce characteristics" },
  layer6: { id: "camera", name: "Layer 6: Camera & Lens", description: "Framing angle, focal length (24mm/35mm/50mm/85mm/macro), depth of field, optical characteristics" },
  layer7: { id: "composition", name: "Layer 7: Composition", description: "Spatial placement, golden ratio balance, foreground-midground-background depth layering, negative space" },
};

// ── Cache Utilities ────────────────────────────────────────────────────────────

function hashKey(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function cacheGet(key) {
  try {
    const p = path.join(CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(p)) return null;
    const { ts, v } = JSON.parse(fs.readFileSync(p, "utf8"));
    if (Date.now() - ts > 86_400_000) {
      try { fs.unlinkSync(p); } catch {}
      return null;
    }
    return v;
  } catch {
    return null;
  }
}

function cacheSet(key, v) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify({ ts: Date.now(), v }));
  } catch {}
}

export function clearBrainstormCache() {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      for (const f of files) {
        if (f.endsWith(".json")) {
          fs.unlinkSync(path.join(CACHE_DIR, f));
        }
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── Synthetic Concept Generator (Fallback & Baseline Blueprint) ───────────────

function generateMetaphor(nodeText, dimension) {
  const text = (nodeText || "").toLowerCase();
  const dim = dimension.tone;

  if (/security|guard|protect|firewall|defense|encrypt|auth/.test(text)) {
    if (dim === "practical") return "Digital fortress with layered bastions and verified access gateways";
    if (dim === "bold") return "Locked monolithic vault glowing under heavy laser-grid perimeter";
    if (dim === "experimental") return "Living cryptographic crystalline lattice self-healing against intrusions";
    if (dim === "emotional") return "Vigilant sentinel standing watch over a fragile pulse of data";
    return "Multi-tiered zero-trust defense matrix with isolated kernel containment vaults";
  }

  if (/ai|model|neural|agent|intelligence|brain|learning/.test(text)) {
    if (dim === "practical") return "High-throughput neural processor operating in synchronized harmony";
    if (dim === "bold") return "Bioluminescent synapse core igniting an ocean of dormant data";
    if (dim === "experimental") return "Non-Euclidean cognitive labyrinth unfolding across quantum dimensions";
    if (dim === "emotional") return "Sparks of sentient awareness emerging from an intricate digital soul";
    return "Dense synaptic motherboard cross-section with high-frequency interconnect bus";
  }

  if (/cloud|infra|database|cluster|server|scale|pipeline/.test(text)) {
    if (dim === "practical") return "Interconnected modular data pillars anchored by solid bedrock foundation";
    if (dim === "bold") return "Towering monolith of light channeling torrential streams of cosmic data";
    if (dim === "experimental") return "Gravitational nexus orbiting clustered compute nodes in zero-G";
    if (dim === "emotional") return "Heartbeat artery pumping lifeblood information through a sleeping city";
    return "Massive hyper-converged compute grid with cryogenic cooling conduits";
  }

  // General Metaphors
  if (dim === "practical") return `Grounded architectural foundation embodying ${nodeText || "core system"}`;
  if (dim === "bold") return `Monolithic beacon of power piercing through surrounding turbulence`;
  if (dim === "experimental") return `Prismatic folding portal unraveling the latent dimensions of ${nodeText || "the subject"}`;
  if (dim === "emotional") return `Solitary guiding flame held against an expansive shadowy expanse`;
  return `Dense mechanical clockwork engine operating at microscopic tolerances`;
}

function synthesizeFallbackConcepts({ nodeText, contextPackage, style, media, userPrompt }) {
  const subjectBase = nodeText || userPrompt || "Antigravity Concept Focal Point";

  return CREATIVE_DIMENSIONS.map((dim) => {
    const metaphor = generateMetaphor(subjectBase, dim);
    let title = `${dim.name.split(": ")[1]}: ${subjectBase.slice(0, 30)}`;
    let visualStory = "";
    let subject = "";
    let environment = "";
    let materials = "";
    let colorPalette = "";
    let depth = "";
    let atmosphere = "";
    let details = [];

    if (dim.tone === "practical") {
      title = `Structured Foundation: ${subjectBase}`;
      visualStory = `A clean, authoritative representation of ${subjectBase}, emphasizing practical utility, architectural clarity, and immediate cognitive comprehension.`;
      subject = `Crisp, highly refined central manifestation of ${subjectBase}, structured with balanced symmetry and distinct focal contours`;
      environment = `Pristine modern research studio with matte white surfaces, warm oak accents, and soft diffused skylight`;
      materials = `Brushed aluminum alloy, non-reflective matte composite, clear tempered glass with subtle etched schematics`;
      colorPalette = "Neutral graphite, architectural bone white, subtle cerulean accents, natural timber warmth";
      depth = "Crisp foreground pedestal, focused midground subject, softly out-of-focus architectural background";
      atmosphere = "Crisp, dust-free ambient clarity with neutral 5600K balanced natural illumination";
      details = [
        "Minimalist status indicator lights glowing soft teal",
        "Neatly recessed perimeter channels with hidden cable runs",
        "Engraved vector typography with precision alignment marks",
        "Subtle matte bevels along structural load-bearing seams",
      ];
    } else if (dim.tone === "bold") {
      title = `High-Voltage Contrast: ${subjectBase}`;
      visualStory = `A high-impact, adrenaline-charged composition presenting ${subjectBase} as a commanding force surging against a tempestuous void.`;
      subject = `Monolithic, razor-edged titan representing ${subjectBase}, radiating intense energy through glowing structural fissures`;
      environment = `Obsidian volcanic plateau under an impending stormy supercell with ambient electric discharges`;
      materials = `Textured black basalt, mirror-polished obsidian glass, glowing liquid plasma conduits, forged carbon fiber`;
      colorPalette = "Deep obsidian black, vivid electric cyan, searing crimson rim highlights, molten gold accents";
      depth = "Low-angle jagged rock foreground, imposing towering midground titan, storm-lit horizon in deep background";
      atmosphere = "Volumetric smoke plumes, charged ozone mist, rising glowing embers caught in turbulent updrafts";
      details = [
        "Violent electrical arcs snapping between high-tension capacitors",
        "Raindrops vaporizing instantly into micro-steam halos upon impact",
        "High-contrast rim lighting carving razor-sharp silhouettes",
        "Reflective wet obsidian ground scattering neon light flares",
      ];
    } else if (dim.tone === "experimental") {
      title = `Quantum Labyrinth: ${subjectBase}`;
      visualStory = `A surreal, boundary-defying interpretation of ${subjectBase} where spatial laws dissolve into folded geometries and multidimensional perspective.`;
      subject = `Levitating non-Euclidean construct embodying ${subjectBase}, continuously unfolding along internal kaleidoscopic axes`;
      environment = `Infinite void of mirrored geometric planes reflecting alternate timelines and abstract coordinate grids`;
      materials = `Dichroic glass prisms, iridescent titanium foil, liquid mercury droplets, translucent crystalline aerogel`;
      colorPalette = "Prismatic spectrum, deep violet-indigo void, shifting holographic magenta-green caustics";
      depth = "Fractured floating planes in extreme foreground, impossible Mobius central core, endless recursive vanishing points";
      atmosphere = "Suspended zero-gravity particulate, iridescent caustic light rays, gentle floating optical refractions";
      details = [
        "Recursive geometric matrices floating in synchronized harmonic oscillation",
        "Gravitational light warping bending ambient grid reflections",
        "Bioluminescent data ribbons weaving through translucent crystal facets",
        "Microscopic floating crystal shards scattering spectral dispersion",
      ];
    } else if (dim.tone === "emotional") {
      title = `The Human Nexus: ${subjectBase}`;
      visualStory = `An evocative, character-anchored narrative exploring the human relationship, vulnerability, and guardianship over ${subjectBase}.`;
      subject = `Solitary figure standing in quiet communion beside a glowing, breathing core of ${subjectBase}`;
      environment = `Weathered cathedral-like observatory at twilight, with overgrown botanical vines intertwined with aged tech`;
      materials = `Weathered bronze, soft woven wool, worn leather, warm glowing amber vacuum tubes, aged polished stone`;
      colorPalette = "Golden hour amber, deep twilight navy, warm terracotta, soft emerald botanical greens";
      depth = "Silhouetted foreground archway framing the scene, intimate midground character interaction, deep starry twilight sky";
      atmosphere = "Warm golden haze, gentle drifting pollen and dust motes illuminated by low sunbeams, quiet emotional stillness";
      details = [
        "Delicate condensation beads on the cool glass of the vacuum tubes",
        "Hand-stitched leather bindings wrapped around brass diagnostic handles",
        "Gentle botanical leaves curling around dormant copper cooling pipes",
        "Soft amber glow reflecting warmly off the character's focused gaze",
      ];
    } else {
      // Technical / Architecture-Dense
      title = `Axonometric Core: ${subjectBase}`;
      visualStory = `A hyper-dense, masterwork technical cross-section exposing the microscopic subsystems, routing matrices, and engineered precision of ${subjectBase}.`;
      subject = `Exploded multi-tier axonometric assembly of ${subjectBase}, revealing nested internal processors, bus lines, and heat sinks`;
      environment = `High-tech cleanroom fabrication facility with laser-etched calibration grids and overhead robotic assembly arms`;
      materials = `Anodized matte-black aluminum, gold-plated circuit traces, silicone heat pipes, micro-etched silicon wafers`;
      colorPalette = "Industrial matte black, surgical white, 24k gold trace lines, high-visibility orange safety markings";
      depth = "Exploded floating component tiers layered from bottom substrate to top optical housing with strict axonometric depth";
      atmosphere = "Sterile cleanroom atmosphere, razor-sharp edge illumination with pinpoint fiber-optic focus";
      details = [
        "Micro-etched component serial numbers and engineering tolerance callouts",
        "Braided high-current copper bus cables routed through laser-cut aluminum clips",
        "Multi-stage Peltier cooling fins with microscopic vapor-chamber capillary textures",
        "Telemetry HUD overlay projecting diagnostic status vectors onto surrounding air",
      ];
    }

    const negativeConstraints = Array.from(new Set([
      ...(style.negativeConstraints || []),
      "no generic AI glow",
      "no blurry low resolution textures",
      "no watermark",
      "no deformed anatomy",
      "no distorted proportions",
    ]));

    const imagePrompt = buildVisualPrompt({
      subject: `${subject}. [Visual Metaphor: ${metaphor}]. Layered Elements: ${details.join("; ")}`,
      context: `Thematic narrative: ${visualStory}. Environmental atmosphere: ${environment}, ${atmosphere}. Color grade: ${colorPalette}. Depth & composition: ${depth}, ${dim.compositionDefault}. Lighting & Optics: ${dim.lightingDefault}, ${dim.cameraDefault}, ${dim.lensDefault}. Materials: ${materials}`,
      style,
      media,
      customInstructions: `Emphasize 7-Layer visual detail architecture. Ensure ${dim.name} aesthetic purity.`,
    });

    return {
      title,
      concept: dim.name,
      dimensionId: dim.id,
      visualStory,
      visualMetaphor: metaphor,
      composition: dim.compositionDefault,
      subject,
      environment,
      camera: dim.cameraDefault,
      lens: dim.lensDefault,
      lighting: dim.lightingDefault,
      materials,
      colorPalette,
      depth,
      atmosphere,
      details,
      style: {
        id: style.id,
        name: style.name,
      },
      media: {
        id: media.id,
        name: media.name,
        defaultAspect: media.defaultAspect,
        defaultSize: media.defaultSize,
      },
      negativeConstraints,
      imagePrompt,
    };
  });
}

// ── 1. generateVisualBrainstorm ───────────────────────────────────────────────

/**
 * Generates 5 structured, production-grade visual concepts across controlled creative dimensions
 * and the 7-Layer visual detail architecture.
 *
 * @param {Object} params
 * @param {string} [params.nodeText=""] - Focal topic or node title
 * @param {string} [params.context=""] - Surrounding canvas narrative or connections
 * @param {string} [params.styleOverride] - Specific style registry ID
 * @param {string} [params.mediaOverride] - Specific media type ID
 * @param {string} [params.userPrompt=""] - User instructions or specific focus
 * @param {Array} [params.vaultNotes=[]] - Relevant Obsidian notes
 * @returns {Promise<Object>} Visual Brainstorm result containing concepts, directions, and recommendations
 */
export async function generateVisualBrainstorm({
  nodeText = "",
  context = "",
  styleOverride,
  mediaOverride,
  userPrompt = "",
  vaultNotes = [],
  timeout = 90_000,
} = {}) {
  // 1. Resolve Style & Media
  const { style, media } = resolveStyle({
    styleOverride,
    prompt: `${nodeText} ${userPrompt}`,
    context,
    mediaOverride,
  });

  // 2. Build Unified Context Package
  const contextPackage = buildContextPackage({
    skillId: "brainstorm",
    nodeText,
    userPrompt,
    vaultNotes,
    visualIntent: { style: style.id, media: media.id },
  });

  // 3. Cache Key Check (SHA-256)
  const cachePayload = JSON.stringify({
    nodeText: nodeText.trim(),
    context: context.trim(),
    styleId: style.id,
    mediaId: media.id,
    userPrompt: userPrompt.trim(),
    vaultCount: vaultNotes.length,
  });
  const cacheKey = hashKey(`vbrain:${cachePayload}`);
  const cached = cacheGet(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  // 4. Construct AI System Prompt for 5 Dimensions & 7-Layer Visual Detail Architecture
  const systemPrompt = [
    `You are the Antigravity Master Visual Art Director & Prompt Engineer.`,
    `Your objective: Formulate 5 extraordinarily distinct, production-grade visual concepts based on the focal subject.`,
    ``,
    `INPUT SPECIFICATION:`,
    `- Focal Subject / Node: "${nodeText || userPrompt || "Core Concept"}"`,
    context ? `- Thematic Narrative Context: "${context}"` : "",
    userPrompt ? `- User Creative Direction: "${userPrompt}"` : "",
    `- Target Art Style: "${style.name}" (${style.id} - ${style.description})`,
    `- Target Media Format: "${media.name}" (${media.defaultAspect}, ${media.defaultSize.width}x${media.defaultSize.height}px)`,
    vaultNotes?.length ? `- Connected Vault Knowledge: ${vaultNotes.map(n => n.title).join(", ")}` : "",
    ``,
    `CONTROLLED CREATIVE DIMENSIONS (You must generate EXACTLY one concept for each of the 5 dimensions):`,
    `1. Concept A: Safe / Practical & Direct (Pragmatic, clear, recognizable, balanced)`,
    `2. Concept B: Bold & High-Contrast (High stakes, dramatic chiaroscuro, vivid color clash, intense silhouette)`,
    `3. Concept C: Experimental / Avant-Garde (Surreal, impossible geometry, non-Euclidean, dimensional folding)`,
    `4. Concept D: Emotional & Character-Centric (Intimate human connection, emotive lighting, vulnerability, poignant)`,
    `5. Concept E: Technical / Architecture-Dense (Masterwork schematic, cross-sectional depth, exploded axonometric, dense telemetry)`,
    ``,
    `7-LAYER VISUAL DETAIL ARCHITECTURE (Every concept must strictly define all 7 layers):`,
    `- Layer 1: Main Subject (character, product, device, object, central environment entity)`,
    `- Layer 2: Secondary Elements (screens, props, architecture, vehicles, peripheral tools)`,
    `- Layer 3: Material Detail (brushed aluminum, optical glass, concrete, ballistic fabric, carbon fiber)`,
    `- Layer 4: Environmental Detail (dust motes, atmospheric haze, rain streaks, reflections, scratches, cables)`,
    `- Layer 5: Lighting (key light, rim light, volumetric fill, color temp in Kelvin)`,
    `- Layer 6: Camera & Lens (angle, focal length: 24mm/35mm/50mm/85mm/macro, depth of field)`,
    `- Layer 7: Composition (placement, golden ratio, layered depth, negative space balance)`,
    ``,
    `ADDITIONAL MANDATORY FIELDS PER CONCEPT:`,
    `- visualMetaphor: Evocative metaphorical anchor (e.g. "Digital fortress", "Locked vault", "Quantum labyrinth")`,
    `- visualStory: 2-3 sentence narrative describing what is occurring in the scene`,
    `- colorPalette: Descriptive primary, secondary, and accent color specification`,
    `- depth: Explicit description of foreground, midground, and background planes`,
    `- atmosphere: Volumetric properties, particles, humidity, mood`,
    `- details: Array of 3-5 hyper-specific micro-elements or props`,
    ``,
    `OUTPUT FORMAT:`,
    `Return ONLY a valid, parseable JSON object matching this exact schema (no markdown fences, no raw commentary):`,
    `{`,
    `  "concepts": [`,
    `    {`,
    `      "title": "Evocative Concept Title",`,
    `      "concept": "Concept A: Safe / Practical & Direct",`,
    `      "dimensionId": "concept-a",`,
    `      "visualStory": "Narrative synopsis of the scene...",`,
    `      "visualMetaphor": "Digital fortress / Locked vault / etc",`,
    `      "subject": "Layer 1 Main Subject specification...",`,
    `      "details": ["Secondary element 1", "Material texture 2", "Environmental cue 3"],`,
    `      "materials": "Layer 3 Material specs...",`,
    `      "environment": "Layer 4 Environmental specs...",`,
    `      "lighting": "Layer 5 Lighting specs...",`,
    `      "camera": "Layer 6 Camera angle and framing...",`,
    `      "lens": "Layer 6 Focal length, aperture, DOF...",`,
    `      "composition": "Layer 7 Spatial composition and balance...",`,
    `      "colorPalette": "Color palette details...",`,
    `      "depth": "Depth layering across planes...",`,
    `      "atmosphere": "Atmospheric density and mood..."`,
    `    }`,
    `  ],`,
    `  "recommendations": {`,
    `    "primaryConcept": "Concept B: Bold & High-Contrast",`,
    `    "rationale": "Why this concept best amplifies the subject matter and selected style",`,
    `    "suggestedAspect": "${media.defaultAspect}",`,
    `    "suggestedStyle": "${style.name}"`,
    `  }`,
    `}`,
  ].filter(Boolean).join("\n");

  let parsedResponse = null;
  try {
    const rawAiOutput = await completePrompt({
      prompt: systemPrompt,
      effort: "high",
      timeout,
    });

    if (rawAiOutput && typeof rawAiOutput === "string") {
      const jsonMatch = rawAiOutput.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      }
    }
  } catch (err) {
    // AI call failed or timed out — will gracefully use synthetic fallback
    parsedResponse = null;
  }

  // 5. Normalize and Validate Output (or use High-Grade Synthetic Blueprint)
  let normalizedConcepts = [];
  const fallbackConcepts = synthesizeFallbackConcepts({
    nodeText,
    contextPackage,
    style,
    media,
    userPrompt,
  });

  if (parsedResponse && Array.isArray(parsedResponse.concepts) && parsedResponse.concepts.length >= 3) {
    normalizedConcepts = parsedResponse.concepts.map((c, idx) => {
      const fallback = fallbackConcepts[idx] || fallbackConcepts[0];
      const dim = CREATIVE_DIMENSIONS[idx] || CREATIVE_DIMENSIONS[0];

      const negativeConstraints = Array.from(new Set([
        ...(style.negativeConstraints || []),
        "no generic AI glow",
        "no low resolution artifacts",
        "no distorted geometry",
      ]));

      const details = Array.isArray(c.details) && c.details.length > 0 ? c.details : fallback.details;
      const subject = c.subject || fallback.subject;
      const visualMetaphor = c.visualMetaphor || fallback.visualMetaphor;
      const visualStory = c.visualStory || fallback.visualStory;
      const composition = c.composition || fallback.composition;
      const environment = c.environment || fallback.environment;
      const camera = c.camera || fallback.camera;
      const lens = c.lens || fallback.lens;
      const lighting = c.lighting || fallback.lighting;
      const materials = c.materials || fallback.materials;
      const colorPalette = c.colorPalette || fallback.colorPalette;
      const depth = c.depth || fallback.depth;
      const atmosphere = c.atmosphere || fallback.atmosphere;

      // Engineer production prompt adhering to style rules and negative constraints
      const imagePrompt = buildVisualPrompt({
        subject: `${subject}. [Visual Metaphor: ${visualMetaphor}]. Key Details: ${details.join("; ")}`,
        context: `Visual Narrative: ${visualStory}. Setting: ${environment}, ${atmosphere}. Color: ${colorPalette}. Depth & Composition: ${depth}, ${composition}. Lighting & Optics: ${lighting}, ${camera}, ${lens}. Materials: ${materials}`,
        style,
        media,
        customInstructions: `7-Layer detail architecture. Dimension: ${dim.name}.`,
      });

      return {
        title: c.title || fallback.title,
        concept: c.concept || dim.name,
        dimensionId: dim.id,
        visualStory,
        visualMetaphor,
        composition,
        subject,
        environment,
        camera,
        lens,
        lighting,
        materials,
        colorPalette,
        depth,
        atmosphere,
        details,
        style: {
          id: style.id,
          name: style.name,
        },
        media: {
          id: media.id,
          name: media.name,
          defaultAspect: media.defaultAspect,
          defaultSize: media.defaultSize,
        },
        negativeConstraints,
        imagePrompt,
      };
    });

    // Ensure all 5 dimensions are present if model generated fewer than 5
    while (normalizedConcepts.length < 5) {
      normalizedConcepts.push(fallbackConcepts[normalizedConcepts.length]);
    }
  } else {
    normalizedConcepts = fallbackConcepts;
  }

  const recommendations = parsedResponse?.recommendations || {
    primaryConcept: normalizedConcepts[1]?.concept || "Concept B: Bold & High-Contrast",
    rationale: `Concept B provides high-contrast visual tension and optimal composition for ${style.name} in ${media.name} format.`,
    suggestedAspect: media.defaultAspect,
    suggestedStyle: style.name,
  };

  const finalResult = {
    ok: true,
    directions: CREATIVE_DIMENSIONS.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description,
    })),
    concepts: normalizedConcepts,
    recommendations,
  };

  // 6. Cache and return
  cacheSet(cacheKey, finalResult);
  return { ...finalResult, cached: false };
}

// ── 2. refineVisualConcept ───────────────────────────────────────────────────

/**
 * Refines an existing visual concept while strictly preserving its core creative identity
 * (concept type, primary subject, visual metaphor, and baseline structure).
 *
 * @param {Object} params
 * @param {Object} params.baseConcept - The original visual concept object
 * @param {string} [params.refinementInstructions=""] - Freeform refinement (e.g. "make it darker", "add heavy rain")
 * @param {string} [params.styleOverride] - New style registry ID to pivot into
 * @param {string} [params.lightingOverride] - Targeted lighting adjustment
 * @param {string} [params.compositionOverride] - Targeted composition adjustment
 * @param {string} [params.environmentOverride] - Targeted environmental adjustment
 * @returns {Object} Refined visual concept object with rebuilt imagePrompt
 */
export function refineVisualConcept({
  baseConcept,
  refinementInstructions = "",
  styleOverride,
  lightingOverride,
  compositionOverride,
  environmentOverride,
} = {}) {
  if (!baseConcept) {
    throw new Error("refineVisualConcept requires a valid baseConcept");
  }

  // 1. Resolve style (preserving existing unless explicitly overridden)
  let activeStyle = null;
  let activeMedia = null;

  if (styleOverride) {
    const resolved = resolveStyle({
      styleOverride,
      mediaOverride: baseConcept.media?.id,
    });
    activeStyle = resolved.style;
    activeMedia = resolved.media;
  } else if (baseConcept.style?.id) {
    activeStyle = getStyleById(baseConcept.style.id) || STYLE_REGISTRY["cinematic-realism"];
    activeMedia = (baseConcept.media?.id && getMediaById(baseConcept.media.id)) || MEDIA_TYPES["keyart"];
  } else {
    const resolved = resolveStyle({});
    activeStyle = resolved.style;
    activeMedia = resolved.media;
  }

  // 2. Clone base concept to maintain immutability
  const refined = JSON.parse(JSON.stringify(baseConcept));

  // 3. Apply freeform refinement heuristics to layer fields (if explicit override not provided)
  const rLower = (refinementInstructions || "").toLowerCase();
  if (rLower) {
    if (rLower.includes("dark") || rLower.includes("noir") || rLower.includes("night") || rLower.includes("shadow")) {
      if (!lightingOverride) {
        refined.lighting = refined.lighting
          ? `${refined.lighting}, deeper shadows with high-contrast nocturnal rim light`
          : "Deep chiaroscuro shadows, dramatic nocturnal rim light";
      }
      if (!environmentOverride) {
        refined.atmosphere = refined.atmosphere
          ? `${refined.atmosphere}, heavy shadowy gloom`
          : "Heavy shadowy gloom";
      }
    }

    if (rLower.includes("rain") || rLower.includes("wet") || rLower.includes("storm")) {
      if (!environmentOverride) {
        refined.environment = refined.environment
          ? `${refined.environment}, torrential downpour with wet reflective ground`
          : "Torrential downpour with wet reflective surfaces";
      }
      if (!refined.details.some(d => d.toLowerCase().includes("rain"))) {
        refined.details.push("Streaking rainwater glistening across surface planes");
      }
    }

    if (rLower.includes("neon") || rLower.includes("cyber") || rLower.includes("glow")) {
      refined.colorPalette = refined.colorPalette
        ? `${refined.colorPalette}, vibrant electric neon cyan and magenta accents`
        : "Electric cyan, neon magenta, and deep dark base tones";
      if (!refined.details.some(d => d.toLowerCase().includes("neon"))) {
        refined.details.push("Vibrant neon conduits pulsing with luminescent data");
      }
    }

    if (rLower.includes("clean") || rLower.includes("minimal") || rLower.includes("studio")) {
      if (!environmentOverride) {
        refined.environment = refined.environment
          ? `${refined.environment}, ultra-clean minimalist studio background`
          : "Ultra-clean minimalist studio setting";
        refined.atmosphere = "Pristine ambient clarity with neutral lighting";
      }
    }
  }

  // 4. Apply explicit layer overrides (highest precedence)
  if (lightingOverride) {
    refined.lighting = lightingOverride;
  }
  if (compositionOverride) {
    refined.composition = compositionOverride;
  }
  if (environmentOverride) {
    refined.environment = environmentOverride;
  }

  // 5. Update Style, Media, and Negative Constraints
  refined.style = {
    id: activeStyle.id,
    name: activeStyle.name,
  };
  refined.media = {
    id: activeMedia.id,
    name: activeMedia.name,
    defaultAspect: activeMedia.defaultAspect,
    defaultSize: activeMedia.defaultSize,
  };

  refined.negativeConstraints = Array.from(new Set([
    ...(activeStyle.negativeConstraints || []),
    ...(baseConcept.negativeConstraints || []),
  ]));

  // 6. Rebuild Image Prompt with style-registry
  const promptContext = [
    `Visual Narrative: ${refined.visualStory}`,
    `Setting & Environment: ${refined.environment}, ${refined.atmosphere}`,
    `Color Grade: ${refined.colorPalette}`,
    `Depth & Composition: ${refined.depth}, ${refined.composition}`,
    `Lighting & Optics: ${refined.lighting}, ${refined.camera}, ${refined.lens}`,
    `Materials: ${refined.materials}`,
    refinementInstructions ? `Refinement Focus: [${refinementInstructions}]` : null,
  ].filter(Boolean).join(". ");

  refined.imagePrompt = buildVisualPrompt({
    subject: `${refined.subject}. [Visual Metaphor: ${refined.visualMetaphor}]. Key Details: ${refined.details.join("; ")}`,
    context: promptContext,
    style: activeStyle,
    media: activeMedia,
    customInstructions: refinementInstructions
      ? `Apply refinement: ${refinementInstructions}. Preserve core visual identity.`
      : undefined,
  });

  return {
    ok: true,
    concept: refined,
  };
}
