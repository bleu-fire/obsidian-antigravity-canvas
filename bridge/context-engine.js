/**
 * Antigravity Context Intelligence Engine
 * Bridge: Obsidian Plugin <-> Antigravity AI Engine
 * 
 * Provides structured multi-level context extraction, relevance scoring,
 * conflict detection, sufficiency audits, and normalized context packaging.
 */

// ── 1. CONTEXT_LEVELS ────────────────────────────────────────────────────────

export const CONTEXT_LEVELS = {
  selection: {
    level: 1,
    id: "selection",
    name: "Selection",
    description: "selected nodes, selected note, user request",
    includes: ["selectedNodes", "selectedNote", "userRequest"],
    maxNodes: 5,
    includeVaultNotes: false,
    includeCanvasSummary: false,
  },
  local: {
    level: 2,
    id: "local",
    name: "Local",
    description: "selected nodes, nearby nodes (parents, children, siblings), direct links, backlinks",
    includes: ["selectedNodes", "nearbyNodes", "parents", "children", "siblings", "directLinks", "backlinks"],
    maxNodes: 15,
    includeVaultNotes: true,
    vaultLimit: 3,
    includeCanvasSummary: true,
  },
  project: {
    level: 3,
    id: "project",
    name: "Project",
    description: "current canvas summary, project notes, tags, dependencies",
    includes: ["canvasSummary", "projectNotes", "tags", "dependencies", "allCanvasNodes"],
    maxNodes: 50,
    includeVaultNotes: true,
    vaultLimit: 10,
    includeCanvasSummary: true,
  },
  graph: {
    level: 4,
    id: "graph",
    name: "Graph",
    description: "broader relevant knowledge filtered by relevance",
    includes: ["vaultNotes", "knowledgeGraph", "filteredSemanticRelevance"],
    maxNodes: 100,
    includeVaultNotes: true,
    vaultLimit: 25,
    includeCanvasSummary: true,
  },
};

// ── 2. SKILL_CONTEXT_REQUIREMENTS ───────────────────────────────────────────

export const SKILL_CONTEXT_REQUIREMENTS = {
  "brainstorm": {
    scope: "local",
    needs: ["goal", "selectedNodes", "currentCanvas", "relatedNotes", "constraints"],
    description: "Ideation and creative branching based on focal goal and local canvas context",
  },
  "explore": {
    scope: "selection",
    needs: ["focalNode", "semanticVariants"],
    description: "Divergent exploration around a specific node and semantic variations",
  },
  "connect": {
    scope: "local",
    needs: ["selectedNodes", "nearbyNodes", "linkedNotes", "relationships"],
    description: "Discovering bridge nodes, latent connections, and relational paths",
  },
  "find-gaps": {
    scope: "local",
    alternateScope: "project",
    needs: ["currentStructure", "dependencies", "knownConcepts", "unknowns"],
    description: "Missing requirement analysis, structural holes, and blindspots",
  },
  "decompose": {
    scope: "selection",
    alternateScope: "local",
    needs: ["focalNode", "subsystems"],
    description: "Hierarchical breakdown of complex systems or multi-part concepts",
  },
  "roadmap": {
    scope: "project",
    needs: ["goal", "existingTasks", "dependencies", "constraints", "milestones"],
    description: "Chronological and dependency-ordered execution plan",
  },
  "challenge": {
    scope: "selection",
    needs: ["focalPremise", "assumptions", "failureModes"],
    description: "Devil's advocate scrutiny, unstated assumptions, and risk testing",
  },
  "research-map": {
    scope: "project",
    needs: ["topic", "existingKnowledge", "questions", "sources"],
    description: "Exploration of literature, references, open questions, and domain maps",
  },
  "synthesize": {
    scope: "project",
    needs: ["multipleNotes", "commonConcepts", "contradictions", "relationships"],
    description: "Convergent summary extracting unified themes from disparate sources",
  },
  "evolve": {
    scope: "project",
    needs: ["currentCanvas", "recentlyChangedNotes", "newKnowledge", "potentialOutdatedNodes"],
    description: "Continuous canvas maintenance, updates, and outdated node detection",
  },
  "context": {
    scope: "local",
    needs: ["audit", "provenance"],
    description: "Full contextual audit, source tracing, and confidence evaluation",
  },
  "visual": {
    scope: "local",
    needs: ["visualSubject", "importantElements", "relationships"],
    description: "Visual layout, diagramming, wireframing, and visual node representations",
  },
};

