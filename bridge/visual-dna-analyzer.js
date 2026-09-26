/**
 * visual-dna-analyzer.js
 * Visual DNA Extraction, Style/Content Separation, and Continuity Engine for Antigravity Canvas
 *
 * Implements:
 * 1. Extraction of structured Visual DNA from reference images (palette, lighting, camera, composition, materials, atmosphere)
 * 2. Strict separation of CONTENT (subject, props, narrative) vs STYLE (art direction, optics, physical rendering)
 * 3. Structured Visual Prompt Builder adhering to production-grade 10-section architecture
 * 4. Quality Gate validator to eliminate generic AI filler and ensure intentional optical staging
 * 5. Multi-composition variations generation (Variations sharing the same DNA)
 * 6. Visual Series continuity engine (Unified universe worldbuilding)
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { completePrompt } from "./ai-manager.js";
import { resolveStyle, buildVisualPrompt, MEDIA_TYPES } from "./style-registry.js";

const CACHE_DIR = path.resolve(".cache/visual-dna");

function hashKey(str) {
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 16);
}

function cacheGet(key) {
  try {
    const p = path.join(CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(p)) return null;
    const { ts, data } = JSON.parse(fs.readFileSync(p, "utf8"));
    if (Date.now() - ts > 86_400_000 * 7) {
      fs.unlinkSync(p);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function cacheSet(key, data) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(CACHE_DIR, `${key}.json`),
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {}
}

// ── Visual DNA Schema Normalizer ──────────────────────────────────────────────

export const DEFAULT_VISUAL_DNA = {
  name: "Standard Cinematic Visual DNA",
  sourceImage: "",
  visualLanguage: "Cinematic Dramatic Film Plate",
  mood: "Atmospheric, focused, narrative tension",
  color: {
    dominant: ["#0A0E1A", "#1E293B"],
    accent: ["#6366F1", "#38BDF8"],
    background: "#080C14",
    contrast: "High chiaroscuro contrast with rich deep blacks",
    saturation: "Desaturated ambient palette with vibrant selective accents",
  },
  lighting: {
    type: "Directional key light with asymmetric rim halo",
    direction: "45-degree elevated key with deep side shadows",
    quality: "Crisp specular highlights with soft volumetric falloff",
    intensity: "Dramatic high contrast ratio (8:1)",
    shadows: "Deep near-black shadows with minimal ambient fill",
    highlights: "Controlled optical specular glints on metallic and reflective edges",
  },
  camera: {
    perspective: "Eye-level medium perspective",
    angle: "Slight low-angle heroic tilt",
    lens: "35mm anamorphic prime lens",
    depthOfField: "Shallow depth of field with creamy circular background bokeh",
    framing: "Rule-of-thirds golden ratio asymmetric balance",
  },
  composition: {
    layout: "Layered tripartite depth staging",
    subjectPlacement: "Off-center at right 60% golden line",
    foreground: "Subtle out-of-focus environmental particles or atmospheric bokeh",
    midground: "Sharp hero subject with high micro-contrast and edge separation",
    background: "Deep architectural atmosphere with soft luminous falloff",
    depth: "Three distinct planes (foreground bokeh, midground hero, deep background)",
  },
  materials: [
    "Brushed anodized metal",
    "Optical frosted glass",
    "Matte ballistic weave",
    "Wet reflective hard surface",
  ],
  textures: [
    "Micro-surface chamfers",
    "Fine carbon weave",
    "Subtle dust condensation",
  ],
  atmosphere: "Volumetric haze, floating micro-particles catching directional light beams",
  detailDensity: "Ultra-high micro-detail on focal surfaces, clean negative space",
  realism: "Photorealistic film plate quality, Octane 8K render fidelity",
  colorGrading: "Teal and amber cinematic split-toning with controlled highlights",
  shapeLanguage: "Clean geometric angles balanced with organic ergonomics",
  typography: "Monospace telemetry or crisp sans-serif minimal branding if applicable",
  artDirection: "Studio masterwork production key art",
  negativeConstraints: [
    "no generic AI glow",
    "no plastic skin textures",
    "no cartoonish proportions",
    "no flat frontal flash lighting",
    "no oversaturated muddy background",
    "no blurry artifacts",
    "no low resolution",
  ],
};

/**
 * Validates and normalizes raw Visual DNA object.
 */
