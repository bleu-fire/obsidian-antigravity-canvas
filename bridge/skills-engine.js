import crypto from "crypto";
import fs from "fs";
import path from "path";
import { completePrompt } from "./ai-manager.js";

const CACHE_DIR = path.resolve(".cache/cognitive");

function hash(str) {
  return crypto.createHash("sha256").update(str).digest("hex").slice(0, 16);
}

function cacheGet(key) {
  try {
    const p = path.join(CACHE_DIR, `${key}.json`);
    if (!fs.existsSync(p)) return null;
    const { ts, v } = JSON.parse(fs.readFileSync(p, "utf8"));
    if (Date.now() - ts > 86_400_000) { fs.unlinkSync(p); return null; }
    return v;
  } catch { return null; }
}

function cacheSet(key, v) {
  try {
    if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(path.join(CACHE_DIR, `${key}.json`), JSON.stringify({ ts: Date.now(), v }));
  } catch {}
}

export const SKILL_DEFINITIONS = {
  "brainstorm": {
    name: "Brainstorm Directions",
    badge: "Ideation",
    description: "Generate structured, non-obvious directions, uncover assumptions, and suggest next actions.",
    suggestedColor: "6",
    nextSkills: ["explore", "decompose", "find-gaps", "challenge"],
  },
  "explore": {
    name: "Explore Concept",
    badge: "Expansion",
    description: "Unfold a concept into constituent semantic branches and fundamental mechanisms.",
    suggestedColor: "6",
    nextSkills: ["decompose", "research-map", "challenge", "connect"],
  },
  "connect": {
    name: "Connect & Relate",
    badge: "Synthesis",
    description: "Discover functional dependencies, contradictions, and relational edges between nodes.",
    suggestedColor: "3",
    nextSkills: ["synthesize", "challenge", "find-gaps", "roadmap"],
  },
  "find-gaps": {
    name: "Find Knowledge Gaps",
    badge: "Audit",
    description: "Detect missing requirements, unaddressed risks, absent dependencies, and blind spots.",
    suggestedColor: "1",
    nextSkills: ["decompose", "challenge", "roadmap", "research-map"],
  },
  "decompose": {
    name: "Decompose System",
    badge: "Architecture",
    description: "Break complex goals or architectures into 3-5 manageable, decoupled subsystems.",
    suggestedColor: "5",
    nextSkills: ["roadmap", "find-gaps", "explore", "challenge"],
  },
  "roadmap": {
    name: "Build Roadmap",
    badge: "Execution",
    description: "Sequence goals into phases and verifiable milestones with dependency criteria.",
    suggestedColor: "5",
    nextSkills: ["decompose", "find-gaps", "challenge", "evolve"],
  },
  "challenge": {
    name: "Challenge Assumptions",
    badge: "Critical",
    description: "Surface implicit assumptions, failure modes, performance bottlenecks, and alternatives.",
    suggestedColor: "2",
    nextSkills: ["find-gaps", "explore", "decompose", "roadmap"],
  },
  "research-map": {
    name: "Research Inquiry Map",
    badge: "Research",
    description: "Structure research across Core Concepts, Key Questions, Sources, and Unknowns.",
    suggestedColor: "4",
    nextSkills: ["synthesize", "explore", "challenge", "decompose"],
  },
  "synthesize": {
    name: "Synthesize Knowledge",
    badge: "Distillation",
    description: "Distill multiple notes and cards into unified models preserving wikilinks.",
    suggestedColor: "4",
    nextSkills: ["roadmap", "connect", "find-gaps", "challenge"],
  },
  "evolve": {
    name: "Evolve from Notes",
    badge: "Sync",
    description: "Differential analysis between Canvas and recent Obsidian notes for incremental sync.",
    suggestedColor: "5",
    nextSkills: ["connect", "synthesize", "find-gaps", "roadmap"],
  },
};