// Common English stop words for keyword extraction
const STOP_WORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and",
  "any", "are", "aren't", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "can't", "cannot", "could",
  "couldn't", "did", "didn't", "do", "does", "doesn't", "doing", "don't", "down",
  "during", "each", "few", "for", "from", "further", "had", "hadn't", "has",
  "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her",
  "here", "here's", "hers", "herself", "him", "himself", "his", "how", "how's",
  "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is", "isn't", "it",
  "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other",
  "ought", "our", "ours", "ourselves", "out", "over", "own", "same", "shan't",
  "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
  "than", "that", "that's", "the", "their", "theirs", "them", "themselves",
  "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up",
  "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
  "weren't", "what", "what's", "when", "when's", "where", "where's", "which",
  "while", "who", "who's", "whom", "why", "why's", "with", "won't", "would",
  "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
  "yourself", "yourselves"
]);

/**
 * Tokenize and normalize text into meaningful keywords.
 */
function extractKeywords(text) {
  if (!text || typeof text !== "string") return new Set();
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s\-_]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t));
  return new Set(tokens);
}

/**
 * Extracts plain text from an item regardless of object structure.
 */
function getItemText(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return [
    item.text,
    item.label,
    item.title,
    item.content,
    item.name,
    Array.isArray(item.tags) ? item.tags.join(" ") : item.tags,
    item.file || item.path || ""
  ].filter(Boolean).join(" ");
}

// ── 3. calculateRelevanceScore ───────────────────────────────────────────────

/**
 * Calculates a relevance score [0.0 - 1.0] and explains the contributing factors.
 * 
 * @param {Object} params
 * @param {Object|string} params.item - Node, note, or text item to evaluate
 * @param {string} params.focalText - Focal node text or search anchor
 * @param {string} [params.skillId] - Target skill ID
 * @param {boolean} [params.directSelection=false] - Whether item is directly selected
 * @param {number} [params.parentDistance=Infinity] - Graph hop distance from focal node
 * @returns {{ score: number, reasons: string[] }}
 */
