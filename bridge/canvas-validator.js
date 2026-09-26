/**
 * canvas-validator.js
 * Validates and normalizes AI-generated SkillResult before Canvas mutation.
 */

const VALID_TYPES = new Set([
  "concept", "question", "decision", "assumption",
  "risk", "task", "evidence", "unknown", "goal", "constraint",
]);

const VALID_COLORS = new Set(["1", "2", "3", "4", "5", "6"]);

const VALID_SKILL_IDS = new Set([
  "brainstorm", "explore", "connect", "find-gaps", "decompose",
  "roadmap", "challenge", "research-map", "synthesize", "evolve",
]);

const MAX_NODES = 8;
const MAX_RELATIONSHIPS = 20;
const MAX_QUESTIONS = 10;
const MAX_GAPS = 10;

export function validateSkillResult(raw, existingNodeTitles = []) {
  const errors = [];

  if (!raw || typeof raw !== "object") {
    return { valid: false, result: null, errors: ["Result is not an object"] };
  }

  const result = {
    summary: "",
    reasoning: "",
    nodes: [],
    relationships: [],
    questions: [],
    gaps: [],
    nextSkills: [],
  };

  result.summary = (typeof raw.summary === "string" && raw.summary.trim())
    ? raw.summary.trim().slice(0, 500)
    : "Analysis completed.";

  result.reasoning = (typeof raw.reasoning === "string" && raw.reasoning.trim())
    ? raw.reasoning.trim().slice(0, 1000)
    : "";

  const existingLower = new Set(
    existingNodeTitles.map(t => String(t).toLowerCase().trim())
  );
  const seenTitles = new Set();

  if (Array.isArray(raw.nodes)) {
    for (const node of raw.nodes.slice(0, MAX_NODES * 2)) {
      if (!node || typeof node !== "object") continue;
      const title = typeof node.title === "string" ? node.title.trim() : "";
      if (!title) continue;
      const titleLower = title.toLowerCase();
      if (existingLower.has(titleLower)) { errors.push(`Skipped (already on Canvas): "${title}"`); continue; }
      if (seenTitles.has(titleLower)) { errors.push(`Skipped duplicate: "${title}"`); continue; }
      if (result.nodes.length >= MAX_NODES) { errors.push(`Truncated at ${MAX_NODES}`); break; }

      const nodeType = VALID_TYPES.has(node.type) ? node.type : "concept";
      const color = VALID_COLORS.has(String(node.color)) ? String(node.color) : "6";
      const nodeId = (typeof node.id === "string" && node.id.trim())
        ? node.id.trim()
        : `node-${Math.random().toString(36).slice(2, 8)}`;
      const content = typeof node.content === "string" ? node.content.trim().slice(0, 800) : "";
      const tags = Array.isArray(node.tags)
        ? node.tags.filter(t => typeof t === "string").slice(0, 5)
        : [];

      result.nodes.push({ id: nodeId, type: nodeType, title, content, color, tags });
      seenTitles.add(titleLower);
    }
  } else {
    errors.push("nodes field is not an array");
  }

  if (Array.isArray(raw.relationships)) {
    for (const rel of raw.relationships.slice(0, MAX_RELATIONSHIPS)) {
      if (!rel || typeof rel !== "object") continue;
      const from = typeof rel.from === "string" ? rel.from.trim() : "";
      const to = typeof rel.to === "string" ? rel.to.trim() : "";
      if (!from || !to) continue;
      result.relationships.push({
        from,
        to,
        label: typeof rel.label === "string" ? rel.label.trim() : "relates to",
        reason: typeof rel.reason === "string" ? rel.reason.trim().slice(0, 400) : "",
      });
    }
  }

  if (Array.isArray(raw.questions)) {
    result.questions = raw.questions
      .filter(q => typeof q === "string" && q.trim())
      .slice(0, MAX_QUESTIONS)
      .map(q => q.trim().slice(0, 300));
  }

  if (Array.isArray(raw.gaps)) {
    result.gaps = raw.gaps
      .filter(g => typeof g === "string" && g.trim())
      .slice(0, MAX_GAPS)
      .map(g => g.trim().slice(0, 300));
  }

  if (Array.isArray(raw.nextSkills)) {
    result.nextSkills = raw.nextSkills
      .filter(s => typeof s === "string" && VALID_SKILL_IDS.has(s))
      .slice(0, 4);
  }

  const valid = result.nodes.length > 0;
  if (!valid) errors.push("No valid nodes produced");

  return { valid, result, errors };
}

export function validateCanvasData(canvasData) {
  const errors = [];
  if (!canvasData || typeof canvasData !== "object") {
    return { valid: false, errors: ["Canvas data is not an object"] };
  }
  if (!Array.isArray(canvasData.nodes)) {
    return { valid: false, errors: ["canvas.nodes is not an array"] };
  }
  if (!Array.isArray(canvasData.edges)) {
    return { valid: false, errors: ["canvas.edges is not an array"] };
  }
  const nodeIds = new Set(canvasData.nodes.map(n => n.id).filter(Boolean));
  for (const edge of canvasData.edges) {
    if (!edge.fromNode || !nodeIds.has(edge.fromNode))
      errors.push(`Edge has invalid fromNode: ${edge.fromNode}`);
    if (!edge.toNode || !nodeIds.has(edge.toNode))
      errors.push(`Edge has invalid toNode: ${edge.toNode}`);
  }
  return { valid: errors.length === 0, errors };
}
