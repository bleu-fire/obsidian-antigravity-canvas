import { execFile } from "child_process";
import { promisify } from "util";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { resolveStyle, buildVisualPrompt } from "./style-registry.js";

const execFileAsync = promisify(execFile);
const AGY_BIN  = process.env.AGY_BIN || "/home/bleufire/.gemini/bin/agy";
const CACHE_DIR = path.resolve(".cache");

// ── Cache ────────────────────────────────────────────────────────────────────

function hash(str) {
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 16);
}
function cacheGet(key) {
  try {
    const p = path.join(CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(p)) return null;
    const { ts, v } = JSON.parse(fs.readFileSync(p, "utf8"));
    if (Date.now() - ts > 86_400_000) { fs.unlinkSync(p); return null; }
    return v;
  } catch { return null; }
}
function cacheSet(key, v) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify({ ts: Date.now(), v }));
  } catch {}
}

// ── agy runner ───────────────────────────────────────────────────────────────

export async function runAgy(prompt, { timeout = 60_000, model, effort } = {}) {
  const args = ["--print", prompt, "--output-format", "text", "--dangerously-skip-permissions"];
  if (model)  args.push("--model",  model);
  if (effort) args.push("--effort", effort);

  const { stdout, stderr } = await execFileAsync(AGY_BIN, args, {
    timeout,
    env: { ...process.env },
    maxBuffer: 10 * 1024 * 1024,
  });
  if (stderr && !stdout) throw new Error(stderr.trim());
  return stdout.trim();
}

// ── generateText ─────────────────────────────────────────────────────────────

export async function generateText({ prompt, systemInstruction, model, effort, useCache = true }) {
  const key = hash(`text:${prompt}:${systemInstruction || ""}:${model || ""}`);
  if (useCache) { const c = cacheGet(key); if (c) return { text: c, cached: true }; }

  const full = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
  const text = await runAgy(full, { model, effort });
  if (useCache) cacheSet(key, text);
  return { text, cached: false };
}

// ── Canvas Context Director & Aesthetic Classifier ──────────────────────────