export function calculateRelevanceScore({
  item,
  focalText = "",
  skillId = "",
  directSelection = false,
  parentDistance = Infinity,
}) {
  let score = 0.0;
  const reasons = [];

  const isDirect = directSelection || (item && typeof item === "object" && Boolean(item.selected));
  const itemText = getItemText(item);

  // 1. Direct Selection Bonus
  if (isDirect) {
    score += 0.35;
    reasons.push("Directly selected by user (+0.35)");
  }

  // 2. Graph Distance / Proximity
  if (parentDistance === 0 || (item && item.id && item.isFocal)) {
    score += 0.30;
    reasons.push("Focal target node (+0.30)");
  } else if (parentDistance === 1) {
    score += 0.25;
    reasons.push("Direct neighbor (1 hop) (+0.25)");
  } else if (parentDistance === 2) {
    score += 0.15;
    reasons.push("Nearby connected node (2 hops) (+0.15)");
  } else if (parentDistance <= 4) {
    score += 0.05;
    reasons.push(`Peripheral node (${parentDistance} hops) (+0.05)`);
  }

  // 3. Keyword / Semantic Overlap
  const focalTokens = extractKeywords(focalText);
  const itemTokens = extractKeywords(itemText);

  if (focalTokens.size > 0 && itemTokens.size > 0) {
    let matchCount = 0;
    const matches = [];
    for (const token of focalTokens) {
      if (itemTokens.has(token)) {
        matchCount++;
        matches.push(token);
      }
    }

    if (matchCount > 0) {
      const jaccard = matchCount / (focalTokens.size + itemTokens.size - matchCount);
      const keywordScore = Math.min(0.35, Number((matchCount * 0.08 + jaccard * 0.2).toFixed(3)));
      score += keywordScore;
      reasons.push(`Keyword overlap [${matches.slice(0, 4).join(", ")}${matches.length > 4 ? "..." : ""}] (+${keywordScore})`);
    }
  }

  // 4. Skill-Specific Semantic Alignment
  if (skillId) {
    const lowerItem = itemText.toLowerCase();
    
    switch (skillId) {
      case "roadmap":
        if (/\b(task|milestone|deadline|phase|sprint|todo|schedule|deliverable|epic|goal|step)\b/i.test(lowerItem)) {
          score += 0.15;
          reasons.push("Contains roadmap/task temporal concepts (+0.15)");
        }
        break;

      case "visual":
        if (/\b(ui|ux|wireframe|layout|screen|component|button|color|theme|view|mockup|icon|card|modal)\b/i.test(lowerItem)) {
          score += 0.15;
          reasons.push("Contains visual/interface design concepts (+0.15)");
        }
        break;

      case "challenge":
        if (/\b(risk|assumption|flaw|weakness|failure|constraint|problem|threat|bottleneck|cost)\b/i.test(lowerItem)) {
          score += 0.15;
          reasons.push("Contains assumption/risk indicators (+0.15)");
        }
        break;

      case "find-gaps":
        if (/\b(missing|unknown|gap|tbd|todo|unresolved|unclear|needed|question|blocker)\b/i.test(lowerItem)) {
          score += 0.15;
          reasons.push("Contains gap/unknown indicators (+0.15)");
        }
        break;

      case "research-map":
        if (/\b(source|citation|reference|paper|article|link|url|study|author|doi|journal|evidence)\b/i.test(lowerItem) || /https?:\/\//i.test(lowerItem)) {
          score += 0.15;
          reasons.push("Contains citation or research source data (+0.15)");
        }
        break;

      case "connect":
        if (item && (item.edges?.length > 0 || item.links?.length > 0 || /\[\[.+?\]\]/.test(itemText))) {
          score += 0.15;
          reasons.push("Has explicit relational connections or backlinks (+0.15)");
        }
        break;

      case "decompose":
        if (/\b(system|subsystem|module|architecture|layer|component|part|breakdown|hierarchy)\b/i.test(lowerItem)) {
          score += 0.15;
          reasons.push("Contains modular or architectural decomposition terms (+0.15)");
        }
        break;

      case "synthesize":
        if (/\b(summary|conclusion|insight|theme|pattern|overview|consensus|synthesis)\b/i.test(lowerItem)) {
          score += 0.15;
          reasons.push("Contains synthesis/theme markers (+0.15)");
        }
        break;

      case "evolve":
        if (/\b(deprecated|outdated|legacy|update|version|migrate|change|refactor)\b/i.test(lowerItem)) {
          score += 0.15;
          reasons.push("Contains change/evolution markers (+0.15)");
        }
        break;

      default:
        break;
    }
  }

  // 5. Freshness / Activity Bonus (if metadata has mtime/updated)
  if (item && typeof item === "object") {
    const ts = item.mtime || item.updatedAt || item.timestamp;
    if (ts) {
      const ageMs = Date.now() - new Date(ts).getTime();
      if (!isNaN(ageMs) && ageMs < 7 * 86_400_000) { // < 7 days
        score += 0.05;
        reasons.push("Recently updated within 7 days (+0.05)");
      }
    }
  }

  // Final score clamping
  const finalScore = Math.min(1.0, Math.max(0.0, Number(score.toFixed(3))));
  if (reasons.length === 0) {
    reasons.push("Base background knowledge");
  }

  return {
    score: finalScore,
    reasons,
  };
}