export function normalizeVisualDNA(raw, sourceImage = "") {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_VISUAL_DNA, sourceImage };
  }

  const cleanString = (val, fallback = "") =>
    typeof val === "string" && val.trim() ? val.trim() : fallback;

  const cleanArray = (val, fallback = []) =>
    Array.isArray(val)
      ? val.filter(v => typeof v === "string" && v.trim()).map(v => v.trim())
      : fallback;

  const normalized = {
    id: cleanString(raw.id, `dna-${Math.random().toString(36).slice(2, 9)}`),
    name: cleanString(raw.name, "Extracted Visual Style"),
    sourceImage: cleanString(sourceImage || raw.sourceImage, ""),
    visualLanguage: cleanString(raw.visualLanguage, DEFAULT_VISUAL_DNA.visualLanguage),
    mood: cleanString(raw.mood, DEFAULT_VISUAL_DNA.mood),
    color: {
      dominant: cleanArray(raw.color?.dominant, DEFAULT_VISUAL_DNA.color.dominant),
      accent: cleanArray(raw.color?.accent, DEFAULT_VISUAL_DNA.color.accent),
      background: cleanString(raw.color?.background, DEFAULT_VISUAL_DNA.color.background),
      contrast: cleanString(raw.color?.contrast, DEFAULT_VISUAL_DNA.color.contrast),
      saturation: cleanString(raw.color?.saturation, DEFAULT_VISUAL_DNA.color.saturation),
    },
    lighting: {
      type: cleanString(raw.lighting?.type, DEFAULT_VISUAL_DNA.lighting.type),
      direction: cleanString(raw.lighting?.direction, DEFAULT_VISUAL_DNA.lighting.direction),
      quality: cleanString(raw.lighting?.quality, DEFAULT_VISUAL_DNA.lighting.quality),
      intensity: cleanString(raw.lighting?.intensity, DEFAULT_VISUAL_DNA.lighting.intensity),
      shadows: cleanString(raw.lighting?.shadows, DEFAULT_VISUAL_DNA.lighting.shadows),
      highlights: cleanString(raw.lighting?.highlights, DEFAULT_VISUAL_DNA.lighting.highlights),
    },
    camera: {
      perspective: cleanString(raw.camera?.perspective, DEFAULT_VISUAL_DNA.camera.perspective),
      angle: cleanString(raw.camera?.angle, DEFAULT_VISUAL_DNA.camera.angle),
      lens: cleanString(raw.camera?.lens, DEFAULT_VISUAL_DNA.camera.lens),
      depthOfField: cleanString(raw.camera?.depthOfField, DEFAULT_VISUAL_DNA.camera.depthOfField),
      framing: cleanString(raw.camera?.framing, DEFAULT_VISUAL_DNA.camera.framing),
    },
    composition: {
      layout: cleanString(raw.composition?.layout, DEFAULT_VISUAL_DNA.composition.layout),
      subjectPlacement: cleanString(raw.composition?.subjectPlacement, DEFAULT_VISUAL_DNA.composition.subjectPlacement),
      foreground: cleanString(raw.composition?.foreground, DEFAULT_VISUAL_DNA.composition.foreground),
      midground: cleanString(raw.composition?.midground, DEFAULT_VISUAL_DNA.composition.midground),
      background: cleanString(raw.composition?.background, DEFAULT_VISUAL_DNA.composition.background),
      depth: cleanString(raw.composition?.depth, DEFAULT_VISUAL_DNA.composition.depth),
    },
    materials: cleanArray(raw.materials, DEFAULT_VISUAL_DNA.materials),
    textures: cleanArray(raw.textures, DEFAULT_VISUAL_DNA.textures),
    atmosphere: cleanString(raw.atmosphere, DEFAULT_VISUAL_DNA.atmosphere),
    detailDensity: cleanString(raw.detailDensity, DEFAULT_VISUAL_DNA.detailDensity),
    realism: cleanString(raw.realism, DEFAULT_VISUAL_DNA.realism),
    colorGrading: cleanString(raw.colorGrading, DEFAULT_VISUAL_DNA.colorGrading),
    shapeLanguage: cleanString(raw.shapeLanguage, DEFAULT_VISUAL_DNA.shapeLanguage),
    typography: cleanString(raw.typography, DEFAULT_VISUAL_DNA.typography),
    artDirection: cleanString(raw.artDirection, DEFAULT_VISUAL_DNA.artDirection),
    negativeConstraints: cleanArray(raw.negativeConstraints, DEFAULT_VISUAL_DNA.negativeConstraints),
  };

  return normalized;
}

