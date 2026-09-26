import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  SKILL_DEFINITIONS,
  SKILL_PROMPT_INSTRUCTIONS,
  routeIntent,
} from "./skills-engine.js";

import {
  CONTEXT_LEVELS,
  SKILL_CONTEXT_REQUIREMENTS,
  calculateRelevanceScore,
  detectConflicts,
  checkContextSufficiency,
  buildContextPackage,
} from "./context-engine.js";

import {
  STYLE_REGISTRY,
  MEDIA_TYPES,
  resolveStyle,
  buildVisualPrompt,
  getStyleById,
  getMediaById,
  listStyles,
  listStyleFamilies,
} from "./style-registry.js";

import {
  validateSkillResult,
  validateCanvasData,
} from "./canvas-validator.js";

// ============================================================================
// 1. Skill Registry & Intent Routing
// ============================================================================
describe("1. Skill Registry & Cognitive Routing", () => {
  const EXPECTED_SKILL_IDS = [
    "context",
    "brainstorm",
    "explore",
    "connect",
    "find-gaps",
    "decompose",
    "roadmap",
    "challenge",
    "research-map",
    "synthesize",
    "evolve",
  ];

  it("should define exactly 11 cognitive skills", () => {
    const keys = Object.keys(SKILL_DEFINITIONS);
    assert.equal(keys.length, 11, `Expected 11 skills, found ${keys.length}`);
    for (const id of EXPECTED_SKILL_IDS) {
      assert.ok(SKILL_DEFINITIONS[id], `Missing skill definition: ${id}`);
    }
  });

  it("should define all required metadata for each cognitive skill", () => {
    for (const [id, skill] of Object.entries(SKILL_DEFINITIONS)) {
      assert.ok(typeof skill.name === "string" && skill.name.trim().length > 0, `${id}: missing valid name`);
      assert.ok(typeof skill.badge === "string" && skill.badge.trim().length > 0, `${id}: missing valid badge`);
      assert.ok(typeof skill.description === "string" && skill.description.trim().length > 0, `${id}: missing valid description`);
      assert.ok(typeof skill.suggestedColor === "string" && /^[1-6]$/.test(skill.suggestedColor), `${id}: invalid suggestedColor (${skill.suggestedColor})`);
      assert.ok(Array.isArray(skill.nextSkills) && skill.nextSkills.length > 0, `${id}: nextSkills must be a non-empty array`);
      
      // Ensure each nextSkill references an existing skill definition
      for (const nextSkill of skill.nextSkills) {
        assert.ok(SKILL_DEFINITIONS[nextSkill], `${id}: referenced nextSkill "${nextSkill}" does not exist in SKILL_DEFINITIONS`);
      }
    }
  });

  it("should define prompt instructions for all 11 skills", () => {
    for (const id of EXPECTED_SKILL_IDS) {
      assert.ok(typeof SKILL_PROMPT_INSTRUCTIONS[id] === "string" && SKILL_PROMPT_INSTRUCTIONS[id].length > 10, `${id}: missing prompt instruction`);
    }
  });

  it("should correctly route natural language queries via routeIntent", () => {
    const testCases = [
      { query: "context", expected: "context" },
      { query: "knowledge audit", expected: "context" },
      { query: "overview", expected: "context" },
      { query: "understand state", expected: "context" },
      { query: "missing architecture gaps", expected: "find-gaps" },
      { query: "break down subsystems", expected: "decompose" },
      { query: "timeline plan", expected: "roadmap" },
      { query: "challenge assumptions", expected: "challenge" },
      { query: "open inquiry", expected: "research-map" },
      { query: "connect and relate dependencies", expected: "connect" },
      { query: "synthesize multiple notes into model", expected: "synthesize" },
      { query: "evolve canvas sync diff", expected: "evolve" },
      { query: "explore deep dive concept", expected: "explore" },
      { query: "completely novel unclassified idea", expected: "brainstorm" },
    ];

    for (const { query, expected } of testCases) {
      const routed = routeIntent({ userPrompt: query });
      assert.ok(routed, `routeIntent returned empty for query: "${query}"`);
      assert.equal(routed.skillId, expected, `Query "${query}" expected skill "${expected}", but got "${routed.skillId}"`);
      assert.ok(routed.confidence > 0, `Confidence score should be > 0 for "${query}"`);
      assert.ok(typeof routed.reason === "string" && routed.reason.length > 0, `Reason should be non-empty for "${query}"`);
    }
  });
});

