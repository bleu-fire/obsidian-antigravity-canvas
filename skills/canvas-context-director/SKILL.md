---
name: canvas-context-director
description: Advanced spatial context harvesting and multi-style visual direction protocol for Obsidian Canvas. Extracts upstream narrative chains from connected nodes and synthesizes cinematic dramatic, 3D cartoonic, or hyper-vibrant color imagery with exact aspect-ratio budgeting.
---

# Canvas Context Director Protocol

This skill bridges **spatial node relationships** on Obsidian Canvas with **multi-aesthetic visual synthesis**. It turns isolated cards into deeply contextual, genre-accurate imagery.

```
┌────────────────────────────────┐    ┌────────────────────────────────┐    ┌────────────────────────────────┐
│ 1. GRAPH CONTEXT HARVESTING    │    │ 2. AESTHETIC PALETTE ENGINE    │    │ 3. PROMPT SYNTHESIS & SIZING   │
│ • Trace upstream parent nodes  │───►│ • Cinematic Dramatic           │───►│ • 5-Layer Prompt Engineering   │
│ • Extract root project themes  │    │ • 3D Cartoonic / Pixar / Arcane│    │ • Dynamic Aspect Ratio (16:9)  │
│ • Synthesize narrative chain   │    │ • Hyper-Vibrant / Chromatic    │    │ • Zero-Collision Canvas Layout │
└────────────────────────────────┘    └────────────────────────────────┘    └────────────────────────────────┘
```

---

## 1. Graph Context Harvesting (Node Traversal)

Never generate an image from an isolated card without understanding its position in the canvas graph.

### Upstream Traversal Algorithm
1. **Target Node ($N_0$)**: The focused card requested for image rendering.
2. **Immediate Parent ($P_1$)**: Follow incoming edges (`toNode = N_0.id`). Extracts the direct concept ancestor.
3. **Root Theme ($R$)**: Follow incoming edges recursively to the initial origin node (the project title or story anchor).
4. **Context Synthesis Formula**:
   $$\text{Context} = [\text{Root Theme}: R] \longrightarrow [\text{Section}: P_1] \longrightarrow [\text{Focal Subject}: N_0]$$

*Example*:
- If $N_0$ = `"Edge Rim Lighting"`
- Parent $P_1$ = `"Hero Subject Anchor: Nocturne Bloodline"`
- Root $R$ = `"Vampire Warlord Video Thumbnail"`
- **Harvested Context**:
  > *"Project: Vampire Warlord Video Thumbnail | Theme: Nocturne Bloodline | Specific Shot: High-contrast edge rim lighting isolating the undead warlord hero asset from the dark backdrop."*

---

## 2. Multi-Aesthetic Style Engine

The director detects stylistic cues from the node and parent context, or applies a requested visual preset:

###  Preset A: Cinematic & Dramatic (IMAX / Chiaroscuro)
* **Trigger Keywords**: `cinematic`, `dramatic`, `dark`, `movie`, `film`, `epic`, `intense`, `noir`, `shadow`
* **Optics & Lighting**: Panavision C-Series anamorphic 50mm, f/1.4, intense chiaroscuro contrast, volumetric haze, rim lights outlining the silhouette.
* **Palette**: Carbon black (`#080C14`), desaturated slate, single intense warm tungsten or icy-blue counter-fill.
* **Prompt Formula**:
  ```text
  Cinematic film still, 16:9 dramatic composition. [SUBJECT WITH HARVESTED CONTEXT].
  Lighting: Extreme chiaroscuro lighting, razor-sharp asymmetric rim light cutting through volumetric haze and smoke.
  Optics & Color: 50mm anamorphic lens, deep natural shadow depth, desaturated cinematic grade with rich contrast, 8k photographic film plate.
  Atmosphere: Heavy narrative tension, dramatic atmospheric dust particles catching the spotlight, masterpiece cinematography.
  --no cartoon, no flat vector, no cheap neon, no blurry artifacts, no low resolution
  ```

---

###  Preset B: 3D Cartoonic & Stylized (Pixar / Arcane / DreamWorks)
* **Trigger Keywords**: `cartoon`, `cartoonic`, `stylized`, `pixar`, `disney`, `animated`, `3d render`, `character`, `cute`, `arcane`
* **Optics & Lighting**: Lush three-point studio lighting, soft key light, colorful bounce lighting, subsurface scattering on skin and materials.
* **Palette**: Rich, expressive, warm saturated tones, stylized hand-painted PBR textures, soft ambient occlusion.
* **Prompt Formula**:
  ```text
  Award-winning 3D stylized animation studio render of [SUBJECT WITH HARVESTED CONTEXT].
  Style: Top-tier feature animation aesthetic (Pixar / Sony Animation / Fortiche Arcane quality).
  Character & Materiality: Highly expressive stylized proportions, rich subsurface scattering on tactile materials, hand-painted texture details.
  Lighting & Color: Warm volumetric key light, whimsical colorful bounce fill, soft atmospheric depth falloff, vibrant cinematic color palette.
  Render: Octane 8k render, crystal clean edges, whimsical lighting highlights, cinematic depth of field.
  --no flat 2D, no low-poly, no muddy colors, no photographic grain, no deformed anatomy
  ```

---

###  Preset C: Hyper-Vibrant & Chromatic Color (Synthwave / Cyber / Iridescent)
* **Trigger Keywords**: `color`, `colorful`, `vibrant`, `neon`, `cyberpunk`, `synthwave`, `holographic`, `iridescent`, `prism`, `glow`
* **Optics & Lighting**: High-intensity dual chromatic lighting (e.g. electric cyan + magenta violet), prismatic light refraction through crystal/glass.
* **Palette**: High dynamic range (HDR) neon, hyper-saturated ultraviolet, deep velvet void backdrop (`#050811`) to maximize color contrast.
* **Prompt Formula**:
  ```text
  Visually stunning hyper-vibrant artistic render of [SUBJECT WITH HARVESTED CONTEXT].
  Lighting & Spectrum: Intense dual-tone chromatic lighting, radiant volumetric neon glow, prismatic dispersion splitting into iridescent jewel tones.
  Materiality: Optical smoked glass, liquid chrome, reflective wet dark basalt surfaces amplifying chromatic color reflections.
  Composition: High-contrast 16:9 composition, vibrant saturation balanced against a deep obsidian dark void, zero color bleeding, pristine 8k render.
  --no dull colors, no washed out grey, no muddy palette, no blurry noise
  ```

---

## 3. Dynamic Aspect Ratio Budgeting

Match the aesthetic to the canvas card size:

| Requested Aesthetic | Ideal Aspect Ratio | Canvas Node Width | Canvas Node Height | Edge Connector Label |
|---|:---:|:---:|:---:|---|
| **Cinematic Dramatic** | `16:9` | **560 px** | **315 px** | `"AGY Cinematic 16:9"` |
| **3D Cartoonic Character** | `3:4` or `1:1` | **330 px** or **360 px** | **440 px** or **360 px** | `"AGY Stylized 3D"` |
| **Hyper-Vibrant Concept** | `16:9` or `1:1` | **560 px** or **360 px** | **315 px** or **360 px** | `"AGY Vibrant Chromatic"` |

---

## 4. Execution Workflow

1. In Obsidian Canvas, select the card you wish to visualize.
2. The plugin traverses incoming edges to gather upstream cards.
3. The Context Director blends the cards into a coherent scene brief.
4. Generates the 8K asset and attaches it right next to the node with zero coordinate collision.
