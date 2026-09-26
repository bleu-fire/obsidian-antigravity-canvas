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

// ── generateImage with Strict Style Registry Fidelity ────────────────────────

export async function generateImage({
  prompt,
  context,
  styleOverride,
  mediaOverride,
  vaultPath,
  model,
}) {
  const { style, media } = resolveStyle({
    styleOverride,
    mediaOverride,
    prompt: prompt || "",
    context: context || "",
  });

  const width = media?.defaultSize ? media.defaultSize.width : 560;
  const height = media?.defaultSize ? media.defaultSize.height : 315;
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

  // Build high-fidelity visual prompt strictly aligned with the chosen style recipe
  const engineeredPrompt = buildVisualPrompt({
    subject: prompt,
    context: context || "",
    style,
    media,
  });

  // Strict visual direction instruction that guarantees zero UI/diagram leakage for artistic styles
  const isInterfaceStyle = style?.family === "ui-ux" || style?.family === "technical";
  const antiDiagramConstraint = isInterfaceStyle
    ? ""
    : "\nCRITICAL CONSTRAINT: Produce a pure artistic/photographic visual scene. Absolutely NO UI elements, NO frames, NO borders, NO tech boxes, NO color palettes, NO HUD overlay, NO metadata labels, NO text or lettering.";

  const instruction =
    `You are the Antigravity Master Art Director executing studio-grade image generation.\n` +
    `Selected Style: "${style.name}" (${style.family} / ${style.category})\n` +
    `Visual Specification & Prompt: ${engineeredPrompt}${antiDiagramConstraint}\n\n` +
    `Core Directive: Always render a concrete, physical visual scene with real subjects, characters, environment, and physical lighting. Never output abstract diagrams, perspective grids, or symbolic geometry.\n\n` +
    `Execute these steps:\n` +
    `1. Call the generate_image tool with AspectRatio: "${aspectRatio}", ImageName: "canvas_art_${Date.now()}", and the exact engineered prompt above.\n` +
    `2. After generation, copy the resulting file to "${absPath}".\n` +
    `3. Reply with ONLY a valid JSON object: {"savedPath": "${relPath}", "aspectRatio": "${aspectRatio}", "width": ${width}, "height": ${height}, "styleType": "${styleType}", "label": "${label}", "status": "ok"}`;

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

  const prompt = [
    `You are the Senior Creative Director, YouTube Thumbnail Strategist, and Visual Concept Developer.`,
    `Focal Topic / Card: "${nodeText}"`,
    context ? `Upstream Canvas Narrative: "${context}"` : "",
    ``,
    `Execute the BRAINSTORMING ENGINE - PROFESSIONAL CREATIVE DIRECTOR protocol:`,
    `1. Extract subject, action, conflict, emotional angle, and curiosity gap.`,
    `2. Think strictly visually: CONCEPT = SUBJECT + ACTION + VISUAL CONTRAST + STORY.`,
    `3. Reject visual cliches (no generic laptop, pointing, generic arrows, shocked face).`,
    `4. Convert abstract concepts into concrete physical visual scenes.`,
    `5. Enforce strong visual tension and composition previews.`,
    `6. Select 3 to 4 strongest, most differentiated visual concepts.`,
    `7. Map each concept to one of the 16 thumbnail styles (Cinematic, YouTube Viral, Luxury, News, Gaming, AI/Tech, Educational, Documentary, Minimal, Sports, Business, Dark Mystery, Colorful, Photorealistic, Illustrated, 3D Futuristic).`,
    `8. Provide the Recommended Creative Directions synthesis.`,
    ``,
    `Return ONLY a valid JSON object with the following structure (no markdown fences, no surrounding commentary):`,
    `{`,
    `  "concepts": [`,
    `    {`,
    `      "title": "Short descriptive name",`,
    `      "approach": "Mechanism used (e.g. Transformation, Visual Metaphor, Conflict, Scale, Mystery, Emotion, Extreme Contrast)",`,
    `      "coreIdea": "One clear sentence describing the visual concept.",`,
    `      "visualHook": "The first thing the viewer notices.",`,
    `      "secondaryHook": "The element that creates curiosity.",`,
    `      "story": "What is happening in the image.",`,
    `      "curiosityGap": "What remains unanswered.",`,
    `      "emotion": "Primary emotional reaction.",`,
    `      "composition": "Exact placement and hierarchy of the major elements.",`,
    `      "styleDirection": "Style name and why it fits.",`,
    `      "textDirection": "Optional 2-5 words text or empty string",`,
    `      "color": "3"`,
    `    }`,
    `  ],`,
    `  "recommendations": {`,
    `    "emotional": "Concept reference and strategic rationale",`,
    `    "mystery": "Concept reference and strategic rationale",`,
    `    "transformation": "Concept reference and strategic rationale",`,
    `    "metaphor": "Concept reference and strategic rationale",`,
    `    "cinematic": "Concept reference and strategic rationale"`,
    `  }`,
    `}`,
  ].filter(Boolean).join("\n");

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
