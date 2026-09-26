import { execFile } from "child_process";
import { promisify } from "util";
import crypto from "crypto";
import fs from "fs";
import path from "path";

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
    if (styleOverride === "gaming") return { aspectRatio: "16:9", width: 560, height: 315, styleType: "gaming_keyart", label: "AGY Gaming Keyart 16:9" };
    if (styleOverride === "loot")   return { aspectRatio: "1:1", width: 360, height: 360, styleType: "gaming_macro_loot", label: "AGY Legendary Loot 1:1" };
    if (styleOverride === "cartoon") return { aspectRatio: "1:1", width: 360, height: 360, styleType: "cartoon_3d", label: "AGY 3D Cartoon" };
    if (styleOverride === "vibrant") return { aspectRatio: "16:9", width: 560, height: 315, styleType: "vibrant_chromatic", label: "AGY Vibrant 16:9" };
    if (styleOverride === "cinematic") return { aspectRatio: "16:9", width: 560, height: 315, styleType: "cinematic_dramatic", label: "AGY Cinematic 16:9" };
  }

  // 1. Gaming Loot & Weapons (Macro 1:1)
  if (/(loot|weapon|sword|katana|blade|dagger|shield|staff|bow|armor|relic|potion|chest|crate)/i.test(combined)) {
    return {
      aspectRatio: "1:1",
      width: 360,
      height: 360,
      styleType: "gaming_macro_loot",
      label: "AGY Legendary Loot 1:1",
    };
  }

  // 2. Gaming Keyart / Boss / Esports / Streamer Thumbnails (16:9)
  if (/(gaming|game|esports|boss|souls|elden|darksouls|raid|dungeon|fps|shooter|speedrun|minecraft|apex|valorant)/i.test(combined)) {
    return {
      aspectRatio: "16:9",
      width: 560,
      height: 315,
      styleType: "gaming_keyart",
      label: "AGY Gaming Keyart 16:9",
    };
  }

  // 3. 3D Cartoon / Pixar
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

  // 4. Hyper-Vibrant / Neon / Synthwave
  if (/(color|colorful|vibrant|neon|synthwave|cyberpunk|holographic|iridescent|rainbow|prismatic)/i.test(combined)) {
    return {
      aspectRatio: "16:9",
      width: 560,
      height: 315,
      styleType: "vibrant_chromatic",
      label: "AGY Vibrant 16:9",
    };
  }

  // 5. 3:4 Character / Portrait
  if (/(character|portrait|warrior|figure|person|face|statue|vertical|poster|model|cyborg|vampire)/i.test(combined)) {
    return {
      aspectRatio: "3:4",
      width: 330,
      height: 440,
      styleType: "portrait_3_4",
      label: "AGY Portrait 3:4",
    };
  }

  // 6. 1:1 Brand Mark / Hardware Object
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

export async function generateImage({ prompt, context, styleOverride, vaultPath, model }) {
  const { aspectRatio, width, height, styleType, label } = classifyIdeaAndStyle(prompt, context, styleOverride);

  const key = hash(`img:${prompt}:${context || ""}:${styleType}:${vaultPath || ""}:${aspectRatio}`);
  const c = cacheGet(key);
  if (c) return { ...c, width, height, aspectRatio, label, cached: true };

  const absPath = vaultPath
    ? `/home/bleufire/Documents/Obsidian Vault/${vaultPath}`
    : `/home/bleufire/Documents/Obsidian Vault/assets/generated/img-${Date.now()}.png`;

  const relPath = vaultPath || `assets/generated/img-${Date.now()}.png`;

  const instruction =
    `You are the Canvas Visual Reasoning & Context Engine adhering strictly to the canvas-visual-reasoning and gaming-visual-engine skill protocols. ` +
    `Focal Concept Card: "${prompt}". ` +
    (context ? `Upstream Graph Context & Storyline Lineage: "${context}". ` : "") +
    `Selected Aesthetic Profile: "${styleType}" (Target Aspect Ratio: "${aspectRatio}"). ` +
    `Execute the 5-Stage Cognitive Reasoning Loop: ` +
    `1. Deconstruct the narrative tension and relationship between the upstream context and the node. ` +
    `2. Formulate a bold visual metaphor with exact PBR material physics (brushed titanium, optical smoked glass, damascus steel, volumetric particles). ` +
    `3. Establish realistic optical staging (45-degree primary key light, sharp volumetric rim light, camera lens optics). ` +
    `4. Compose the scene with 60% negative space and golden-ratio ocular hierarchy. ` +
    `5. Strip out cheap AI tropes and clichés (--no cartoon unless requested, no flat vector, no cheap neon, no blurry artifacts). ` +
    `Now, call the generate_image tool with AspectRatio: "${aspectRatio}", ImageName: "canvas_art_${Date.now()}", and your deeply reasoned studio-grade prompt. ` +
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
  };

  cacheSet(key, finalOutput);
  return { ...finalOutput, cached: false };
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
    `> 💡 **Strategic Recommendation**: [Specific next card, visual asset, or dramatic angle recommended for the next connected node]\n\n` +
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
    `> 💡 **Context Recommendation**: [1-2 sentences recommending the optimal next card, visual asset, or connected angle to explore]\n\n` +
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
