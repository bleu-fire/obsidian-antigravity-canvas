---
name: ui-ux-design-master
description: Master-level UI/UX, product design, and design system protocol for mobile and web applications. Specializes in production-grade visual design across 50+ styles, mobile 9:16 wireframes, atomic design systems, and responsive UX architectures.
---

# UI/UX Design Master Protocol

This skill encodes full-stack digital product design, mobile-first UX architectures, atomic design systems, and multi-style visual aesthetics for production applications.

```
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│ 1. PRODUCT & UX AUDIT   │       │ 2. DESIGN SYSTEM TOKENS │       │ 3. SCREEN ARCHITECTURE  │
│ • User problem & goal   │ ───►  │ • Exact HEX & Type scale│ ───►  │ • Mobile 9:16 Wireframe │
│ • Platform & constraints│       │ • Spacing & Components  │       │ • Micro-states & States │
│ • Style matrix selection│       │ • Responsive breakpoints│       │ • WCAG 2.1 AA Compliance│
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
```

---

## 1. Supported Visual Styles Matrix

The engine supports 50+ visual design paradigms. Select the style based on product domain, audience, and mood:

### Contemporary Digital & App Styles
* **Minimal / Clean**: High whitespace, restrained typography, subtle neutral borders, distraction-free.
* **Modern SaaS**: Slate/Indigo palettes, soft drop-shadows, rounded containers, high information density.
* **Glassmorphism**: Translucent frosted-glass cards (`backdrop-filter: blur(16px)`), 1px white border at 15% opacity, layered depth.
* **Neumorphism & Soft UI**: Extruded soft surfaces, dual directional shadows (light top-left, dark bottom-right), tactile buttons.
* **Neo-Brutalism**: Thick black 2px/3px borders, high-contrast flat primary colors, solid hard drop-shadows (`box-shadow: 4px 4px 0px #000`), raw typography.
* **Dark Mode Luxury**: Velvet obsidian background (`#080C14`), micro-gold accents (`#D4AF37`), subtle brushed gradients, understated elegance.

### Platform-Native Guidelines
* **iOS / Apple-Inspired**: SF Pro typography, dynamic blur navigation bars, large titles, segmented controls, standard 44pt touch targets.
* **Android / Material You**: Dynamic color extraction, surface tinting, floating action buttons (FAB), pill-shaped navigation, bottom navigation bars.

### Niche & Genre Aesthetics
* **Cyberpunk & Sci-Fi**: Electric cyan (`#00F0FF`) and violet accents, dark HUD telemetry, monospace data grids, glowing edge strokes.
* **Playful / 3D UI**: Soft rounded squircle cards, colorful isometric 3D illustrations, claymation-inspired pill buttons.
* **Fintech & Banking**: High-trust navy (`#0A2540`) and emerald green (`#00D924`), clear tabular numbers, zero ambiguous interactions.
* **E-Commerce & Retail**: Image-first cards, prominent sticky add-to-cart buttons, clear pricing hierarchy, star rating badges.

---

## 2. Product Discovery & Problem Definition

Before designing any interface, establish the product blueprint:

1. **Product Name & Core Value**: What is the singular job-to-be-done?
2. **Target Audience Profile**: Casual consumers, enterprise power-users, mobile-first Gen Z, or accessibility-dependent users.
3. **Primary Platform**:
   * Mobile (iOS / Android)
   * Responsive Web (Mobile, Tablet, Desktop, Wide)
   * Desktop Application
4. **Primary Flow**: The 3 to 5 critical steps from launch to goal completion.
5. **Brand Personality**: (e.g. "Authoritative and secure" vs "Playful and fast").

---

## 3. Atomic Design System Architecture

Every design must define complete design tokens:

### A. Color System (Provide exact HEX values)
* **Primary & Secondary**: Core brand hues.
* **Surfaces & Background**:
  * `Background`: Deep canvas background (e.g. `#0B0F19` dark, `#F8FAFC` light).
  * `Surface / Card`: Container layer (e.g. `#111827` dark, `#FFFFFF` light).
  * `Border / Divider`: Contrast line (e.g. `rgba(255,255,255,0.08)` or `#E2E8F0`).
