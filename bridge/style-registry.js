/**
 * style-registry.js
 * Centralized Visual Style System for Antigravity Canvas
 *
 * Architecture:
 *   Style Registry  →  Style Resolver  →  Prompt Builder
 *
 * Each style is a full visual recipe: not just a name but a set of
 * composition, lighting, color, and negative-constraint rules.
 * Skills consume this via resolveStyle() and buildVisualPrompt().
 */

// ── Style Registry ────────────────────────────────────────────────────────────

export const STYLE_REGISTRY = {

  // ── CINEMATIC FAMILY ──────────────────────────────────────────────────────

  "cinematic-realism": {
    id: "cinematic-realism",
    name: "Cinematic Realism",
    family: "cinematic",
    category: "photographic",
    description: "Photographic film plate quality. High contrast, anamorphic lens, directional key light.",
    compatibleMedia: ["poster", "thumbnail", "keyart", "concept-art", "social"],
    composition: "rule-of-thirds, asymmetric, strong foreground-background depth layering",
    camera: "35-50mm anamorphic, shallow depth of field, natural bokeh",
    lighting: "single directional key light, deep shadows, volumetric haze, subtle rim light",
    color: "desaturated cinematic grade, rich blacks, controlled highlights, warm-cool contrast",
    texture: "high realism, micro-detail, film grain",
    mood: "dramatic, narrative, tension",
    negativeConstraints: [
      "no generic AI glow", "no flat composition", "no plastic skin",
      "no unnecessary objects", "no blurry artifacts", "no low resolution"
    ],
  },

  "sci-fi-cinematic": {
    id: "sci-fi-cinematic",
    name: "Sci-Fi Cinematic",
    family: "cinematic",
    category: "photographic",
    description: "Space opera and hard sci-fi. Epic scale, volumetric atmosphere, technological environments.",
    compatibleMedia: ["poster", "thumbnail", "keyart", "concept-art"],
    composition: "extreme scale contrast, center vs negative space, epic wide establishing shot",
    camera: "ultra-wide anamorphic, deep focus, lens flare from light sources",
    lighting: "practical light sources, volumetric atmosphere, cold-blue dominant with warm accents",
    color: "desaturated blues and grays, neon accent colors, high contrast",
    texture: "hard surfaces, industrial materials, greebling detail",
    mood: "epic, isolated, technological wonder or dread",
    negativeConstraints: [
      "no fantasy elements", "no magic", "no warm medieval tones", "no cartoon"
    ],
  },

  "neo-noir": {
    id: "neo-noir",
    name: "Neo-Noir",
    family: "cinematic",
    category: "photographic",
    description: "Urban thriller aesthetic. Rain, neon reflections, deep shadows, moral ambiguity.",
    compatibleMedia: ["poster", "thumbnail", "keyart", "social"],
    composition: "low-angle Dutch tilt, rain-soaked foreground reflections, silhouette subjects",
    camera: "35mm, tight urban framing, oppressive headspace",
    lighting: "neon practical lights, deep chiaroscuro, wet surface reflections",
    color: "high contrast, cyan-magenta neon, near-black shadows",
    texture: "wet pavement, rain drops, city grime",
    mood: "paranoid, morally ambiguous, dangerous",
    negativeConstraints: [
      "no bright cheerful colors", "no natural settings", "no generic city skyline"
    ],
  },

  // ── GAMING FAMILY ─────────────────────────────────────────────────────────

  "aaa-game-keyart": {
    id: "aaa-game-keyart",
    name: "AAA Game Key Art",
    family: "gaming",
    category: "game-art",
    description: "Triple-A quality game promotional art. Unreal Engine 5 render quality, extreme detail.",
    compatibleMedia: ["keyart", "poster", "thumbnail", "concept-art"],
    composition: "16:9, hero subject left or right at 60% rule, secondary elements creating depth",
    camera: "wide cinematic, low angle for authority, motion blur on action elements",
    lighting: "Lumen global illumination, volumetric particles, electric neon rim halos",
    color: "high saturation, complementary color contrast, deep shadows with vivid highlights",
    texture: "Nanite micro-geometry, PBR materials, raytraced reflections",
    mood: "epic, powerful, adrenaline, dangerous",
    negativeConstraints: [
      "no flat vector", "no muddy colors", "no low-poly", "no plastic textures",
      "no blur", "no oversaturated generic gradient"
    ],
  },

  "dark-fantasy-art": {
    id: "dark-fantasy-art",
    name: "Dark Fantasy Art",
    family: "gaming",
    category: "game-art",
    description: "Soulslike / grimdark aesthetic. Oppressive atmosphere, ancient evil, crumbling civilizations.",
    compatibleMedia: ["keyart", "poster", "thumbnail", "concept-art"],
    composition: "massive scale elements dwarfing the protagonist, ancient ruins framing",
    camera: "slightly low angle, deep atmospheric perspective",
    lighting: "ashen grey ambient, ember glow from below, cold moonlight from above",
    color: "muted desaturated palette, ash greys and dark browns, amber ember accents",
    texture: "cracked stone, corroded metal, decaying organic matter",
    mood: "oppressive, ancient, hopeless determination",
    negativeConstraints: [
      "no bright cheerful colors", "no cartoon", "no anime", "no generic fantasy tropes"
    ],
  },

  "gaming-macro-loot": {
    id: "gaming-macro-loot",
    name: "Gaming Macro Loot",
    family: "gaming",
    category: "game-art",
    description: "Extreme close-up of legendary items. 8K macro studio render of weapons and relics.",
    compatibleMedia: ["asset", "icon", "social"],
    composition: "1:1, centered object, 45-degree elevated camera, minimal negative space",
    camera: "macro lens, f/8, sharp focus across entire subject",
    lighting: "45-degree key light, sharp rim light, deep dark background",
    color: "rich jewel tones, metallic PBR materials, subtle emissive glow",
    texture: "damascus steel grain, hand-carved runes, liquid gold inlay",
    mood: "legendary, rare, powerful, desirable",
    negativeConstraints: [
      "no cartoon", "no flat vector", "no plastic shine", "no low-poly"
    ],
  },

  // ── UI/UX FAMILY ──────────────────────────────────────────────────────────

  "minimal-saas": {
    id: "minimal-saas",
    name: "Minimal SaaS UI",
    family: "ui-ux",
    category: "interface",
    description: "Clean, modern SaaS interface. Dark mode, card-based layout, generous whitespace.",
    compatibleMedia: ["ui-screen", "wireframe", "dashboard", "social"],
    composition: "9:16 or 16:9, clear visual hierarchy, component grid, status bar + content + nav dock",
    camera: "straight-on flat rendering, no perspective distortion",
    lighting: "flat screen simulation, frosted glass card elevation, subtle drop shadows",
    color: "deep obsidian background (#0A0E1A), indigo-purple accent (#6366F1), high-contrast text",
    texture: "crisp pixel-perfect vector rendering, no noise or film grain",
    mood: "professional, efficient, trustworthy",
    negativeConstraints: [
      "no photographic backgrounds", "no hands holding phone", "no lens distortion",
      "no blurry text", "no cluttered layout", "no cartoon icons"
    ],
  },

  "cybersecurity-ui": {
    id: "cybersecurity-ui",
    name: "Cybersecurity UI",
    family: "ui-ux",
    category: "interface",
    description: "Technical dark terminal aesthetic. Matrix-inspired, threat monitoring, hacker culture.",
    compatibleMedia: ["ui-screen", "dashboard", "wireframe"],
    composition: "dense information grid, monospace typography, terminal-style data feeds",
    camera: "straight-on flat, slight scanline texture overlay",
    lighting: "dark background with green and cyan terminal glow",
    color: "near-black background (#050A0E), matrix green (#00FF41), cyan alerts (#00D4FF)",
    texture: "subtle scanline texture, monospace font rendering, pixelated grid lines",
    mood: "technical, vigilant, expert, underground",
    negativeConstraints: [
      "no friendly rounded corners", "no pastel colors", "no photographic content"
    ],
  },

  "neo-brutalist-ui": {
    id: "neo-brutalist-ui",
    name: "Neo-Brutalist UI",
    family: "ui-ux",
    category: "interface",
    description: "Raw, unpolished intentional design. Heavy borders, stark contrast, bold typography.",
    compatibleMedia: ["ui-screen", "poster", "wireframe", "social"],
    composition: "off-grid asymmetric layout, heavy black borders, stark negative space",
    camera: "straight-on flat",
    lighting: "flat no-shadow rendering, stark contrast only",
    color: "stark black and white with single bold accent (yellow, red, or electric blue)",
    texture: "rough texture overlays, photocopier grain, exposed structural elements",
    mood: "confrontational, raw, unapologetic, anti-corporate",
    negativeConstraints: [
      "no rounded corners", "no gradients", "no glassmorphism", "no soft shadows"
    ],
  },

  // ── REALISTIC PHOTOGRAPHY FAMILY ──────────────────────────────────────────

  "product-photography": {
    id: "product-photography",
    name: "Product Photography",
    family: "realistic",
    category: "photographic",
    description: "Commercial studio product photography. Clean, precise, aspirational.",
    compatibleMedia: ["asset", "poster", "social", "editorial"],
    composition: "centered or slightly off-center, clean studio background, hero product focus",
    camera: "medium format, 90mm macro, f/11 deep focus",
    lighting: "softbox key light, white bounce fill, subtle rim separation",
    color: "neutral studio whites and grays, product colors isolated and saturated",
    texture: "ultra-sharp surface detail, specular highlights on reflective surfaces",
    mood: "premium, desirable, trustworthy, aspirational",
    negativeConstraints: [
      "no busy backgrounds", "no hands", "no people", "no dramatic lighting"
    ],
  },

  "editorial-realism": {
    id: "editorial-realism",
    name: "Editorial Realism",
    family: "realistic",
    category: "photographic",
    description: "Magazine-quality editorial photography. Human subjects, narrative documentary style.",
    compatibleMedia: ["poster", "thumbnail", "social", "editorial"],
    composition: "environmental portrait, subject in context, foreground-background storytelling",
    camera: "35mm or 50mm, natural depth of field, slightly desaturated",
    lighting: "available light, window light, or modified natural light",
    color: "slightly desaturated, warm editorial grade, controlled shadows",
    texture: "natural grain, authentic textures, real environment",
    mood: "authentic, human, documentary, thoughtful",
    negativeConstraints: [
      "no obvious studio lighting", "no artificial-looking skin", "no over-retouching"
    ],
  },

  // ── ILLUSTRATION FAMILY ───────────────────────────────────────────────────

  "modern-cartoon-3d": {
    id: "modern-cartoon-3d",
    name: "Modern 3D Cartoon",
    family: "illustration",
    category: "animated",
    description: "Pixar/Sony Animation studio render quality. Expressive, tactile, warm and inviting.",
    compatibleMedia: ["keyart", "poster", "thumbnail", "concept-art", "social"],
    composition: "character-centered, expressive silhouette, warm environmental staging",
    camera: "slightly low, intimate angle, wide enough to show character context",
    lighting: "three-point studio setup, warm key, cool fill, bounce light from environment",
    color: "vibrant saturated palette, harmonious complementary colors, no muddy tones",
    texture: "subsurface scattering on skin, tactile fabric, whimsical environmental props",
    mood: "charming, expressive, adventurous, family-friendly",
    negativeConstraints: [
      "no flat 2D", "no low-poly", "no muddy colors", "no photographic grain",
      "no deformed anatomy"
    ],
  },

  "anime-cinematic": {
    id: "anime-cinematic",
    name: "Anime Cinematic",
    family: "illustration",
    category: "animated",
    description: "High-production anime style. Detailed cel shading, dramatic lighting, dynamic composition.",
    compatibleMedia: ["keyart", "poster", "thumbnail", "concept-art"],
    composition: "dynamic diagonal composition, speed lines, dramatic foreshortening",
    camera: "low dutch angle for power, high angle for vulnerability, extreme perspective",
    lighting: "dramatic rim light, magical effect glow, high contrast cel shading",
    color: "vibrant jewel tones, high saturation, dramatic shadow colors",
    texture: "clean line art, precise cel shading, detailed environmental backgrounds",
    mood: "epic, emotional, action-packed, dramatic",
    negativeConstraints: [
      "no 3D render look", "no photographic elements", "no western cartoon style"
    ],
  },

  // ── SOCIAL/EDITORIAL FAMILY ───────────────────────────────────────────────

  "youtube-viral": {
    id: "youtube-viral",
    name: "YouTube Viral Thumbnail",
    family: "social",
    category: "editorial",
    description: "High-CTR thumbnail composition. Emotional face, bold typography, curiosity gap.",
    compatibleMedia: ["thumbnail", "social"],
    composition: "16:9, subject 55-65% of frame left or right, text zone opposite, safe areas respected",
    camera: "tight close-up or medium shot, slight low angle for authority",
    lighting: "clean separation from background, strong rim light, face in sharp focus",
    color: "high contrast, complementary color pairs, bold saturated background",
    texture: "sharp subject, simplified background, no distracting environmental texture",
    mood: "urgent, emotional, surprising, credible",
    negativeConstraints: [
      "no text-dependent communication", "no generic shocked face without context",
      "no blurry subjects", "no overcrowded composition"
    ],
  },

  "luxury-editorial": {
    id: "luxury-editorial",
    name: "Luxury Editorial",
    family: "social",
    category: "editorial",
    description: "Premium brand aesthetic. Restrained, sophisticated, premium materials and space.",
    compatibleMedia: ["poster", "thumbnail", "social", "editorial", "keyart"],
    composition: "generous negative space, single hero element, asymmetric balance",
    camera: "medium format feel, natural depth of field, precise framing",
    lighting: "directional natural light, controlled shadows, no harsh artificial look",
    color: "dark navy, deep black, gold accents, premium muted palette",
    texture: "premium material surfaces, fine grain, deliberate imperfections",
    mood: "exclusive, quiet confidence, understated power, aspirational",
    negativeConstraints: [
      "no bright saturated colors", "no busy compositions", "no generic luxury clichés"
    ],
  },

  // ── TECHNICAL/INFORMATIONAL ───────────────────────────────────────────────

  "technical-diagram": {
    id: "technical-diagram",
    name: "Technical Diagram",
    family: "technical",
    category: "informational",
    description: "Clean system architecture and flow diagrams. Clear hierarchy, minimal decoration.",
    compatibleMedia: ["wireframe", "diagram", "dashboard"],
    composition: "left-to-right or top-to-bottom flow, clear grouping, ample whitespace",
    camera: "straight-on flat rendering, no perspective",
    lighting: "flat, no shadows, subtle card elevation only",
    color: "neutral background, semantic color coding (green=success, red=error, blue=info)",
    texture: "clean vector lines, no texture or grain",
    mood: "precise, trustworthy, expert, logical",
    negativeConstraints: [
      "no decorative elements", "no photographic backgrounds", "no abstract art elements"
    ],
  },

  // ── EXPERIMENTAL ─────────────────────────────────────────────────────────

  "hyper-vibrant": {
    id: "hyper-vibrant",
    name: "Hyper-Vibrant Chromatic",
    family: "experimental",
    category: "abstract",
    description: "Extreme color saturation, prismatic dispersion, iridescent surfaces.",
    compatibleMedia: ["keyart", "poster", "social", "thumbnail"],
    composition: "radial or spiral composition, chromatic aberration as design element",
    camera: "abstract or macro, prismatic lens effects",
    lighting: "multi-colored practical lights, chromatic prism dispersion, neon underlighting",
    color: "full spectrum prismatic, complementary color tension, deep black void background",
    texture: "liquid chrome, iridescent glass, holographic surfaces",
    mood: "euphoric, overwhelming sensory richness, futuristic",
    negativeConstraints: [
      "no dull colors", "no washed-out grey", "no muddy palette"
    ],
  },
};