export function classifyIdeaAndStyle(prompt, context = "", styleOverride = null) {
  const combined = `${prompt} ${context}`.toLowerCase();

  // Explicit style overrides
  if (styleOverride) {
    if (styleOverride === "mobile_ui") return { aspectRatio: "9:16", width: 380, height: 680, styleType: "mobile_app_ui", label: "AGY Mobile UI 9:16" };
    if (styleOverride === "gaming") return { aspectRatio: "16:9", width: 560, height: 315, styleType: "gaming_keyart", label: "AGY Gaming Keyart 16:9" };
    if (styleOverride === "loot")   return { aspectRatio: "1:1", width: 360, height: 360, styleType: "gaming_macro_loot", label: "AGY Legendary Loot 1:1" };
    if (styleOverride === "cartoon") return { aspectRatio: "1:1", width: 360, height: 360, styleType: "cartoon_3d", label: "AGY 3D Cartoon" };
    if (styleOverride === "vibrant") return { aspectRatio: "16:9", width: 560, height: 315, styleType: "vibrant_chromatic", label: "AGY Vibrant 16:9" };
    if (styleOverride === "cinematic") return { aspectRatio: "16:9", width: 560, height: 315, styleType: "cinematic_dramatic", label: "AGY Cinematic 16:9" };
  }

  // 1. Mobile UI / App Screen Detection
  if (/(mobile|app|ui|ux|screen|dashboard|checkout|onboarding|feed|settings|profile|tabbar|ios|android)/i.test(combined)) {
    return {
      aspectRatio: "9:16",
      width: 380,
      height: 680,
      styleType: "mobile_app_ui",
      label: "AGY Mobile UI 9:16",
    };
  }

  // 2. Gaming Loot & Weapons (Macro 1:1)
  if (/(loot|weapon|sword|katana|blade|dagger|shield|staff|bow|armor|relic|potion|chest|crate)/i.test(combined)) {
    return {
      aspectRatio: "1:1",
      width: 360,
      height: 360,
      styleType: "gaming_macro_loot",
      label: "AGY Legendary Loot 1:1",
    };
  }

  // 3. Gaming Keyart / Boss / Esports (16:9)
  if (/(gaming|game|esports|boss|souls|elden|darksouls|raid|dungeon|fps|shooter|speedrun|minecraft|apex|valorant)/i.test(combined)) {
    return {
      aspectRatio: "16:9",
      width: 560,
      height: 315,
      styleType: "gaming_keyart",
      label: "AGY Gaming Keyart 16:9",
    };
  }

  // 4. 3D Cartoon / Pixar
  if (/(cartoon|cartoonic|pixar|disney|animated|stylized|anime|cute|toy|claymation|comic)/i.test(combined)) {
    const isPortrait = /(character|portrait|figure|hero|face|person)/i.test(combined);
    return {
      aspectRatio: isPortrait ? "3:4" : "1:1",
      width: isPortrait ? 330 : 360,
      height: isPortrait ? 440 : 360,
      styleType: "cartoon_3d",
      label: isPortrait ? "AGY 3D Stylized (3:4)" : "AGY 3D Stylized (1:1)",
    };
  }

  // 5. Hyper-Vibrant / Neon / Synthwave
  if (/(color|colorful|vibrant|neon|synthwave|cyberpunk|holographic|iridescent|rainbow|prismatic)/i.test(combined)) {
    return {
      aspectRatio: "16:9",
      width: 560,
      height: 315,
      styleType: "vibrant_chromatic",
      label: "AGY Vibrant 16:9",
    };
  }

  // 6. 3:4 Character / Portrait
  if (/(character|portrait|warrior|figure|person|face|statue|vertical|poster|model|cyborg|vampire)/i.test(combined)) {
    return {
      aspectRatio: "3:4",
      width: 330,
      height: 440,
      styleType: "portrait_3_4",
      label: "AGY Portrait 3:4",
    };
  }

  // 7. 1:1 Brand Mark / Hardware Object
  if (/(logo|icon|emblem|orb|cube|badge|mark|symbol|avatar|token|monogram|asset|crystal|apple|sphere)/i.test(combined)) {
    return {
      aspectRatio: "1:1",
      width: 360,
      height: 360,
      styleType: "object_1_1",
      label: "AGY Studio 1:1",
    };
  }

  // Default: Cinematic 16:9
  return {
    aspectRatio: "16:9",
    width: 560,
    height: 315,
    styleType: "cinematic_dramatic",
    label: "AGY Cinematic 16:9",
  };
}

