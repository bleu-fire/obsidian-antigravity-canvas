/*
 * Antigravity Canvas Plugin v2.7.0
 * AI Spatial Thinking and Knowledge-Work System for Obsidian Canvas
 */

const { Plugin, Notice, Modal, Setting } = require("obsidian");

const BRIDGE = "http://127.0.0.1:3099";
const POLL   = 5000;

// ── Skill Preview & Approval Modal ──────────────────────────────────────────

class SkillPreviewModal extends Modal {
  constructor(app, { skillId, skillName, badge, summary, reasoning, nodes, relationships, questions, gaps, nextSkills, onApply, onNextSkill }) {
    super(app);
    this.skillId = skillId;
    this.skillName = skillName;
    this.badge = badge;
    this.summary = summary;
    this.reasoning = reasoning;
    this.nodes = nodes || [];
    this.relationships = relationships || [];
    this.questions = questions || [];
    this.gaps = gaps || [];
    this.nextSkills = nextSkills || [];
    this.onApply = onApply;
    this.onNextSkill = onNextSkill;
    this.selectedIndices = new Set(this.nodes.map((_, i) => i));
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container");

    // Header
    const header = contentEl.createDiv({ cls: "agy-modal-header" });
    header.createEl("h2", { text: `AGY: ${this.skillName}` });
    header.createSpan({ cls: "agy-badge", text: this.badge });

    // Executive Summary Box
    const summaryBox = contentEl.createDiv({ cls: "agy-summary-box" });
    summaryBox.createEl("p", { cls: "agy-summary-title", text: this.summary });
    if (this.reasoning) {
      summaryBox.createEl("div", { cls: "agy-reasoning-text", text: this.reasoning });
    }

    // Potential Gaps Notice
    if (this.gaps && this.gaps.length > 0) {
      const gapsBox = contentEl.createDiv({ cls: "agy-gaps-box" });
      gapsBox.createEl("h4", { text: "Potential Gaps Detected" });
      const ul = gapsBox.createEl("ul");
      this.gaps.forEach(g => ul.createEl("li", { text: g }));
    }

    // Unanswered Questions Notice
    if (this.questions && this.questions.length > 0) {
      const qBox = contentEl.createDiv({ cls: "agy-questions-box" });
      qBox.createEl("h4", { text: "Critical Inquiries" });
      const ul = qBox.createEl("ul");
      this.questions.forEach(q => ul.createEl("li", { text: q }));
    }

    // Cards Checklist Header
    const listHeader = contentEl.createDiv({ cls: "agy-list-header" });
    listHeader.createEl("h3", { text: `Proposed Knowledge Cards (${this.nodes.length})` });

    const btnContainer = listHeader.createDiv({ cls: "agy-toggle-btns" });
    const selectAllBtn = btnContainer.createEl("button", { text: "Select All", cls: "mod-muted" });
    const deselectBtn = btnContainer.createEl("button", { text: "Deselect All", cls: "mod-muted" });

    // Checklist Container
    const cardList = contentEl.createDiv({ cls: "agy-cards-list" });
    const checkboxes = [];

    this.nodes.forEach((node, idx) => {
      const item = cardList.createDiv({ cls: "agy-card-item" });

      const cb = item.createEl("input", { type: "checkbox" });
      cb.checked = this.selectedIndices.has(idx);
      cb.onchange = () => {
        if (cb.checked) this.selectedIndices.add(idx);
        else this.selectedIndices.delete(idx);
      };
      checkboxes.push(cb);

      const info = item.createDiv({ cls: "agy-card-info" });
      const topRow = info.createDiv({ cls: "agy-card-top" });
      topRow.createSpan({ cls: `agy-type-badge agy-type-${node.type || "concept"}`, text: (node.type || "concept").toUpperCase() });
      topRow.createEl("strong", { text: node.title });

      info.createEl("div", { cls: "agy-card-content", text: node.content });
    });

    selectAllBtn.onclick = () => {
      this.nodes.forEach((_, i) => this.selectedIndices.add(i));
      checkboxes.forEach(cb => cb.checked = true);
    };

    deselectBtn.onclick = () => {
      this.selectedIndices.clear();
      checkboxes.forEach(cb => cb.checked = false);
    };

    // Skill Chaining / Next Reasoning Steps
    if (this.nextSkills && this.nextSkills.length > 0) {
      const nextSkillsBox = contentEl.createDiv({ cls: "agy-next-skills-box" });
      nextSkillsBox.createSpan({ cls: "agy-next-label", text: "Suggested Next Steps: " });
      this.nextSkills.forEach(sk => {
        const btn = nextSkillsBox.createEl("button", { cls: "agy-next-skill-btn", text: sk });
        btn.onclick = () => {
          this.close();
          if (this.onNextSkill) this.onNextSkill(sk);
        };
      });
    }

    // Modal Footer Actions
    const footer = contentEl.createDiv({ cls: "agy-modal-footer" });
    const cancelBtn = footer.createEl("button", { text: "Cancel" });
    cancelBtn.onclick = () => this.close();

    const applyBtn = footer.createEl("button", { cls: "mod-cta", text: "Apply Selected to Canvas" });
    applyBtn.onclick = () => {
      const approvedNodes = this.nodes.filter((_, i) => this.selectedIndices.has(i));
      this.close();
      if (this.onApply) this.onApply(approvedNodes, this.relationships);
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ── Intent Router Modal ─────────────────────────────────────────────────────

class SkillRouterModal extends Modal {
  constructor(app, onPrompt) {
    super(app);
    this.onPrompt = onPrompt;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container");

    contentEl.createEl("h2", { text: "AGY: Intent Router (Natural Language)" });
    contentEl.createEl("p", {
      cls: "mod-muted",
      text: "Describe what you want to think through (e.g., 'What am I missing in this architecture?', 'Decompose into subsystems', 'Challenge my tech stack'). Antigravity will route to the optimal skill."
    });

    const input = contentEl.createEl("textarea", {
      cls: "agy-router-textarea",
      placeholder: "Enter thinking goal or question..."
    });
    input.rows = 4;

    const footer = contentEl.createDiv({ cls: "agy-modal-footer" });
    const cancelBtn = footer.createEl("button", { text: "Cancel" });
    cancelBtn.onclick = () => this.close();

    const submitBtn = footer.createEl("button", { cls: "mod-cta", text: "Route & Analyze" });
    submitBtn.onclick = () => {
      const val = input.value.trim();
      if (!val) return;
      this.close();
      if (this.onPrompt) this.onPrompt(val);
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ── Skill Picker Modal ──────────────────────────────────────────────────────

class SkillPickerModal extends Modal {
  constructor(app, skills, onSelect) {
    super(app);
    this.skills = skills;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container");

    contentEl.createEl("h2", { text: "AGY: Select Cognitive Thinking Skill" });

    const list = contentEl.createDiv({ cls: "agy-picker-list" });
    for (const [id, def] of Object.entries(this.skills)) {
      const item = list.createDiv({ cls: "agy-picker-item" });
      const top = item.createDiv({ cls: "agy-card-top" });
      top.createSpan({ cls: "agy-badge", text: def.badge });
      top.createEl("strong", { text: def.name });

      item.createEl("div", { cls: "agy-card-content", text: def.description });
      item.onclick = () => {
        this.close();
        if (this.onSelect) this.onSelect(id);
      };
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ── Visual Style Picker Modal ──────────────────────────────────────────────

class StylePickerModal extends Modal {
  constructor(app, styles, onSelect) {
    super(app);
    this.styles = styles;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container");

    contentEl.createEl("h2", { text: "AGY: Select Visual Style" });
    contentEl.createEl("p", {
      cls: "mod-muted",
      text: "Choose a visual style recipe for image generation, or select Auto to infer from node context.",
    });

    const list = contentEl.createDiv({ cls: "agy-picker-list" });

    // Auto option
    const autoItem = list.createDiv({ cls: "agy-picker-item" });
    const autoTop = autoItem.createDiv({ cls: "agy-card-top" });
    autoTop.createSpan({ cls: "agy-badge", text: "Auto" });
    autoTop.createEl("strong", { text: "Auto Detect (Context-Aware)" });
    autoItem.createEl("div", {
      cls: "agy-card-content",
      text: "Automatically analyzes node text and graph context to resolve optimal style and aspect ratio.",
    });
    autoItem.onclick = () => {
      this.close();
      if (this.onSelect) this.onSelect(null);
    };

    for (const style of this.styles) {
      const item = list.createDiv({ cls: "agy-picker-item" });
      const top = item.createDiv({ cls: "agy-card-top" });
      top.createSpan({ cls: "agy-badge", text: style.family || "Style" });
      top.createEl("strong", { text: style.name });

      item.createEl("div", { cls: "agy-card-content", text: style.description });
      item.onclick = () => {
        this.close();
        if (this.onSelect) this.onSelect(style.id);
      };
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ── Main Plugin Class ───────────────────────────────────────────────────────

class AntigravityCanvasPlugin extends Plugin {
  online    = false;
  statusEl  = null;
  pollTimer = null;
  settings  = {
    enableContextMenu: true,
    enablePreviewModal: true,
    bridgeUrl: BRIDGE,
  };

  async onload() {
    this.statusEl = this.addStatusBarItem();
    this.setStatus(false);

    this.addRibbonIcon("cpu", "Antigravity Spatial Thinking", () => this.showStatus());

    // Cognitive Thinking Commands
    this.addCommand({ id: "agy-route-intent", name: "AGY: Ask / Route Skill (Natural Language)", callback: () => this.cmdRouteIntent() });
    this.addCommand({ id: "agy-pick-skill",   name: "AGY: Run Cognitive Thinking Skill...",      callback: () => this.cmdPickSkill() });
    this.addCommand({ id: "agy-brainstorm-dir", name: "AGY Thinking: Brainstorm Directions",     callback: () => this.cmdSkill("brainstorm") });
    this.addCommand({ id: "agy-explore",      name: "AGY Thinking: Explore Concept",            callback: () => this.cmdSkill("explore") });
    this.addCommand({ id: "agy-connect",      name: "AGY Thinking: Connect & Relate Nodes",     callback: () => this.cmdSkill("connect") });
    this.addCommand({ id: "agy-find-gaps",    name: "AGY Thinking: Find Knowledge Gaps",        callback: () => this.cmdSkill("find-gaps") });
    this.addCommand({ id: "agy-decompose",    name: "AGY Thinking: Decompose System",           callback: () => this.cmdSkill("decompose") });
    this.addCommand({ id: "agy-roadmap",      name: "AGY Thinking: Build Roadmap",              callback: () => this.cmdSkill("roadmap") });
    this.addCommand({ id: "agy-challenge",    name: "AGY Thinking: Challenge Assumptions",      callback: () => this.cmdSkill("challenge") });
    this.addCommand({ id: "agy-research-map", name: "AGY Thinking: Research Inquiry Map",       callback: () => this.cmdSkill("research-map") });
    this.addCommand({ id: "agy-synthesize",   name: "AGY Thinking: Synthesize Knowledge",       callback: () => this.cmdSkill("synthesize") });
    this.addCommand({ id: "agy-evolve",       name: "AGY Thinking: Evolve from Notes",          callback: () => this.cmdSkill("evolve") });

    // Studio & Visuals Commands
    this.addCommand({ id: "agy-director",     name: "AGY Studio: Creative Director Concepts",   callback: () => this.cmdDirector() });
    this.addCommand({ id: "agy-wireframe",    name: "AGY Studio: 16:9 Editorial Wireframe",     callback: () => this.cmdWireframe() });
    this.addCommand({ id: "agy-mobile-ui",    name: "AGY Studio: 9:16 Mobile UI Screen",        callback: () => this.cmdMobileUI() });
    this.addCommand({ id: "agy-design-system",name: "AGY Studio: UI Design System Tokens",      callback: () => this.cmdDesignSystem() });
    this.addCommand({ id: "agy-expand-rec",   name: "AGY Studio: Expand with Strategic Rec",     callback: () => this.cmdExpandRec() });
    this.addCommand({ id: "agy-generate-image", name: "AGY Studio: Generate Image (Auto Context)", callback: () => this.cmdImage() });
    this.addCommand({ id: "agy-image-picker", name: "AGY Studio: Generate Image (Choose Style...)", callback: () => this.cmdPickStyleImage() });

    // Context Menu on Canvas Nodes
    this.registerEvent(
      this.app.workspace.on("canvas:node-menu", (menu, node) => {
        if (!this.settings.enableContextMenu) return;

        // Group 1: Cognitive Thinking Actions
        menu.addSeparator();
        menu.addItem(i => i.setTitle("AGY Thinking: Brainstorm Directions").setIcon("lightbulb").onClick(() => this.executeSkill("brainstorm", node)));
        menu.addItem(i => i.setTitle("AGY Thinking: Explore Concept").setIcon("compass").onClick(() => this.executeSkill("explore", node)));
        menu.addItem(i => i.setTitle("AGY Thinking: Connect & Relate").setIcon("link").onClick(() => this.executeSkill("connect", node)));
        menu.addItem(i => i.setTitle("AGY Thinking: Find Knowledge Gaps").setIcon("alert-triangle").onClick(() => this.executeSkill("find-gaps", node)));
        menu.addItem(i => i.setTitle("AGY Thinking: Decompose System").setIcon("git-branch").onClick(() => this.executeSkill("decompose", node)));
        menu.addItem(i => i.setTitle("AGY Thinking: Build Roadmap").setIcon("map").onClick(() => this.executeSkill("roadmap", node)));
        menu.addItem(i => i.setTitle("AGY Thinking: Challenge Assumptions").setIcon("shield-alert").onClick(() => this.executeSkill("challenge", node)));
        menu.addItem(i => i.setTitle("AGY Thinking: Research Inquiry Map").setIcon("search").onClick(() => this.executeSkill("research-map", node)));
        menu.addItem(i => i.setTitle("AGY Thinking: Synthesize Knowledge").setIcon("layers").onClick(() => this.executeSkill("synthesize", node)));
        menu.addItem(i => i.setTitle("AGY Thinking: Evolve from Notes").setIcon("refresh-cw").onClick(() => this.executeSkill("evolve", node)));

        // Group 2: Studio Visual Actions
        menu.addSeparator();
        menu.addItem(i => i.setTitle("AGY Studio: Creative Director Concepts").setIcon("compass").onClick(() => this.brainstormDirector(node)));
        menu.addItem(i => i.setTitle("AGY Studio: 9:16 Mobile UI Screen").setIcon("smartphone").onClick(() => this.createMobileUI(node)));
        menu.addItem(i => i.setTitle("AGY Studio: 16:9 Editorial Wireframe").setIcon("layout").onClick(() => this.createWireframe(node)));
        menu.addItem(i => i.setTitle("AGY Studio: UI Design System Tokens").setIcon("palette").onClick(() => this.createDesignSystem(node)));
        menu.addItem(i => i.setTitle("AGY Studio: Expand with Rec").setIcon("file-text").onClick(() => this.expandWithRec(node)));

        // Group 3: Image Generation
        menu.addSeparator();
        menu.addItem(i => i.setTitle("AGY Image: Choose Style & Generate...").setIcon("palette").onClick(() => {
          fetch(`${BRIDGE}/styles`).then(r => r.json()).then(data => {
            if (data.ok && data.styles) {
              new StylePickerModal(this.app, data.styles, (styleId) => this.genImage(node, styleId)).open();
            } else {
              this.genImage(node, null);
            }
          }).catch(() => this.genImage(node, null));
        }));
        menu.addItem(i => i.setTitle("AGY Image: Auto Context").setIcon("image").onClick(() => this.genImage(node)));
        menu.addItem(i => i.setTitle("AGY Image: Mobile App UI (9:16)").setIcon("smartphone").onClick(() => this.genImage(node, "mobile_ui")));
        menu.addItem(i => i.setTitle("AGY Image: Gaming Keyart (16:9)").setIcon("swords").onClick(() => this.genImage(node, "gaming")));
        menu.addItem(i => i.setTitle("AGY Image: Legendary Loot (1:1)").setIcon("gem").onClick(() => this.genImage(node, "loot")));
        menu.addItem(i => i.setTitle("AGY Image: Cinematic Dramatic").setIcon("film").onClick(() => this.genImage(node, "cinematic")));
      })
    );

    this.checkBridge();
    this.pollTimer = setInterval(() => this.checkBridge(), POLL);
  }

  onunload() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.statusEl?.remove();
  }

  // ── Bridge Connectivity ───────────────────────────────────────────────────

  async checkBridge() {
    try {
      const res = await fetch(`${BRIDGE}/health`, { signal: AbortSignal.timeout(2500) });
      const d   = await res.json();
      this.setStatus(d.status === "ok");
    } catch {
      this.setStatus(false);
    }
  }

  setStatus(on) {
    this.online = on;
    if (!this.statusEl) return;
    this.statusEl.empty();
    const dot = this.statusEl.createSpan({ cls: "nav-action-button" });
    dot.setText(on ? "AGY Bridge: Online" : "AGY Bridge: Offline");
    dot.style.color = on ? "var(--text-success)" : "var(--text-muted)";
    dot.style.fontSize = "11px";
    dot.style.fontWeight = "600";
    dot.title = on ? "Antigravity Bridge is connected." : "Antigravity Bridge offline (port 3099).";
  }

  showStatus() {
    if (this.online) {
      new Notice("Antigravity Bridge is active and ready.");
    } else {
      new Notice("Antigravity Bridge is offline. Start it in terminal: node bridge/server.js");
    }
  }

  // ── Canvas Helpers ────────────────────────────────────────────────────────

  getCanvasView() {
    // Find the active canvas leaf directly
    const leaf = this.app.workspace.activeLeaf;
    if (leaf?.view?.getViewType?.() === "canvas") return leaf.view;
    // Fall back to first open canvas leaf
    const leaves = this.app.workspace.getLeavesOfType("canvas");
    return leaves[0]?.view || null;
  }

  getCanvasFile() {
    const activeFile = this.app.workspace.getActiveFile();
    if (activeFile && activeFile.extension === "canvas") return activeFile;
    const leaves = this.app.workspace.getLeavesOfType("canvas");
    for (const leaf of leaves) {
      const f = leaf.view?.file;
      if (f && f.extension === "canvas") return f;
    }
    return null;
  }

  async readCanvas(file) {
    const raw = await this.app.vault.read(file);
    try { return JSON.parse(raw); } catch { return { nodes: [], edges: [] }; }
  }

  async writeCanvas(file, data) {
    await this.app.vault.modify(file, JSON.stringify(data, null, 2));
  }

  uid() {
    return Math.random().toString(36).slice(2, 14);
  }

  // ── Context Engine ────────────────────────────────────────────────────────

  extractNodeContext(targetNode, canvasData) {
    if (!canvasData || !canvasData.nodes || !canvasData.edges) {
      return { context: "", existingNodes: [], canvasSummary: "" };
    }

    const nodeMap = new Map();
    const existingTitles = [];
    for (const n of canvasData.nodes) {
      if (n.id) nodeMap.set(n.id, n);
      const t = (n.text || n.unknownData?.text || "").split("\n")[0].replace(/^#+\s*/, "").trim();
      if (t) existingTitles.push(t);
    }

    const ancestors = [];
    const directParentEdges = canvasData.edges.filter(e => e.toNode === targetNode.id);

    const parentIds = new Set();
    for (const edge of directParentEdges) {
      parentIds.add(edge.fromNode);
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

    const descendants = [];
    const childEdges = canvasData.edges.filter(e => e.fromNode === targetNode.id);
    for (const edge of childEdges) {
      const child = nodeMap.get(edge.toNode);
      if (child) {
        const text = (child.text || child.unknownData?.text || "").trim();
        if (text) descendants.push(text.replace(/\n+/g, " "));
      }
    }

    // Sibling nodes (nodes sharing the same parents)
    const siblings = [];
    if (parentIds.size > 0) {
      const siblingEdges = canvasData.edges.filter(e => parentIds.has(e.fromNode) && e.toNode !== targetNode.id);
      for (const sEdge of siblingEdges) {
        const sib = nodeMap.get(sEdge.toNode);
        if (sib) {
          const text = (sib.text || sib.unknownData?.text || "").trim();
          if (text && !siblings.includes(text)) {
            siblings.push(text.replace(/\n+/g, " "));
          }
        }
      }
    }

    let narrative = "";
    if (ancestors.length) narrative += `[Upstream Chain: ${ancestors.join(" -> ")}]`;
    if (siblings.length) narrative += ` [Sibling Context: ${siblings.slice(0, 3).join(", ")}]`;
    if (descendants.length) narrative += ` [Downstream Branches: ${descendants.join(", ")}]`;

    const canvasSummary = `Canvas contains ${canvasData.nodes.length} nodes and ${canvasData.edges.length} connections. Major topics: ${existingTitles.slice(0, 15).join("; ")}`;

    return {
      context: narrative.trim(),
      existingNodes: existingTitles,
      canvasSummary
    };
  }

  async getVaultContextForNode(node, canvasFile) {
    const vaultNotes = [];

    // Check if node is a file card
    if (node.type === "file" && node.file) {
      const tfile = this.app.vault.getAbstractFileByPath(node.file);
      if (tfile && tfile.extension === "md") {
        try {
          const content = await this.app.vault.cachedRead(tfile);
          vaultNotes.push({
            title: tfile.basename,
            path: tfile.path,
            excerpt: content.slice(0, 1500).replace(/\n+/g, " ")
          });
        } catch {}
      }
    }

    // Check for wikilinks inside text card
    const text = node?.unknownData?.text || node?.text || "";
    const matches = text.match(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g);
    if (matches) {
      for (const m of matches.slice(0, 3)) {
        const linkpath = m.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0];
        const tfile = this.app.metadataCache.getFirstLinkpathDest(linkpath, canvasFile ? canvasFile.path : "");
        if (tfile && tfile.extension === "md") {
          try {
            const content = await this.app.vault.cachedRead(tfile);
            vaultNotes.push({
              title: tfile.basename,
              path: tfile.path,
              excerpt: content.slice(0, 1500).replace(/\n+/g, " ")
            });
          } catch {}
        }
      }
    }

    return vaultNotes;
  }

  // ── Layout Algorithm: Spatial Zero-Collision Clustering ────────────────────

  applyCognitiveCards(canvasFile, canvasData, focalNode, approvedNodes, relationships) {
    if (!approvedNodes || !approvedNodes.length) return;

    const px = focalNode.x ?? 0;
    const py = focalNode.y ?? 0;
    const pw = focalNode.width ?? 260;
    const ph = focalNode.height ?? 100;

    const cardWidth = 380;
    const cardHeight = 220;
    const gapX = 140;
    const gapY = 30;

    const count = approvedNodes.length;
    const totalHeight = count * cardHeight + (count - 1) * gapY;
    const startY = py + (ph / 2) - (totalHeight / 2);
    const startX = px + pw + gapX;

    const newNodes = [];
    const newEdges = [];

    approvedNodes.forEach((item, i) => {
      const newId = this.uid();
      const nodeType = (item.type || "concept").toUpperCase();

      const markdownLines = [
        `### [${nodeType}] ${item.title}`,
        ``,
        item.content,
      ];
      if (item.tags && item.tags.length) {
        markdownLines.push(``);
        markdownLines.push(item.tags.map(t => `#${t.replace(/\s+/g, "_")}`).join(" "));
      }

      newNodes.push({
        id: newId,
        type: "text",
        text: markdownLines.join("\n"),
        x: startX,
        y: startY + i * (cardHeight + gapY),
        width: cardWidth,
        height: cardHeight,
        color: item.color || "6",
      });

      // Find matching relation label
      const rel = relationships?.find(r =>
        (r.to && (r.to === item.id || r.to.toLowerCase() === item.title.toLowerCase())) ||
        (r.from && (r.from === item.id || r.from.toLowerCase() === item.title.toLowerCase()))
      );
      const edgeLabel = rel?.label || "relates to";

      newEdges.push({
        id: this.uid(),
        fromNode: focalNode.id,
        fromSide: "right",
        toNode: newId,
        toSide: "left",
        label: edgeLabel,
      });
    });

    canvasData.nodes.push(...newNodes);
    canvasData.edges.push(...newEdges);
  }

  // ── Cognitive Skill Execution ──────────────────────────────────────────────

  async executeSkill(skillId, node, userPrompt = null) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim() && !userPrompt) return this.say("Node is empty. Select a card with text.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const { context, existingNodes, canvasSummary } = this.extractNodeContext(node, canvasData);
    const vaultNotes = await this.getVaultContextForNode(node, file);

    const n = this.say(`AGY: Analyzing ${skillId}...`, 0);
    try {
      const resp = await this.post("cognitive-skill", {
        skillId,
        nodeText: text.trim(),
        context,
        canvasSummary,
        existingNodes,
        userPrompt: userPrompt || "",
        vaultNotes,
      }, 90000);
      n.hide();

      if (!resp.ok) return this.say(`Analysis failed: ${resp.error || "Unknown error"}`);

      // Open Interactive Preview Modal
      new SkillPreviewModal(this.app, {
        skillId,
        skillName: resp.skillName || skillId,
        badge: resp.badge || "Thinking",
        summary: resp.summary || "Analysis completed.",
        reasoning: resp.reasoning || "",
        nodes: resp.nodes || [],
        relationships: resp.relationships || [],
        questions: resp.questions || [],
        gaps: resp.gaps || [],
        nextSkills: resp.nextSkills || [],
        onApply: async (approvedNodes, relationships) => {
          if (!approvedNodes.length) return this.say("No cards selected.");
          const freshData = await this.readCanvas(file);
          this.applyCognitiveCards(file, freshData, node, approvedNodes, relationships);
          await this.writeCanvas(file, freshData);
          this.say(`${approvedNodes.length} cards added to Canvas.${resp.cached ? " (cached)" : ""}`);
        },
        onNextSkill: (nextSkillId) => {
          this.executeSkill(nextSkillId, node);
        }
      }).open();

    } catch (e) {
      n.hide();
      this.say(`Error: ${e.message}`);
    }
  }

  // ── Studio & Visual Actions (Preserved) ────────────────────────────────────

  async brainstormDirector(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const { context } = this.extractNodeContext(node, canvasData);

    const n = this.say("AGY: Formulating Creative Director Visual Concepts...", 0);
    try {
      const resp = await this.post("canvas-brainstorm-director", { nodeText: text.trim(), context }, 90000);
      n.hide();
      if (!resp.ok || (!resp.concepts?.length && !resp.raw)) return this.say("No concepts returned.");

      const data = await this.readCanvas(file);
      const px = node.x ?? 0;
      const py = node.y ?? 0;
      const pw = node.width ?? 250;
      const ph = node.height ?? 60;

      const concepts = resp.concepts || [];
      const hasRecs = resp.recommendations && Object.keys(resp.recommendations).length > 0;
      const cardWidth = 480;
      const conceptCardHeight = 360;
      const recCardHeight = 240;
      const gap = 30;

      const totalHeight = (concepts.length * (conceptCardHeight + gap)) + (hasRecs ? (recCardHeight + gap) : 0) - gap;
      let startY = py + (ph / 2) - (totalHeight / 2);

      const newNodes = [];

      if (hasRecs) {
        const recs = resp.recommendations;
        const recText = [
          "### Creative Director Strategy: Recommended Directions",
          `- **Emotional Approach**: ${recs.emotional || "N/A"}`,
          `- **Mystery Approach**: ${recs.mystery || "N/A"}`,
          `- **Transformation Approach**: ${recs.transformation || "N/A"}`,
          `- **Visual Metaphor**: ${recs.metaphor || "N/A"}`,
          `- **Cinematic Approach**: ${recs.cinematic || "N/A"}`
        ].join("\n");

        newNodes.push({
          id: this.uid(),
          type: "text",
          text: recText,
          x: px + pw + 120,
          y: startY,
          width: cardWidth,
          height: recCardHeight,
          color: "5",
          isDirectorRec: true
        });
        startY += recCardHeight + gap;
      }

      concepts.forEach((concept, i) => {
        const textLines = [
          `### Concept ${i + 1}: ${concept.title || "Visual Concept"}`,
          `**Mechanism**: ${concept.approach || "Visual Narrative"}`,
          `**Core Idea**: ${concept.coreIdea || ""}`,
          "",
          `> **Visual Hook**: ${concept.visualHook || ""}`,
          concept.secondaryHook ? `> **Secondary Hook**: ${concept.secondaryHook}` : "",
          "",
          `**Story**: ${concept.story || ""}`,
          concept.curiosityGap ? `**Curiosity Gap**: ${concept.curiosityGap}` : "",
          concept.emotion ? `**Emotion**: ${concept.emotion}` : "",
          "",
          "**Composition Preview**:",
          `${concept.composition || ""}`,
          "",
          concept.styleDirection ? `**Style Direction**: ${concept.styleDirection}` : "",
          concept.textDirection && concept.textDirection !== "N/A" ? `**Text Direction**: \`${concept.textDirection}\`` : ""
        ].filter(Boolean).join("\n");

        newNodes.push({
          id: this.uid(),
          type: "text",
          text: textLines,
          x: px + pw + 120,
          y: startY + (i * (conceptCardHeight + gap)),
          width: cardWidth,
          height: conceptCardHeight,
          color: concept.color || "3",
        });
      });

      const newEdges = newNodes.map(nn => ({
        id: this.uid(),
        fromNode: node.id,
        fromSide: "right",
        toNode: nn.id,
        toSide: "left",
        label: nn.isDirectorRec ? "Strategy Brief" : "Director Concept",
      }));

      newNodes.forEach(nn => delete nn.isDirectorRec);

      data.nodes.push(...newNodes);
      data.edges.push(...newEdges);
      await this.writeCanvas(file, data);
      this.say(`${concepts.length} Creative Director Concepts generated.${resp.cached ? " (cached)" : ""}`);
    } catch (e) {
      n.hide();
      this.say(`Error: ${e.message}`);
    }
  }

  async createMobileUI(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const { context } = this.extractNodeContext(node, canvasData);

    const n = this.say("AGY: Architecting 9:16 Mobile UI Screen...", 0);
    try {
      const resp = await this.post("canvas-mobile-ui", { nodeText: text.trim(), context }, 90000);
      n.hide();
      if (!resp.ok || !resp.wireframe) return this.say("Failed to construct mobile UI.");

      const data = await this.readCanvas(file);
      const px = node.x ?? 0;
      const py = node.y ?? 0;
      const pw = node.width ?? 250;
      const ph = node.height ?? 60;

      const cardWidth = 380;
      const cardHeight = 680;

      const mobileNode = {
        id:     this.uid(),
        type:   "text",
        text:   resp.wireframe,
        x:      px + pw + 100,
        y:      py + (ph - cardHeight) / 2,
        width:  cardWidth,
        height: cardHeight,
        color:  "5",
      };

      data.nodes.push(mobileNode);
      data.edges.push({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "right",
        toNode:   mobileNode.id,
        toSide:   "left",
        label:    "AGY Mobile 9:16",
      });

      await this.writeCanvas(file, data);
      this.say("9:16 Mobile Screen Wireframe generated.");
    } catch (e) { n.hide(); this.say(`Error: ${e.message}`); }
  }

  async createDesignSystem(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const { context } = this.extractNodeContext(node, canvasData);

    const n = this.say("AGY: Synthesizing UI Design System Tokens...", 0);
    try {
      const resp = await this.post("canvas-design-system", { nodeText: text.trim(), context }, 90000);
      n.hide();
      if (!resp.ok || !resp.system) return this.say("Failed to generate design system.");

      const data = await this.readCanvas(file);
      const px = node.x ?? 0;
      const py = node.y ?? 0;
      const pw = node.width ?? 250;
      const ph = node.height ?? 60;

      const cardWidth = 480;
      const cardHeight = 380;

      const dsNode = {
        id:     this.uid(),
        type:   "text",
        text:   resp.system,
        x:      px + pw + 100,
        y:      py + (ph - cardHeight) / 2,
        width:  cardWidth,
        height: cardHeight,
        color:  "2",
      };

      data.nodes.push(dsNode);
      data.edges.push({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "right",
        toNode:   dsNode.id,
        toSide:   "left",
        label:    "Design System Tokens",
      });

      await this.writeCanvas(file, data);
      this.say("Design System Tokens card generated.");
    } catch (e) { n.hide(); this.say(`Error: ${e.message}`); }
  }

  async createWireframe(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const { context } = this.extractNodeContext(node, canvasData);

    const n = this.say("AGY: Generating 16:9 Editorial Wireframe Card...", 0);
    try {
      const resp = await this.post("canvas-wireframe", { nodeText: text.trim(), context }, 90000);
      n.hide();
      if (!resp.ok || !resp.wireframe) return this.say("Failed to generate wireframe.");

      const data = await this.readCanvas(file);
      const px = node.x ?? 0;
      const py = node.y ?? 0;
      const pw = node.width ?? 250;
      const ph = node.height ?? 60;

      const cardWidth = 500;
      const cardHeight = 320;

      const wfNode = {
        id:     this.uid(),
        type:   "text",
        text:   resp.wireframe,
        x:      px + pw + 100,
        y:      py + (ph - cardHeight) / 2,
        width:  cardWidth,
        height: cardHeight,
        color:  "4",
      };

      data.nodes.push(wfNode);
      data.edges.push({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "right",
        toNode:   wfNode.id,
        toSide:   "left",
        label:    "AGY Wireframe 16:9",
      });

      await this.writeCanvas(file, data);
      this.say("16:9 Editorial Wireframe generated.");
    } catch (e) { n.hide(); this.say(`Error: ${e.message}`); }
  }

  async expandWithRec(node) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const { context } = this.extractNodeContext(node, canvasData);

    const n = this.say("AGY: Expanding concept from context...", 0);
    try {
      const resp = await this.post("canvas-expand-recommend", { nodeText: text.trim(), context }, 90000);
      n.hide();
      if (!resp.ok || !resp.text) return this.say("Failed to expand concept.");

      const data = await this.readCanvas(file);
      const px = node.x ?? 0;
      const py = node.y ?? 0;
      const pw = node.width ?? 250;
      const ph = node.height ?? 60;

      const cardWidth = 420;
      const cardHeight = 220;

      const expNode = {
        id:     this.uid(),
        type:   "text",
        text:   `### Context Expansion & Next Step\n\n${resp.text}`,
        x:      px + pw + 100,
        y:      py + (ph - cardHeight) / 2,
        width:  cardWidth,
        height: cardHeight,
        color:  "3",
      };

      data.nodes.push(expNode);
      data.edges.push({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "right",
        toNode:   expNode.id,
        toSide:   "left",
        label:    "Context Deepening",
      });

      await this.writeCanvas(file, data);
      this.say("Expansion & Recommendation added.");
    } catch (e) { n.hide(); this.say(`Error: ${e.message}`); }
  }

  async genImage(node, styleOverride = null) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim()) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const { context } = this.extractNodeContext(node, canvasData);

    const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    const vaultPath = `assets/generated/${slug}-${Date.now()}.png`;

    const styleName = styleOverride ? `[${styleOverride.toUpperCase()}]` : "[Auto]";
    const n = this.say(`AGY: Synthesizing image ${styleName}...`, 0);

    try {
      const resp = await this.post("generate-image", {
        prompt: text.trim(),
        context,
        styleOverride,
        vaultPath,
      }, 120000);
      n.hide();

      if (!resp.ok) return this.say(`Image generation failed: ${resp.error || "Unknown error"}`);

      // Use exact dimensions from style-registry via API response
      const imgW = resp.width || 560;
      const imgH = resp.height || 315;

      const data = await this.readCanvas(file);
      const px   = node.x ?? 0;
      const py   = node.y ?? 0;
      const pw   = node.width ?? 250;
      const ph   = node.height ?? 100;

      const imgNode = {
        id:     this.uid(),
        type:   "file",
        file:   resp.savedPath,
        x:      px + pw + 100,
        y:      py + (ph - imgH) / 2,
        width:  imgW,
        height: imgH,
      };

      data.nodes.push(imgNode);
      data.edges.push({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "right",
        toNode:   imgNode.id,
        toSide:   "left",
        label:    resp.detectedStyle ? `AGY: ${resp.detectedStyle}` : "AGY Art",
      });

      await this.writeCanvas(file, data);
      this.say(`Image generated and placed on Canvas.${resp.cached ? " (cached)" : ""}`);
    } catch (e) { n.hide(); this.say(`Error: ${e.message}`); }
  }

  // ── Command Palette Dispatchers ───────────────────────────────────────────

  getSelectedNode() {
    const view = this.getCanvasView();
    const canvas = view?.canvas;
    if (!canvas) return null;
    const sel = Array.from(canvas.selection || []);
    if (sel.length) return sel[0];
    const all = Array.from(canvas.nodes?.values() || []);
    return all[0] || null;
  }

  cmdSkill(skillId) {
    const node = this.getSelectedNode();
    if (!node) return this.say("Please select a Canvas card first.");
    this.executeSkill(skillId, node);
  }

  cmdRouteIntent() {
    const node = this.getSelectedNode();
    if (!node) return this.say("Please select a Canvas card first.");

    new SkillRouterModal(this.app, async (userPrompt) => {
      const n = this.say("AGY: Routing intent...", 0);
      try {
        const resp = await this.post("route-intent", { userPrompt });
        n.hide();
        if (resp.ok && resp.skillId) {
          this.say(`Routing to: ${resp.skillId} (${Math.round(resp.confidence * 100)}% match)`);
          this.executeSkill(resp.skillId, node, userPrompt);
        } else {
          this.executeSkill("brainstorm", node, userPrompt);
        }
      } catch {
        n.hide();
        this.executeSkill("brainstorm", node, userPrompt);
      }
    }).open();
  }

  async cmdPickSkill() {
    const node = this.getSelectedNode();
    if (!node) return this.say("Please select a Canvas card first.");

    try {
      const resp = await fetch(`${BRIDGE}/cognitive-skills`);
      const data = await resp.json();
      if (data.ok && data.skills) {
        new SkillPickerModal(this.app, data.skills, (skillId) => {
          this.executeSkill(skillId, node);
        }).open();
      }
    } catch {
      this.say("Bridge offline. Cannot fetch skills.");
    }
  }

  async cmdPickStyleImage() {
    const node = this.getSelectedNode();
    if (!node) return this.say("Please select a Canvas card first.");

    try {
      const resp = await fetch(`${BRIDGE}/styles`);
      const data = await resp.json();
      if (data.ok && data.styles) {
        new StylePickerModal(this.app, data.styles, (styleId) => {
          this.genImage(node, styleId);
        }).open();
      }
    } catch {
      this.genImage(node, null);
    }
  }

  cmdDirector()     { const n = this.getSelectedNode(); if (n) this.brainstormDirector(n); else this.say("Select a card first."); }
  cmdMobileUI()      { const n = this.getSelectedNode(); if (n) this.createMobileUI(n); else this.say("Select a card first."); }
  cmdDesignSystem()  { const n = this.getSelectedNode(); if (n) this.createDesignSystem(n); else this.say("Select a card first."); }
  cmdWireframe()     { const n = this.getSelectedNode(); if (n) this.createWireframe(n); else this.say("Select a card first."); }
  cmdExpandRec()     { const n = this.getSelectedNode(); if (n) this.expandWithRec(n); else this.say("Select a card first."); }
  cmdImage(st)       { const n = this.getSelectedNode(); if (n) this.genImage(n, st); else this.say("Select a card first."); }

  // ── Network & UI Utilities ────────────────────────────────────────────────

  async post(path, body, timeout = 60000) {
    const res = await fetch(`${BRIDGE}/${path}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(timeout),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  say(msg, dur = 4000) {
    return new Notice(msg, dur);
  }

  guard() {
    if (!this.online) {
      this.say("Bridge offline. Run: node bridge/server.js", 6000);
      return false;
    }
    return true;
  }
}

module.exports = AntigravityCanvasPlugin;
