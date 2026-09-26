/*
 * Antigravity Canvas Plugin v2.9.0
 * AI Spatial Thinking, Visual DNA, and Knowledge-Work System for Obsidian Canvas
 */

const { Plugin, Notice, Modal, Setting } = require("obsidian");

const BRIDGE = "http://127.0.0.1:3099";
const POLL   = 5000;

// ── Skill Preview & Approval Modal ──────────────────────────────────────────

class SkillPreviewModal extends Modal {
  constructor(app, { skillId, skillName, badge, summary, reasoning, nodes, relationships, questions, gaps, warnings = [], conflicts = [], nextSkills, onApply, onNextSkill }) {
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
    this.warnings = warnings || [];
    this.conflicts = conflicts || [];
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

    // Context Warnings Notice
    if (this.warnings && this.warnings.length > 0) {
      const warnBox = contentEl.createDiv({ cls: "agy-warnings-box" });
      warnBox.createEl("h4", { text: "Context Warnings" });
      const ul = warnBox.createEl("ul");
      this.warnings.forEach(w => ul.createEl("li", { text: w }));
    }

    // Knowledge Conflicts Detected Notice
    if (this.conflicts && this.conflicts.length > 0) {
      const conflictsBox = contentEl.createDiv({ cls: "agy-conflicts-box" });
      conflictsBox.createEl("h4", { text: "Knowledge Conflicts Detected" });
      const ul = conflictsBox.createEl("ul");
      this.conflicts.forEach(c => ul.createEl("li", { text: c }));
    }

    // Potential Gaps Notice
    if (this.gaps && this.gaps.length > 0) {
      const gapsBox = contentEl.createDiv({ cls: "agy-gaps-box" });
      gapsBox.createEl("h4", { text: "Potential Gaps Detected" });
      const ul = gapsBox.createEl("ul");
      this.gaps.forEach(g => ul.createEl("li", { text: g }));
    }

    // Open Questions Notice
    if (this.questions && this.questions.length > 0) {
      const questionsBox = contentEl.createDiv({ cls: "agy-questions-box" });
      questionsBox.createEl("h4", { text: "Critical Inquiries" });
      const ul = questionsBox.createEl("ul");
      this.questions.forEach(q => ul.createEl("li", { text: q }));
    }

    // Candidate Nodes Header & Action Controls
    const listHeader = contentEl.createDiv({ cls: "agy-list-header" });
    listHeader.createEl("h3", { text: `Proposed Knowledge Nodes (${this.nodes.length})` });

    const controls = listHeader.createDiv({ cls: "agy-controls" });
    const selectAllBtn = controls.createEl("button", { text: "Select All" });
    const deselectBtn = controls.createEl("button", { text: "Deselect All" });

    // Node Cards Checklist
    const list = contentEl.createDiv({ cls: "agy-card-list" });
    const checkboxes = [];

    this.nodes.forEach((node, idx) => {
      const item = list.createDiv({ cls: "agy-card-item" });

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

// ── Refine Prompt Modal ─────────────────────────────────────────────────────

class RefinePromptModal extends Modal {
  constructor(app, title, promptText, onSubmit) {
    super(app);
    this.modalTitle = title;
    this.promptText = promptText;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container");

    contentEl.createEl("h2", { text: this.modalTitle });
    contentEl.createEl("p", { cls: "mod-muted", text: this.promptText });

    const input = contentEl.createEl("textarea", {
      cls: "agy-router-textarea",
      placeholder: "e.g., Make the lighting darker and more moody, add rain reflections, switch style to Anime Cinematic..."
    });
    input.rows = 3;

    const footer = contentEl.createDiv({ cls: "agy-modal-footer" });
    const cancelBtn = footer.createEl("button", { text: "Cancel" });
    cancelBtn.onclick = () => this.close();

    const submitBtn = footer.createEl("button", { cls: "mod-cta", text: "Refine Concept" });
    submitBtn.onclick = () => {
      const val = input.value.trim();
      if (!val) return;
      this.close();
      if (this.onSubmit) this.onSubmit(val);
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ── Advanced Visual Brainstorming Modal ─────────────────────────────────────

class VisualBrainstormModal extends Modal {
  constructor(app, options) {
    super(app);
    this.focalText = options.focalText || "";
    this.concepts = options.concepts || [];
    this.directions = options.directions || [];
    this.recommendations = options.recommendations || {};
    this.onApplyConcept = options.onApplyConcept;
    this.onGenerateImage = options.onGenerateImage;
    this.onRefine = options.onRefine;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container", "agy-vbrain-modal");

    const header = contentEl.createDiv({ cls: "agy-modal-header" });
    header.createEl("h2", { text: "AGY Studio: Advanced Visual Brainstorming" });
    header.createSpan({ cls: "agy-badge", text: "5 Directions" });

    contentEl.createEl("p", {
      cls: "mod-muted",
      text: `Creative Directions and 7-Layer Visual Concepts for: "${this.focalText}"`,
    });

    const list = contentEl.createDiv({ cls: "agy-vbrain-list" });

    this.concepts.forEach((c, idx) => {
      const card = list.createDiv({ cls: "agy-vbrain-card" });

      const top = card.createDiv({ cls: "agy-vbrain-top" });
      top.createEl("h3", { cls: "agy-vbrain-title", text: `${c.title || `Concept ${idx + 1}`}` });
      top.createSpan({ cls: "agy-badge", text: (c.dimensionId || c.concept || "").replace(/^concept-[a-e]:?\s*/i, "").toUpperCase() });

      if (c.visualMetaphor) {
        card.createDiv({ cls: "agy-vbrain-metaphor", text: `Metaphor: ${c.visualMetaphor}` });
      }

      if (c.visualStory) {
        card.createDiv({ cls: "agy-vbrain-story", text: c.visualStory });
      }

      // 7-Layer Visual Detail Architecture Grid
      const grid = card.createDiv({ cls: "agy-vbrain-layers-grid" });

      const addLayer = (label, val) => {
        if (!val) return;
        const item = grid.createDiv({ cls: "agy-vbrain-layer-item" });
        item.createSpan({ cls: "agy-vbrain-layer-label", text: label });
        item.createSpan({ cls: "agy-vbrain-layer-val", text: val });
      };

      addLayer("Subject (L1)", c.subject);
      addLayer("Lighting (L5)", c.lighting);
      addLayer("Camera & Lens (L6)", `${c.camera || ""}${c.lens ? ` (${c.lens})` : ""}`);
      addLayer("Composition (L7)", c.composition);
      addLayer("Materials (L3)", c.materials);
      addLayer("Environment (L4)", c.environment);
      addLayer("Palette", c.colorPalette);

      if (c.imagePrompt) {
        const promptPreview = card.createDiv({ cls: "agy-vbrain-prompt-preview" });
        promptPreview.setText(c.imagePrompt);
      }

      const actions = card.createDiv({ cls: "agy-vbrain-card-actions" });

      const addBtn = actions.createEl("button", { text: "Add to Canvas" });
      addBtn.onclick = () => {
        if (this.onApplyConcept) this.onApplyConcept(c, idx);
      };

      const imgBtn = actions.createEl("button", { cls: "mod-cta", text: "Generate Image" });
      imgBtn.onclick = () => {
        if (this.onGenerateImage) this.onGenerateImage(c);
      };

      const refineBtn = actions.createEl("button", { text: "Refine..." });
      refineBtn.onclick = () => {
        if (this.onRefine) this.onRefine(c);
      };
    });

    const footer = contentEl.createDiv({ cls: "agy-modal-footer" });
    const closeBtn = footer.createEl("button", { text: "Close" });
    closeBtn.onclick = () => this.close();

    const addAllBtn = footer.createEl("button", { cls: "mod-cta", text: "Add All 5 Concepts to Canvas" });
    addAllBtn.onclick = () => {
      this.close();
      if (this.onApplyConcept) {
        this.concepts.forEach((c, i) => this.onApplyConcept(c, i));
      }
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ── Visual DNA Preview Modal ────────────────────────────────────────────────

class VisualDNAPreviewModal extends Modal {
  constructor(app, { visualDNA, sourceNode, isLocked = false, onBuild, onLock, onUnlock, onSave, onAddCard, onVariations, onSeries }) {
    super(app);
    this.dna = visualDNA;
    this.sourceNode = sourceNode;
    this.isLocked = isLocked;
    this.onBuild = onBuild;
    this.onLock = onLock;
    this.onUnlock = onUnlock;
    this.onSave = onSave;
    this.onAddCard = onAddCard;
    this.onVariations = onVariations;
    this.onSeries = onSeries;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container", "agy-dna-modal");

    const header = contentEl.createDiv({ cls: "agy-modal-header" });
    header.createEl("h2", { text: `Visual DNA: ${this.dna.name || "Extracted Style"}` });
    header.createSpan({ cls: "agy-badge", text: this.dna.visualLanguage || "Visual Style" });
    if (this.isLocked) {
      header.createSpan({ cls: "agy-lock-badge", text: "Style Locked" });
    }

    if (this.dna.mood) {
      contentEl.createEl("p", {
        cls: "mod-muted",
        text: `Mood: ${this.dna.mood} | Art Direction: ${this.dna.artDirection || "Studio standard"}`
      });
    }

    // Palette Swatches
    const swatchesContainer = contentEl.createDiv({ cls: "agy-dna-swatches" });
    swatchesContainer.createEl("strong", { text: "Palette: " });

    const domGroup = swatchesContainer.createDiv({ cls: "agy-dna-swatch-group" });
    domGroup.createSpan({ cls: "agy-dna-color-label", text: "Dominant: " });
    (this.dna.color?.dominant || []).forEach(hex => {
      const chip = domGroup.createSpan({ cls: "agy-dna-color-chip", title: hex });
      chip.style.backgroundColor = hex;
      domGroup.createSpan({ cls: "agy-dna-color-label", text: hex });
    });

    const accGroup = swatchesContainer.createDiv({ cls: "agy-dna-swatch-group" });
    accGroup.createSpan({ cls: "agy-dna-color-label", text: "Accents: " });
    (this.dna.color?.accent || []).forEach(hex => {
      const chip = accGroup.createSpan({ cls: "agy-dna-color-chip", title: hex });
      chip.style.backgroundColor = hex;
      accGroup.createSpan({ cls: "agy-dna-color-label", text: hex });
    });

    // DNA Properties Grid
    const grid = contentEl.createDiv({ cls: "agy-dna-grid" });

    // Section 1: Lighting & Shadows
    const lightSec = grid.createDiv({ cls: "agy-dna-section" });
    lightSec.createEl("h4", { text: "Lighting & Optics" });
    lightSec.createDiv({ cls: "agy-dna-prop" }).innerHTML = `<strong>Type:</strong> ${this.dna.lighting?.type || "Directional key"}`;
    lightSec.createDiv({ cls: "agy-dna-prop" }).innerHTML = `<strong>Direction:</strong> ${this.dna.lighting?.direction || "45° Key"}`;
    lightSec.createDiv({ cls: "agy-dna-prop" }).innerHTML = `<strong>Shadows:</strong> ${this.dna.lighting?.shadows || "Deep blacks"}`;

    // Section 2: Camera & Staging
    const camSec = grid.createDiv({ cls: "agy-dna-section" });
    camSec.createEl("h4", { text: "Camera & Staging" });
    camSec.createDiv({ cls: "agy-dna-prop" }).innerHTML = `<strong>Perspective:</strong> ${this.dna.camera?.perspective || "Eye-level"}`;
    camSec.createDiv({ cls: "agy-dna-prop" }).innerHTML = `<strong>Lens:</strong> ${this.dna.camera?.lens || "35mm prime"}`;
    camSec.createDiv({ cls: "agy-dna-prop" }).innerHTML = `<strong>Depth:</strong> ${this.dna.composition?.depth || "Layered"}`;

    // Section 3: Materials & Textures
    const matSec = grid.createDiv({ cls: "agy-dna-section" });
    matSec.createEl("h4", { text: "Materials & Surfaces" });
    const matPills = matSec.createDiv({ cls: "agy-pills-container" });
    (this.dna.materials || []).forEach(m => {
      matPills.createSpan({ cls: "agy-pill agy-pill-accent", text: m });
    });
    const texPills = matSec.createDiv({ cls: "agy-pills-container" });
    (this.dna.textures || []).forEach(t => {
      texPills.createSpan({ cls: "agy-pill", text: t });
    });

    // Section 4: Atmosphere & Color Grade
    const atmSec = grid.createDiv({ cls: "agy-dna-section" });
    atmSec.createEl("h4", { text: "Atmosphere & Color Grade" });
    atmSec.createDiv({ cls: "agy-dna-prop" }).innerHTML = `<strong>Atmosphere:</strong> ${this.dna.atmosphere || "Clean"}`;
    atmSec.createDiv({ cls: "agy-dna-prop" }).innerHTML = `<strong>Grade:</strong> ${this.dna.colorGrading || "Cinematic"}`;
    atmSec.createDiv({ cls: "agy-dna-prop" }).innerHTML = `<strong>Realism:</strong> ${this.dna.realism || "Photorealistic"}`;

    // Negative Constraints
    if (this.dna.negativeConstraints && this.dna.negativeConstraints.length > 0) {
      const negBox = contentEl.createDiv({ cls: "agy-dna-section" });
      negBox.createEl("h4", { text: "Negative Style Constraints" });
      const negPills = negBox.createDiv({ cls: "agy-pills-container" });
      this.dna.negativeConstraints.forEach(nc => {
        negPills.createSpan({ cls: "agy-pill agy-pill-negative", text: nc });
      });
    }

    // Modal Actions Footer
    const footer = contentEl.createDiv({ cls: "agy-modal-footer" });

    const cancelBtn = footer.createEl("button", { text: "Close" });
    cancelBtn.onclick = () => this.close();

    const addCardBtn = footer.createEl("button", { text: "Add DNA Card" });
    addCardBtn.onclick = () => {
      this.close();
      if (this.onAddCard) this.onAddCard(this.dna);
    };

    const lockBtn = footer.createEl("button", {
      text: this.isLocked ? "Unlock Style" : "Lock Style as Active"
    });
    lockBtn.onclick = () => {
      this.close();
      if (this.isLocked && this.onUnlock) this.onUnlock(this.dna);
      else if (!this.isLocked && this.onLock) this.onLock(this.dna);
    };

    const saveBtn = footer.createEl("button", { text: "Save Style" });
    saveBtn.onclick = () => {
      this.close();
      if (this.onSave) this.onSave(this.dna);
    };

    const varBtn = footer.createEl("button", { text: "Variations" });
    varBtn.onclick = () => {
      this.close();
      if (this.onVariations) this.onVariations(this.dna);
    };

    const seriesBtn = footer.createEl("button", { text: "Series" });
    seriesBtn.onclick = () => {
      this.close();
      if (this.onSeries) this.onSeries(this.dna);
    };

    const buildBtn = footer.createEl("button", { cls: "mod-cta", text: "Build From This Style..." });
    buildBtn.onclick = () => {
      this.close();
      if (this.onBuild) this.onBuild(this.dna);
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ── Build From Style Modal ──────────────────────────────────────────────────

class BuildFromStyleModal extends Modal {
  constructor(app, { visualDNA, sourceNode, onGenerate }) {
    super(app);
    this.dna = visualDNA;
    this.sourceNode = sourceNode;
    this.onGenerate = onGenerate;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container");

    contentEl.createEl("h2", { text: "Build From This Style (Visual DNA)" });
    contentEl.createEl("p", {
      cls: "mod-muted",
      text: `Preserve the visual identity ("${this.dna.name || "Extracted Style"}") while rendering completely new content.`
    });

    const subjectGroup = contentEl.createDiv({ cls: "setting-item" });
    subjectGroup.createDiv({ cls: "setting-item-info" }).createDiv({
      cls: "setting-item-name",
      text: "New Subject / Concept to Render"
    });
    const subjectInput = subjectGroup.createEl("textarea", {
      cls: "agy-router-textarea",
      placeholder: "e.g., A futuristic gaming room with autonomous drone dock and holographic battle-station..."
    });
    subjectInput.rows = 3;

    // Aspect Ratio Setting
    let selectedAspect = "16:9";
    const aspectGroup = contentEl.createDiv({ cls: "setting-item" });
    aspectGroup.createDiv({ cls: "setting-item-info" }).createDiv({
      cls: "setting-item-name",
      text: "Output Format / Aspect Ratio"
    });
    const aspectSelect = aspectGroup.createEl("select", { cls: "dropdown" });
    [
      { label: "16:9 Widescreen (Landscape Keyart)", val: "16:9" },
      { label: "1:1 Square (Loot / Icon / Object)", val: "1:1" },
      { label: "9:16 Vertical (Mobile App / Reel)", val: "9:16" },
      { label: "2:3 Poster (Cinematic Vertical)", val: "2:3" },
      { label: "3:4 Character / Portrait", val: "3:4" },
    ].forEach(opt => {
      const el = aspectSelect.createEl("option", { text: opt.label, value: opt.val });
      if (opt.val === selectedAspect) el.selected = true;
    });
    aspectSelect.onchange = () => { selectedAspect = aspectSelect.value; };

    // Additional Custom Refinements
    const customGroup = contentEl.createDiv({ cls: "setting-item" });
    customGroup.createDiv({ cls: "setting-item-info" }).createDiv({
      cls: "setting-item-name",
      text: "Additional Nuance / Instructions (Optional)"
    });
    const customInput = customGroup.createEl("input", {
      type: "text",
      placeholder: "e.g., Make it darker, add subtle rain reflections..."
    });
    customInput.style.width = "100%";

    // Footer
    const footer = contentEl.createDiv({ cls: "agy-modal-footer" });
    const cancelBtn = footer.createEl("button", { text: "Cancel" });
    cancelBtn.onclick = () => this.close();

    const generateBtn = footer.createEl("button", { cls: "mod-cta", text: "Generate Image" });
    generateBtn.onclick = () => {
      const subject = subjectInput.value.trim();
      if (!subject) return;
      this.close();
      if (this.onGenerate) {
        this.onGenerate({
          newSubject: subject,
          aspectRatio: selectedAspect,
          customInstructions: customInput.value.trim(),
          visualDNA: this.dna,
        });
      }
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ── Visual Series Modal ─────────────────────────────────────────────────────

class VisualSeriesModal extends Modal {
  constructor(app, { visualDNA, sourceNode, onGenerate }) {
    super(app);
    this.dna = visualDNA;
    this.sourceNode = sourceNode;
    this.onGenerate = onGenerate;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container");

    contentEl.createEl("h2", { text: "Continue Visual Series" });
    contentEl.createEl("p", {
      cls: "mod-muted",
      text: "Generate the next thematic scene belonging to the exact same designed visual universe."
    });

    const nameGroup = contentEl.createDiv({ cls: "setting-item" });
    nameGroup.createDiv({ cls: "setting-item-info" }).createDiv({
      cls: "setting-item-name",
      text: "Series Name"
    });
    const nameInput = nameGroup.createEl("input", {
      type: "text",
      value: `${this.dna.name || "Visual"} Series`
    });
    nameInput.style.width = "100%";

    const nextGroup = contentEl.createDiv({ cls: "setting-item" });
    nextGroup.createDiv({ cls: "setting-item-info" }).createDiv({
      cls: "setting-item-name",
      text: "Next Scene Focus / Subject"
    });
    const nextInput = nextGroup.createEl("textarea", {
      cls: "agy-router-textarea",
      placeholder: "e.g., Threat visualization room with biometric telemetry walls..."
    });
    nextInput.rows = 3;

    const footer = contentEl.createDiv({ cls: "agy-modal-footer" });
    const cancelBtn = footer.createEl("button", { text: "Cancel" });
    cancelBtn.onclick = () => this.close();

    const generateBtn = footer.createEl("button", { cls: "mod-cta", text: "Generate Next Scene" });
    generateBtn.onclick = () => {
      const nextFocus = nextInput.value.trim();
      if (!nextFocus) return;
      this.close();
      if (this.onGenerate) {
        this.onGenerate({
          seriesName: nameInput.value.trim() || "Visual Series",
          nextSceneFocus: nextFocus,
          visualDNA: this.dna,
        });
      }
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ── Visual Variations Modal ─────────────────────────────────────────────────

class VisualVariationsModal extends Modal {
  constructor(app, { variations, visualDNA, onGenerateAll, onGenerateSingle, onAddCards }) {
    super(app);
    this.variations = variations || [];
    this.dna = visualDNA;
    this.onGenerateAll = onGenerateAll;
    this.onGenerateSingle = onGenerateSingle;
    this.onAddCards = onAddCards;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container", "agy-vbrain-modal");

    const header = contentEl.createDiv({ cls: "agy-modal-header" });
    header.createEl("h2", { text: "Visual DNA: Composition Variations" });
    header.createSpan({ cls: "agy-badge", text: `${this.variations.length} Archetypes` });

    contentEl.createEl("p", {
      cls: "mod-muted",
      text: `Differentiated staging and optical variations preserving the "${this.dna.name || "Extracted"}" visual language.`
    });

    const grid = contentEl.createDiv({ cls: "agy-variations-grid" });

    this.variations.forEach((v, idx) => {
      const card = grid.createDiv({ cls: "agy-var-card" });
      const top = card.createDiv({ cls: "agy-vbrain-top" });
      top.createEl("h4", { text: v.title || `Variation ${idx + 1}` });
      top.createSpan({ cls: "agy-badge", text: v.archetype });

      card.createEl("p", { text: v.description });

      const actions = card.createDiv({ cls: "agy-vbrain-card-actions" });
      const genBtn = actions.createEl("button", { cls: "mod-cta", text: "Generate Image" });
      genBtn.onclick = () => {
        this.close();
        if (this.onGenerateSingle) this.onGenerateSingle(v);
      };
    });

    const footer = contentEl.createDiv({ cls: "agy-modal-footer" });
    const closeBtn = footer.createEl("button", { text: "Close" });
    closeBtn.onclick = () => this.close();

    const addCardsBtn = footer.createEl("button", { text: "Add Cards to Canvas" });
    addCardsBtn.onclick = () => {
      this.close();
      if (this.onAddCards) this.onAddCards(this.variations);
    };

    const genAllBtn = footer.createEl("button", { cls: "mod-cta", text: "Generate All Variations" });
    genAllBtn.onclick = () => {
      this.close();
      if (this.onGenerateAll) this.onGenerateAll(this.variations);
    };
  }

  onClose() {
    this.contentEl.empty();
  }
}

// ── Style Library Modal ─────────────────────────────────────────────────────

class StyleLibraryModal extends Modal {
  constructor(app, { styles, activeLock, onApply, onLock, onUnlock, onDelete }) {
    super(app);
    this.styles = styles || [];
    this.activeLock = activeLock;
    this.onApply = onApply;
    this.onLock = onLock;
    this.onUnlock = onUnlock;
    this.onDelete = onDelete;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("agy-modal-container");

    const header = contentEl.createDiv({ cls: "agy-modal-header" });
    header.createEl("h2", { text: "Visual Style Library (My Styles)" });
    if (this.activeLock) {
      header.createSpan({ cls: "agy-lock-badge", text: `Active Lock: ${this.activeLock.name}` });
    }

    contentEl.createEl("p", {
      cls: "mod-muted",
      text: "Saved custom Visual DNA styles. Apply them to new prompts, lock them for multi-generation consistency, or manage your library."
    });

    if (!this.styles.length) {
      const emptyDiv = contentEl.createDiv({ cls: "agy-summary-box" });
      emptyDiv.createEl("p", { text: "No custom styles saved yet. Select an image node on Canvas and choose 'Extract Visual DNA' -> 'Save to Style Library'." });
    } else {
      const list = contentEl.createDiv({ cls: "agy-picker-list" });

      this.styles.forEach(style => {
        const item = list.createDiv({ cls: "agy-picker-item" });
        const top = item.createDiv({ cls: "agy-card-top" });
        top.createSpan({ cls: "agy-badge", text: style.visualLanguage || "Custom DNA" });
        top.createEl("strong", { text: style.name });
        if (this.activeLock && this.activeLock.id === style.id) {
          top.createSpan({ cls: "agy-lock-badge", text: "LOCKED" });
        }

        item.createEl("div", {
          cls: "agy-card-content",
          text: `Palette: ${(style.color?.dominant || []).join(", ")} | Lighting: ${style.lighting?.type || "Directional"} | Mood: ${style.mood || ""}`
        });

        const actions = item.createDiv({ cls: "agy-vbrain-card-actions", style: "margin-top: 8px;" });

        const applyBtn = actions.createEl("button", { cls: "mod-cta", text: "Build From Style" });
        applyBtn.onclick = (e) => {
          e.stopPropagation();
          this.close();
          if (this.onApply) this.onApply(style);
        };

        const isLocked = this.activeLock && this.activeLock.id === style.id;
        const lockBtn = actions.createEl("button", { text: isLocked ? "Unlock" : "Lock Style" });
        lockBtn.onclick = (e) => {
          e.stopPropagation();
          this.close();
          if (isLocked && this.onUnlock) this.onUnlock(style);
          else if (!isLocked && this.onLock) this.onLock(style);
        };

        const delBtn = actions.createEl("button", { text: "Delete" });
        delBtn.onclick = (e) => {
          e.stopPropagation();
          this.close();
          if (this.onDelete) this.onDelete(style);
        };
      });
    }

    const footer = contentEl.createDiv({ cls: "agy-modal-footer" });
    const closeBtn = footer.createEl("button", { text: "Close" });
    closeBtn.onclick = () => this.close();
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
  activeLock = null;
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
    this.addCommand({ id: "agy-context",      name: "AGY Thinking: Context Intelligence Audit", callback: () => this.cmdSkill("context") });

    // Studio & Visual DNA Commands
    this.addCommand({ id: "agy-visual-brainstorm", name: "AGY Studio: Advanced Visual Brainstorming (5 Directions)", callback: () => this.cmdVisualBrainstorm() });
    this.addCommand({ id: "agy-build-from-style", name: "AGY Visual: Build From This Style (Preserve Visual DNA)", callback: () => this.cmdBuildFromStyle() });
    this.addCommand({ id: "agy-extract-dna",     name: "AGY Visual: Extract Visual DNA from Image",              callback: () => this.cmdExtractVisualDNA() });
    this.addCommand({ id: "agy-continue-series",  name: "AGY Visual: Continue Visual Series",                      callback: () => this.cmdContinueSeries() });
    this.addCommand({ id: "agy-create-variations",name: "AGY Visual: Create Variations (Same Style)",              callback: () => this.cmdCreateVariations() });
    this.addCommand({ id: "agy-style-library",    name: "AGY Visual: Open Style Library & Saved Styles",           callback: () => this.cmdOpenStyleLibrary() });
    this.addCommand({ id: "agy-toggle-lock",      name: "AGY Visual: Toggle Active Style Lock",                    callback: () => this.cmdToggleStyleLock() });

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

        const isImg = this.isImageNode(node);

        if (isImg) {
          // Dedicated Group for Image Nodes: Visual DNA & Build From Style
          menu.addSeparator();
          menu.addItem(i => i.setTitle("AGY Visual: Build From This Style...").setIcon("wand").onClick(() => this.buildFromStyle(node)));
          menu.addItem(i => i.setTitle("AGY Visual: Extract Visual DNA").setIcon("dna").onClick(() => this.extractVisualDNA(node)));
          menu.addItem(i => i.setTitle("AGY Visual: Continue Visual Series...").setIcon("film").onClick(() => this.continueVisualSeries(node)));
          menu.addItem(i => i.setTitle("AGY Visual: Create Variations (Same Style)").setIcon("copy").onClick(() => this.createVariations(node)));
          menu.addItem(i => i.setTitle("AGY Visual: Open Style Library...").setIcon("palette").onClick(() => this.openStyleLibrary(node)));
        }

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
        menu.addItem(i => i.setTitle("AGY Thinking: Context Intelligence Audit").setIcon("scan").onClick(() => this.executeSkill("context", node)));

        // Group 2: Studio Visual Actions
        menu.addSeparator();
        menu.addItem(i => i.setTitle("AGY Studio: Visual Brainstorm (5 Directions)").setIcon("sparkles").onClick(() => this.visualBrainstorm(node)));
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

      // Check active style lock state
      const lockRes = await fetch(`${BRIDGE}/visual-dna/lock`, { signal: AbortSignal.timeout(2500) });
      const lockData = await lockRes.json();
      this.activeLock = lockData.locked ? lockData.style : null;
    } catch {
      this.setStatus(false);
      this.activeLock = null;
    }
  }

  setStatus(on) {
    this.online = on;
    if (!this.statusEl) return;
    this.statusEl.empty();
    const dot = this.statusEl.createSpan({ cls: "nav-action-button" });
    const lockText = this.activeLock ? ` [Lock: ${this.activeLock.name}]` : "";
    dot.setText(on ? `AGY Bridge: Online${lockText}` : "AGY Bridge: Offline");
    dot.style.color = on ? "var(--text-success)" : "var(--text-muted)";
    dot.style.fontSize = "11px";
    dot.style.fontWeight = "600";
    dot.title = on ? `Antigravity Bridge is connected.${lockText}` : "Antigravity Bridge offline (port 3099).";
  }

  showStatus() {
    if (this.online) {
      const lockMsg = this.activeLock ? ` | Active Style Lock: "${this.activeLock.name}"` : "";
      new Notice(`Antigravity Bridge is active and ready.${lockMsg}`);
    } else {
      new Notice("Antigravity Bridge is offline. Start it in terminal: node bridge/server.js");
    }
  }

  // ── Canvas Helpers ────────────────────────────────────────────────────────

  getCanvasView() {
    const leaf = this.app.workspace.activeLeaf;
    if (leaf?.view?.getViewType?.() === "canvas") return leaf.view;
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

  isImageNode(node) {
    if (!node) return false;
    if (node.type === "file" && node.file) {
      return /\.(png|jpg|jpeg|webp|svg|gif)$/i.test(node.file);
    }
    const text = node.unknownData?.text || node.text || "";
    return /!\[\[.*?\.(png|jpg|jpeg|webp|svg)\]\]/i.test(text) || /!\[.*?\]\(.*?\.(png|jpg|jpeg|webp|svg)\)/i.test(text);
  }

  getImagePathFromNode(node) {
    if (!node) return "";
    if (node.type === "file" && node.file) return node.file;
    const text = node.unknownData?.text || node.text || "";
    const wikiMatch = text.match(/!\[\[(.*?\.(png|jpg|jpeg|webp|svg))\]\]/i);
    if (wikiMatch) return wikiMatch[1];
    const mdMatch = text.match(/!\[.*?\]\((.*?\.(png|jpg|jpeg|webp|svg))\)/i);
    if (mdMatch) return mdMatch[1];
    return "";
  }

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
        warnings: resp.warnings || [],
        conflicts: resp.conflicts || [],
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

  // ── Visual DNA & Build From Style Implementation ──────────────────────────

  async extractVisualDNA(node) {
    if (!this.guard()) return;
    const imgPath = this.getImagePathFromNode(node);
    const text = node?.unknownData?.text || node?.text || "";

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const { context } = this.extractNodeContext(node, canvasData);

    const n = this.say("AGY: Extracting Visual DNA from image...", 0);
    try {
      const resp = await this.post("visual-dna/extract", {
        imagePath: imgPath,
        imageDescription: text.trim() || imgPath,
        context,
      }, 90000);
      n.hide();

      if (!resp.ok || !resp.visualDNA) {
        return this.say(`Extraction failed: ${resp.error || "Unknown error"}`);
      }

      const isLocked = this.activeLock && (this.activeLock.id === resp.visualDNA.id || this.activeLock.name === resp.visualDNA.name);

      new VisualDNAPreviewModal(this.app, {
        visualDNA: resp.visualDNA,
        sourceNode: node,
        isLocked,
        onBuild: (dna) => this.buildFromStyle(node, dna),
        onLock: async (dna) => {
          await this.post("visual-dna/lock", { visualDNA: dna, lock: true });
          this.activeLock = dna;
          this.setStatus(true);
          this.say(`Visual style "${dna.name}" locked for subsequent generations.`);
        },
        onUnlock: async () => {
          await this.post("visual-dna/lock", { lock: false });
          this.activeLock = null;
          this.setStatus(true);
          this.say("Visual style unlocked.");
        },
        onSave: async (dna) => {
          new RefinePromptModal(this.app, "Save Visual Style", "Enter a name for this custom style in your library:", async (customName) => {
            const saveResp = await this.post("visual-dna/styles", { visualDNA: dna, customName });
            if (saveResp.ok) this.say(`Style "${saveResp.style.name}" saved to Style Library.`);
          }).open();
        },
        onAddCard: async (dna) => {
          const freshData = await this.readCanvas(file);
          this.applyVisualDNACard(file, freshData, node, dna);
          await this.writeCanvas(file, freshData);
          this.say(`Visual DNA card added to Canvas.`);
        },
        onVariations: (dna) => this.createVariations(node, dna),
        onSeries: (dna) => this.continueVisualSeries(node, dna),
      }).open();

    } catch (e) {
      n.hide();
      this.say(`Error: ${e.message}`);
    }
  }

  async buildFromStyle(node, preloadedDNA = null) {
    if (!this.guard()) return;
    const imgPath = this.getImagePathFromNode(node);

    let dna = preloadedDNA;
    if (!dna) {
      const n = this.say("AGY: Analyzing reference style...", 0);
      try {
        const resp = await this.post("visual-dna/extract", {
          imagePath: imgPath,
          imageDescription: node?.unknownData?.text || node?.text || "",
        });
        n.hide();
        if (resp.ok && resp.visualDNA) dna = resp.visualDNA;
      } catch {
        n.hide();
      }
    }

    if (!dna && this.activeLock) {
      dna = this.activeLock;
    }

    if (!dna) {
      return this.say("Could not extract Visual DNA from selected node.");
    }

    new BuildFromStyleModal(this.app, {
      visualDNA: dna,
      sourceNode: node,
      onGenerate: async ({ newSubject, aspectRatio, customInstructions, visualDNA }) => {
        const file = this.getCanvasFile();
        if (!file) return this.say("No active canvas file.");

        const slug = newSubject.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
        const vaultPath = `assets/generated/${slug}-${Date.now()}.png`;

        const gn = this.say(`AGY: Synthesizing "${newSubject}" in [${visualDNA.name}]...`, 0);
        try {
          const resp = await this.post("visual-dna/build", {
            imagePath: imgPath,
            visualDNA,
            newSubject,
            mediaOverride: aspectRatio === "1:1" ? "asset" : aspectRatio === "9:16" ? "ui-screen" : "keyart",
            customInstructions,
            vaultPath,
          }, 180000);
          gn.hide();

          if (!resp.ok) return this.say(`Build failed: ${resp.error || "Unknown error"}`);

          const imgW = resp.width || 560;
          const imgH = resp.height || 315;

          const freshData = await this.readCanvas(file);
          const px = node.x ?? 0;
          const py = node.y ?? 0;
          const pw = node.width ?? 260;
          const ph = node.height ?? 100;

          const imgNode = {
            id: this.uid(),
            type: "file",
            file: resp.savedPath,
            x: px + pw + 120,
            y: py + (ph - imgH) / 2,
            width: imgW,
            height: imgH,
          };

          freshData.nodes.push(imgNode);
          freshData.edges.push({
            id: this.uid(),
            fromNode: node.id,
            fromSide: "right",
            toNode: imgNode.id,
            toSide: "left",
            label: `Style DNA: ${visualDNA.name}`,
          });

          await this.writeCanvas(file, freshData);
          this.say(`New image generated with Visual DNA lineage.`);
        } catch (err) {
          gn.hide();
          this.say(`Build error: ${err.message}`);
        }
      }
    }).open();
  }

  async continueVisualSeries(node, preloadedDNA = null) {
    if (!this.guard()) return;
    const imgPath = this.getImagePathFromNode(node);

    let dna = preloadedDNA;
    if (!dna) {
      const n = this.say("AGY: Analyzing universe style...", 0);
      try {
        const resp = await this.post("visual-dna/extract", { imagePath: imgPath });
        n.hide();
        if (resp.ok && resp.visualDNA) dna = resp.visualDNA;
      } catch { n.hide(); }
    }

    if (!dna && this.activeLock) dna = this.activeLock;
    if (!dna) return this.say("Could not extract Visual DNA for series.");

    new VisualSeriesModal(this.app, {
      visualDNA: dna,
      sourceNode: node,
      onGenerate: async ({ seriesName, nextSceneFocus, visualDNA }) => {
        const file = this.getCanvasFile();
        if (!file) return this.say("No active canvas file.");

        const slug = nextSceneFocus.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
        const vaultPath = `assets/generated/${slug}-${Date.now()}.png`;

        const gn = this.say(`AGY: Synthesizing next scene for "${seriesName}"...`, 0);
        try {
          const resp = await this.post("visual-dna/series", {
            imagePath: imgPath,
            visualDNA,
            seriesName,
            nextSceneFocus,
            vaultPath,
          }, 180000);
          gn.hide();

          if (!resp.ok) return this.say(`Series generation failed: ${resp.error || "Unknown error"}`);

          const imgW = resp.width || 560;
          const imgH = resp.height || 315;

          const freshData = await this.readCanvas(file);
          const px = node.x ?? 0;
          const py = node.y ?? 0;
          const pw = node.width ?? 260;
          const ph = node.height ?? 100;

          const imgNode = {
            id: this.uid(),
            type: "file",
            file: resp.savedPath,
            x: px + pw + 120,
            y: py + (ph - imgH) / 2,
            width: imgW,
            height: imgH,
          };

          freshData.nodes.push(imgNode);
          freshData.edges.push({
            id: this.uid(),
            fromNode: node.id,
            fromSide: "right",
            toNode: imgNode.id,
            toSide: "left",
            label: `${seriesName} (Part ${resp.sceneNumber || 2})`,
          });

          await this.writeCanvas(file, freshData);
          this.say(`Series scene added to Canvas with continuity.`);
        } catch (err) {
          gn.hide();
          this.say(`Series error: ${err.message}`);
        }
      }
    }).open();
  }

  async createVariations(node, preloadedDNA = null) {
    if (!this.guard()) return;
    const imgPath = this.getImagePathFromNode(node);
    const subject = node?.unknownData?.text || node?.text || "Scene";

    let dna = preloadedDNA;
    if (!dna) {
      const n = this.say("AGY: Analyzing Visual DNA...", 0);
      try {
        const resp = await this.post("visual-dna/extract", { imagePath: imgPath });
        n.hide();
        if (resp.ok && resp.visualDNA) dna = resp.visualDNA;
      } catch { n.hide(); }
    }

    if (!dna && this.activeLock) dna = this.activeLock;
    if (!dna) return this.say("Could not extract Visual DNA for variations.");

    const vn = this.say("AGY: Formulating composition variations...", 0);
    try {
      const resp = await this.post("visual-dna/variations", {
        imagePath: imgPath,
        visualDNA: dna,
        subject,
        count: 3,
      });
      vn.hide();

      if (!resp.ok || !resp.variations?.length) {
        return this.say(`Variations failed: ${resp.error || "No variations generated"}`);
      }

      new VisualVariationsModal(this.app, {
        variations: resp.variations,
        visualDNA: dna,
        onGenerateSingle: async (v) => {
          this.genImageWithPrompt(node, {
            title: v.title,
            imagePrompt: v.imagePrompt,
            style: v.style,
            media: v.media,
          });
        },
        onGenerateAll: async (variations) => {
          this.say(`Generating ${variations.length} variations in parallel...`);
          variations.forEach(v => {
            this.genImageWithPrompt(node, {
              title: v.title,
              imagePrompt: v.imagePrompt,
              style: v.style,
              media: v.media,
            });
          });
        },
        onAddCards: async (variations) => {
          const file = this.getCanvasFile();
          if (!file) return;
          const freshData = await this.readCanvas(file);
          this.applyVariationCards(file, freshData, node, variations, dna);
          await this.writeCanvas(file, freshData);
          this.say(`Added ${variations.length} variation cards to Canvas.`);
        }
      }).open();

    } catch (e) {
      vn.hide();
      this.say(`Error: ${e.message}`);
    }
  }

  async openStyleLibrary(targetNode = null) {
    if (!this.guard()) return;
    try {
      const resp = await fetch(`${BRIDGE}/visual-dna/styles`);
      const data = await resp.json();
      const styles = data.ok ? data.styles : [];

      new StyleLibraryModal(this.app, {
        styles,
        activeLock: this.activeLock,
        onApply: (style) => {
          const node = targetNode || this.getSelectedNode();
          if (!node) return this.say("Select a card first.");
          this.buildFromStyle(node, style);
        },
        onLock: async (style) => {
          await this.post("visual-dna/lock", { visualDNA: style, lock: true });
          this.activeLock = style;
          this.setStatus(true);
          this.say(`Active style locked to: "${style.name}"`);
        },
        onUnlock: async () => {
          await this.post("visual-dna/lock", { lock: false });
          this.activeLock = null;
          this.setStatus(true);
          this.say("Active style unlocked.");
        },
        onDelete: async (style) => {
          await fetch(`${BRIDGE}/visual-dna/styles/${style.id}`, { method: "DELETE" });
          this.say(`Deleted style "${style.name}"`);
          if (this.activeLock && this.activeLock.id === style.id) {
            this.activeLock = null;
            this.setStatus(true);
          }
        },
      }).open();
    } catch {
      this.say("Could not fetch Style Library.");
    }
  }

  applyVisualDNACard(canvasFile, canvasData, focalNode, dna) {
    const px = focalNode.x ?? 0;
    const py = focalNode.y ?? 0;
    const pw = focalNode.width ?? 260;
    const ph = focalNode.height ?? 100;

    const cardWidth = 460;
    const cardHeight = 360;
    const newId = this.uid();

    const markdownLines = [
      `### [VISUAL DNA] ${dna.name || "Extracted Style"}`,
      `> **Art Direction**: ${dna.artDirection || "Studio standard"}`,
      `> **Mood**: ${dna.mood || "Focused"}`,
      "",
      "#### Palette",
      `- **Dominant**: ${(dna.color?.dominant || []).join(", ") || "N/A"}`,
      `- **Accents**: ${(dna.color?.accent || []).join(", ") || "N/A"}`,
      `- **Contrast**: ${dna.color?.contrast || "High"} | **Saturation**: ${dna.color?.saturation || "Controlled"}`,
      "",
      "#### Optics & Lighting",
      `- **Lighting**: ${dna.lighting?.type || "Directional key"} (${dna.lighting?.direction || "45°"})`,
      `- **Camera**: ${dna.camera?.lens || "35mm prime"} | ${dna.camera?.perspective || "Eye-level"}`,
      `- **Composition**: ${dna.composition?.layout || "Rule-of-thirds"} (${dna.composition?.depth || "Layered"})`,
      "",
      "#### Materials & Atmosphere",
      `- **Materials**: ${(dna.materials || []).join(", ") || "N/A"}`,
      `- **Atmosphere**: ${dna.atmosphere || "Clean"} | **Grade**: ${dna.colorGrading || "Cinematic"}`,
    ];

    const newNode = {
      id: newId,
      type: "text",
      text: markdownLines.join("\n"),
      x: px + pw + 120,
      y: py + (ph - cardHeight) / 2,
      width: cardWidth,
      height: cardHeight,
      color: "5",
    };

    const newEdge = {
      id: this.uid(),
      fromNode: focalNode.id,
      fromSide: "right",
      toNode: newId,
      toSide: "left",
      label: "Visual DNA Profile",
    };

    canvasData.nodes.push(newNode);
    canvasData.edges.push(newEdge);
  }

  applyVariationCards(canvasFile, canvasData, focalNode, variations, dna) {
    const px = focalNode.x ?? 0;
    const py = focalNode.y ?? 0;
    const pw = focalNode.width ?? 260;
    const ph = focalNode.height ?? 100;

    const cardWidth = 420;
    const cardHeight = 260;
    const gapX = 120;
    const gapY = 30;

    variations.forEach((v, idx) => {
      const newId = this.uid();
      const markdownLines = [
        `### [VARIATION] ${v.title}`,
        `**Archetype**: ${v.archetype}`,
        "",
        v.description,
        "",
        `*Optics: ${v.camera?.lens || "Wide"} | Lighting: ${v.lighting?.type || "Directional"}*`,
      ];

      const newNode = {
        id: newId,
        type: "text",
        text: markdownLines.join("\n"),
        x: px + pw + gapX,
        y: py + idx * (cardHeight + gapY),
        width: cardWidth,
        height: cardHeight,
        color: "4",
      };

      const newEdge = {
        id: this.uid(),
        fromNode: focalNode.id,
        fromSide: "right",
        toNode: newId,
        toSide: "left",
        label: `Variation: ${v.archetype}`,
      };

      canvasData.nodes.push(newNode);
      canvasData.edges.push(newEdge);
    });
  }

  // ── Visual Brainstorming Execution ────────────────────────────────────────

  async visualBrainstorm(node, styleOverride = null, userPrompt = null) {
    if (!this.guard()) return;
    const text = node?.unknownData?.text || node?.text || "";
    if (!text.trim() && !userPrompt) return this.say("Node is empty.");

    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const canvasData = await this.readCanvas(file);
    const { context } = this.extractNodeContext(node, canvasData);
    const vaultNotes = await this.getVaultContextForNode(node, file);

    const n = this.say("AGY: Running Visual Brainstorming (5 Directions)...", 0);
    try {
      const resp = await this.post("canvas-visual-brainstorm", {
        nodeText: text.trim(),
        context,
        styleOverride: styleOverride || (this.activeLock ? this.activeLock.id : null),
        userPrompt: userPrompt || "",
        vaultNotes,
      }, 120000);
      n.hide();

      if (!resp.ok || !resp.concepts?.length) {
        return this.say(`Visual brainstorm failed: ${resp.error || "No concepts generated"}`);
      }

      new VisualBrainstormModal(this.app, {
        focalText: text.trim(),
        concepts: resp.concepts,
        directions: resp.directions || [],
        recommendations: resp.recommendations || {},
        onApplyConcept: async (concept, i) => {
          const freshData = await this.readCanvas(file);
          this.applyVisualConceptCard(file, freshData, node, concept, i);
          await this.writeCanvas(file, freshData);
          this.say(`Added "${concept.title}" to Canvas.`);
        },
        onGenerateImage: async (concept) => {
          this.genImageWithPrompt(node, concept);
        },
        onRefine: (concept) => {
          new RefinePromptModal(this.app, "Refine Visual Concept", `Enter refinement instructions for "${concept.title}":`, async (refineText) => {
            const rn = this.say("AGY: Refining visual concept...", 0);
            try {
              const refineResp = await this.post("canvas-visual-brainstorm/refine", {
                baseConcept: concept,
                refinementInstructions: refineText,
              });
              rn.hide();
              if (refineResp.ok && refineResp.concept) {
                this.say("Concept refined.");
                const freshData = await this.readCanvas(file);
                this.applyVisualConceptCard(file, freshData, node, refineResp.concept, 0);
                await this.writeCanvas(file, freshData);
              }
            } catch (err) {
              rn.hide();
              this.say(`Refinement failed: ${err.message}`);
            }
          }).open();
        }
      }).open();

    } catch (e) {
      n.hide();
      this.say(`Error: ${e.message}`);
    }
  }

  applyVisualConceptCard(canvasFile, canvasData, focalNode, concept, index = 0) {
    const px = focalNode.x ?? 0;
    const py = focalNode.y ?? 0;
    const pw = focalNode.width ?? 260;
    const ph = focalNode.height ?? 100;

    const cardWidth = 460;
    const cardHeight = 360;
    const gapX = 120;
    const gapY = 30;

    const newId = this.uid();
    const markdownLines = [
      `### [${(concept.dimensionId || "CONCEPT").toUpperCase()}] ${concept.title}`,
      concept.visualMetaphor ? `> **Metaphor**: ${concept.visualMetaphor}` : "",
      "",
      concept.visualStory || "",
      "",
      "#### 7-Layer Visual Detail",
      `- **Subject**: ${concept.subject || "N/A"}`,
      `- **Secondary Details**: ${(concept.details || []).join(", ") || "N/A"}`,
      `- **Materials**: ${concept.materials || "N/A"}`,
      `- **Environment**: ${concept.environment || "N/A"}`,
      `- **Lighting**: ${concept.lighting || "N/A"}`,
      `- **Camera & Lens**: ${concept.camera || ""} ${concept.lens ? `(${concept.lens})` : ""}`,
      `- **Composition**: ${concept.composition || "N/A"}`,
      "",
      `*Style: ${concept.style?.name || "Auto"} | Format: ${concept.media?.defaultAspect || "16:9"}*`,
    ].filter(Boolean);

    const newNode = {
      id: newId,
      type: "text",
      text: markdownLines.join("\n"),
      x: px + pw + gapX,
      y: py + index * (cardHeight + gapY),
      width: cardWidth,
      height: cardHeight,
      color: "3",
    };

    const newEdge = {
      id: this.uid(),
      fromNode: focalNode.id,
      fromSide: "right",
      toNode: newId,
      toSide: "left",
      label: concept.title || "Visual Concept",
    };

    canvasData.nodes.push(newNode);
    canvasData.edges.push(newEdge);
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
        color:  "6",
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
      this.say("16:9 Editorial Wireframe Card generated.");
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

    const n = this.say("AGY: Expanding card narrative & context recommendation...", 0);
    try {
      const resp = await this.post("canvas-expand-recommend", { nodeText: text.trim(), context }, 60000);
      n.hide();
      if (!resp.ok || !resp.text) return this.say("Failed to expand context.");

      const data = await this.readCanvas(file);
      const px = node.x ?? 0;
      const py = node.y ?? 0;
      const pw = node.width ?? 250;
      const ph = node.height ?? 60;

      const recNode = {
        id:     this.uid(),
        type:   "text",
        text:   resp.text,
        x:      px + pw + 100,
        y:      py + (ph - 180) / 2,
        width:  360,
        height: 180,
        color:  "4",
      };

      data.nodes.push(recNode);
      data.edges.push({
        id:       this.uid(),
        fromNode: node.id,
        fromSide: "right",
        toNode:   recNode.id,
        toSide:   "left",
        label:    "Context Expansion",
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

    const effectiveStyle = styleOverride || (this.activeLock ? this.activeLock.id : null);
    const styleName = effectiveStyle ? `[${effectiveStyle.toUpperCase()}]` : "[Auto]";
    const n = this.say(`AGY: Synthesizing image ${styleName}...`, 0);

    try {
      const resp = await this.post("generate-image", {
        prompt: text.trim(),
        context,
        styleOverride: effectiveStyle,
        vaultPath,
      }, 120000);
      n.hide();

      if (!resp.ok) return this.say(`Image generation failed: ${resp.error || "Unknown error"}`);

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

  async genImageWithPrompt(node, concept) {
    if (!this.guard()) return;
    const file = this.getCanvasFile();
    if (!file) return this.say("No active canvas file.");

    const slug = (concept.title || "art").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
    const vaultPath = `assets/generated/${slug}-${Date.now()}.png`;
    const styleName = concept.style?.name || "Auto";

    const n = this.say(`AGY: Synthesizing image [${styleName}]...`, 0);
    try {
      const resp = await this.post("generate-image", {
        prompt: concept.imagePrompt || concept.subject || concept.title,
        styleOverride: concept.style?.id,
        mediaOverride: concept.media?.id,
        vaultPath,
      }, 180000);
      n.hide();

      if (!resp.ok) return this.say(`Image generation failed: ${resp.error || "Unknown error"}`);

      const imgW = resp.width || concept.media?.defaultSize?.width || 560;
      const imgH = resp.height || concept.media?.defaultSize?.height || 315;

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
        label:    concept.title || `AGY: ${styleName}`,
      });

      await this.writeCanvas(file, data);
      this.say(`Image generated and placed on Canvas.${resp.cached ? " (cached)" : ""}`);
    } catch (e) {
      n.hide();
      this.say(`Error: ${e.message}`);
    }
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

  cmdVisualBrainstorm() {
    const node = this.getSelectedNode();
    if (!node) return this.say("Please select a Canvas card first.");
    this.visualBrainstorm(node);
  }

  cmdBuildFromStyle() {
    const node = this.getSelectedNode();
    if (!node) return this.say("Please select an image card first.");
    this.buildFromStyle(node);
  }

  cmdExtractVisualDNA() {
    const node = this.getSelectedNode();
    if (!node) return this.say("Please select an image card first.");
    this.extractVisualDNA(node);
  }

  cmdContinueSeries() {
    const node = this.getSelectedNode();
    if (!node) return this.say("Please select an image card first.");
    this.continueVisualSeries(node);
  }

  cmdCreateVariations() {
    const node = this.getSelectedNode();
    if (!node) return this.say("Please select an image card first.");
    this.createVariations(node);
  }

  cmdOpenStyleLibrary() {
    this.openStyleLibrary();
  }

  async cmdToggleStyleLock() {
    if (this.activeLock) {
      await this.post("visual-dna/lock", { lock: false });
      this.activeLock = null;
      this.setStatus(true);
      this.say("Active Visual Style unlocked.");
    } else {
      const node = this.getSelectedNode();
      if (node && this.isImageNode(node)) {
        this.extractVisualDNA(node);
      } else {
        this.openStyleLibrary();
      }
    }
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