export function enhancePrompt(prompt, context, styleType) {
  const narrative = context ? `Context & Theme: [${context}]. Primary Focal Card: [${prompt}]` : prompt;

  if (styleType === "mobile_app_ui") {
    return (
      `Award-winning modern mobile application UI/UX screen design of ${narrative}, 9:16 vertical composition. ` +
      `Platform: iOS / Android flagship application interface. ` +
      `Layout Structure: Clean top status bar and header with navigation actions, central hero card with high-priority metrics and interactive controls, ` +
      `refined content feed blocks, sticky modern bottom navigation dock with active pill indicator. ` +
      `Visual Language: Modern Dark Mode SaaS aesthetic with deep obsidian background (#0A0E1A), clean frosted glass cards (1px subtle border at 15% opacity), ` +
      `vibrant primary accent color (#6366F1), SF Pro readable typography, generous whitespace. ` +
      `Render: Dribbble and Behance top trending UI mockup, pristine 8k resolution, crisp vector-like edge sharpness, zero blur, zero deformed icons. ` +
      `--no cartoon, no photograph of phone frame, no hands holding device, no blurry text, no cluttered layout`
    );
  }

  if (styleType === "gaming_keyart") {
    return (
      `Unreal Engine 5 AAA gaming keyart and high-CTR thumbnail scene, 16:9 composition. ${narrative}. ` +
      `Dynamic cinematic battle staging, colossal scale contrast, volumetric particle effects, glowing sparks, ` +
      `intense electric neon and amber rim halo lighting isolating the silhouette, raytraced reflections on wet surfaces. ` +
      `Lumen global illumination, Nanite micro-geometry details, razor-sharp 8k render, masterpiece video game cover quality. ` +
      `--no flat vector, no muddy colors, no low resolution, no plastic textures, no blur`
    );
  }

  if (styleType === "gaming_macro_loot") {
    return (
      `Award-winning 8k macro studio render of legendary gaming loot: ${narrative}, 1:1 composition. ` +
      `Extreme close-up detailing folded Damascus steel grain, hand-carved luminous runes with liquid gold inlay, ` +
      `subtle internal azure plasma energy flowing through precision metal channels, micro-beveled chamfers catching specular studio highlights. ` +
      `Single 45-degree directional key light, sharp volumetric rim lighting against deep dark #080D1A background, Octane 8k render. ` +
      `--no cartoon, no flat vector, no plastic shine, no low-poly, no blurry artifacts`
    );
  }

  if (styleType === "cartoon_3d") {
    return (
      `Award-winning 3D stylized animation studio render of ${narrative}. ` +
      `Feature-film animation character and environment aesthetics (Pixar / Sony Animation / Fortiche Arcane quality). ` +
      `Rich subsurface scattering on tactile materials, expressive proportions, warm volumetric studio three-point lighting, ` +
      `colorful bounce light, soft ambient occlusion, Octane 8k render, crystal clean edges, whimsical depth. ` +
      `--no flat 2D, no low-poly, no muddy colors, no photographic grain, no deformed anatomy`
    );
  }

  if (styleType === "vibrant_chromatic") {
    return (
      `Visually stunning hyper-vibrant artistic render of ${narrative}. ` +
      `Intense dual-tone chromatic lighting, radiant volumetric neon glow, prismatic dispersion splitting into iridescent jewel tones, ` +
      `optical smoked glass and liquid chrome reflections against deep obsidian dark void (#050811), ` +
      `pristine 8k render, high-contrast saturation balance, vivid color harmony. ` +
      `--no dull colors, no washed out grey, no muddy palette, no blurry noise`
    );
  }

  if (styleType === "portrait_3_4") {
    return (
      `Authoritative high-fashion editorial portrait of ${narrative}, 3:4 vertical composition. ` +
      `Structured tactile materials with fine micro-textures, Rembrandt split lighting, ` +
      `crisp edge definition against deep neutral dark void (#080D1A), ` +
      `Phase One 100MP medium format, 85mm portrait lens, f/2.0, award-winning editorial quality. ` +
      `--no anime, no childish graphics, no deformed anatomy, no blur`
    );
  }

  if (styleType === "object_1_1") {
    return (
      `Award-winning luxury 3D industrial design render of ${narrative}, 1:1 composition. ` +
      `Beveled geometric construction, brushed aerospace titanium with dark gunmetal PBR finish and subtle internal glass refraction. ` +
      `Directional studio key light at 45 degrees, sharp volumetric rim lighting creating crisp edge definition. ` +
      `Clean dark neutral studio backdrop (#080D1A) with soft falloff, zero clutter, Hasselblad 8k studio render. ` +
      `--no cartoon, no flat vector, no cheap neon, no low-poly, no blurry artifacts`
    );
  }

  // cinematic_dramatic
  return (
    `Cinematic film still, 16:9 dramatic composition. ${narrative}. ` +
    `Masterful cinematography with extreme chiaroscuro contrast, razor-sharp asymmetric rim light cutting through volumetric haze and smoke. ` +
    `50mm anamorphic lens, deep natural shadow depth, desaturated cinematic grade with rich contrast, 8k photographic film plate, ` +
    `heavy narrative tension, atmospheric dust particles catching the spotlight. ` +
    `--no cartoon, no flat vector, no cheap neon, no blurry artifacts, no low resolution`
  );
}

// ── generateImage with Deep Visual Reasoning Protocol ───────────────────────