export async function executeCognitiveSkill({
  skillId,
  nodeText = "",
  context = "",
  canvasSummary = "",
  existingNodes = [],
  userPrompt = "",
  vaultNotes = [],
}) {
  const def = SKILL_DEFINITIONS[skillId] || {
    name: skillId,
    badge: "Cognitive",
    description: "General cognitive thinking analysis",
    suggestedColor: "6",
    nextSkills: ["explore", "find-gaps"],
  };

  const cacheKey = hash(`cog:${skillId}:${nodeText}:${context}:${userPrompt}:${(existingNodes || []).slice(0, 5).join(",")}`);
  const cached = cacheGet(cacheKey);
  if (cached) return { ...cached, cached: true };

  const prompt = [
    `You are the Senior AI Spatial Thinking Engine operating within Obsidian Canvas.`,
    `Active Skill Protocol: "${def.name}" (${skillId}).`,
    `Skill Objective: ${def.description}`,
    ``,
    `INPUT CONTEXT:`,
    `- Focal Subject / Node: "${nodeText}"`,
    context ? `- Connected Canvas Narrative & Ancestors: "${context}"` : "",
    canvasSummary ? `- Canvas Scope & Overview: "${canvasSummary}"` : "",
    userPrompt ? `- User Specific Guidance / Inquiry: "${userPrompt}"` : "",
    existingNodes?.length ? `- Existing Nodes on Canvas (DO NOT DUPLICATE THESE): ${JSON.stringify(existingNodes.slice(0, 25))}` : "",
    vaultNotes?.length ? `- Referenced Obsidian Notes:
${vaultNotes.map(n => `  * [[${n.title}]]: ${n.excerpt}`).join("\n")}` : "",
    ``,
    `COGNITIVE PROTOCOL RULES:`,
    `1. Think critically, structurally, and contextually. Reject generic filler text.`,
    `2. Generate between 3 and 5 high-value structured cards (never flood the canvas).`,
    `3. Every card must have a clear semantic type:`,
    `   - "concept" (core ideas, mental models, sub-components) -> color "6" (Purple)`,
    `   - "question" (critical unanswered inquiries) -> color "2" (Amber)`,
    `   - "decision" (architectural choices, milestone commits) -> color "3" (Yellow)`,
    `   - "assumption" (unverified premises or beliefs) -> color "2" (Orange)`,
    `   - "risk" (failure modes, bottlenecks, potential gaps) -> color "1" (Red)`,
    `   - "task" (actionable work items, build phases) -> color "5" (Cyan)`,
    `   - "evidence" (facts, sources, benchmarks) -> color "4" (Green)`,
    `   - "unknown" (unresolved blind spots) -> color "1" (Red)`,
    `4. Provide explicit relationships connecting the new cards to the focal node or to each other.`,
    `   Labels must be functional: "depends on", "contradicts", "enables", "evidence for", "part of", "leads to".`,
    `5. Identify any potential gaps or blind spots using measured language ("Potential gap...").`,
    `6. Suggest 2-4 logical next skills from: ["explore", "connect", "find-gaps", "decompose", "roadmap", "challenge", "research-map", "synthesize", "evolve"].`,
    ``,
    `OUTPUT SPECIFICATION:`,
    `Return ONLY a valid JSON object matching this exact schema (no markdown formatting, no code fences):`,
    `{`,
    `  "summary": "1-2 sentence executive explanation of what was discovered or formulated.",`,
    `  "reasoning": "Why this matters in the context of the user project.",`,
    `  "nodes": [`,
    `    {`,
    `      "id": "short-unique-slug",`,
    `      "type": "concept",`,
    `      "title": "Concise Descriptive Title",`,
    `      "content": "2-3 dense, analytical sentences explaining the mechanism, value, or requirement.",`,
    `      "color": "6",`,
    `      "tags": ["tag1", "tag2"]`,
    `    }`,
    `  ],`,
    `  "relationships": [`,
    `    {`,
    `      "from": "Focal Node or new node id",`,
    `      "to": "Target node id",`,
    `      "label": "depends on",`,
    `      "reason": "Clear explanation of the dependency or connection."`,
    `    }`,
    `  ],`,
    `  "questions": [`,
    `    "Unresolved high-leverage question 1"`,
    `  ],`,
    `  "gaps": [`,
    `    "Potential missing architectural element or risk"`,
    `  ],`,
    `  "nextSkills": ["explore", "find-gaps"]`,
    `}`,
  ].filter(Boolean).join("\n");

  const raw = await completePrompt({ prompt, effort: "high", timeout: 90_000 });

  let result;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (err) {
    // Robust fallback normalization
    result = {
      summary: `Analysis conducted for ${def.name}.`,
      reasoning: "Generated analytical structure based on active Canvas context.",
      nodes: [
        {
          id: "analysis-card-1",
          type: "concept",
          title: `${def.name}: Core Finding`,
          content: raw.slice(0, 250).replace(/\n+/g, " "),
          color: def.suggestedColor,
          tags: [skillId],
        }
      ],
      relationships: [
        {
          from: nodeText || "Focal Node",
          to: "analysis-card-1",
          label: "leads to",
          reason: "Direct cognitive expansion of focal node"
        }
      ],
      questions: [],
      gaps: [],
      nextSkills: def.nextSkills,
    };
  }

  // Deduplicate against existing nodes
  if (existingNodes?.length && result.nodes?.length) {
    const existingLower = new Set(existingNodes.map(s => String(s).toLowerCase().trim()));
    result.nodes = result.nodes.filter(n => !existingLower.has(n.title.toLowerCase().trim()));
  }

  // Ensure default nextSkills if missing
  if (!result.nextSkills || !result.nextSkills.length) {
    result.nextSkills = def.nextSkills;
  }

  const payload = {
    ok: true,
    skillId,
    skillName: def.name,
    badge: def.badge,
    ...result,
  };

  cacheSet(cacheKey, payload);
  return { ...payload, cached: false };
}

