/**
 * One-off vault maintenance:
 * 1) Wargame/: tag `wargame` on every note; `02 Models` → +`Wargame_Models`;
 *    `04 Utilities` → +`Wargame_Utilities` (YAML lists → Obsidian #wargame / #Wargame_Models / etc.)
 * 2) Rename tag/metadata Dyrrachon -> Osmirate without touching narrative prose
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve("c:\\Noosphera");
const WARGAME_PREFIX = "Wargame";

function desiredWargameTags(relPosix) {
  const tags = ["wargame"];
  if (relPosix.includes("/02 Models/")) tags.push("Wargame_Models");
  if (relPosix.includes("/04 Utilities/")) tags.push("Wargame_Utilities");
  return tags;
}

/** Drop legacy nested Wargame tags from earlier passes */
function stripObsoleteWargameAutoTags(tags) {
  return tags.filter((t) => {
    const s = String(t);
    if (s === "Wargame Other") return false;
    if (s.endsWith("/Wargame Models")) return false;
    if (s.endsWith("/Wargame Utilities")) return false;
    if (s.endsWith("/Wargame Other")) return false;
    return true;
  });
}

function splitFirstFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { hasFm: false, fmLines: [], bodyLines: lines };
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (end < 0) return { hasFm: false, fmLines: [], bodyLines: lines };
  return {
    hasFm: true,
    fmLines: lines.slice(1, end),
    bodyLines: lines.slice(end + 1),
  };
}