// ============================================================================
// 2. Style Registry & Style Resolution
// ============================================================================
describe("2. Style Registry & Style Resolution", () => {
  it("should have comprehensive style registry entries with metadata", () => {
    const styles = listStyles();
    assert.ok(styles.length >= 10, "Should have at least 10 visual styles");
    const families = listStyleFamilies();
    assert.ok(Object.keys(families).length >= 3, "Should have multiple style families");

    for (const style of Object.values(STYLE_REGISTRY)) {
      assert.ok(style.id, "Style missing id");
      assert.ok(style.name, "Style missing name");
      assert.ok(style.family, "Style missing family");
      assert.ok(style.composition, "Style missing composition");
      assert.ok(style.lighting, "Style missing lighting");
      assert.ok(style.color, "Style missing color");
      assert.ok(Array.isArray(style.negativeConstraints), "Style negativeConstraints should be array");
    }
  });

  it("should prioritize explicit user style override over auto-detection", () => {
    const result = resolveStyle({
      styleOverride: "neo-noir",
      prompt: "cute colorful cartoon kitten playing in sunshine",
    });
    assert.equal(result.style.id, "neo-noir", "Explicit style override 'neo-noir' must take precedence");
  });

  it("should resolve legacy string overrides for backward compatibility", () => {
    const legacyTests = [
      { legacy: "gaming", expectedStyle: "aaa-game-keyart", expectedMedia: "keyart" },
      { legacy: "mobile_ui", expectedStyle: "minimal-saas", expectedMedia: "ui-screen" },
      { legacy: "loot", expectedStyle: "gaming-macro-loot", expectedMedia: "asset" },
      { legacy: "cartoon", expectedStyle: "modern-cartoon-3d", expectedMedia: "concept-art" },
      { legacy: "cinematic", expectedStyle: "cinematic-realism", expectedMedia: "poster" },
      { legacy: "anime", expectedStyle: "anime-cinematic", expectedMedia: "concept-art" },
    ];

    for (const { legacy, expectedStyle, expectedMedia } of legacyTests) {
      const res = resolveStyle({ styleOverride: legacy });
      assert.equal(res.style?.id, expectedStyle, `Legacy override '${legacy}' should map to style '${expectedStyle}', got '${res.style?.id}'`);
      assert.equal(res.media?.id, expectedMedia, `Legacy override '${legacy}' should map to media '${expectedMedia}', got '${res.media?.id}'`);
    }
  });

  it("should auto-detect style and media from prompt text", () => {
    const autoTests = [
      { prompt: "dark fantasy dungeon warrior", expectedStyle: "dark-fantasy-art" },
      { prompt: "futuristic deep space orbital station", expectedStyle: "sci-fi-cinematic" },
      { prompt: "luxury gold watch editorial fashion", expectedStyle: "luxury-editorial" },
      { prompt: "mobile app screen user onboarding flow", expectedMedia: "ui-screen" },
      { prompt: "legendary magical sword weapon loot relic", expectedMedia: "asset" },
      { prompt: "youtube viral thumbnail clickbait face", expectedMedia: "thumbnail" },
    ];

    for (const { prompt, expectedStyle, expectedMedia } of autoTests) {
      const res = resolveStyle({ prompt });
      if (expectedStyle) {
        assert.equal(res.style?.id, expectedStyle, `Prompt "${prompt}" expected style "${expectedStyle}", got "${res.style?.id}"`);
      }
      if (expectedMedia) {
        assert.equal(res.media?.id, expectedMedia, `Prompt "${prompt}" expected media "${expectedMedia}", got "${res.media?.id}"`);
      }
    }
  });

  it("should handle media type fallback and aspect ratio resolution", () => {
    // Media override takes priority
    const resWithMediaOverride = resolveStyle({
      styleOverride: "neo-noir",
      mediaOverride: "social",
    });
    assert.equal(resWithMediaOverride.media.id, "social");
    assert.equal(resWithMediaOverride.media.defaultAspect, "1:1");

    // Media fallback from style compatibleMedia
    const resFallback = resolveStyle({
      styleOverride: "neo-noir",
    });
    assert.ok(resFallback.media, "Media must be resolved");
    assert.ok(resFallback.style.compatibleMedia.includes(resFallback.media.id), "Media should be among compatibleMedia of style");
    assert.ok(resFallback.media.defaultAspect, "Media must have defaultAspect");
    assert.ok(resFallback.media.defaultSize?.width > 0 && resFallback.media.defaultSize?.height > 0, "Media must have valid defaultSize dimensions");
  });

  it("should build visual prompt with style rules, composition, lighting, and negative constraints", () => {
    const style = getStyleById("neo-noir");
    const media = getMediaById("poster");
    const prompt = buildVisualPrompt({
      subject: "A detective standing under a street lamp",
      context: "Rainy cyberpunk alleyway",
      style,
      media,
      customInstructions: "Emphasize volumetric steam from manholes",
    });

    assert.ok(prompt.includes(`[STYLE: ${style.name}]`), "Visual prompt must include style name header");
    assert.ok(prompt.includes("Primary Subject / Concept: [A detective standing under a street lamp]"), "Visual prompt must include subject");
    assert.ok(prompt.includes(`Composition: ${style.composition}`), "Visual prompt must include style composition");
    assert.ok(prompt.includes(`Lighting: ${style.lighting}`), "Visual prompt must include style lighting");
    assert.ok(prompt.includes(`Color grading: ${style.color}`), "Visual prompt must include style color");
    assert.ok(prompt.includes(`Mood: ${style.mood}`), "Visual prompt must include style mood");
    assert.ok(prompt.includes(`Output format: ${media.defaultAspect} aspect ratio`), "Visual prompt must include output format");
    assert.ok(prompt.includes("Emphasize volumetric steam from manholes"), "Visual prompt must include custom instructions");
    assert.ok(prompt.includes("--no no bright cheerful colors"), "Visual prompt must include negative constraints prefixed with --no");
  });

  it("should build fallback visual prompt gracefully when style/media are omitted", () => {
    const fallbackPrompt = buildVisualPrompt({
      subject: "A plain concept card",
      context: "Some context",
    });
    assert.equal(fallbackPrompt, "A plain concept card. Context: Some context");
  });
});