export async function generateImage({ prompt, context, styleOverride, mediaOverride, vaultPath, model }) {
  const { style, media } = resolveStyle({
    styleOverride,
    mediaOverride,
    prompt: prompt || "",
    context: context || "",
  });

  const width = media?.defaultSize?.width || 560;
  const height = media?.defaultSize?.height || 315;
  const aspectRatio = media?.defaultAspect || "16:9";
  const label = style ? `AGY: ${style.name}` : "AGY: Auto";
  const styleType = style ? style.id : "cinematic-realism";

  const key = hash(`img:${prompt}:${context || ""}:${styleType}:${vaultPath || ""}:${aspectRatio}`);
  const c = cacheGet(key);
  if (c) return { ...c, width, height, aspectRatio, label, cached: true };

  const absPath = vaultPath
    ? `/home/bleufire/Documents/Obsidian Vault/${vaultPath}`
    : `/home/bleufire/Documents/Obsidian Vault/assets/generated/img-${Date.now()}.png`;

  const relPath = vaultPath || `assets/generated/img-${Date.now()}.png`;

  const isUI = style.category === "interface" || media.id === "ui-screen" || media.id === "wireframe";

  const engineeredPrompt = buildVisualPrompt({
    subject: prompt,
    context: context || "",
    style,
    media,
    customInstructions: isUI
      ? "Render a crisp pixel-perfect UI interface mockup"
      : "Render a pure immersive cinematic/photographic visual scene. Absolutely NO text, NO watermarks, NO HUD overlays, NO graphic borders, NO metadata labels, NO logos.",
  });

  const negativeRules = isUI
    ? "no photographic background, no hands holding device, no blurry text"
    : "no text, no words, no letters, no logos, no watermarks, no UI frames, no HUD overlay, no borders, no metadata labels, no diagram boxes, no graphic badges, no signatures, no overlays";

  const finalPromptText = `${engineeredPrompt}, --no ${negativeRules}`;

  const instruction =
    `You are the Master Visual Art Director. ` +
    `Generate a studio-grade visual image asset for the following prompt:\n\n` +
    `Prompt: "${finalPromptText.replace(/"/g, "'")}"\n\n` +
    `MANDATORY COMPOSITION RULES:\n` +
    `- ${isUI ? "Render a clean, pixel-perfect UI interface mockup." : "Render a pure photographic / artistic scene WITHOUT any text, watermarks, HUD overlays, borders, metadata labels, or UI frames."}\n` +
    `- The scene must be a rich physical environment or subject, completely filling the ${aspectRatio} frame.\n\n` +
    `Call the generate_image tool with AspectRatio: "${aspectRatio}", ImageName: "canvas_art_${Date.now()}", and this prompt: "${finalPromptText.replace(/"/g, "'")}". ` +
    `After the image is generated, copy the resulting file to "${absPath}". ` +
    `Reply with ONLY a valid JSON object: {"savedPath": "${relPath}", "aspectRatio": "${aspectRatio}", "width": ${width}, "height": ${height}, "styleType": "${styleType}", "label": "${label}", "status": "ok"}`;

  const raw = await runAgy(instruction, { model, effort: "medium", timeout: 180_000 });
  let result;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    result = jsonMatch ? JSON.parse(jsonMatch[0]) : { savedPath: relPath, status: "ok" };
  } catch {
    result = { savedPath: relPath, status: "ok" };
  }

  const finalOutput = {
    ...result,
    width,
    height,
    aspectRatio,
    label,
    styleType,
    detectedStyle: style ? style.name : "Auto",
  };

  cacheSet(key, finalOutput);
  return { ...finalOutput, cached: false };
}

// ── generateMobileScreenWireframe ───────────────────────────────────────────