function extractTagsFromFm(fmLines) {
  const tags = [];
  let i = 0;
  while (i < fmLines.length) {
    const line = fmLines[i];
    const mInline = line.match(/^\s*tags:\s*\[(.*)\]\s*$/);
    if (mInline) {
      const inner = mInline[1];
      inner.split(",").forEach((part) => {
        const t = part.trim().replace(/^["']|["']$/g, "");
        if (t) tags.push(t);
      });
      i++;
      continue;
    }
    const mKey = line.match(/^\s*tags:\s*$/);
    if (mKey) {
      i++;
      while (i < fmLines.length && /^\s*-\s+/.test(fmLines[i])) {
        const t = fmLines[i].replace(/^\s*-\s+/, "").trim().replace(/^["']|["']$/g, "");
        if (t) tags.push(t);
        i++;
      }
      continue;
    }
    i++;
  }
  return tags;
}

function fmLinesWithoutTags(fmLines) {
  const out = [];
  let i = 0;
  while (i < fmLines.length) {
    const line = fmLines[i];
    if (/^\s*tags:\s*\[/.test(line)) {
      i++;
      continue;
    }
    if (/^\s*tags:\s*$/.test(line)) {
      i++;
      while (i < fmLines.length && /^\s*-\s+/.test(fmLines[i])) i++;
      continue;
    }
    out.push(line);
    i++;
  }
  return out;
}

function mergeUnique(existing, add) {
  const seen = new Set(existing.map((t) => String(t)));
  const merged = [...existing];
  for (const t of add) {
    const s = String(t);
    if (!seen.has(s)) {
      seen.add(s);
      merged.push(s);
    }
  }
  return merged;
}

function appendTagsBlock(fmLines, tags) {
  const trimmed = fmLines.join("\n").replace(/\s+$/, "");
  const tagBlock =
    "tags:\n" + tags.map((t) => `  - ${t}`).join("\n");
  if (!trimmed) return [tagBlock];
  return [...trimmed.split("\n"), tagBlock];
}

function rebuildFile(hasFm, fmLines, bodyLines) {
  const body = bodyLines.join("\n");
  if (!hasFm) return body;
  const fm = fmLines.join("\n");
  return `---\n${fm}\n---\n${body}`;
}

function applyWargameTags(relPosix, text) {
  const want = desiredWargameTags(relPosix);
  let { hasFm, fmLines, bodyLines } = splitFirstFrontmatter(text);

  if (!hasFm) {
    const tagBlock = appendTagsBlock([], want);
    return rebuildFile(true, tagBlock, bodyLines);
  }

  const existing = stripObsoleteWargameAutoTags(extractTagsFromFm(fmLines));
  const merged = mergeUnique(existing, want);
  let newFm = fmLinesWithoutTags(fmLines);
  newFm = appendTagsBlock(newFm, merged);
  return rebuildFile(true, newFm, bodyLines);
}

/** Dyrrachon -> Osmirate only for Obsidian tag / region metadata lines */
function dyrrachonMetadataSwap(line) {
  const t = line.trimStart();
  if (t.startsWith("tags:")) {
    return line.replace(/\bDyrrachon\b/g, "Osmirate");
  }
  if (/^\s*-\s+Dyrrachon\b/.test(line)) {
    return line.replace(/\bDyrrachon\b/g, "Osmirate");
  }
  if (/^\s*regiao:\s*Dyrrachon\s*$/.test(line)) {
    return line.replace(/\bDyrrachon\b/g, "Osmirate");
  }
  return line;
}

function processDyrrachonFile(absPath, text) {
  const lines = text.split(/\r?\n/);
  const isArcanosStyle =
    absPath.includes(`${path.sep}Arcanos e Mecânicas${path.sep}`) &&
    path.basename(absPath).startsWith("Arcanos");

  if (isArcanosStyle) {
    return lines.map((line) => dyrrachonMetadataSwap(line)).join("\n");
  }

  const { hasFm, fmLines, bodyLines } = splitFirstFrontmatter(text);
  if (!hasFm) {
    const buscarLore =
      absPath.endsWith(`${path.sep}Worldbuilding${path.sep}Buscador de Lore.md`);
    return lines
      .map((line) => {
        if (
          buscarLore &&
          line.includes("linearch") &&
          line.includes('reg = "Dyrrachon"')
        ) {
          return line.replace(/"Dyrrachon"/g, '"Osmirate"');
        }
        return dyrrachonMetadataSwap(line);
      })
      .join("\n");
  }

  const newFm = fmLines.map(dyrrachonMetadataSwap);
  const buscarPath = absPath.endsWith(`${path.sep}Worldbuilding${path.sep}Buscador de Lore.md`);
  const newBody = bodyLines.map((line) => {
    if (buscarPath && /reg\s*=\s*"Dyrrachon"/.test(line)) {
      return line.replace(/"Dyrrachon"/g, '"Osmirate"');
    }
    return line;
  });

  return rebuildFile(true, newFm, newBody);
}

function walkMarkdownFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = ent.name;
    if (name.startsWith(".")) continue;
    const abs = path.join(dir, name);
    if (ent.isDirectory()) {
      if (name === ".git" || name === "node_modules") continue;
      walkMarkdownFiles(abs, out);
    } else if (name.endsWith(".md")) {
      out.push(abs);
    }
  }
  return out;
}

// --- run ---
const wargameDir = path.join(ROOT, WARGAME_PREFIX);
let wgChanged = 0;
for (const abs of walkMarkdownFiles(wargameDir)) {
  const raw = fs.readFileSync(abs, "utf8");
  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  const next = applyWargameTags(rel, raw);
  if (next !== raw) {
    fs.writeFileSync(abs, next, "utf8");
    wgChanged++;
  }
}

let loreChanged = 0;
for (const abs of walkMarkdownFiles(ROOT)) {
  if (abs.startsWith(wargameDir + path.sep)) continue;
  const raw = fs.readFileSync(abs, "utf8");
  const next = processDyrrachonFile(abs, raw);
  if (next !== raw) {
    fs.writeFileSync(abs, next, "utf8");
    loreChanged++;
  }
}

console.log(JSON.stringify({ wargameFilesUpdated: wgChanged, otherMarkdownUpdated: loreChanged }, null, 2));