// ── Media Type Registry ────────────────────────────────────────────────────────

export const MEDIA_TYPES = {
  "poster": {
    id: "poster",
    name: "Poster",
    aspectRatios: ["2:3", "16:9", "3:4"],
    defaultAspect: "2:3",
    defaultSize: { width: 400, height: 600 },
    recommendedStyles: ["cinematic-realism", "sci-fi-cinematic", "neo-noir", "luxury-editorial", "aaa-game-keyart"],
  },
  "thumbnail": {
    id: "thumbnail",
    name: "YouTube Thumbnail",
    aspectRatios: ["16:9"],
    defaultAspect: "16:9",
    defaultSize: { width: 560, height: 315 },
    recommendedStyles: ["youtube-viral", "aaa-game-keyart", "cinematic-realism", "neo-noir"],
  },
  "keyart": {
    id: "keyart",
    name: "Game / Film Key Art",
    aspectRatios: ["16:9", "2:3"],
    defaultAspect: "16:9",
    defaultSize: { width: 560, height: 315 },
    recommendedStyles: ["aaa-game-keyart", "dark-fantasy-art", "sci-fi-cinematic", "cinematic-realism"],
  },
  "ui-screen": {
    id: "ui-screen",
    name: "UI / App Screen",
    aspectRatios: ["9:16", "16:9"],
    defaultAspect: "9:16",
    defaultSize: { width: 380, height: 680 },
    recommendedStyles: ["minimal-saas", "cybersecurity-ui", "neo-brutalist-ui"],
  },
  "asset": {
    id: "asset",
    name: "Asset / Icon / Object",
    aspectRatios: ["1:1", "3:4"],
    defaultAspect: "1:1",
    defaultSize: { width: 360, height: 360 },
    recommendedStyles: ["gaming-macro-loot", "product-photography", "modern-cartoon-3d"],
  },
  "social": {
    id: "social",
    name: "Social Media Post",
    aspectRatios: ["1:1", "9:16", "16:9"],
    defaultAspect: "1:1",
    defaultSize: { width: 400, height: 400 },
    recommendedStyles: ["youtube-viral", "luxury-editorial", "neo-brutalist-ui", "hyper-vibrant"],
  },
  "concept-art": {
    id: "concept-art",
    name: "Concept Art",
    aspectRatios: ["16:9", "3:4"],
    defaultAspect: "16:9",
    defaultSize: { width: 560, height: 315 },
    recommendedStyles: ["aaa-game-keyart", "dark-fantasy-art", "sci-fi-cinematic", "modern-cartoon-3d", "anime-cinematic"],
  },
  "editorial": {
    id: "editorial",
    name: "Editorial",
    aspectRatios: ["16:9", "3:4", "1:1"],
    defaultAspect: "16:9",
    defaultSize: { width: 560, height: 315 },
    recommendedStyles: ["editorial-realism", "luxury-editorial", "cinematic-realism"],
  },
  "wireframe": {
    id: "wireframe",
    name: "Wireframe / Layout Spec",
    aspectRatios: ["16:9", "9:16"],
    defaultAspect: "16:9",
    defaultSize: { width: 500, height: 300 },
    recommendedStyles: ["minimal-saas", "technical-diagram"],
  },
  "diagram": {
    id: "diagram",
    name: "Diagram / Architecture",
    aspectRatios: ["16:9"],
    defaultAspect: "16:9",
    defaultSize: { width: 560, height: 315 },
    recommendedStyles: ["technical-diagram"],
  },
};

