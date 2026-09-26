/*
 * Antigravity Canvas Plugin v2.2
 * Canvas Visual Artisan Engine
 * Dynamically sizes image cards (16:9, 1:1, 3:4) with zero-collision coordinates
 */

const { Plugin, Notice } = require("obsidian");

const BRIDGE = "http://127.0.0.1:3099";
const POLL   = 5000;

class AntigravityCanvasPlugin extends Plugin {
  online    = false;
  statusEl  = null;
  pollTimer = null;

  async onload() {
    this.statusEl = this.addStatusBarItem();
    this.setStatus(false);

    this.addRibbonIcon("cpu", "Antigravity Canvas", () => this.showStatus());

    this.addCommand({ id: "agy-brainstorm",     name: "AGY: Brainstorm 3 ideas",      callback: () => this.cmdBrainstorm() });
    this.addCommand({ id: "agy-generate-image", name: "AGY: Generate image for node", callback: () => this.cmdImage() });
    this.addCommand({ id: "agy-expand",         name: "AGY: Expand node text",        callback: () => this.cmdExpand() });

    this.registerEvent(
      this.app.workspace.on("canvas:node-menu", (menu, node) => {
        menu.addSeparator();
        menu.addItem(i => i.setTitle("AGY  Brainstorm 3 ideas").setIcon("lightbulb").onClick(() => this.brainstorm(node)));
        menu.addItem(i => i.setTitle("AGY  Generate image (Artisan 8K)").setIcon("image").onClick(() => this.genImage(node)));
        menu.addItem(i => i.setTitle("AGY  Expand text").setIcon("pencil").onClick(() => this.expand(node)));
      })
    );

    this.checkBridge();
    this.pollTimer = setInterval(() => this.checkBridge(), POLL);
  }

  onunload() { clearInterval(this.pollTimer); }

  // ── Bridge ────────────────────────────────────────────────────────────────

  async checkBridge() {
    try {
      const r = await fetch(`${BRIDGE}/health`, { signal: AbortSignal.timeout(3000) });
      const d = await r.json();
      this.online = d.status === "ok";
    } catch { this.online = false; }
    this.setStatus(this.online);
  }

  setStatus(on) {
    if (!this.statusEl) return;
    this.statusEl.setText(on ? "AGY ready" : "AGY offline");
    this.statusEl.style.color = on ? "#50fa7b" : "#ff5555";
  }