// ============================================================================
// 3. Canvas Validator & Output Normalization
// ============================================================================
describe("3. Canvas Validator & Output Normalization", () => {
  it("should reject non-objects or null raw input", () => {
    const nullRes = validateSkillResult(null);
    assert.equal(nullRes.valid, false);
    assert.ok(nullRes.errors.length > 0);

    const stringRes = validateSkillResult("invalid string payload");
    assert.equal(stringRes.valid, false);

    const numberRes = validateSkillResult(12345);
    assert.equal(numberRes.valid, false);
  });

  it("should reject results with empty nodes array or missing nodes", () => {
    const emptyNodesRes = validateSkillResult({ summary: "Done", nodes: [] });
    assert.equal(emptyNodesRes.valid, false);
    assert.ok(emptyNodesRes.errors.some(e => e.includes("No valid nodes")));

    const missingNodesRes = validateSkillResult({ summary: "Done" });
    assert.equal(missingNodesRes.valid, false);
  });

  it("should deduplicate nodes matching existing canvas titles (case-insensitive)", () => {
    const raw = {
      summary: "Analyzed concepts",
      nodes: [
        { id: "1", title: "Existing Concept", type: "concept", content: "Details" },
        { id: "2", title: "existing concept", type: "concept", content: "Details duplicate" },
        { id: "3", title: "Brand New Finding", type: "concept", content: "Fresh analysis" },
      ],
    };
    const existingTitles = ["EXISTING CONCEPT", "Another Old Card"];
    const validation = validateSkillResult(raw, existingTitles);

    assert.equal(validation.valid, true);
    assert.equal(validation.result.nodes.length, 1);
    assert.equal(validation.result.nodes[0].title, "Brand New Finding");
    assert.ok(validation.errors.some(e => e.includes("Skipped (already on Canvas)")));
  });

  it("should deduplicate internal duplicate node titles within the same result", () => {
    const raw = {
      summary: "Internal duplicate test",
      nodes: [
        { id: "1", title: "Duplicate Node", type: "concept" },
        { id: "2", title: "duplicate node", type: "concept" },
        { id: "3", title: "Unique Node", type: "task" },
      ],
    };
    const validation = validateSkillResult(raw);
    assert.equal(validation.valid, true);
    assert.equal(validation.result.nodes.length, 2);
    assert.equal(validation.result.nodes[0].title, "Duplicate Node");
    assert.equal(validation.result.nodes[1].title, "Unique Node");
    assert.ok(validation.errors.some(e => e.includes("Skipped duplicate")));
  });

  it("should truncate nodes beyond MAX_NODES (8)", () => {
    const rawNodes = Array.from({ length: 15 }, (_, i) => ({
      id: `node-${i + 1}`,
      title: `Generated Card ${i + 1}`,
      type: "concept",
      content: `Card content ${i + 1}`,
    }));

    const validation = validateSkillResult({
      summary: "Generated 15 nodes",
      nodes: rawNodes,
    });

    assert.equal(validation.valid, true);
    assert.equal(validation.result.nodes.length, 8, "Must truncate at 8 nodes");
    assert.ok(validation.errors.some(e => e.includes("Truncated at 8")));
  });

  it("should normalize invalid node types and colors to safe defaults", () => {
    const raw = {
      summary: "Testing normalization",
      nodes: [
        { id: "n1", title: "Normal Risk", type: "risk", color: "1" },
        { id: "n2", title: "Invalid Type Node", type: "unknown-bad-type", color: "99" },
        { id: "", title: "Missing ID Node", type: "decision", color: "3" },
      ],
    };

    const validation = validateSkillResult(raw);
    assert.equal(validation.valid, true);
    assert.equal(validation.result.nodes.length, 3);

    // Normal risk preserved
    assert.equal(validation.result.nodes[0].type, "risk");
    assert.equal(validation.result.nodes[0].color, "1");

    // Invalid type normalized to "concept", invalid color normalized to "6"
    assert.equal(validation.result.nodes[1].type, "concept");
    assert.equal(validation.result.nodes[1].color, "6");

    // Missing id gets auto-generated id
    assert.ok(validation.result.nodes[2].id.startsWith("node-"));
  });

  it("should validate relationships, questions, gaps, and nextSkills normalization", () => {
    const raw = {
      summary: "Full analysis",
      reasoning: "Detailed reasoning",
      nodes: [
        { id: "a", title: "Node A", type: "concept" },
        { id: "b", title: "Node B", type: "task" },
      ],
      relationships: [
        { from: "a", to: "b", label: "enables", reason: "Direct dependency" },
        { from: "a", to: "", label: "invalid rel" }, // missing 'to'
      ],
      questions: ["How to scale?", "   ", 1234],
      gaps: ["Missing fallback", ""],
      nextSkills: ["explore", "invalid-skill", "roadmap"],
    };

    const validation = validateSkillResult(raw);
    assert.equal(validation.valid, true);
    assert.equal(validation.result.relationships.length, 1);
    assert.equal(validation.result.relationships[0].label, "enables");
    assert.deepEqual(validation.result.questions, ["How to scale?"]);
    assert.deepEqual(validation.result.gaps, ["Missing fallback"]);
    assert.deepEqual(validation.result.nextSkills, ["explore", "roadmap"]);
  });

  it("should validate canvas data structure and detect orphan edges", () => {
    // Valid canvas data
    const validCanvas = {
      nodes: [
        { id: "node-1", type: "text", text: "Root" },
        { id: "node-2", type: "text", text: "Child" },
      ],
      edges: [
        { id: "edge-1", fromNode: "node-1", toNode: "node-2" },
      ],
    };
    const validRes = validateCanvasData(validCanvas);
    assert.equal(validRes.valid, true);
    assert.equal(validRes.errors.length, 0);

    // Canvas with orphan edges
    const brokenCanvas = {
      nodes: [
        { id: "node-1", type: "text", text: "Root" },
      ],
      edges: [
        { id: "edge-1", fromNode: "node-1", toNode: "ghost-node" },
        { id: "edge-2", fromNode: "missing-origin", toNode: "node-1" },
      ],
    };
    const brokenRes = validateCanvasData(brokenCanvas);
    assert.equal(brokenRes.valid, false);
    assert.equal(brokenRes.errors.length, 2);
    assert.ok(brokenRes.errors.some(e => e.includes("invalid toNode: ghost-node")));
    assert.ok(brokenRes.errors.some(e => e.includes("invalid fromNode: missing-origin")));

    // Non-object or invalid types
    assert.equal(validateCanvasData(null).valid, false);
    assert.equal(validateCanvasData({ nodes: "not-an-array", edges: [] }).valid, false);
    assert.equal(validateCanvasData({ nodes: [], edges: "not-an-array" }).valid, false);
  });
});

