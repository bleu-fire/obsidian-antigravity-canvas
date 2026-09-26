# Canvas Sizing & Zero-Collision Layout Guide

The **Canvas Visual Artisan** engine automatically eliminates visual distortion and card overlap by pairing each idea type with its mathematically ideal aspect ratio and canvas coordinates.

---

## 1. Dimension Matrix

| Genre / Concept | Ratio | Card Width | Card Height | Visual Behavior |
|---|:---:|:---:|:---:|---|
| **Thumbnail / Cover / Scene** | `16:9` | `560 px` | `315 px` | Landscape layout with golden ratio focal point |
| **Panoramic Landscape / Wireframe** | `16:9` | `640 px` | `360 px` | Wide-screen environment display |
| **Brand Mark / 3D Icon / Emblem** | `1:1` | `360 px` | `360 px` | Symmetrical studio-lit hardware/object |
| **Character / Portrait / Poster** | `3:4` | `330 px` | `440 px` | Vertical editorial figure representation |

---

## 2. Dynamic Classifier Triggers

The classifier scans the source card text and selects the dimension profile:

* **16:9 Keywords**: `thumbnail`, `cover`, `youtube`, `wireframe`, `scene`, `landscape`, `cinematic`, `movie`, `video`, `film`, `wide`, `environment`, `battle`, `cyberpunk`, `documentary`.
* **1:1 Keywords**: `logo`, `icon`, `emblem`, `orb`, `cube`, `badge`, `mark`, `symbol`, `avatar`, `token`, `monogram`, `asset`, `crystal`, `apple`, `sphere`.
* **3:4 Keywords**: `character`, `portrait`, `warrior`, `figure`, `person`, `face`, `statue`, `vertical`, `poster`, `model`, `cyborg`, `samurai`, `vampire`.

---

## 3. Zero-Collision Layout Mathematics

When a generated image card is written into the `.canvas` JSON:

$$x_{\text{child}} = x_{\text{parent}} + \text{width}_{\text{parent}} + 80\text{px}$$

$$y_{\text{child}} = y_{\text{parent}} + \frac{\text{height}_{\text{parent}} - \text{height}_{\text{child}}}{2}$$

This ensures that regardless of whether the generated card is wide (16:9) or tall (3:4), its vertical center perfectly aligns with the parent idea card.