* **Semantic Tokens**:
  * `Success` (Green: `#10B981`)
  * `Warning` (Amber: `#F59E0B`)
  * `Error / Danger` (Red: `#EF4444`)
  * `Info` (Blue: `#3B82F6`)
* **Typography Tokens**:
  * `Text Primary`: Highest contrast readable text.
  * `Text Muted / Secondary`: Supporting labels and timestamps.

### B. Typography Scale
* **Display / Hero**: 32px – 48px, Bold / Heavy.
* **Heading 1 / Screen Title**: 24px – 28px, SemiBold.
* **Heading 2 / Section**: 18px – 20px, Medium / SemiBold.
* **Body / Paragraph**: 15px – 16px, Regular, 1.5 line-height.
* **Labels / Captions**: 12px – 13px, Medium, uppercase with letter-spacing for badges.

### C. Spacing Scale (8pt Grid)
`4px` (micro), `8px` (compact), `16px` (standard), `24px` (comfortable), `32px` (generous), `48px` (section separation).

---

## 4. Mobile Screen Architecture (9:16 Viewports)

When specifying mobile screens:

### Mobile Viewport Standard:
* **Ratio**: `9:16` vertical or `390 x 844 px` (standard iPhone/Android baseline).
* **Safe Areas**: Top status bar (`44px`), bottom home indicator (`34px`).

### Vertical Screen Structure:
1. **Top App Bar**: Back navigation or avatar, screen title, secondary action icon.
2. **Primary Hero Section**: High-priority KPI, hero balance, or active task banner.
3. **Scrollable Content Canvas**:
   * Feed cards, grouped lists, or interactive form blocks.
   * Standard card padding: `16px` internal, `16px` screen margin.
4. **Bottom Dock / Navigation**:
   * Fixed 4-5 tab navigation bar with active state pill, OR
   * Sticky full-width Call to Action (CTA) button (`height: 52px`, `border-radius: 12px` or pill).

---

## 5. Interaction States & Edge Cases

Never deliver only the happy path. Every critical component must account for:

| State | Visual Treatment | UX Purpose |
|---|---|---|
| **Default** | Standard token styling | Baseline discovery |
| **Active / Pressed** | Scale transform (`scale(0.98)`), elevation shift | Tactile feedback |
| **Loading / Skeleton** | Shimmer animation placeholder blocks | Perceived performance |
| **Disabled** | 40% opacity, `cursor: not-allowed` | Error prevention |
| **Empty State** | Contextual illustration, 1-line explanation, CTA button | Onboarding recovery |
| **Error State** | Clear inline red message, border highlight, recovery action | Friction resolution |

---

## 6. Accessibility & WCAG 2.1 AA Compliance

* **Contrast Ratios**: Minimum `4.5:1` for normal body text, `3:0:1` for large text and UI controls against their background.
* **Touch Targets**: Minimum `44 x 44 px` interactive hit area for all buttons and tap triggers.
* **Multi-Channel Feedback**: Never use color alone to signal an error—always combine with icons, text labels, or haptic cues.

---

## 7. Obsidian Canvas Output Formatting

When generating mobile UI/UX mockups or wireframes for Obsidian Canvas:

1. **Card Aspect Ratio**:
   * Single Mobile Screen Wireframe: `width: 380, height: 680` (9:16 vertical mobile container).
   * Feature Flow (3-Screen Step): 3 horizontal cards linked by directional arrows (`label: "User Action"`).
2. **Wireframe Markdown Layout**:
   ```markdown
   ### Screen: [Screen Name] (Mobile 9:16)
   
   **Goal**: [Primary User Action]
   
   #### Layout Hierarchy:
   - **Header**: [Title + Actions]
   - **Hero Card**: [Primary Metric / Focal Element]
   - **Action Area**: [List / Inputs / Controls]
   - **Bottom Sticky**: [Primary CTA Button: e.g. "Confirm & Pay ($48)"]
   
   #### Design Tokens Applied:
   - Style: [e.g. Modern Dark Mode SaaS]
   - Primary: `#4F46E5` | Surface: `#111827` | Background: `#0B0F19`
   
   > **UX Note**: [Error prevention rule or micro-interaction detail]
   ```
