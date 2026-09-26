#!/usr/bin/env bash
set -e

# ==============================================================================
# Obsidian Antigravity Canvas - Universal 1-Click Installer
# Works with: Local Terminal, Antigravity (AGY), or Claude
# ==============================================================================

VAULT_DIR="${1:-$HOME/Documents/Obsidian Vault}"
INSTALL_DIR="$HOME/.gemini/antigravity-bridge"
REPO_URL="https://github.com/bleu-fire/obsidian-antigravity-canvas.git"
SKILLS_DIR="$HOME/.gemini/config/skills"

echo "------------------------------------------------------------"
echo "  Obsidian Antigravity Canvas - Automated Setup"
echo "------------------------------------------------------------"

# 1. Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required. Please install Node.js (v18+) first."
  exit 1
fi
echo "[1/6] Node.js found: $(node -v)"

# 2. Check Antigravity (agy)
AGY_BIN="$HOME/.gemini/bin/agy"
if [ ! -f "$AGY_BIN" ] && ! command -v agy >/dev/null 2>&1; then
  echo "Warning: agy CLI not found at $AGY_BIN. Make sure Antigravity is installed."
else
  echo "[2/6] Antigravity CLI located."
fi

# 3. Clone or Update Repository
echo "[3/6] Fetching repository..."
if [ -d "$INSTALL_DIR/.git" ]; then
  cd "$INSTALL_DIR" && git pull --quiet origin main || true
else
  mkdir -p "$(dirname "$INSTALL_DIR")"
  git clone --quiet "$REPO_URL" "$INSTALL_DIR"
fi

# 4. Install & Enable Obsidian Plugin
echo "[4/6] Installing plugin to Obsidian Vault: $VAULT_DIR"
PLUGIN_DEST="$VAULT_DIR/.obsidian/plugins/antigravity-canvas"
mkdir -p "$PLUGIN_DEST"
cp "$INSTALL_DIR/plugin/manifest.json" "$PLUGIN_DEST/"
cp "$INSTALL_DIR/plugin/main.js" "$PLUGIN_DEST/"
cp "$INSTALL_DIR/plugin/styles.css" "$PLUGIN_DEST/"

# Auto-enable plugin in community-plugins.json
COMMUNITY_CONFIG="$VAULT_DIR/.obsidian/community-plugins.json"
if [ -f "$COMMUNITY_CONFIG" ]; then
  python3 -c "
import json
p = '$COMMUNITY_CONFIG'
try:
    with open(p, 'r') as f: data = json.load(f)
    if 'antigravity-canvas' not in data:
        data.append('antigravity-canvas')
        with open(p, 'w') as f: json.dump(data, f, indent=2)
except Exception: pass
"
else
  echo '["antigravity-canvas"]' > "$COMMUNITY_CONFIG"
fi

# 5. Sync AI Skills to Global Config & Vault
echo "[5/6] Syncing reasoning, UI/UX, gaming, and creative director skills..."
mkdir -p "$SKILLS_DIR"
mkdir -p "$VAULT_DIR/copilot/skills"

for skill in ui-ux-design-master canvas-visual-reasoning canvas-context-director gaming-visual-engine gaming-thumbnail-architect macro-asset-artisan canvas-visual-artisan thumbnail-architect antigravity-brand-reasoning antigravity-miro-canvas brainstorming-creative-director; do
  if [ -d "$INSTALL_DIR/skills/$skill" ]; then
    mkdir -p "$SKILLS_DIR/$skill" "$VAULT_DIR/copilot/skills/$skill"
    cp -r "$INSTALL_DIR/skills/$skill/"* "$SKILLS_DIR/$skill/" 2>/dev/null || true
    cp -r "$INSTALL_DIR/skills/$skill/"* "$VAULT_DIR/copilot/skills/$skill/" 2>/dev/null || true
  fi
done

# 6. Install Bridge Dependencies & Launch Daemon
echo "[6/6] Starting Antigravity Bridge Daemon..."
cd "$INSTALL_DIR/bridge"
npm install --silent >/dev/null 2>&1

fuser -k 3099/tcp 2>/dev/null || true
sleep 1
setsid node "$INSTALL_DIR/bridge/server.js" </dev/null >/tmp/agy-bridge.log 2>&1 &
sleep 2

# Verify
if curl -s http://127.0.0.1:3099/health | grep -q '"status":"ok"'; then
  echo "------------------------------------------------------------"
  echo "  SUCCESS: Antigravity Canvas Workflow is Fully Installed!"
  echo "------------------------------------------------------------"
  echo "  Bridge Server : http://127.0.0.1:3099 (RUNNING)"
  echo "  Plugin        : $PLUGIN_DEST (ENABLED)"
  echo "  Skills Synced : $SKILLS_DIR"
  echo ""
  echo "  Next Step: In Obsidian, press [Ctrl + P] and run:"
  echo "             'Reload app without saving'"
  echo "------------------------------------------------------------"
else
  echo "Warning: Bridge started but health check timed out. Check /tmp/agy-bridge.log"
fi