  async post(endpoint, body, ms = 90000) {
    const r = await fetch(`${BRIDGE}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ms),
    });
    return r.json();
  }

  // ── Canvas file helpers ───────────────────────────────────────────────────

  getCanvasFile() {
    const leaf = this.app.workspace.activeLeaf;
    const view = leaf?.view;
    if (!view || view.getViewType() !== "canvas") return null;
    return view.file;
  }

  async readCanvas(file) {
    const raw = await this.app.vault.read(file);
    const data = JSON.parse(raw);
    data.nodes = data.nodes || [];
    data.edges = data.edges || [];
    return data;
  }

  async writeCanvas(file, data) {
    await this.app.vault.modify(file, JSON.stringify(data, null, "\t"));
    const leaf = this.app.workspace.activeLeaf;
    if (leaf?.view?.load) leaf.view.load();
  }

  uid() { return Math.random().toString(36).slice(2, 14); }

  // ── Actions ───────────────────────────────────────────────────────────────

  async brainstorm(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const n = this.say("AGY brainstorming...", 0);
    try {
      const resp = await this.post("canvas-brainstorm", { nodeText: text.trim() });
      n.hide();
      if (!resp.ok || !resp.ideas?.length) return this.say("No ideas returned.");

      const data  = await this.readCanvas(file);
      const px    = node.x ?? 0;
      const py    = node.y ?? 0;
      const pw    = node.width ?? 250;
      const count = resp.ideas.length;

      const newNodes = resp.ideas.map((idea, i) => ({
        id:     this.uid(),
        type:   "text",
        text:   `### ${idea.title}\n${idea.description}`,
        x:      px + pw + 120,
        y:      py + i * 220 - ((count - 1) * 220) / 2,
        width:  320,
        height: 150,
        color:  idea.color || "1",
      }));

      const newEdges = newNodes.map(nn => ({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "right",
        toNode:   nn.id,
        toSide:   "left",
        label:    "AGY",
      }));

      data.nodes.push(...newNodes);
      data.edges.push(...newEdges);
      await this.writeCanvas(file, data);
      this.say(`${count} ideas added!${resp.cached ? " (cached)" : ""}`);
    } catch (e) { n.hide(); this.say(`Error: ${e.message}`); }
  }

  async genImage(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const slug      = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    const vaultPath = `assets/generated/${slug}-${Date.now()}.png`;
    const n         = this.say("AGY generating Artisan image...", 0);

    try {
      const resp = await this.post("generate-image", { prompt: text.trim(), vaultPath }, 180000);
      n.hide();
      if (!resp.ok) return this.say(`Error: ${resp.error}`);

      const savedPath = resp.savedPath || vaultPath;
      const cardWidth = resp.width || 560;
      const cardHeight = resp.height || 315;
      const ratioLabel = resp.aspectRatio ? `AGY ${resp.aspectRatio}` : "AGY visual";

      const data = await this.readCanvas(file);

      // Centered vertical math
      const nodeX = node.x ?? 0;
      const nodeY = node.y ?? 0;
      const nodeW = node.width ?? 250;
      const nodeH = node.height ?? 60;

      const imgNode = {
        id:     this.uid(),
        type:   "file",
        file:   savedPath,
        x:      nodeX + nodeW + 80,
        y:      nodeY + (nodeH - cardHeight) / 2,
        width:  cardWidth,
        height: cardHeight,
      };

      data.nodes.push(imgNode);
      data.edges.push({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "right",
        toNode:   imgNode.id,
        toSide:   "left",
        label:    ratioLabel,
      });

      await this.writeCanvas(file, data);
      this.say(`Image rendered (${resp.aspectRatio || "16:9"} - ${cardWidth}x${cardHeight})!`);
    } catch (e) { n.hide(); this.say(`Error: ${e.message}`); }
  }

  async expand(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const n = this.say("AGY expanding...", 0);
    try {
      const resp = await this.post("generate-text", {
        prompt: `Expand this Obsidian canvas node into 3 rich sentences: "${text.trim()}"`,
        effort: "medium",
      });
      n.hide();
      if (!resp.ok) return this.say(`Error: ${resp.error}`);

      const data    = await this.readCanvas(file);
      const textNode = {
        id:     this.uid(),
        type:   "text",
        text:   resp.text,
        x:      node.x ?? 0,
        y:      (node.y ?? 0) + (node.height ?? 60) + 80,
        width:  node.width ?? 320,
        height: 180,
        color:  "5",
      };

      data.nodes.push(textNode);
      data.edges.push({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "bottom",
        toNode:   textNode.id,
        toSide:   "top",
        label:    "AGY",
      });

      await this.writeCanvas(file, data);
      this.say("Expansion added!");
    } catch (e) { n.hide(); this.say(`Error: ${e.message}`); }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  say(msg, dur = 4000) { return new Notice(msg, dur); }

  guard() {
    if (!this.online) {
      this.say("Bridge offline. Run: bash ~/.gemini/antigravity/scratch/antigravity-bridge/start.sh", 8000);
      return false;
    }
    return true;
  }

  async showStatus() {
    try {
      const r = await fetch(`${BRIDGE}/health`, { signal: AbortSignal.timeout(3000) });
      const d = await r.json();
      this.say(`AGY Bridge v${d.version} — backend: ${d.backend}\nQueue: ${d.queue?.completed} done / ${d.queue?.errors} errors`);
    } catch { this.say("Bridge offline."); }
  }

  getSelectedNode() {
    const leaf = this.app.workspace.activeLeaf;
    const view = leaf?.view;
    if (!view || view.getViewType() !== "canvas") { this.say("Open a canvas file."); return null; }
    const sel = [...(view.canvas?.selection || [])];
    if (!sel.length) { this.say("Select a node first."); return null; }
    return sel[0];
  }

  cmdBrainstorm() { const n = this.getSelectedNode(); if (n) this.brainstorm(n); }
  cmdImage()      { const n = this.getSelectedNode(); if (n) this.genImage(n); }
  cmdExpand()     { const n = this.getSelectedNode(); if (n) this.expand(n); }
}

module.exports = AntigravityCanvasPlugin;
