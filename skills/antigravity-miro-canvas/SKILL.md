---
name: antigravity-miro-canvas
description: Transforms Obsidian Canvas into a Miro-like visual whiteboard using Antigravity as the backend. Generates real photorealistic 3D images (PNG/JPG), spatial brainstorm ideas, and 16:9 high-CTR thumbnail wireframe mockups with clean node layouts, custom icons, and zero coordinate collisions.
---

# Antigravity Miro Canvas Skill

This skill defines the complete spatial workflow turning **Obsidian Canvas** into an AI-augmented **Miro Whiteboard** powered by **Antigravity**.

## The 3-Stage Visual Pipeline

Unlike simple text-expansion or flat SVG code, this workflow combines three distinct layers:

```
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│     1. SPATIAL IDEA     │       │    2. REAL 3D RENDER    │       │ 3. 16:9 THUMBNAIL FRAME │
│ • Concept & angle cards │  ───► │ • Real PNG/JPG renders  │  ───► │ • Bold 3-word hook text │
│ • Color-coded themes    │       │ • Antigravity Imagen AI │       │ • Social proof badges   │
│ • Bidirectional links   │       │ • High-contrast dark bg │       │ • 60/40 visual balance  │
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
```

---

## 1. Real Image Generation (No Low-Quality SVGs)

When creating graphics or brand marks for canvas cards:
- Do **not** use manual vector SVGs for photorealistic or 3D concepts.
- Use **Antigravity Image Generation** (or Imagen 3) with prompt engineering:
  - Subject: `High-end 3D metallic/glass/cybernetic brand mark`
  - Lighting: `Cinematic rim lighting, volumetric soft glow`
  - Background: `Deep dark `#0A0F1D` or dark carbon studio background`
  - Output: High-resolution raster images saved to `assets/logos/<name>.jpg` or `.png`
- Embed the image directly into the canvas using a `"type": "file"` node.

---

## 2. 16:9 Thumbnail Wireframe & Mockup Architecture

Thumbnail frames simulate high-CTR video/project covers:
- **Aspect Ratio**: Standard 16:9 canvas box (`width: 560, height: 320` or `width: 800, height: 450`).
- **Hook Headline Card**:
  - Upper left quadrant (primary eye-scan zone).
  - Maximum 3 to 4 words (e.g. `THE 1% LOGO SECRET`, `DO NOT DO THIS`).
  - Red / Yellow / High-contrast color preset (`color: "1"` or `"3"`).
- **Social Proof / CTR Badge Card**:
  - Contextual anchor (e.g. ` FINTECH VAULT`, `⚡ $100K SAAS`).
- **Embedded Visual Anchor**:
  - Placed on the right third to maintain a 60/40 visual weight ratio.

---

## 3. Spatial Math & Zero-Collision Layout Rules

When updating `.canvas` files:
1. **Vertical Progression**:
   - `Concept Node`: `(x, y)`
   - `Generated Image Node`: `(x, y + height + 120)`
   - `Thumbnail Mockup Frame`: `(x + width + 80, y + height + 120)`
2. **Horizontal Branching**:
   - Spacing between parallel sub-ideas: $\Delta y = 220\text{px}$, $\Delta x = \text{width} + 140\text{px}$.
3. **Connectors (Edges)**:
   - Always connect from side to side: `fromSide: "bottom"` $\rightarrow$ `toSide: "top"` or `fromSide: "right"` $\rightarrow$ `toSide: "left"`.
   - Use meaningful edge labels (`"Antigravity 3D Render"`, `"Wireframe Layout"`).

---

## 4. Obsidian Plugin Architecture

The companion plugin lives in `.obsidian/plugins/antigravity-canvas/`:
- **Ribbon Icon**: Adds instant canvas launch and Antigravity workflow access.
- **Node Context Menu**:
  - `Antigravity: Brainstorm 3 Connected Ideas`
  - `Antigravity: Generate 16:9 Thumbnail Frame`
- **Backend**: Direct async integration with Gemini & Antigravity image pipelines.
