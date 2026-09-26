import {
  SKILL_DEFINITIONS,
  executeCognitiveSkill,
  routeIntent
} from "./skills-engine.js";
import {
  listStyles,
  listStyleFamilies,
  getCompatibleStyles,
  resolveStyle,
} from "./style-registry.js";
import { validateSkillResult } from "./canvas-validator.js";
import {
  buildContextPackage,
  checkContextSufficiency,
  CONTEXT_LEVELS,
  SKILL_CONTEXT_REQUIREMENTS
} from "./context-engine.js";
import {
  generateVisualBrainstorm,
  refineVisualConcept,
  CREATIVE_DIMENSIONS,
} from "./visual-brainstorm-engine.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { execFileSync } from "child_process";
import {
  generateText,
  generateImage,
  generateWireframe,
  expandWithRecommendation,
  generateMobileScreenWireframe,
  generateDesignSystemCard,
  brainstormCreativeDirectorConcepts
} from "./antigravity.js";
import { enqueue, getStats } from "./queue.js";


const app  = express();
const PORT = process.env.PORT || 3099;
const AGY  = process.env.AGY_BIN || "/home/bleufire/.gemini/bin/agy";

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString().slice(11,19)}] ${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => {
  let agyOk = false;
  try { execFileSync(AGY, ["--help"], { timeout: 3000, stdio: "pipe" }); agyOk = true; } catch {}
  res.json({ status: "ok", version: "2.8.0", backend: "antigravity-agy", agyOk, queue: getStats() });
});