// ── 4. detectConflicts ───────────────────────────────────────────────────────

/**
 * Scans context items for conflicting statements, incompatible constraints, or contradictions.
 * 
 * @param {Array<Object|string>} contextItems
 * @returns {Array<{ type: "conflict", topic: string, sources: Array<{ id: string, label: string, snippet: string }>, description: string }>}
 */
export function detectConflicts(contextItems = []) {
  if (!Array.isArray(contextItems) || contextItems.length < 2) {
    return [];
  }

  const conflicts = [];
  const normalizedItems = contextItems.map((item, idx) => {
    const text = getItemText(item);
    const id = (item && typeof item === "object" && item.id) ? item.id : `item-${idx + 1}`;
    const label = (item && typeof item === "object" && (item.label || item.title || item.name)) ? (item.label || item.title || item.name) : text.slice(0, 30);
    return { id, label, text, raw: item };
  });

  // Patterns indicating conflicting pairs
  const conflictPatterns = [
    {
      topic: "Requirement vs Deprecation",
      pos: /\b(required|must have|mandatory|essential|always use)\b/i,
      neg: /\b(deprecated|forbidden|do not use|disallowed|obsolete|must not)\b/i,
    },
    {
      topic: "Activation vs Deactivation",
      pos: /\b(enabled|activate|turn on|opt-in|supported)\b/i,
      neg: /\b(disabled|deactivate|turn off|opt-out|unsupported)\b/i,
    },
    {
      topic: "Completion vs Blockage",
      pos: /\b(completed|done|finished|resolved)\b/i,
      neg: /\b(blocked|in-progress|failing|broken|unresolved|pending)\b/i,
    },
    {
      topic: "Tech Choice / Paradigm Contradiction",
      pairs: [
        { a: /\breact\b/i, b: /\bvue\b/i, topic: "Frontend Framework (React vs Vue)" },
        { a: /\bpostgres(?:ql)?\b/i, b: /\bmongodb\b/i, topic: "Database Paradigm (Postgres vs Mongo)" },
        { a: /\bmonolith(?:ic)?\b/i, b: /\bmicroservices?\b/i, topic: "Architecture Style (Monolith vs Microservices)" },
        { a: /\bsynchronous\b/i, b: /\basynchronous\b/i, topic: "Execution Mode (Sync vs Async)" },
        { a: /\bclient-side\b/i, b: /\bserver-side\b/i, topic: "Rendering/Execution Target (Client vs Server)" },
      ]
    }
  ];

  // Compare pairwise
  for (let i = 0; i < normalizedItems.length; i++) {
    for (let j = i + 1; j < normalizedItems.length; j++) {
      const itemA = normalizedItems[i];
      const itemB = normalizedItems[j];

      // Check keyword topic overlap first
      const keywordsA = extractKeywords(itemA.text);
      const keywordsB = extractKeywords(itemB.text);
      const sharedKeywords = [...keywordsA].filter(k => keywordsB.has(k));

      // Rule check 1: Direct polarity contradictions on overlapping subjects
      for (const pattern of conflictPatterns) {
        if (pattern.pos && pattern.neg) {
          const aHasPos = pattern.pos.test(itemA.text);
          const aHasNeg = pattern.neg.test(itemA.text);
          const bHasPos = pattern.pos.test(itemB.text);
          const bHasNeg = pattern.neg.test(itemB.text);

          if ((aHasPos && bHasNeg) || (aHasNeg && bHasPos)) {
            // Check if they share at least one context keyword
            if (sharedKeywords.length > 0) {
              conflicts.push({
                type: "conflict",
                topic: `${pattern.topic} around "${sharedKeywords.slice(0, 2).join(", ")}"`,
                description: `Contradictory state between "${itemA.label}" and "${itemB.label}"`,
                sources: [
                  { id: itemA.id, label: itemA.label, snippet: itemA.text.slice(0, 100) },
                  { id: itemB.id, label: itemB.label, snippet: itemB.text.slice(0, 100) },
                ]
              });
            }
          }
        }

        // Rule check 2: Explicit exclusive technology pairs
        if (pattern.pairs) {
          for (const pair of pattern.pairs) {
            const aHasA = pair.a.test(itemA.text);
            const aHasB = pair.b.test(itemA.text);
            const bHasA = pair.a.test(itemB.text);
            const bHasB = pair.b.test(itemB.text);

            if ((aHasA && bHasB) || (aHasB && bHasA)) {
              conflicts.push({
                type: "conflict",
                topic: pair.topic,
                description: `Competing specifications found in "${itemA.label}" and "${itemB.label}"`,
                sources: [
                  { id: itemA.id, label: itemA.label, snippet: itemA.text.slice(0, 100) },
                  { id: itemB.id, label: itemB.label, snippet: itemB.text.slice(0, 100) },
                ]
              });
            }
          }
        }
      }
    }
  }

  return conflicts;
}

