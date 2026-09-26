# Quickstart Guide

Get up and running with **Obsidian Antigravity Canvas** in under two minutes.

---

## 1. Prerequisites

1. **Obsidian** (v1.0.0 or higher) installed on Linux / macOS / Windows (WSL).
2. **Node.js** (v18.0.0 or higher).
3. **Google Antigravity CLI (`agy`)** installed and authenticated.

---

## 2. Install the Bridge Server

In your terminal:

```bash
cd bridge
npm install
bash start.sh
```

You should see:
```text
{"status":"ok","version":"2.0.0","backend":"antigravity-agy","agyOk":true}
✅ Antigravity Bridge running in background on port 3099
```

---

## 3. Install the Obsidian Plugin

Copy the `plugin/` folder into your Obsidian Vault's plugin directory:

```bash
# Example for default Linux path:
mkdir -p "$HOME/Documents/Obsidian Vault/.obsidian/plugins/antigravity-canvas"
cp -r plugin/* "$HOME/Documents/Obsidian Vault/.obsidian/plugins/antigravity-canvas/"
```

1. Open Obsidian.
2. Go to **Settings** ➔ **Community plugins**.
3. Toggle on **Antigravity Canvas**.
4. Check the bottom status bar: it should display **`AGY ready` 🟢**.

---

## 4. Usage in Obsidian Canvas

1. Create or open any `.canvas` file.
2. Create a card with some text (e.g., `Cyberpunk Night Market Samurai`).
3. Right-click the card and choose:
   - **🧠 AGY Brainstorm 3 ideas**: Generates 3 structured sub-ideas connected via visual edges.
   - **🖼️ AGY Generate image (Artisan 8K)**: Automatically generates an 8K studio-grade render with intelligent aspect ratio matching (16:9, 1:1, or 3:4) and embeds it right on the canvas.
   - **✍️ AGY Expand text**: Enriches the node concept with 3 detailed sentences.

---

## 5. Management Commands

* **Check status**:
  ```bash
  curl -s http://127.0.0.1:3099/health
  ```
* **View live logs**:
  ```bash
  tail -f /tmp/agy-bridge.log
  ```
* **Stop the server**:
  ```bash
  fuser -k 3099/tcp
  ```
