import {
  SKILL_DEFINITIONS,
  executeCognitiveSkill,
  routeIntent,
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
  SKILL_CONTEXT_REQUIREMENTS,
} from "./context-engine.js";
import {
  generateVisualBrainstorm,
  refineVisualConcept,
  CREATIVE_DIMENSIONS,
} from "./visual-brainstorm-engine.js";
import {
  extractVisualDNA,
  buildVisualPromptFromDNA,
  generateVariationsFromDNA,
  continueSeriesFromDNA,
  normalizeVisualDNA,
} from "./visual-dna-analyzer.js";
import {
  listCustomStyles,
  getCustomStyle,
  saveCustomStyle,
  deleteCustomStyle,
  getActiveLockedStyle,
  setActiveLockedStyle,
  clearActiveLockedStyle,
} from "./style-library.js";
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
  brainstormCreativeDirectorConcepts,
} from "./antigravity.js";
import { enqueue, getStats } from "./queue.js";

const app  = express();
const PORT = process.env.PORT || 3099;
const AGY  = process.env.AGY_BIN || "/home/bleufire/.gemini/bin/agy";

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString().slice(11, 19)}] ${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => {
  let agyOk = false;
  try { execFileSync(AGY, ["--help"], { timeout: 3000, stdio: "pipe" }); agyOk = true; } catch {}
  res.json({ status: "ok", version: "2.9.0", backend: "antigravity-agy", agyOk, queue: getStats() });
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

// ── Visual Brainstorming Endpoints ──────────────────────────────────────────

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

// ── Visual DNA / Build From This Style Endpoints ───────────────────────────

app.post("/visual-dna/extract", async (req, res) => {
  const { imagePath, imageDescription, context } = req.body;
  try {
    const result = await enqueue(() => extractVisualDNA({ imagePath, imageDescription, context }));
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/visual-dna/build", async (req, res) => {
  const {
    imagePath,
    visualDNA: rawDNA,
    newSubject,
    styleOverride,
    mediaOverride,
    customInstructions,
    vaultPath,
    model,
  } = req.body;

  if (!newSubject?.trim()) {
    return res.status(400).json({ ok: false, error: "newSubject is required" });
  }

  try {
    let dna = rawDNA;
    if (!dna && imagePath) {
      const extracted = await enqueue(() => extractVisualDNA({ imagePath }));
      dna = extracted.visualDNA;
    }
    if (!dna) {
      dna = getActiveLockedStyle();
    }

    const { imagePrompt, qualityGate, style, media, content, styleProfile } = buildVisualPromptFromDNA({
      newSubject,
      visualDNA: dna,
      styleOverride,
      mediaType: mediaOverride || "keyart",
      customInstructions,
    });

    const genResult = await enqueue(() => generateImage({
      prompt: imagePrompt,
      context: customInstructions,
      styleOverride: styleOverride || style.id,
      vaultPath,
      model,
    }));

    res.json({
      ok: true,
      imagePrompt,
      qualityGate,
      visualDNA: styleProfile,
      style,
      media,
      content,
      ...genResult,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/visual-dna/series", async (req, res) => {
  const {
    imagePath,
    visualDNA: rawDNA,
    seriesName,
    nextSceneFocus,
    currentSeriesCount,
    mediaType,
    vaultPath,
    model,
  } = req.body;

  try {
    let dna = rawDNA;
    if (!dna && imagePath) {
      const extracted = await enqueue(() => extractVisualDNA({ imagePath }));
      dna = extracted.visualDNA;
    }
    if (!dna) {
      dna = getActiveLockedStyle();
    }

    const seriesResult = continueSeriesFromDNA({
      visualDNA: dna,
      seriesName: seriesName || "Visual Series",
      nextSceneFocus: nextSceneFocus || "",
      currentSeriesCount: currentSeriesCount || 1,
      mediaType: mediaType || "keyart",
    });

    const genResult = await enqueue(() => generateImage({
      prompt: seriesResult.imagePrompt,
      vaultPath,
      model,
    }));

    res.json({
      ok: true,
      ...seriesResult,
      ...genResult,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/visual-dna/variations", async (req, res) => {
  const {
    imagePath,
    visualDNA: rawDNA,
    subject,
    count = 3,
    mediaType = "keyart",
  } = req.body;

  try {
    let dna = rawDNA;
    if (!dna && imagePath) {
      const extracted = await enqueue(() => extractVisualDNA({ imagePath }));
      dna = extracted.visualDNA;
    }
    if (!dna) {
      dna = getActiveLockedStyle();
    }

    const result = generateVariationsFromDNA({
      visualDNA: dna,
      subject,
      count,
      mediaType,
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/visual-dna/styles", (_req, res) => {
  res.json({ ok: true, styles: listCustomStyles() });
});

app.post("/visual-dna/styles", (req, res) => {
  const { visualDNA, customName } = req.body;
  if (!visualDNA) return res.status(400).json({ ok: false, error: "visualDNA required" });
  try {
    const saved = saveCustomStyle(visualDNA, customName);
    res.json({ ok: true, style: saved });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.delete("/visual-dna/styles/:id", (req, res) => {
  const success = deleteCustomStyle(req.params.id);
  res.json({ ok: success });
});

app.get("/visual-dna/lock", (_req, res) => {
  const locked = getActiveLockedStyle();
  res.json({ ok: true, locked: !!locked, style: locked });
});

app.post("/visual-dna/lock", (req, res) => {
  const { visualDNA, lock } = req.body;
  if (lock === false) {
    clearActiveLockedStyle();
    return res.json({ ok: true, locked: false, style: null });
  }
  if (!visualDNA) {
    return res.status(400).json({ ok: false, error: "visualDNA required to lock" });
  }
  const lockedStyle = setActiveLockedStyle(visualDNA);
  res.json({ ok: true, locked: true, style: lockedStyle });
});

// ── Studio Legacy Endpoints ──────────────────────────────────────────────────

app.post("/canvas-brainstorm-director", async (req, res) => {
  const { nodeText, context } = req.body;
  if (!nodeText) return res.status(400).json({ error: "nodeText required" });
  try {
    const r = await enqueue(() => brainstormCreativeDirectorConcepts({ nodeText, context }));
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
  const { styleOverride, referenceDNA, skillStyle, mediaOverride, prompt, context } = req.body;
  const { style, media, source } = resolveStyle({
    styleOverride,
    referenceDNA,
    skillStyle,
    mediaOverride,
    prompt,
    context,
  });
  res.json({
    ok: true,
    styleId: style?.id || null,
    styleName: style?.name || null,
    mediaId: media?.id || null,
    mediaName: media?.name || null,
    aspectRatio: media?.defaultAspect || "16:9",
    dimensions: media?.defaultSize || { width: 560, height: 315 },
    source,
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
  console.log("Antigravity Bridge v2.9.0 — http://127.0.0.1:" + PORT);
});