// ── Legacy override map (backward compatibility with old styleOverride strings) ──

const LEGACY_OVERRIDE_MAP = {
  "mobile_ui":   { styleId: "minimal-saas",       mediaId: "ui-screen" },
  "gaming":      { styleId: "aaa-game-keyart",     mediaId: "keyart" },
  "loot":        { styleId: "gaming-macro-loot",   mediaId: "asset" },
  "cartoon":     { styleId: "modern-cartoon-3d",   mediaId: "concept-art" },
  "vibrant":     { styleId: "hyper-vibrant",       mediaId: "social" },
  "cinematic":   { styleId: "cinematic-realism",   mediaId: "poster" },
  "neo-noir":    { styleId: "neo-noir",            mediaId: "poster" },
  "sci-fi":      { styleId: "sci-fi-cinematic",    mediaId: "keyart" },
  "anime":       { styleId: "anime-cinematic",     mediaId: "concept-art" },
  "luxury":      { styleId: "luxury-editorial",    mediaId: "editorial" },
  "brutalist":   { styleId: "neo-brutalist-ui",    mediaId: "ui-screen" },
  "cybersecurity": { styleId: "cybersecurity-ui",  mediaId: "ui-screen" },
  "youtube":     { styleId: "youtube-viral",       mediaId: "thumbnail" },
  "product":     { styleId: "product-photography", mediaId: "asset" },
};