export async function generateMobileScreenWireframe({ nodeText, context }) {
  const key = hash(`mobile_wireframe:${nodeText}:${context || ""}`);
  const c = cacheGet(key);
  if (c) return { wireframe: c, cached: true };

  const prompt =
    `You are the UI/UX Design Master Architect adhering strictly to the ui-ux-design-master protocol. ` +
    `Screen Focus: "${nodeText}". ` +
    (context ? `App Product Context: "${context}". ` : "") +
    `Synthesize a complete, production-ready 9:16 mobile application screen architecture in clean Obsidian markdown. ` +
    `Format:\n` +
    `### Screen: [Screen Name] (Mobile 9:16)\n\n` +
    `**User Goal**: [1-sentence primary job-to-be-done]\n` +
    `**Target Platform**: iOS 18 / Material You Baseline (390 x 844 px)\n\n` +
    `#### Layout Structure:\n` +
    `- **Top App Bar**: [Navigation back button, screen title, profile / search action]\n` +
    `- **Hero Card**: [Primary KPI, balance, or focal action container with high contrast]\n` +
    `- **Content Blocks**: [2-3 grouped interactive items, list feeds, or input fields]\n` +
    `- **Bottom Navigation / CTA**: [Sticky primary button (height: 52px, full width) OR 5-tab dock]\n\n` +
    `#### Design Tokens Applied:\n` +
    `- **Style**: Modern Dark Mode SaaS\n` +
    `- **Colors**: Primary: \`#6366F1\` | Surface: \`#111827\` | Background: \`#0A0E1A\` | Border: \`rgba(255,255,255,0.08)\`\n` +
    `- **Typography**: Inter / SF Pro (Title: 24px Bold, Body: 15px Regular, Labels: 12px Medium)\n` +
    `- **Spacing Scale**: 8pt grid (16px screen padding, 12px item gap)\n\n` +
    `#### UX Edge Cases & Feedback:\n` +
    `- **Active State**: [Micro-interaction on tap, scale(0.98)]\n` +
    `- **Empty State**: [Helpful illustration and primary onboarding recovery action]\n` +
    `- **WCAG Accessibility**: 4.5:1 text contrast compliance verified\n\n` +
    `Return ONLY the markdown specification without preamble.`;

  const raw = await runAgy(prompt, { effort: "medium" });
  cacheSet(key, raw);
  return { wireframe: raw, cached: false };
}

// ── generateDesignSystemCard ────────────────────────────────────────────────

export async function generateDesignSystemCard({ nodeText, context }) {
  const key = hash(`design_system:${nodeText}:${context || ""}`);
  const c = cacheGet(key);
  if (c) return { system: c, cached: true };

  const prompt =
    `You are the Design System Architect following the ui-ux-design-master protocol. ` +
    `Product / Screen Context: "${nodeText}". ` +
    (context ? `Theme Context: "${context}". ` : "") +
    `Synthesize a complete atomic Design System specification card in clean markdown. ` +
    `Format:\n` +
    `### Design System: [Brand / Product Name]\n\n` +
    `#### 1. Color Palette (HEX):\n` +
    `- **Primary**: \`#6366F1\` (Brand Accent)\n` +
    `- **Background**: \`#090D16\` (Deep Canvas)\n` +
    `- **Surface**: \`#121826\` (Card Elevation)\n` +
    `- **Border**: \`rgba(255, 255, 255, 0.08)\` (Subtle Divider)\n` +
    `- **Text Primary**: \`#F8FAFC\` (High Contrast)\n` +
    `- **Text Muted**: \`#94A3B8\` (Secondary Labels)\n` +
    `- **Semantic**: Success \`#10B981\` | Warning \`#F59E0B\` | Error \`#EF4444\`\n\n` +
    `#### 2. Typography Hierarchy:\n` +
    `- **Display**: 32px / 1.2 line-height / Bold\n` +
    `- **Headings**: 22px / 1.3 line-height / SemiBold\n` +
    `- **Body Text**: 15px / 1.5 line-height / Regular\n` +
    `- **Micro Labels**: 12px / 1.0 line-height / Medium Uppercase (Letter-spacing: 0.05em)\n\n` +
    `#### 3. Core Component Library:\n` +
    `- **Primary Button**: Height 48px, radius 12px, full-width on mobile\n` +
    `- **Card Containers**: Radius 16px, 16px internal padding, 1px contrast stroke\n` +
    `- **Input Fields**: Height 48px, background surface, focus border 2px primary\n\n` +
    `Return ONLY the markdown content.`;

  const raw = await runAgy(prompt, { effort: "medium" });
  cacheSet(key, raw);
  return { system: raw, cached: false };
}

