/**
 * Replace the "#### Mais" similar-models carousel dataviewjs block with the canonical fragment.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRAG = fs.readFileSync(
  path.join(__dirname, "assets", "model-similar-carousel.dataviewjs.fragment"),
  "utf8"
);
const NEW_BLOCK = "\n#### Mais:\n\n```dataviewjs\n" + FRAG + "\n```\n";

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

function patchFile(fp) {
  let text = fs.readFileSync(fp, "utf8");
  const marker = "\n#### Mais:\n\n```dataviewjs\n";
  const idx = text.lastIndexOf(marker);
  if (idx === -1) {
    console.warn("SKIP (no #### Mais block):", fp);
    return false;
  }
  const codeStart = idx + marker.length;
  const head = text.slice(codeStart, codeStart + 500);
  if (!head.includes("Carrossel")) {
    console.warn("SKIP (not similar-models carousel):", fp);
    return false;
  }
  const fenceIdx = text.indexOf("\n```", codeStart);
  if (fenceIdx === -1) {
    console.warn("SKIP (no closing fence):", fp);
    return false;
  }
  const end = fenceIdx + "\n```\n".length;
  const next = text.slice(0, idx) + NEW_BLOCK + text.slice(end);
  if (next === text) {
    console.warn("SKIP (unchanged):", fp);
    return false;
  }
  fs.writeFileSync(fp, next, "utf8");
  return true;
}

let n = 0;
const roots = [
  path.join(__dirname, "..", "Wargame", "02 Models"),
  path.join(__dirname, "..", "Recursos", "Templates", "Template - Unit.md"),
];

for (const r of roots) {
  if (r.endsWith(".md")) {
    if (patchFile(r)) {
      n++;
      console.log("Patched:", path.relative(path.join(__dirname, ".."), r));
    }
  } else {
    for (const fp of walk(r).sort()) {
      if (patchFile(fp)) {
        n++;
        console.log("Patched:", path.relative(path.join(__dirname, ".."), fp));
      }
    }
  }
}

console.log("Done. Patched", n, "files.");