// ── Intent Detection for Auto-Classification ──────────────────────────────────

function detectMediaFromText(text) {
  const t = text.toLowerCase();
  if (/(mobile|app screen|ios|android|checkout|onboarding|feed|settings|profile|tabbar)/.test(t))
    return "ui-screen";
  if (/(dashboard|analytics|metrics|monitoring|data viz)/.test(t))
    return "wireframe";
  if (/(loot|weapon|sword|blade|shield|relic|potion|chest|crate|artifact)/.test(t))
    return "asset";
  if (/(game|gaming|esports|boss|dungeon|fps|shooter|rpg|souls|elden|raid)/.test(t))
    return "keyart";
  if (/(youtube|thumbnail|clickbait|ctr|hook|viral)/.test(t))
    return "thumbnail";
  if (/(concept art|character design|environment design|world building)/.test(t))
    return "concept-art";
  if (/(poster|film|movie|cinema|promotional)/.test(t))
    return "poster";
  if (/(logo|icon|badge|mark|symbol|emblem|avatar|orb|cube|sphere)/.test(t))
    return "asset";
  if (/(portrait|character|warrior|figure|person|face|model|cyborg)/.test(t))
    return "poster";
  if (/(cartoon|anime|pixar|disney|animated|stylized|cute)/.test(t))
    return "concept-art";
  if (/(instagram|tiktok|social|post|story|reel)/.test(t))
    return "social";
  if (/(architecture|diagram|flow|system|sequence|schema)/.test(t))
    return "diagram";
  return "keyart";
}

