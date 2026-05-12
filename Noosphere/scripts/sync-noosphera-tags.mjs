/**
 * 1) Wargame/04 Utilities/{Ryke|Osmirate}/**.md → ensure noosphera: Ryke | Osmirate (after tipo: if present).
 * 2) Any vault .md whose first frontmatter has noosphera: Ryke|Osmirate → ensure tags Ryke / Osmirate
 *    (canonical capitalization; removes duplicate ryke/osmirate variants).
 * Skips: .git, node_modules, .cursor, .obsidian
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve("c:\\Noosphera");

const SKIP_DIRS = new Set([".git", "node_modules", ".cursor", ".obsidian"]);

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

function rebuildFile(fmLines, bodyLines) {
  const fm = fmLines.join("\n");
  const body = bodyLines.join("\n");
  return `---\n${fm}\n---\n${body}`;
}

function extractTagsFromFm(fmLines) {
  const tags = [];
  let i = 0;
  while (i < fmLines.length) {
    const line = fmLines[i];
    const mInline = line.match(/^\s*tags:\s*\[(.*)\]\s*$/);
    if (mInline) {
      mInline[1].split(",").forEach((part) => {
        const t = part.trim().replace(/^["']|["']$/g, "");
        if (t) tags.push(t);
      });
      i++;
      continue;
    }
    if (/^\s*tags:\s*$/.test(line)) {
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

function appendTagsBlock(fmLines, tags) {
  const trimmed = fmLines.join("\n").replace(/\s+$/, "");
  const tagBlock = "tags:\n" + tags.map((t) => `  - ${t}`).join("\n");
  if (!trimmed) return [tagBlock];
  return [...trimmed.split("\n"), tagBlock];
}

function mergeUniquePreserveCanonical(existing, additions) {
  const keys = new Set();
  const out = [];
  const push = (raw) => {
    const s = String(raw);
    const tl = s.toLowerCase();
    let canon = s;
    if (tl === "ryke") canon = "Ryke";
    if (tl === "osmirate") canon = "Osmirate";
    const key = canon.toLowerCase();
    if (keys.has(key)) return;
    keys.add(key);
    out.push(canon);
  };
  for (const t of existing) push(t);
  for (const t of additions) push(t);
  return out;
}

function extractNoosphera(fmLines) {
  for (const line of fmLines) {
    const m = line.match(/^\s*noosphera\s*:\s*(.+)$/);
    if (!m) continue;
    return m[1].trim().replace(/^["']|["']$/g, "").trim();
  }
  return null;
}

function regionTagsFromNoosphera(nVal) {
  const nv = (nVal || "").trim();
  if (/^ryke$/i.test(nv)) return ["Ryke"];
  if (/^osmirate$/i.test(nv)) return ["Osmirate"];
  return [];
}

/** Strip ryke/osmirate (any case) so we can apply canonical from noosphera */
function stripRegionTags(tags) {
  return tags.filter((t) => !["ryke", "osmirate"].includes(String(t).toLowerCase()));
}

function syncTagsFromNoosphera(fmLines, nVal) {
  const wantRegion = regionTagsFromNoosphera(nVal);
  const existing = extractTagsFromFm(fmLines);
  const base = stripRegionTags(existing);
  return mergeUniquePreserveCanonical(base, wantRegion);
}

function ensureUtilityNoosphera(relPosix, fmLines) {
  if (!relPosix.includes("/04 Utilities/")) return [...fmLines];
  let region = null;
  if (relPosix.includes("/04 Utilities/Ryke/")) region = "Ryke";
  else if (relPosix.includes("/04 Utilities/Osmirate/")) region = "Osmirate";
  if (!region) return [...fmLines];

  const lines = [...fmLines];
  const keyIdx = lines.findIndex((l) => /^\s*noosphera\s*:/.test(l));
  if (keyIdx >= 0) {
    lines[keyIdx] = `noosphera: ${region}`;
    return lines;
  }
  const tipoIdx = lines.findIndex((l) => /^\s*tipo\s*:/.test(l));
  const insert = `noosphera: ${region}`;
  if (tipoIdx >= 0) {
    lines.splice(tipoIdx + 1, 0, insert);
    return lines;
  }
  lines.unshift(insert);
  return lines;
}

function walkMarkdownFiles(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = ent.name;
    if (name.startsWith(".")) continue;
    const abs = path.join(dir, name);
    if (ent.isDirectory()) {
      if (SKIP_DIRS.has(name)) continue;
      walkMarkdownFiles(abs, out);
    } else if (name.endsWith(".md")) {
      out.push(abs);
    }
  }
  return out;
}

function processFile(absPath, text) {
  const rel = path.relative(ROOT, absPath).split(path.sep).join("/");
  const { hasFm, fmLines: rawFm, bodyLines } = splitFirstFrontmatter(text);
  if (!hasFm) return text;

  let fmLines = ensureUtilityNoosphera(rel, rawFm);
  const nVal = extractNoosphera(fmLines);
  if (!nVal) return text;

  const newTags = syncTagsFromNoosphera(fmLines, nVal);
  let newFm = fmLinesWithoutTags(fmLines);
  newFm = appendTagsBlock(newFm, newTags);
  const next = rebuildFile(newFm, bodyLines);
  return next;
}

let updated = 0;
for (const abs of walkMarkdownFiles(ROOT)) {
  const raw = fs.readFileSync(abs, "utf8");
  const next = processFile(abs, raw);
  if (next !== raw) {
    fs.writeFileSync(abs, next, "utf8");
    updated++;
  }
}

console.log(JSON.stringify({ markdownFilesUpdated: updated }, null, 2));