// ── Extract Visual DNA ────────────────────────────────────────────────────────

/**
 * Extracts structured Visual DNA from an image file path or text description.
 * Separates CONTENT from STYLE.
 *
 * @param {Object} params
 * @param {string} [params.imagePath] - File path to the image
 * @param {string} [params.imageDescription] - Description or filename of the image
 * @param {string} [params.context] - Surrounding canvas context
 * @returns {Promise<Object>} Extracted Visual DNA profile
 */
export async function extractVisualDNA({
  imagePath = "",
  imageDescription = "",
  context = "",
  timeout = 90_000,
} = {}) {
  const cacheKey = hashKey(`dna_extract:${imagePath}:${imageDescription}:${context}`);
  const cached = cacheGet(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  // Attempt to check if local image exists and read basic metadata
  let fileStats = null;
  if (imagePath) {
    const absPath = imagePath.startsWith("/")
      ? imagePath
      : path.join("/home/bleufire/Documents/Obsidian Vault", imagePath);
    if (fs.existsSync(absPath)) {
      try {
        const stat = fs.statSync(absPath);
        fileStats = { size: stat.size, basename: path.basename(absPath) };
      } catch {}
    }
  }

  const prompt = [
    `You are the Antigravity Master Visual DNA & Style Analyzer.`,
    `Analyze the target image reference and extract a deeply structured VISUAL STYLE PROFILE (Visual DNA).`,
    ``,
    `CRITICAL MANDATE: STRICTLY SEPARATE CONTENT FROM STYLE.`,
    `- CONTENT = What is in the scene (e.g., hacker, sword, specific character, specific room). DO NOT hardcode content as style.`,
    `- STYLE = How the scene is rendered (lighting, color palette, camera optics, materials, atmosphere, composition rules, render quality).`,
    ``,
    `INPUT REFERENCE:`,
    imagePath ? `- Image File: "${imagePath}"` : "",
    fileStats ? `- File Metadata: ${fileStats.basename} (${fileStats.size} bytes)` : "",
    imageDescription ? `- Reference Subject / Context: "${imageDescription}"` : "",
    context ? `- Surrounding Canvas Context: "${context}"` : "",
    ``,
    `EXTRACT THE COMPLETE VISUAL DNA SPECIFICATION:`,
    `1. visualLanguage: High-level aesthetic taxonomy (e.g., "Dark Cyberpunk High-Contrast", "Grimdark Soulsborne", "Minimal Luxury Editorial", "Unreal Engine 5 AAA Keyart", "Modern 3D Pixar Animation").`,
    `2. mood: Emotional atmosphere and visual tension.`,
    `3. color:`,
    `   - dominant: Array of 2-3 primary HEX colors representing the dominant background and surfaces`,
    `   - accent: Array of 1-3 vibrant HEX accent colors used for highlights and focal energy`,
    `   - background: Base background color tone or HEX`,
    `   - contrast: Contrast ratio and tonal range`,
    `   - saturation: Saturation behavior and chroma balance`,
    `4. lighting:`,
    `   - type: Lighting model (e.g., chiaroscuro, volumetric rim, softbox studio, neon underlighting)`,
    `   - direction: Key light angle and secondary fill positions`,
    `   - quality: Hard vs soft falloff, specular characteristics`,
    `   - intensity: Lighting energy and exposure grade`,
    `   - shadows: Shadow depth, ambient occlusion, black level`,
    `   - highlights: Specular gleam, rim reflection, bloom behavior`,
    `5. camera:`,
    `   - perspective: Eye-level, low-angle heroic, overhead axonometric, etc.`,
    `   - angle: Exact camera angle`,
    `   - lens: Focal length (e.g., 24mm wide, 35mm anamorphic, 50mm natural, 85mm portrait, 90mm macro) and aperture/bokeh`,
    `   - depthOfField: Depth of field depth and falloff`,
    `   - framing: Framing rule (rule-of-thirds, golden ratio, center-focal)`,
    `6. composition:`,
    `   - layout: Spatial geometry and axis balance`,
    `   - subjectPlacement: Spatial placement coordinates`,
    `   - foreground: Behavior of foreground elements`,
    `   - midground: Midground staging and focal anchor`,
    `   - background: Background depth, atmosphere, and separation`,
    `   - depth: Multi-plane spatial hierarchy`,
    `7. materials: Array of 3-5 distinct physical material surface types present in the visual universe.`,
    `8. textures: Array of 2-4 micro-texture specifications.`,
    `9. atmosphere: Volumetric properties, humidity, dust, smoke, particles.`,
    `10. detailDensity: Micro-detail distribution and negative space balance.`,
    `11. realism: Render fidelity and physical shader level.`,
    `12. colorGrading: Color grade, split-toning, LUT profile.`,
    `13. shapeLanguage: Geometric vs organic silhouettes.`,
    `14. typography: Font styling or telemetry language if applicable.`,
    `15. artDirection: Studio standard summary.`,
    `16. negativeConstraints: Array of 5-8 strict negative constraints (--no items).`,
    ``,
    `OUTPUT FORMAT:`,
    `Return ONLY a valid, parseable JSON object matching this exact schema (no markdown fences, no raw commentary):`,
    `{`,
    `  "name": "Short Evocative Style Name (e.g., Neo-Cyan Cyberpunk)",`,
    `  "visualLanguage": "...",`,
    `  "mood": "...",`,
    `  "color": {`,
    `    "dominant": ["#...", "#..."],`,
    `    "accent": ["#...", "#..."],`,
    `    "background": "#...",`,
    `    "contrast": "...",`,
    `    "saturation": "..."`,
    `  },`,
    `  "lighting": {`,
    `    "type": "...",`,
    `    "direction": "...",`,
    `    "quality": "...",`,
    `    "intensity": "...",`,
    `    "shadows": "...",`,
    `    "highlights": "..."`,
    `  },`,
    `  "camera": {`,
    `    "perspective": "...",`,
    `    "angle": "...",`,
    `    "lens": "...",`,
    `    "depthOfField": "...",`,
    `    "framing": "..."`,
    `  },`,
    `  "composition": {`,
    `    "layout": "...",`,
    `    "subjectPlacement": "...",`,
    `    "foreground": "...",`,
    `    "midground": "...",`,
    `    "background": "...",`,
    `    "depth": "..."`,
    `  },`,
    `  "materials": ["...", "..."],`,
    `  "textures": ["...", "..."],`,
    `  "atmosphere": "...",`,
    `  "detailDensity": "...",`,
    `  "realism": "...",`,
    `  "colorGrading": "...",`,
    `  "shapeLanguage": "...",`,
    `  "typography": "...",`,
    `  "artDirection": "...",`,
    `  "negativeConstraints": ["no ...", "no ..."]`,
    `}`,
  ].filter(Boolean).join("\n");

  const raw = await completePrompt({ prompt, effort: "high", timeout });
  let parsed = null;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch {
    parsed = DEFAULT_VISUAL_DNA;
  }

  const normalized = normalizeVisualDNA(parsed, imagePath);
  const result = {
    ok: true,
    visualDNA: normalized,
    sourceImage: imagePath,
  };

  cacheSet(cacheKey, result);
  return { ...result, cached: false };
}

// ── Quality Gate Validator ───────────────────────────────────────────────────

const GENERIC_AI_FILLERS = [
  /\bhigh quality\b/i,
  /\bbeautiful\b/i,
  /\bamazing\b/i,
  /\bprofessional\b/i,
  /\bstunning\b/i,
  /\bbest quality\b/i,
  /\bhyper realistic\b/i,
  /\bphotorealistic masterpiece\b/i,
];

/**
 * Validates prompt quality and enforces concrete physical specifications.
 */
export function validatePromptQuality(promptText, visualDNA) {
  const issues = [];
  const cleanPrompt = promptText || "";

  // 1. Check for generic filler words
  for (const filler of GENERIC_AI_FILLERS) {
    if (filler.test(cleanPrompt)) {
      issues.push(`Generic adjective detected: ${filler.source}`);
    }
  }

  // 2. Check for required structured sections
  const hasSubject = /\[SUBJECT\]|Subject:/i.test(cleanPrompt);
  const hasLighting = /\[LIGHTING\]|Lighting:/i.test(cleanPrompt);
  const hasCamera = /\[CAMERA\]|Camera:/i.test(cleanPrompt);
  const hasComposition = /\[COMPOSITION\]|Composition:/i.test(cleanPrompt);
  const hasNegative = /--no\s+/i.test(cleanPrompt);

  if (!hasSubject) issues.push("Missing concrete SUBJECT definition");
  if (!hasLighting) issues.push("Missing concrete LIGHTING specification");
  if (!hasCamera) issues.push("Missing concrete CAMERA & LENS specification");
  if (!hasComposition) issues.push("Missing concrete COMPOSITION specification");
  if (!hasNegative) issues.push("Missing NEGATIVE CONSTRAINTS (--no rules)");

  const score = Math.max(0, 100 - issues.length * 15);
  return {
    passed: issues.length <= 1,
    score,
    issues,
  };
}

// ── Visual Prompt Builder from DNA ──────────────────────────────────────────

/**
 * Builds a 10-section production-grade image prompt from Visual DNA and a new subject.
 *
 * @param {Object} params
 * @param {string} params.newSubject - The new subject/concept to render
 * @param {Object} params.visualDNA - Extracted or selected Visual DNA profile
 * @param {string} [params.styleOverride] - Optional style registry ID override
 * @param {string} [params.mediaType="keyart"] - Output media type ID
 * @param {string} [params.customInstructions=""] - Additional user instructions
 * @param {boolean} [params.isSeriesContinuity=false] - If true, enforces series-level continuity tokens
 * @returns {Object} { imagePrompt, qualityGate, style, media, content, styleProfile }
 */
export function buildVisualPromptFromDNA({
  newSubject = "",
  visualDNA = null,
  styleOverride = null,
  mediaType = "keyart",
  customInstructions = "",
  isSeriesContinuity = false,
}) {
  const dna = normalizeVisualDNA(visualDNA);
  const media = MEDIA_TYPES[mediaType] || MEDIA_TYPES["keyart"];

  // Resolve style based on priority:
  // Priority 1: Explicit user style override (e.g. user selected anime)
  // Priority 2: Visual DNA style
  let activeStyle = null;
  if (styleOverride) {
    const resolved = resolveStyle({ styleOverride, mediaOverride: mediaType });
    activeStyle = resolved.style;
  }

  const styleName = activeStyle ? activeStyle.name : dna.name;
  const visualLang = activeStyle ? activeStyle.description : dna.visualLanguage;

  // Palette summary
  const dominantPalette = dna.color.dominant.join(", ");
  const accentPalette = dna.color.accent.join(", ");

  // Materials & Textures
  const materialsStr = dna.materials.slice(0, 4).join(", ");
  const texturesStr = dna.textures.slice(0, 3).join(", ");

  // Negative constraints combination
  const combinedNegatives = Array.from(new Set([
    ...(dna.negativeConstraints || []),
    ...(activeStyle?.negativeConstraints || []),
    "no blurry artifacts",
    "no low resolution",
  ]));

  // 10-Section Structured Prompt
  const sections = [
    `[STYLE & ART DIRECTION]: ${styleName}. ${visualLang}. Art direction: ${dna.artDirection}. Mood: ${dna.mood}`,
    `[SUBJECT]: ${newSubject.trim()}`,
    `[COMPOSITION]: ${dna.composition.layout}. Focal placement: ${dna.composition.subjectPlacement}. Depth planes: ${dna.composition.depth}`,
    `[CAMERA & OPTICS]: ${dna.camera.perspective}, ${dna.camera.angle}. Lens: ${dna.camera.lens}. Depth of field: ${dna.camera.depthOfField}. Framing: ${dna.camera.framing}`,
    `[LIGHTING]: ${dna.lighting.type}. Key direction: ${dna.lighting.direction}. Quality: ${dna.lighting.quality}. Shadows: ${dna.lighting.shadows}. Specular highlights: ${dna.lighting.highlights}`,
    `[MATERIALS & TEXTURES]: Surface materials: ${materialsStr}. Micro-textures: ${texturesStr}`,
    `[ATMOSPHERE & DEPTH]: ${dna.atmosphere}. Detail density: ${dna.detailDensity}`,
    `[COLOR & GRADING]: Dominant palette: [${dominantPalette}]. Accent energy: [${accentPalette}]. Contrast: ${dna.color.contrast}. Saturation: ${dna.color.saturation}. Color grade: ${dna.colorGrading}`,
    isSeriesContinuity
      ? `[SERIES CONTINUITY]: Maintain strict universe continuity with reference style. Exact matching lighting grammar, material physics, and cinematic split-toning.`
      : null,
    customInstructions ? `[CUSTOM REFINEMENT]: ${customInstructions.trim()}` : null,
    `[OUTPUT SPEC]: ${media.defaultAspect} aspect ratio (${media.defaultSize.width}x${media.defaultSize.height}px), Octane 8K masterwork render standard`,
    `--no ${combinedNegatives.join(", --no ")}`,
  ].filter(Boolean);

  const imagePrompt = sections.join(". \n");
  const qualityGate = validatePromptQuality(imagePrompt, dna);

  return {
    imagePrompt,
    qualityGate,
    style: {
      id: activeStyle ? activeStyle.id : dna.id,
      name: styleName,
      family: activeStyle ? activeStyle.family : "custom",
    },
    media: {
      id: media.id,
      name: media.name,
      defaultAspect: media.defaultAspect,
      defaultSize: media.defaultSize,
    },
    content: {
      subject: newSubject.trim(),
      context: customInstructions,
    },
    styleProfile: dna,
  };
}

// ── Multi-Composition Variations Engine ───────────────────────────────────────

export const VARIATION_ARCHETYPES = [
  {
    id: "var-hero-close",
    name: "Hero Close-Up & Micro-Detail",
    description: "Intimate 85mm portrait/close-up emphasizing surface textures, micro-materials, and dramatic rim lighting.",
    cameraMod: "85mm prime lens f/1.4, tight intimate framing, ultra-shallow depth of field with creamy circular background bokeh",
    lightingMod: "Intense asymmetric 45-degree rim halo slicing across edge chamfers, subtle key light fill",
    compositionMod: "Center-weighted hero subject dominating 70% of the frame with atmospheric bokeh particles",
  },
  {
    id: "var-wide-environment",
    name: "Environmental Wide Staging",
    description: "Expansive 24mm wide establishing shot showing the subject embedded in a grand architectural or atmospheric space.",
    cameraMod: "24mm ultra-wide anamorphic lens, deep field perspective with atmospheric falloff",
    lightingMod: "Volumetric fog beams streaming from high windows or light grids, expansive ambient glow",
    compositionMod: "Extreme scale contrast, hero subject positioned at lower-left golden ratio intersection against massive environmental architecture",
  },
  {
    id: "var-dynamic-action",
    name: "Dynamic Action & Kinetic Tension",
    description: "Low-angle Dutch tilt with directional energy, speed lines, high-contrast chiaroscuro, and visceral tension.",
    cameraMod: "35mm wide lens, low-angle dramatic Dutch tilt looking upward with razor-sharp foreground perspective",
    lightingMod: "Harsh directional tungsten key with sharp cyan/amber cross-lighting and deep black shadow cuts",
    compositionMod: "Dynamic diagonal tension line cutting across frame from bottom-left to top-right",
  },
];

/**
 * Generates 3 differentiated composition concepts and engineered prompts using the same Visual DNA.
 */
export function generateVariationsFromDNA({
  visualDNA,
  subject = "",
  count = 3,
  mediaType = "keyart",
}) {
  const dna = normalizeVisualDNA(visualDNA);
  const archetypes = VARIATION_ARCHETYPES.slice(0, count);

  const variations = archetypes.map((arch, idx) => {
    // Clone DNA and apply archetype optical modifications
    const variantDNA = JSON.parse(JSON.stringify(dna));
    variantDNA.camera.lens = arch.cameraMod;
    variantDNA.camera.angle = `Variation ${idx + 1}: ${arch.name}`;
    variantDNA.lighting.type = arch.lightingMod;
    variantDNA.composition.layout = arch.compositionMod;

    const { imagePrompt, qualityGate, style, media } = buildVisualPromptFromDNA({
      newSubject: subject || dna.name,
      visualDNA: variantDNA,
      mediaType,
      customInstructions: `Composition Archetype: ${arch.name}. ${arch.description}`,
    });

    return {
      id: `variation-${idx + 1}`,
      title: `${subject || "Scene"} (${arch.name})`,
      archetype: arch.name,
      description: arch.description,
      imagePrompt,
      qualityGate,
      style,
      media,
      camera: variantDNA.camera,
      lighting: variantDNA.lighting,
      composition: variantDNA.composition,
    };
  });

  return {
    ok: true,
    subject,
    visualDNA: dna,
    variations,
  };
}

// ── Continue Visual Series Engine ─────────────────────────────────────────────

/**
 * Formulates the next sequence in an ongoing visual series belonging to the same visual universe.
 */
export function continueSeriesFromDNA({
  visualDNA,
  seriesName = "Visual Series",
  nextSceneFocus = "",
  currentSeriesCount = 1,
  mediaType = "keyart",
}) {
  const dna = normalizeVisualDNA(visualDNA);
  const sceneNumber = currentSeriesCount + 1;

  const continuityInstructions =
    `Series Episode / Part ${sceneNumber} in "${seriesName}". ` +
    `Exact visual universe continuity: preserve the signature ${dna.colorGrading} color grading, ` +
    `the ${dna.lighting.type} lighting grammar, and ${dna.materials.slice(0, 2).join(", ")} material physics.`;

  const { imagePrompt, qualityGate, style, media } = buildVisualPromptFromDNA({
    newSubject: nextSceneFocus || `Part ${sceneNumber} of ${seriesName}`,
    visualDNA: dna,
    mediaType,
    customInstructions: continuityInstructions,
    isSeriesContinuity: true,
  });

  return {
    ok: true,
    seriesName,
    sceneNumber,
    nextSceneFocus,
    imagePrompt,
    qualityGate,
    style,
    media,
    visualDNA: dna,
  };
}