function detectStyleFromText(text, mediaId) {
  const t = text.toLowerCase();
  const media = MEDIA_TYPES[mediaId];
  if (!media) return "cinematic-realism";

  if (/(noir|detective|rain|neon|city|urban|crime|thriller)/.test(t)) return "neo-noir";
  if (/(sci.fi|space|futur|cyberpunk|cyber|robot|android|quantum)/.test(t)) return "sci-fi-cinematic";
  if (/(dark fantasy|souls|grimdark|medieval|ancient evil|ruins|undead)/.test(t)) return "dark-fantasy-art";
  if (/(luxury|premium|gold|exclusive|haute|fashion|vogue)/.test(t)) return "luxury-editorial";
  if (/(vibrant|colorful|neon|rainbow|iridescent|holographic|prismatic)/.test(t)) return "hyper-vibrant";
  if (/(anime|manga|cel.shad|japan|mech|kaiju)/.test(t)) return "anime-cinematic";
  if (/(cartoon|pixar|disney|animated|cute|toy|3d stylized)/.test(t)) return "modern-cartoon-3d";
  if (/(hack|security|terminal|matrix|cyber|monitor|threat)/.test(t)) return "cybersecurity-ui";
  if (/(brutalist|raw|bold|stark|expressive|unconventional)/.test(t)) return "neo-brutalist-ui";
  if (/(product|studio|commercial|clean|white background)/.test(t)) return "product-photography";
  if (/(youtube|viral|thumbnail|ctr|clickbait)/.test(t)) return "youtube-viral";

  return media.recommendedStyles[0] || "cinematic-realism";
}