app.post("/generate-text", async (req, res) => {
  const { prompt, systemInstruction, model, effort, useCache } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  try {
    const r = await enqueue(() => generateText({ prompt, systemInstruction, model, effort, useCache }));
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/generate-image", async (req, res) => {
  const { prompt, context, styleOverride, vaultPath, model } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });
  try {
    const r = await enqueue(() => generateImage({ prompt, context, styleOverride, vaultPath, model }));
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/canvas-brainstorm-director", async (req, res) => {
  const { nodeText, context } = req.body;
  if (!nodeText) return res.status(400).json({ error: "nodeText required" });
  try {
    const r = await enqueue(() => brainstormCreativeDirectorConcepts({ nodeText, context }));
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/canvas-visual-brainstorm/dimensions", (_req, res) => {
  res.json({ ok: true, dimensions: CREATIVE_DIMENSIONS });
});

app.post("/canvas-visual-brainstorm", async (req, res) => {
  const { nodeText, context, styleOverride, mediaOverride, userPrompt, vaultNotes } = req.body;
  try {
    const r = await enqueue(() => generateVisualBrainstorm({
      nodeText,
      context,
      styleOverride,
      mediaOverride,
      userPrompt,
      vaultNotes,
    }));
    res.json(r);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/canvas-visual-brainstorm/refine", async (req, res) => {
  const {
    baseConcept,
    refinementInstructions,
    styleOverride,
    lightingOverride,
    compositionOverride,
    environmentOverride,
  } = req.body;
  if (!baseConcept) return res.status(400).json({ error: "baseConcept required" });
  try {
    const r = await enqueue(() => refineVisualConcept({
      baseConcept,
      refinementInstructions,
      styleOverride,
      lightingOverride,
      compositionOverride,
      environmentOverride,
    }));
    res.json(r);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/canvas-brainstorm", async (req, res) => {
  const { nodeText, context } = req.body;
  if (!nodeText) return res.status(400).json({ error: "nodeText required" });
  try {
    const r = await enqueue(() => brainstormIdeas({ nodeText, context }));
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/canvas-wireframe", async (req, res) => {
  const { nodeText, context } = req.body;
  if (!nodeText) return res.status(400).json({ error: "nodeText required" });
  try {
    const r = await enqueue(() => generateWireframe({ nodeText, context }));
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/canvas-mobile-ui", async (req, res) => {
  const { nodeText, context } = req.body;
  if (!nodeText) return res.status(400).json({ error: "nodeText required" });
  try {
    const r = await enqueue(() => generateMobileScreenWireframe({ nodeText, context }));
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/canvas-design-system", async (req, res) => {
  const { nodeText, context } = req.body;
  if (!nodeText) return res.status(400).json({ error: "nodeText required" });
  try {
    const r = await enqueue(() => generateDesignSystemCard({ nodeText, context }));
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/canvas-expand-recommend", async (req, res) => {
  const { nodeText, context } = req.body;
  if (!nodeText) return res.status(400).json({ error: "nodeText required" });
  try {
    const r = await enqueue(() => expandWithRecommendation({ nodeText, context }));
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/cognitive-skills", (_req, res) => {
  res.json({ ok: true, skills: SKILL_DEFINITIONS });
});

app.post("/cognitive-skill", async (req, res) => {
  const { skillId, nodeText, context, canvasSummary, existingNodes, userPrompt, vaultNotes } = req.body;
  if (!skillId) return res.status(400).json({ error: "skillId required" });
  try {
    const raw = await enqueue(() => executeCognitiveSkill({
      skillId,
      nodeText,
      context,
      canvasSummary,
      existingNodes,
      userPrompt,
      vaultNotes
    }));

    // Validate and normalize output before sending to Canvas
    const { valid, result, errors } = validateSkillResult(raw, existingNodes || []);
    if (!valid) {
      console.warn(`[cognitive-skill] Validation failed for ${skillId}:`, errors);
    }

    res.json({
      ...raw,
      ...(valid ? result : {}),
      validationErrors: errors.length ? errors : undefined,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/route-intent", (req, res) => {
  const { userPrompt, context } = req.body;
  const result = routeIntent({ userPrompt, context });
  res.json({ ok: true, ...result });
});

// ── Style System Endpoints ────────────────────────────────────────────────────

app.get("/styles", (_req, res) => {
  res.json({ ok: true, styles: listStyles(), families: listStyleFamilies() });
});

app.get("/styles/families", (_req, res) => {
  res.json({ ok: true, families: listStyleFamilies() });
});

app.get("/styles/compatible/:mediaId", (req, res) => {
  const { mediaId } = req.params;
  res.json({ ok: true, mediaId, styles: getCompatibleStyles(mediaId) });
});

app.post("/styles/resolve", (req, res) => {
  const { styleOverride, mediaOverride, prompt, context } = req.body;
  const { style, media } = resolveStyle({ styleOverride, mediaOverride, prompt, context });
  res.json({
    ok: true,
    styleId: style?.id || null,
    styleName: style?.name || null,
    mediaId: media?.id || null,
    mediaName: media?.name || null,
    aspectRatio: media?.defaultAspect || "16:9",
    dimensions: media?.defaultSize || { width: 560, height: 315 },
  });
});

// ── Context Intelligence Endpoints ──────────────────────────────────────────

app.get("/context/levels", (_req, res) => {
  res.json({
    ok: true,
    levels: CONTEXT_LEVELS,
    skillRequirements: SKILL_CONTEXT_REQUIREMENTS,
    CONTEXT_LEVELS,
    SKILL_CONTEXT_REQUIREMENTS,
  });
});

app.post("/context/package", (req, res) => {
  const {
    skillId,
    nodeText,
    canvasData,
    focalNode,
    vaultNotes,
    userPrompt,
    contextLevel,
    visualIntent,
  } = req.body;
  try {
    const pkg = buildContextPackage({
      skillId,
      nodeText,
      canvasData,
      focalNode,
      vaultNotes,
      userPrompt,
      contextLevel,
      visualIntent,
    });
    res.json({ ok: true, package: pkg });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/context/audit", (req, res) => {
  const {
    skillId,
    nodeText,
    canvasSummary,
    existingNodes,
    vaultNotes,
    contextLevel,
  } = req.body;
  try {
    const audit = checkContextSufficiency({
      skillId,
      nodeText,
      canvasSummary,
      existingNodes,
      vaultNotes,
      contextLevel,
    });
    res.json({ ok: true, audit });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/stats", (_req, res) => res.json(getStats()));

app.listen(PORT, "127.0.0.1", () => {
  console.log("Antigravity Bridge v2.8.0 — http://127.0.0.1:" + PORT);
});

