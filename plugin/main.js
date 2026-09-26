/*
 * Antigravity Canvas Plugin v2.5
 * Canvas Context Director, Gaming Visual Engine & 16:9 Wireframe Architect
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

    this.addCommand({ id: "agy-brainstorm",     name: "AGY: Brainstorm 3 ideas",                 callback: () => this.cmdBrainstorm() });
    this.addCommand({ id: "agy-wireframe",      name: "AGY: Create 16:9 Wireframe Card",         callback: () => this.cmdWireframe() });
    this.addCommand({ id: "agy-expand-rec",     name: "AGY: Expand with Strategic Recommendation",callback: () => this.cmdExpandRec() });
    this.addCommand({ id: "agy-generate-image", name: "AGY: Generate image (Auto Context)",       callback: () => this.cmdImage() });
    this.addCommand({ id: "agy-gen-gaming",     name: "AGY: Generate Gaming Keyart (16:9)",       callback: () => this.cmdImage("gaming") });
    this.addCommand({ id: "agy-gen-loot",       name: "AGY: Generate Legendary Loot (1:1)",      callback: () => this.cmdImage("loot") });
    this.addCommand({ id: "agy-gen-cinematic",  name: "AGY: Generate Cinematic Dramatic image",   callback: () => this.cmdImage("cinematic") });
    this.addCommand({ id: "agy-gen-cartoon",    name: "AGY: Generate 3D Cartoon/Pixar image",     callback: () => this.cmdImage("cartoon") });
    this.addCommand({ id: "agy-gen-vibrant",    name: "AGY: Generate Hyper-Vibrant image",        callback: () => this.cmdImage("vibrant") });

    this.registerEvent(
      this.app.workspace.on("canvas:node-menu", (menu, node) => {
        menu.addSeparator();
        menu.addItem(i => i.setTitle("AGY  Brainstorm 3 ideas").setIcon("lightbulb").onClick(() => this.brainstorm(node)));
        menu.addItem(i => i.setTitle("AGY  📐 16:9 Wireframe Layout").setIcon("layout").onClick(() => this.createWireframe(node)));
        menu.addItem(i => i.setTitle("AGY  💡 Expand with Recommendations").setIcon("sparkles").onClick(() => this.expandWithRec(node)));
        menu.addItem(i => i.setTitle("AGY  Generate image (Auto Context)").setIcon("image").onClick(() => this.genImage(node)));
        menu.addItem(i => i.setTitle("AGY  Style: 🎮 Gaming Keyart (16:9)").setIcon("swords").onClick(() => this.genImage(node, "gaming")));
        menu.addItem(i => i.setTitle("AGY  Style: ⚔️ Legendary Loot / Item (1:1)").setIcon("gem").onClick(() => this.genImage(node, "loot")));
        menu.addItem(i => i.setTitle("AGY  Style: 🎬 Cinematic Dramatic").setIcon("film").onClick(() => this.genImage(node, "cinematic")));
        menu.addItem(i => i.setTitle("AGY  Style: 🎨 3D Cartoon / Pixar").setIcon("smile").onClick(() => this.genImage(node, "cartoon")));
        menu.addItem(i => i.setTitle("AGY  Style: 🌈 Hyper-Vibrant Colors").setIcon("sparkles").onClick(() => this.genImage(node, "vibrant")));
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

  // ── Canvas Graph Context Traversal ────────────────────────────────────────

  extractNodeContext(targetNode, canvasData) {
    if (!canvasData || !canvasData.nodes || !canvasData.edges) return "";

    const nodeMap = new Map();
    for (const n of canvasData.nodes) {
      if (n.id) nodeMap.set(n.id, n);
    }

    const ancestors = [];
    const directParentEdges = canvasData.edges.filter(e => e.toNode === targetNode.id);

    for (const edge of directParentEdges) {
      const parent = nodeMap.get(edge.fromNode);
      if (parent) {
        const text = (parent.text || parent.unknownData?.text || "").trim();
        if (text) ancestors.push(text.replace(/\n+/g, " "));

        const grandParentEdges = canvasData.edges.filter(e => e.toNode === parent.id);
        for (const gpEdge of grandParentEdges) {
          const grandParent = nodeMap.get(gpEdge.fromNode);
          if (grandParent) {
            const gpText = (grandParent.text || grandParent.unknownData?.text || "").trim();
            if (gpText && !ancestors.includes(gpText)) {
              ancestors.unshift(gpText.replace(/\n+/g, " "));
            }
          }
        }
      }
    }

    if (ancestors.length === 0) return "";
    return ancestors.join(" ➔ ");
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  async createWireframe(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const context = this.extractNodeContext(node, canvasData);

    const n = this.say("AGY architecting 16:9 Wireframe...", 0);
    try {
      const resp = await this.post("canvas-wireframe", { nodeText: text.trim(), context }, 90000);
      n.hide();
      if (!resp.ok || !resp.wireframe) return this.say("Failed to construct wireframe.");

      const data = await this.readCanvas(file);
      const px = node.x ?? 0;
      const py = node.y ?? 0;
      const pw = node.width ?? 250;
      const ph = node.height ?? 60;

      const cardWidth = 580;
      const cardHeight = 320;

      const wireframeNode = {
        id:     this.uid(),
        type:   "text",
        text:   resp.wireframe,
        x:      px + pw + 100,
        y:      py + (ph - cardHeight) / 2,
        width:  cardWidth,
        height: cardHeight,
        color:  "3",
      };

      data.nodes.push(wireframeNode);
      data.edges.push({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "right",
        toNode:   wireframeNode.id,
        toSide:   "left",
        label:    "AGY Wireframe 16:9",
      });

      await this.writeCanvas(file, data);
      this.say("16:9 Wireframe generated with Strategic Recommendation!");
    } catch (e) { n.hide(); this.say(`Error: ${e.message}`); }
  }

  async expandWithRec(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const context = this.extractNodeContext(node, canvasData);

    const n = this.say("AGY generating contextual expansion & recommendation...", 0);
    try {
      const resp = await this.post("canvas-expand-recommend", { nodeText: text.trim(), context }, 90000);
      n.hide();
      if (!resp.ok || !resp.text) return this.say("Failed to generate recommendation.");

      const data = await this.readCanvas(file);
      const px = node.x ?? 0;
      const py = node.y ?? 0;
      const pw = node.width ?? 320;
      const ph = node.height ?? 60;

      const cardWidth = Math.max(pw, 360);
      const cardHeight = 220;

      const recNode = {
        id:     this.uid(),
        type:   "text",
        text:   resp.text,
        x:      px,
        y:      py + ph + 80,
        width:  cardWidth,
        height: cardHeight,
        color:  "4",
      };

      data.nodes.push(recNode);
      data.edges.push({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "bottom",
        toNode:   recNode.id,
        toSide:   "top",
        label:    "Context Recommendation",
      });

      await this.writeCanvas(file, data);
      this.say("Expansion & Recommendation added!");
    } catch (e) { n.hide(); this.say(`Error: ${e.message}`); }
  }

  async brainstorm(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const context = this.extractNodeContext(node, canvasData);

    const n = this.say("AGY brainstorming ideas...", 0);
    try {
      const resp = await this.post("canvas-brainstorm", { nodeText: text.trim(), context });
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

  async genImage(node, styleOverride = null) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const context = this.extractNodeContext(node, canvasData);

    const slug      = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    const vaultPath = `assets/generated/${slug}-${Date.now()}.png`;

    const styleName = styleOverride ? `[${styleOverride.toUpperCase()}]` : "[Auto]";
    const n = this.say(`AGY synthesizing image ${styleName}...`, 0);

    try {
      const resp = await this.post("generate-image", {
        prompt: text.trim(),
        context,
        styleOverride,
        vaultPath
      }, 180000);
      n.hide();
      if (!resp.ok) return this.say(`Error: ${resp.error}`);

      const savedPath = resp.savedPath || vaultPath;
      const cardWidth = resp.width || 560;
      const cardHeight = resp.height || 315;
      const ratioLabel = resp.label || "AGY visual";

      const data = await this.readCanvas(file);

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
      this.say(`Rendered: ${ratioLabel} (${cardWidth}x${cardHeight})!`);
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

  cmdBrainstorm()         { const n = this.getSelectedNode(); if (n) this.brainstorm(n); }
  cmdWireframe()          { const n = this.getSelectedNode(); if (n) this.createWireframe(n); }
  cmdExpandRec()          { const n = this.getSelectedNode(); if (n) this.expandWithRec(n); }
  cmdImage(styleOverride) { const n = this.getSelectedNode(); if (n) this.genImage(n, styleOverride); }
}

module.exports = AntigravityCanvasPlugin;