import { getActiveLockedStyle, getCustomStyle } from "./style-library.js";

// ── Convert Visual DNA to Style Recipe ─────────────────────────────────────────

export function convertVisualDNAToStyleRecipe(dna) {
  if (!dna) return null;
  return {
    id: dna.id || "custom-dna",
    name: dna.name || "Visual DNA Style",
    family: "custom",
    category: "dna-extracted",
    description: dna.visualLanguage || "Extracted Visual DNA style",
    compatibleMedia: ["poster", "thumbnail", "keyart", "concept-art", "social", "ui-screen", "asset"],
    composition: `${dna.composition?.layout || "rule-of-thirds"}, ${dna.composition?.subjectPlacement || "focal anchor"}, ${dna.composition?.depth || "layered depth"}`,
    camera: `${dna.camera?.perspective || "eye-level"}, ${dna.camera?.angle || ""}, ${dna.camera?.lens || "35mm prime"}, ${dna.camera?.depthOfField || ""}`,
    lighting: `${dna.lighting?.type || "directional key light"}, ${dna.lighting?.direction || ""}, ${dna.lighting?.quality || "high contrast chiaroscuro"}, ${dna.lighting?.shadows || "deep shadows"}`,
    color: `Dominant: [${(dna.color?.dominant || []).join(", ")}], Accents: [${(dna.color?.accent || []).join(", ")}], ${dna.color?.contrast || ""}, ${dna.color?.saturation || ""}, ${dna.colorGrading || ""}`,
    texture: `${(dna.materials || []).join(", ")}, ${(dna.textures || []).join(", ")}`,
    mood: dna.mood || "narrative tension",
    negativeConstraints: dna.negativeConstraints || [
      "no generic AI glow",
      "no blurry artifacts",
      "no low resolution",
      "no plastic skin",
    ],
  };
}