// ── 5. checkContextSufficiency ───────────────────────────────────────────────

/**
 * Evaluates whether enough context exists to run the requested skill reliably.
 * 
 * @param {Object} params
 * @param {string} params.skillId - The skill identifier
 * @param {string} [params.nodeText=""] - Text of focal/selected node
 * @param {string} [params.canvasSummary=""] - Canvas summary text
 * @param {Array} [params.existingNodes=[]] - Current canvas nodes
 * @param {Array} [params.vaultNotes=[]] - Related vault notes
 * @param {string} [params.contextLevel="local"] - Requested context level
 * @returns {{ sufficient: boolean, warnings: string[], missing: string[], quality: { coverage: number, relevance: number, freshness: number } }}
 */
export function checkContextSufficiency({
  skillId,
  nodeText = "",
  canvasSummary = "",
  existingNodes = [],
  vaultNotes = [],
  contextLevel = "local",
}) {
  const req = SKILL_CONTEXT_REQUIREMENTS[skillId] || {
    scope: contextLevel || "local",
    needs: ["focalNode"],
    description: "General skill execution",
  };

  const warnings = [];
  const missing = [];
  const nodes = Array.isArray(existingNodes) ? existingNodes : [];
  const notes = Array.isArray(vaultNotes) ? vaultNotes : [];
  const hasFocalText = Boolean(nodeText && nodeText.trim().length > 0);

  // Evaluate individual requirement needs
  for (const need of req.needs) {
    switch (need) {
      case "goal":
      case "focalNode":
      case "focalPremise":
      case "topic":
      case "visualSubject":
        if (!hasFocalText) {
          missing.push(need);
          warnings.push(`Missing focal text or goal for '${need}'.`);
        }
        break;

      case "selectedNodes":
        if (!hasFocalText && nodes.filter(n => n.selected).length === 0) {
          missing.push(need);
          warnings.push("No nodes selected in canvas.");
        }
        break;

      case "currentCanvas":
      case "currentStructure":
        if (nodes.length === 0 && !canvasSummary) {
          missing.push(need);
          warnings.push("Canvas is empty; structural context unavailable.");
        }
        break;

      case "nearbyNodes":
      case "relationships":
      case "dependencies":
        if (nodes.length < 2 && (!nodes[0]?.edges || nodes[0]?.edges.length === 0)) {
          warnings.push(`Limited relationship graph for '${need}' (fewer than 2 nodes or connections).`);
        }
        break;

      case "relatedNotes":
      case "linkedNotes":
      case "multipleNotes":
      case "projectNotes":
      case "existingKnowledge":
        if (notes.length === 0) {
          warnings.push(`No related vault notes found for '${need}'. Skill will rely on canvas content alone.`);
          if (need === "multipleNotes" && notes.length + nodes.length < 2) {
            missing.push(need);
          }
        }
        break;

      case "milestones":
      case "existingTasks":
        const hasTaskCues = nodes.some(n => /\b(task|todo|milestone|phase|step|due)\b/i.test(getItemText(n)));
        if (!hasTaskCues && !/\b(task|todo|milestone|phase|step)\b/i.test(nodeText)) {
          warnings.push("No existing tasks or milestones identified; initial roadmap will start from scratch.");
        }
        break;

      case "assumptions":
      case "failureModes":
      case "constraints":
      case "unknowns":
      case "subsystems":
      case "semanticVariants":
      case "sources":
      case "commonConcepts":
      case "contradictions":
      case "newKnowledge":
      case "potentialOutdatedNodes":
      case "audit":
      case "provenance":
      case "importantElements":
        // Generative/evaluative needs that can be synthesized by AI if focalText exists
        if (!hasFocalText && nodes.length === 0) {
          missing.push(need);
        }
        break;

      default:
        break;
    }
  }

  // Calculate Quality Metrics
  const totalNeeds = req.needs.length || 1;
  const metNeeds = Math.max(0, totalNeeds - missing.length);
  const coverage = Number((metNeeds / totalNeeds).toFixed(2));

  // Relevance metric based on presence of focal text and nodes
  let relevance = 0.5;
  if (hasFocalText) relevance += 0.3;
  if (nodes.length > 0) relevance += 0.1;
  if (notes.length > 0) relevance += 0.1;
  relevance = Math.min(1.0, Number(relevance.toFixed(2)));

  // Freshness metric based on timestamps or active session
  let freshness = 0.9;
  if (nodes.some(n => n.mtime && (Date.now() - new Date(n.mtime).getTime()) > 30 * 86_400_000)) {
    freshness = 0.7;
  }

  const sufficient = missing.length === 0 && (hasFocalText || nodes.length > 0);

  return {
    sufficient,
    warnings,
    missing,
    quality: {
      coverage,
      relevance,
      freshness,
    },
  };
}