// ── generateWireframe from Context ──────────────────────────────────────────

export async function generateWireframe({ nodeText, context }) {
  const key = hash(`wireframe:${nodeText}:${context || ""}`);
  const c = cacheGet(key);
  if (c) return { wireframe: c, cached: true };

  const prompt =
    `You are the Canvas Wireframe Architect adhering to the thumbnail-architect, gaming-thumbnail-architect, and canvas-visual-reasoning protocols. ` +
    `Focal Node: "${nodeText}". ` +
    (context ? `Connected Canvas Story Context: "${context}". ` : "") +
    `Synthesize a structured 16:9 editorial wireframe card in clean Obsidian markdown. ` +
    `Structure: ` +
    `### Wireframe: [Concise 2-4 Word Concept Title]\n\n` +
    `**Headline Hook**: [Bold 2-4 word uppercase hook]\n` +
    `**Sub-headline**: [1-sentence context or value proposition]\n\n` +
    `#### Composition Specs (16:9)\n` +
    `- **Ratio**: 16:9 Widescreen (560x315 px)\n` +
    `- **Focal Anchor**: [Subject placement along the 60% golden ratio line]\n` +
    `- **Lighting & Contrast**: [Key light direction + asymmetric rim light]\n` +
    `- **Curiosity Tension**: [The unresolved visual conflict driving viewer attention]\n\n` +
    `> **Strategic Recommendation**: [Specific next card, visual asset, or dramatic angle recommended for the next connected node]\n\n` +
    `Return ONLY the markdown text. No surrounding meta-explanations.`;

  const raw = await runAgy(prompt, { effort: "medium" });
  cacheSet(key, raw);
  return { wireframe: raw, cached: false };
}

// ── expandWithRecommendation from Context ───────────────────────────────────

export async function expandWithRecommendation({ nodeText, context }) {
  const key = hash(`expand_rec:${nodeText}:${context || ""}`);
  const c = cacheGet(key);
  if (c) return { text: c, cached: true };

  const prompt =
    `You are the Canvas Context Strategic Advisor. ` +
    `Focal Node: "${nodeText}". ` +
    (context ? `Upstream Canvas Narrative: "${context}". ` : "") +
    `1. Expand this concept into 2 rich, analytical sentences that deepen the narrative or technical architecture. ` +
    `2. Add a clear, actionable recommendation for what card or asset should be created next based on this context. ` +
    `Format:\n` +
    `[2 analytical expansion sentences]\n\n` +
    `> **Context Recommendation**: [1-2 sentences recommending the optimal next card, visual asset, or connected angle to explore]\n\n` +
    `Return ONLY the content. No preamble.`;

  const raw = await runAgy(prompt, { effort: "medium" });
  cacheSet(key, raw);
  return { text: raw, cached: false };
}

// ── brainstormIdeas ──────────────────────────────────────────────────────────

export async function brainstormIdeas({ nodeText, context }) {
  const key = hash(`brainstorm:${nodeText}:${context || ""}`);
  const c = cacheGet(key); if (c) return { ideas: c, cached: true };

  const prompt =
    `Given this Obsidian Canvas node: "${nodeText}"` +
    (context ? `\nContext & Narrative: ${context}` : "") +
    `\n\nGenerate exactly 3 creative connected sub-ideas as a JSON array.` +
    ` Each has: title (short), description (1-2 sentences), color ("1" to "6").` +
    ` Return ONLY a valid JSON array, no markdown.`;

  const raw = await runAgy(prompt, { effort: "medium" });
  let ideas;
  try { ideas = JSON.parse((raw.match(/\[[\s\S]*\]/) || ["[]"])[0]); }
  catch { ideas = []; }
  cacheSet(key, ideas);
  return { ideas, cached: false };
}

// ── brainstormCreativeDirectorConcepts ──────────────────────────────────────