// ── Style Resolver (Strict 6-Tier Priority) ───────────────────────────────────

export function resolveStyle({
  styleOverride,
  referenceDNA,
  skillStyle,
  prompt = "",
  context = "",
  mediaOverride,
}) {
  // Priority 1: Explicit built-in style registry ID or Custom Saved Style
  if (styleOverride) {
    if (STYLE_REGISTRY[styleOverride]) {
      const style = STYLE_REGISTRY[styleOverride];
      const media = mediaOverride && MEDIA_TYPES[mediaOverride]
        ? MEDIA_TYPES[mediaOverride]
        : MEDIA_TYPES[style.compatibleMedia[0]] || MEDIA_TYPES["keyart"];
      return { style, media, source: "explicit-builtin" };
    }

    const custom = getCustomStyle(styleOverride);
    if (custom) {
      const style = convertVisualDNAToStyleRecipe(custom);
      const media = mediaOverride && MEDIA_TYPES[mediaOverride]
        ? MEDIA_TYPES[mediaOverride]
        : MEDIA_TYPES["keyart"];
      return { style, media, source: "explicit-custom" };
    }

    // Priority 2: Legacy string override
    if (LEGACY_OVERRIDE_MAP[styleOverride]) {
      const { styleId, mediaId } = LEGACY_OVERRIDE_MAP[styleOverride];
      return {
        style: STYLE_REGISTRY[styleId],
        media: MEDIA_TYPES[mediaId],
        source: "legacy-override",
      };
    }
  }

  // Priority 3: Reference Visual DNA (e.g. Build From This Style) or Active Locked Style
  if (referenceDNA) {
    const style = convertVisualDNAToStyleRecipe(referenceDNA);
    const media = mediaOverride && MEDIA_TYPES[mediaOverride]
      ? MEDIA_TYPES[mediaOverride]
      : MEDIA_TYPES["keyart"];
    return { style, media, source: "reference-dna" };
  }

  const activeLock = getActiveLockedStyle();
  if (activeLock) {
    const style = convertVisualDNAToStyleRecipe(activeLock);
    const media = mediaOverride && MEDIA_TYPES[mediaOverride]
      ? MEDIA_TYPES[mediaOverride]
      : MEDIA_TYPES["keyart"];
    return { style, media, source: "active-lock" };
  }

  // Priority 4: Skill-specific style
  if (skillStyle && STYLE_REGISTRY[skillStyle]) {
    const style = STYLE_REGISTRY[skillStyle];
    const media = mediaOverride && MEDIA_TYPES[mediaOverride]
      ? MEDIA_TYPES[mediaOverride]
      : MEDIA_TYPES[style.compatibleMedia[0]] || MEDIA_TYPES["keyart"];
    return { style, media, source: "skill-style" };
  }

  // Priority 5 & 6: Auto-detect from prompt + context, or media default
  const combined = `${prompt} ${context}`;
  const mediaId = mediaOverride || detectMediaFromText(combined);
  const media = MEDIA_TYPES[mediaId] || MEDIA_TYPES["keyart"];
  const styleId = detectStyleFromText(combined, mediaId);
  return {
    style: STYLE_REGISTRY[styleId] || STYLE_REGISTRY["cinematic-realism"],
    media,
    source: "auto-detect",
  };
}