// ============================================================================
// 4. Context Intelligence Engine
// ============================================================================
describe("4. Context Intelligence Engine", () => {
  it("should define CONTEXT_LEVELS with 4 ascending scopes and expected metadata", () => {
    const expectedLevels = ["selection", "local", "project", "graph"];
    assert.deepEqual(Object.keys(CONTEXT_LEVELS), expectedLevels);

    for (let i = 0; i < expectedLevels.length; i++) {
      const id = expectedLevels[i];
      const level = CONTEXT_LEVELS[id];
      assert.equal(level.id, id);
      assert.equal(level.level, i + 1);
      assert.ok(typeof level.name === "string" && level.name.length > 0);
      assert.ok(typeof level.description === "string" && level.description.length > 0);
      assert.ok(Array.isArray(level.includes) && level.includes.length > 0);
      assert.ok(typeof level.maxNodes === "number" && level.maxNodes > 0);
      assert.ok(typeof level.includeVaultNotes === "boolean");
      assert.ok(typeof level.includeCanvasSummary === "boolean");
    }

    assert.equal(CONTEXT_LEVELS.selection.includeVaultNotes, false);
    assert.equal(CONTEXT_LEVELS.selection.includeCanvasSummary, false);
    assert.equal(CONTEXT_LEVELS.local.includeVaultNotes, true);
    assert.equal(CONTEXT_LEVELS.project.includeVaultNotes, true);
    assert.equal(CONTEXT_LEVELS.graph.includeVaultNotes, true);
    assert.ok(CONTEXT_LEVELS.graph.maxNodes > CONTEXT_LEVELS.project.maxNodes);
  });

  it("should define SKILL_CONTEXT_REQUIREMENTS for all skills", () => {
    const allSkillKeys = Object.keys(SKILL_DEFINITIONS);
    for (const skillId of allSkillKeys) {
      const req = SKILL_CONTEXT_REQUIREMENTS[skillId];
      assert.ok(req, `Missing context requirement for skill: ${skillId}`);
      assert.ok(["selection", "local", "project", "graph"].includes(req.scope), `Invalid scope '${req.scope}' for ${skillId}`);
      assert.ok(Array.isArray(req.needs) && req.needs.length > 0, `Needs must be non-empty array for ${skillId}`);
      assert.ok(typeof req.description === "string" && req.description.length > 0, `Missing description for ${skillId}`);
    }
  });

  it("should calculate relevance score with factors and explanatory reasons", () => {
    // Direct selection bonus
    const selRes = calculateRelevanceScore({
      item: { id: "n1", text: "Database Architecture" },
      focalText: "Other topic",
      directSelection: true,
    });
    assert.ok(selRes.score >= 0.35, "Direct selection should give at least 0.35");
    assert.ok(selRes.reasons.some(r => r.includes("Directly selected")));

    // Hop distance scoring
    const hop0Res = calculateRelevanceScore({ item: { text: "Topic" }, parentDistance: 0 });
    const hop1Res = calculateRelevanceScore({ item: { text: "Topic" }, parentDistance: 1 });
    const hop2Res = calculateRelevanceScore({ item: { text: "Topic" }, parentDistance: 2 });
    const hop4Res = calculateRelevanceScore({ item: { text: "Topic" }, parentDistance: 4 });
    assert.ok(hop0Res.score > hop1Res.score, "Hop 0 score should exceed Hop 1");
    assert.ok(hop1Res.score > hop2Res.score, "Hop 1 score should exceed Hop 2");
    assert.ok(hop2Res.score > hop4Res.score, "Hop 2 score should exceed Hop 4");

    // Keyword overlap
    const keywordRes = calculateRelevanceScore({
      item: { text: "Distributed caching and Redis key-value store" },
      focalText: "Redis caching strategies",
    });
    assert.ok(keywordRes.score > 0, "Keyword match should increase score");
    assert.ok(keywordRes.reasons.some(r => r.includes("Keyword overlap") && r.includes("caching")));

    // Skill-specific alignment
    const roadmapRes = calculateRelevanceScore({
      item: { text: "Phase 1 milestone task deliverable" },
      focalText: "Project plan",
      skillId: "roadmap",
    });
    assert.ok(roadmapRes.reasons.some(r => r.includes("Contains roadmap/task temporal concepts")));

    const riskRes = calculateRelevanceScore({
      item: { text: "Critical bottleneck and security risk" },
      focalText: "Architecture",
      skillId: "challenge",
    });
    assert.ok(riskRes.reasons.some(r => r.includes("Contains assumption/risk indicators")));

    // Score boundaries
    assert.ok(selRes.score >= 0.0 && selRes.score <= 1.0);
    assert.ok(Array.isArray(selRes.reasons) && selRes.reasons.length > 0);
  });

  it("should detect conflicts in contradictory polarity and tech choices", () => {
    // 1. Polarity conflict: required vs deprecated with shared keyword
    const polarityItems = [
      { id: "node-1", text: "PostgreSQL is required for user persistence layer", label: "DB Requirement" },
      { id: "node-2", text: "PostgreSQL is deprecated and must not be used", label: "DB Deprecation" },
    ];
    const polarityConflicts = detectConflicts(polarityItems);
    assert.ok(polarityConflicts.length > 0, "Should detect polarity contradiction");
    assert.equal(polarityConflicts[0].type, "conflict");
    assert.ok(polarityConflicts[0].topic.includes("Requirement vs Deprecation"));
    assert.equal(polarityConflicts[0].sources.length, 2);

    // 2. Tech choice conflict: React vs Vue
    const techItems = [
      { id: "note-a", text: "Build frontend client with React components", label: "Frontend Spec" },
      { id: "note-b", text: "Vue framework chosen for client UI", label: "UI Architecture" },
    ];
    const techConflicts = detectConflicts(techItems);
    assert.ok(techConflicts.length > 0, "Should detect React vs Vue contradiction");
    assert.ok(techConflicts[0].topic.includes("Frontend Framework"));

    // 3. No conflict case
    const harmoniousItems = [
      { id: "node-a", text: "Backend service uses Node.js and Express", label: "Backend" },
      { id: "node-b", text: "Frontend uses Tailwind CSS for layout", label: "Styling" },
    ];
    const noConflicts = detectConflicts(harmoniousItems);
    assert.equal(noConflicts.length, 0, "Harmonious items should produce 0 conflicts");
  });

  it("should evaluate context sufficiency, missing prerequisites, and quality metrics", () => {
    // Case 1: Complete context
    const fullRes = checkContextSufficiency({
      skillId: "brainstorm",
      nodeText: "Decentralized identity management",
      canvasSummary: "Canvas with 5 identity nodes",
      existingNodes: [{ id: "n1", text: "Identity Provider", selected: true }],
      vaultNotes: [{ title: "OAuth Guide", content: "OAuth 2.0 flow" }],
      contextLevel: "local",
    });
    assert.equal(fullRes.sufficient, true);
    assert.equal(fullRes.missing.length, 0);
    assert.ok(fullRes.quality.coverage >= 0.8);
    assert.ok(fullRes.quality.relevance >= 0.7);
    assert.ok(fullRes.quality.freshness > 0);

    // Case 2: Missing focal text & empty canvas
    const missingRes = checkContextSufficiency({
      skillId: "roadmap",
      nodeText: "",
      existingNodes: [],
      vaultNotes: [],
      contextLevel: "project",
    });
    assert.equal(missingRes.sufficient, false);
    assert.ok(missingRes.missing.includes("goal"));
    assert.ok(missingRes.warnings.length > 0);
    assert.ok(missingRes.quality.coverage < 1.0);
  });

  it("should build structured context package with provenance, deduplication, and compactSummary", () => {
    const canvasData = {
      nodes: [
        { id: "root-1", text: "Core Service #backend #auth", selected: true, mtime: Date.now() },
        { id: "child-1", text: "Cache Layer #backend", selected: false, mtime: Date.now() },
        { id: "peripheral-1", text: "Unrelated Analytics #data", selected: false },
      ],
      edges: [
        { id: "e1", fromNode: "root-1", toNode: "child-1" },
      ],
    };

    const vaultNotes = [
      {
        id: "note-auth",
        title: "Authentication Architecture",
        path: "docs/auth.md",
        content: "OAuth2 and session token handling in Core Service",
        tags: ["#security", "#auth"],
      },
    ];

    const pkg = buildContextPackage({
      skillId: "brainstorm",
      nodeText: "Core Service #backend",
      canvasData,
      focalNode: canvasData.nodes[0],
      vaultNotes,
      userPrompt: "Explore high availability patterns",
      contextLevel: "local",
    });

    // Structure checks
    assert.equal(pkg.skillId, "brainstorm");
    assert.equal(pkg.contextLevel, "local");
    assert.ok(pkg.levelDetails);
    assert.equal(pkg.focalText, "Core Service #backend");
    assert.equal(pkg.userPrompt, "Explore high availability patterns");

    // BFS distances & scoring
    assert.ok(Array.isArray(pkg.activeNodes) && pkg.activeNodes.length > 0);
    const rootNode = pkg.activeNodes.find(n => n.id === "root-1");
    assert.ok(rootNode, "Root node should be present");
    assert.equal(rootNode.distance, 0);

    const childNode = pkg.activeNodes.find(n => n.id === "child-1");
    if (childNode) {
      assert.equal(childNode.distance, 1);
    }

    // Provenance tracking
    assert.ok(Array.isArray(pkg.provenance) && pkg.provenance.length >= 3);
    assert.ok(pkg.provenance.some(p => p.sourceType === "canvas_node"));
    assert.ok(pkg.provenance.some(p => p.sourceType === "vault_note"));
    assert.ok(pkg.provenance.some(p => p.sourceType === "user_prompt"));

    // Tags extraction & deduplication
    assert.ok(Array.isArray(pkg.tags));
    assert.ok(pkg.tags.includes("#backend"));
    assert.ok(pkg.tags.includes("#auth"));

    // Sufficiency & compactSummary
    assert.ok(pkg.sufficiency);
    assert.ok(typeof pkg.compactSummary === "string" && pkg.compactSummary.length > 0);
    assert.ok(pkg.compactSummary.includes("Skill: brainstorm"));
    assert.ok(pkg.compactSummary.includes("Core Service"));
  });
});

