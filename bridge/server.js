import "dotenv/config";
import express from "express";
import cors from "cors";
import { execFileSync } from "child_process";
import {
  generateText,
  generateImage,
  brainstormIdeas,
  generateWireframe,
  expandWithRecommendation
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
  res.json({ status: "ok", version: "2.4.0", backend: "antigravity-agy", agyOk, queue: getStats() });
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

app.post("/canvas-expand-recommend", async (req, res) => {
  const { nodeText, context } = req.body;
  if (!nodeText) return res.status(400).json({ error: "nodeText required" });
  try {
    const r = await enqueue(() => expandWithRecommendation({ nodeText, context }));
    res.json({ ok: true, ...r });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/stats", (_req, res) => res.json(getStats()));

app.listen(PORT, "127.0.0.1", () => {
  console.log("Antigravity Bridge v2.4.0 — http://127.0.0.1:" + PORT);
});