// ── 6. buildContextPackage ───────────────────────────────────────────────────

/**
 * Builds a clean, normalized, deduplicated context package with provenance and compact summaries.
 * 
 * @param {Object} params
 * @param {string} params.skillId - Target skill ID
 * @param {string} [params.nodeText=""] - Text of focal/selected node
 * @param {Object} [params.canvasData={}] - Full or partial canvas data ({ nodes, edges })
 * @param {Object} [params.focalNode=null] - Focal node entity
 * @param {Array} [params.vaultNotes=[]] - Related vault notes
 * @param {string} [params.userPrompt=""] - User prompt or override instructions
 * @param {string} [params.contextLevel] - Explicit context level override ('selection' | 'local' | 'project' | 'graph')
 * @param {Object} [params.visualIntent=null] - Visual classification or intent metadata
 * @returns {Object} Complete Context Package
 */
export function buildContextPackage({
  skillId = "brainstorm",
  nodeText = "",
  canvasData = {},
  focalNode = null,
  vaultNotes = [],
  userPrompt = "",
  contextLevel = null,
  visualIntent = null,
} = {}) {
  const req = SKILL_CONTEXT_REQUIREMENTS[skillId] || { scope: "local", needs: [] };
  const targetLevelId = contextLevel || req.scope || "local";
  const levelConfig = CONTEXT_LEVELS[targetLevelId] || CONTEXT_LEVELS.local;

  const rawNodes = Array.isArray(canvasData?.nodes) ? canvasData.nodes : [];
  const rawEdges = Array.isArray(canvasData?.edges) ? canvasData.edges : [];
  const rawVaultNotes = Array.isArray(vaultNotes) ? vaultNotes : [];

  const effectiveFocalText = nodeText || focalNode?.text || focalNode?.label || "";
  const focalId = focalNode?.id || (rawNodes.find(n => n.selected)?.id) || null;

  // Build Edge adjacency map
  const adjacency = new Map();
  for (const edge of rawEdges) {
    const from = edge.fromNode || edge.source;
    const to = edge.toNode || edge.target;
    if (from && to) {
      if (!adjacency.has(from)) adjacency.set(from, new Set());
      if (!adjacency.has(to)) adjacency.set(to, new Set());
      adjacency.get(from).add(to);
      adjacency.get(to).add(from);
    }
  }

  // Calculate BFS graph distances from focal node
  const distances = new Map();
  if (focalId) {
    distances.set(focalId, 0);
    const queue = [focalId];
    while (queue.length > 0) {
      const current = queue.shift();
      const currentDist = distances.get(current);
      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, currentDist + 1);
          queue.push(neighbor);
        }
      }
    }
  }

  // Process & score canvas nodes
  const processedNodes = rawNodes.map(node => {
    const dist = distances.has(node.id) ? distances.get(node.id) : (node.id === focalId ? 0 : Infinity);
    const isDirectSelection = Boolean(node.selected || node.id === focalId);
    const { score, reasons } = calculateRelevanceScore({
      item: node,
      focalText: effectiveFocalText,
      skillId,
      directSelection: isDirectSelection,
      parentDistance: dist,
    });

    return {
      id: node.id,
      text: node.text || node.label || "",
      type: node.type || "text",
      color: node.color,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      selected: isDirectSelection,
      distance: dist,
      relevanceScore: score,
      relevanceReasons: reasons,
      mtime: node.mtime,
    };
  });

  // Sort nodes by relevance descending
  processedNodes.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Group nodes by proximity
  const selectedNodes = processedNodes.filter(n => n.selected || n.distance === 0);
  const nearbyNodes = processedNodes.filter(n => !n.selected && n.distance <= 2);
  const peripheralNodes = processedNodes.filter(n => !n.selected && n.distance > 2);

  // Filter based on context level max limits
  let activeNodes = [];
  if (targetLevelId === "selection") {
    activeNodes = selectedNodes.slice(0, levelConfig.maxNodes);
  } else if (targetLevelId === "local") {
    activeNodes = [...selectedNodes, ...nearbyNodes].slice(0, levelConfig.maxNodes);
  } else {
    activeNodes = processedNodes.slice(0, levelConfig.maxNodes);
  }

  // Process & score vault notes
  const processedVaultNotes = rawVaultNotes.map(note => {
    const { score, reasons } = calculateRelevanceScore({
      item: note,
      focalText: effectiveFocalText,
      skillId,
      directSelection: false,
      parentDistance: Infinity,
    });

    return {
      id: note.id || note.path || note.file || note.title,
      title: note.title || note.name || note.path || "Untitled Note",
      path: note.path || note.file || "",
      content: note.content || note.text || "",
      tags: note.tags || [],
      relevanceScore: score,
      relevanceReasons: reasons,
      mtime: note.mtime || note.updatedAt,
    };
  });

  processedVaultNotes.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const activeVaultNotes = levelConfig.includeVaultNotes
    ? processedVaultNotes.slice(0, levelConfig.vaultLimit || 5)
    : [];

  // Detect conflicts across all active items
  const allContextItems = [
    ...activeNodes.map(n => ({ id: `node:${n.id}`, label: n.text.slice(0, 40), text: n.text })),
    ...activeVaultNotes.map(v => ({ id: `note:${v.path}`, label: v.title, text: `${v.title}\n${v.content}` })),
  ];
  if (userPrompt) {
    allContextItems.push({ id: "prompt:user", label: "User Prompt", text: userPrompt });
  }

  const conflicts = detectConflicts(allContextItems);

  // Canvas Summary generation
  let canvasSummary = "";
  if (levelConfig.includeCanvasSummary && rawNodes.length > 0) {
    const totalCount = rawNodes.length;
    const selectedCount = selectedNodes.length;
    const edgeCount = rawEdges.length;
    const keyLabels = processedNodes.slice(0, 5).map(n => `"${n.text.slice(0, 35)}"`).join(", ");
    canvasSummary = `Canvas contains ${totalCount} nodes (${selectedCount} selected) and ${edgeCount} connections. Top relevant entities: ${keyLabels}.`;
  }

  // Sufficiency Check
  const sufficiency = checkContextSufficiency({
    skillId,
    nodeText: effectiveFocalText,
    canvasSummary,
    existingNodes: activeNodes,
    vaultNotes: activeVaultNotes,
    contextLevel: targetLevelId,
  });

  // Track Provenance
  const provenance = [];
  if (effectiveFocalText) {
    provenance.push({
      sourceId: focalId || "focal_input",
      sourceType: focalId ? "canvas_node" : "user_input",
      label: effectiveFocalText.slice(0, 50),
      score: 1.0,
      reasons: ["Primary focal input anchor"],
      timestamp: new Date().toISOString(),
    });
  }

  for (const n of activeNodes) {
    if (n.id !== focalId) {
      provenance.push({
        sourceId: n.id,
        sourceType: "canvas_node",
        label: n.text.slice(0, 50),
        score: n.relevanceScore,
        reasons: n.relevanceReasons,
        timestamp: n.mtime ? new Date(n.mtime).toISOString() : new Date().toISOString(),
      });
    }
  }

  for (const note of activeVaultNotes) {
    provenance.push({
      sourceId: note.path,
      sourceType: "vault_note",
      label: note.title,
      score: note.relevanceScore,
      reasons: note.relevanceReasons,
      timestamp: note.mtime ? new Date(note.mtime).toISOString() : new Date().toISOString(),
    });
  }

  if (userPrompt) {
    provenance.push({
      sourceId: "user_prompt",
      sourceType: "user_prompt",
      label: userPrompt.slice(0, 50),
      score: 1.0,
      reasons: ["Explicit user prompt instruction"],
      timestamp: new Date().toISOString(),
    });
  }

  // Deduplicate and extract dependencies / tags
  const tags = new Set();
  for (const n of activeNodes) {
    const matchedTags = (n.text || "").match(/#[a-zA-Z0-9_\-\/]+/g);
    if (matchedTags) matchedTags.forEach(t => tags.add(t));
  }
  for (const note of activeVaultNotes) {
    if (Array.isArray(note.tags)) note.tags.forEach(t => tags.add(t));
  }

  // Build compact text summary
  const summaryLines = [];
  summaryLines.push(`Skill: ${skillId} | Context Level: ${targetLevelId} (Level ${levelConfig.level})`);
  if (effectiveFocalText) summaryLines.push(`Focal Target: "${effectiveFocalText}"`);
  if (userPrompt) summaryLines.push(`User Request: "${userPrompt}"`);
  if (activeNodes.length > 0) {
    summaryLines.push(`Nodes (${activeNodes.length}): ${activeNodes.map(n => `[${n.text.slice(0, 30)}]`).join(", ")}`);
  }
  if (activeVaultNotes.length > 0) {
    summaryLines.push(`Vault Notes (${activeVaultNotes.length}): ${activeVaultNotes.map(n => n.title).join(", ")}`);
  }
  if (conflicts.length > 0) {
    summaryLines.push(`Detected Conflicts (${conflicts.length}): ${conflicts.map(c => c.topic).join("; ")}`);
  }

  return {
    skillId,
    contextLevel: targetLevelId,
    levelDetails: levelConfig,
    focalNode: focalNode || (focalId ? { id: focalId, text: effectiveFocalText } : null),
    focalText: effectiveFocalText,
    userPrompt,
    visualIntent,
    selectedNodes,
    nearbyNodes,
    peripheralNodes,
    activeNodes,
    vaultNotes: activeVaultNotes,
    tags: Array.from(tags),
    canvasSummary,
    conflicts,
    sufficiency,
    provenance,
    compactSummary: summaryLines.join("\n"),
    timestamp: new Date().toISOString(),
  };
}