// ── Prompt Builder ─────────────────────────────────────────────────────────────

export function buildVisualPrompt({ subject, context, style, media, customInstructions }) {
  if (!style || !media) {
    return `${subject}${context ? `. Context: ${context}` : ""}`;
  }

  const narrative = context
    ? `Primary Subject / Concept: [${subject}]. Thematic Context: [${context}]`
    : subject;

  const parts = [
    `[STYLE: ${style.name}]`,
    narrative,
    `Composition: ${style.composition}`,
    style.camera ? `Camera: ${style.camera}` : null,
    `Lighting: ${style.lighting}`,
    `Color grading: ${style.color}`,
    `Mood: ${style.mood}`,
    style.texture ? `Surface quality: ${style.texture}` : null,
    `Output format: ${media.defaultAspect} aspect ratio, ${media.defaultSize.width}x${media.defaultSize.height}px`,
    customInstructions || null,
    `Technical quality: 8K ultra-high definition, masterwork render quality, studio production standard`,
    style.negativeConstraints && style.negativeConstraints.length
      ? `--no ${style.negativeConstraints.join(", --no ")}`
      : null,
  ].filter(Boolean).join(". ");

  return parts;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getStyleById(id) {
  return STYLE_REGISTRY[id] || null;
}

export function getMediaById(id) {
  return MEDIA_TYPES[id] || null;
}

export function listStyles() {
  return Object.values(STYLE_REGISTRY).map(s => ({
    id: s.id,
    name: s.name,
    family: s.family,
    category: s.category,
    description: s.description,
    compatibleMedia: s.compatibleMedia,
  }));
}

export function listStyleFamilies() {
  const families = {};
  for (const s of Object.values(STYLE_REGISTRY)) {
    if (!families[s.family]) families[s.family] = [];
    families[s.family].push({ id: s.id, name: s.name, description: s.description });
  }
  return families;
}

export function getCompatibleStyles(mediaId) {
  return Object.values(STYLE_REGISTRY)
    .filter(s => s.compatibleMedia.includes(mediaId))
    .map(s => ({ id: s.id, name: s.name, description: s.description }));
}