export function routeIntent({ userPrompt = "", context = "" }) {
  const p = userPrompt.toLowerCase();

  if (p.includes("gap") || p.includes("missing") || p.includes("blind spot") || p.includes("risk") || p.includes("vulnerab")) {
    return { skillId: "find-gaps", confidence: 0.95, reason: "Inquiry targets missing requirements or unstated risks." };
  }
  if (p.includes("break down") || p.includes("decompose") || p.includes("module") || p.includes("subsystem") || p.includes("parts")) {
    return { skillId: "decompose", confidence: 0.95, reason: "Inquiry asks for architectural system decomposition." };
  }
  if (p.includes("roadmap") || p.includes("plan") || p.includes("step") || p.includes("phase") || p.includes("milestone") || p.includes("timeline")) {
    return { skillId: "roadmap", confidence: 0.95, reason: "Inquiry requests a phased progression or milestone sequence." };
  }
  if (p.includes("challenge") || p.includes("critique") || p.includes("assumption") || p.includes("tradeoff") || p.includes("counter")) {
    return { skillId: "challenge", confidence: 0.95, reason: "Inquiry requests stress-testing of premises and assumptions." };
  }
  if (p.includes("connect") || p.includes("relat") || p.includes("link") || p.includes("depend")) {
    return { skillId: "connect", confidence: 0.90, reason: "Inquiry seeks relationships and dependencies between cards." };
  }
  if (p.includes("research") || p.includes("investigat") || p.includes("source") || p.includes("unknown")) {
    return { skillId: "research-map", confidence: 0.90, reason: "Inquiry is an open exploration of an unfamiliar topic." };
  }
  if (p.includes("synthes") || p.includes("distill") || p.includes("summariz") || p.includes("unif")) {
    return { skillId: "synthesize", confidence: 0.90, reason: "Inquiry aims to condense multiple concepts into a coherent model." };
  }
  if (p.includes("evolve") || p.includes("sync") || p.includes("update") || p.includes("diff")) {
    return { skillId: "evolve", confidence: 0.90, reason: "Inquiry asks to update the Canvas based on new knowledge." };
  }
  if (p.includes("explore") || p.includes("deep dive") || p.includes("unpack") || p.includes("dimension")) {
    return { skillId: "explore", confidence: 0.85, reason: "Inquiry seeks conceptual expansion of a single subject." };
  }

  // Default to brainstorm
  return { skillId: "brainstorm", confidence: 0.75, reason: "General exploratory ideation requested." };
}
