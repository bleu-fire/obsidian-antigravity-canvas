/**
 * style-library.js
 * Persistent Style Library and Active Style Locking for Antigravity Canvas
 *
 * Provides:
 * 1. File-backed CRUD operations for user custom Visual DNA styles
 * 2. Active Style Lock state management across multiple generations
 */

import fs from "fs";
import path from "path";
import { normalizeVisualDNA } from "./visual-dna-analyzer.js";

const LIBRARY_DIR = path.resolve(".cache/style-library");
const LIBRARY_FILE = path.join(LIBRARY_DIR, "custom-styles.json");
const LOCK_FILE = path.join(LIBRARY_DIR, "active-lock.json");

function ensureDir() {
  if (!fs.existsSync(LIBRARY_DIR)) {
    fs.mkdirSync(LIBRARY_DIR, { recursive: true });
  }
}

function readLibrary() {
  ensureDir();
  try {
    if (!fs.existsSync(LIBRARY_FILE)) return [];
    const data = JSON.parse(fs.readFileSync(LIBRARY_FILE, "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLibrary(items) {
  ensureDir();
  try {
    fs.writeFileSync(LIBRARY_FILE, JSON.stringify(items, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

// ── CRUD Operations ──────────────────────────────────────────────────────────

/**
 * Lists all user-saved custom styles from the style library.
 */
export function listCustomStyles() {
  return readLibrary();
}

/**
 * Gets a single custom style by ID.
 */
export function getCustomStyle(id) {
  if (!id) return null;
  const lib = readLibrary();
  return lib.find(s => s.id === id || s.name.toLowerCase() === id.toLowerCase()) || null;
}

/**
 * Saves or updates a custom Visual DNA style in the library.
 */
export function saveCustomStyle(visualDNA, customName = null) {
  const dna = normalizeVisualDNA(visualDNA);
  const lib = readLibrary();
  const now = new Date().toISOString();

  const name = customName?.trim() || dna.name || "Custom Visual DNA";
  const id = dna.id || `style-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`;

  const existingIdx = lib.findIndex(s => s.id === id || s.name.toLowerCase() === name.toLowerCase());

  const styleEntry = {
    id,
    name,
    visualLanguage: dna.visualLanguage,
    mood: dna.mood,
    artDirection: dna.artDirection,
    color: dna.color,
    lighting: dna.lighting,
    camera: dna.camera,
    composition: dna.composition,
    materials: dna.materials,
    textures: dna.textures,
    atmosphere: dna.atmosphere,
    detailDensity: dna.detailDensity,
    realism: dna.realism,
    colorGrading: dna.colorGrading,
    shapeLanguage: dna.shapeLanguage,
    negativeConstraints: dna.negativeConstraints,
    sourceImage: dna.sourceImage || "",
    updatedAt: now,
    createdAt: existingIdx >= 0 ? lib[existingIdx].createdAt : now,
  };

  if (existingIdx >= 0) {
    lib[existingIdx] = styleEntry;
  } else {
    lib.push(styleEntry);
  }

  writeLibrary(lib);
  return styleEntry;
}

/**
 * Renames a custom style.
 */
export function renameCustomStyle(id, newName) {
  if (!id || !newName?.trim()) return null;
  const lib = readLibrary();
  const style = lib.find(s => s.id === id);
  if (!style) return null;

  style.name = newName.trim();
  style.updatedAt = new Date().toISOString();
  writeLibrary(lib);
  return style;
}

/**
 * Deletes a custom style by ID.
 */
export function deleteCustomStyle(id) {
  if (!id) return false;
  const lib = readLibrary();
  const filtered = lib.filter(s => s.id !== id);
  if (filtered.length === lib.length) return false;
  writeLibrary(filtered);

  // If the deleted style was locked, clear lock
  const activeLock = getActiveLockedStyle();
  if (activeLock && activeLock.id === id) {
    clearActiveLockedStyle();
  }

  return true;
}

// ── Style Lock Management ────────────────────────────────────────────────────

let inMemoryLock = null;

/**
 * Gets the active locked style if enabled.
 */
export function getActiveLockedStyle() {
  if (inMemoryLock) return inMemoryLock;
  ensureDir();
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const data = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));
      if (data && data.locked) {
        inMemoryLock = data.style;
        return inMemoryLock;
      }
    }
  } catch {}
  return null;
}

/**
 * Locks an active Visual DNA profile across subsequent generations.
 */
export function setActiveLockedStyle(visualDNA) {
  const dna = normalizeVisualDNA(visualDNA);
  inMemoryLock = dna;
  ensureDir();
  try {
    fs.writeFileSync(
      LOCK_FILE,
      JSON.stringify({ locked: true, style: dna, lockedAt: new Date().toISOString() }, null, 2),
      "utf8"
    );
  } catch {}
  return dna;
}

/**
 * Clears and unlocks the active visual style.
 */
export function clearActiveLockedStyle() {
  inMemoryLock = null;
  ensureDir();
  try {
    if (fs.existsSync(LOCK_FILE)) {
      fs.unlinkSync(LOCK_FILE);
    }
  } catch {}
  return true;
}