export async function brainstormCreativeDirectorConcepts({ nodeText, context }) {
  const key = hash(`brainstorm_director:${nodeText}:${context || ""}`);
  const c = cacheGet(key);
  if (c) return { ...c, cached: true };

  const prompt =
    `You are the Senior Creative Director, YouTube Thumbnail Strategist, and Visual Concept Developer.
` +
    `Focal Topic / Card: "${nodeText}"
` +
    (context ? `Upstream Canvas Narrative: "${context}"
` : "") +
    `
` +
    `Execute the BRAINSTORMING ENGINE - PROFESSIONAL CREATIVE DIRECTOR protocol:
` +
    `1. Extract subject, action, conflict, emotional angle, and curiosity gap.
` +
    `2. Think strictly visually: CONCEPT = SUBJECT + ACTION + VISUAL CONTRAST + STORY.
` +
    `3. Reject visual cliches (no generic laptop, pointing, generic arrows, shocked face).
` +
    `4. Convert abstract concepts into concrete physical visual scenes.
` +
    `5. Enforce strong visual tension and composition previews.
` +
    `6. Select 3 to 4 strongest, most differentiated visual concepts.
` +
    `7. Map each concept to one of the 16 thumbnail styles (Cinematic, YouTube Viral, Luxury, News, Gaming, AI/Tech, Educational, Documentary, Minimal, Sports, Business, Dark Mystery, Colorful, Photorealistic, Illustrated, 3D Futuristic).
` +
    `8. Provide the Recommended Creative Directions synthesis.

` +
    `Return ONLY a valid JSON object with the following structure (no markdown fences, no surrounding commentary):
` +
    `{
` +
    `  "concepts": [
` +
    `    {
` +
    `      "title": "Short descriptive name",
` +
    `      "approach": "Mechanism used (e.g. Transformation, Visual Metaphor, Conflict, Scale, Mystery, Emotion, Extreme Contrast)",
` +
    `      "coreIdea": "One clear sentence describing the visual concept.",
` +
    `      "visualHook": "The first thing the viewer notices.",
` +
    `      "secondaryHook": "The element that creates curiosity.",
` +
    `      "story": "What is happening in the image.",
` +
    `      "curiosityGap": "What remains unanswered.",
` +
    `      "emotion": "Primary emotional reaction.",
` +
    `      "composition": "Exact placement and hierarchy of the major elements.",
` +
    `      "styleDirection": "Style name and why it fits.",
` +
    `      "textDirection": "Optional 2-5 words text or empty string",
` +
    `      "color": "3"
` +
    `    }
` +
    `  ],
` +
    `  "recommendations": {
` +
    `    "emotional": "Concept reference and strategic rationale",
` +
    `    "mystery": "Concept reference and strategic rationale",
` +
    `    "transformation": "Concept reference and strategic rationale",
` +
    `    "metaphor": "Concept reference and strategic rationale",
` +
    `    "cinematic": "Concept reference and strategic rationale"
` +
    `  }
` +
    `}`;

  const raw = await runAgy(prompt, { effort: "high", timeout: 90_000 });
  let result;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (err) {
    result = {
      concepts: [
        {
          title: "Creative Director Concept",
          approach: "Visual Storytelling",
          coreIdea: nodeText,
          visualHook: "Dynamic visual contrast and focal hierarchy",
          secondaryHook: "Narrative tension",
          story: raw.slice(0, 300),
          curiosityGap: "The outcome of the visual conflict",
          emotion: "Curiosity and engagement",
          composition: "Foreground focal subject with depth layering",
          styleDirection: "Cinematic / YouTube Viral",
          textDirection: "",
          color: "3",
        },
      ],
      recommendations: {
        emotional: "Focus on human expression and stakes",
        mystery: "Withhold key resolution details",
        transformation: "Visual before vs after split",
        metaphor: "Physical manifestation of core idea",
        cinematic: "High-contrast anamorphic lighting and scale",
      },
    };
  }

  cacheSet(key, result);
  return { ...result, cached: false };
}
