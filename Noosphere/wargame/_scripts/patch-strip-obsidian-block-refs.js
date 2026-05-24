/**
 * Strip Obsidian block IDs (^abc123) from glossary map values in model fichas.
 * Run: node Wargame/_scripts/patch-strip-obsidian-block-refs.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "03 Models");

const STRIP_FN = `function stripObsidianBlockRef(s) {
    return String(s || "")
        .replace(/\\s*(?:#\\^|\\^)[a-f0-9]+\\s*$/gi, "")
        .trim();
}

`;

const OLD_BUILD_MAP = `const buildMap = (lists) => {
    let m = {};
    lists.forEach(l => {
        let txt = l.text;
        if (txt.includes(':')) {
            let [k, d] = txt.split(':');
            m[k.trim().toLowerCase()] = d.trim();
        }
    });
    return m;
};`;

const NEW_BUILD_MAP = STRIP_FN + `const buildMap = (lists) => {
    let m = {};
    lists.forEach(l => {
        let txt = l.text;
        if (txt.includes(':')) {
            let [k, d] = txt.split(':');
            m[k.trim().toLowerCase()] = stripObsidianBlockRef(d.trim());
        }
    });
    return m;
};`;

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

let patched = 0;
let skipped = 0;

for (const file of walk(ROOT)) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("const buildMap = (lists) =>")) {
    skipped++;
    continue;
  }
  if (src.includes("function stripObsidianBlockRef(s)")) {
    skipped++;
    continue;
  }
  if (!src.includes(OLD_BUILD_MAP)) {
    console.warn("Unexpected buildMap shape:", file);
    skipped++;
    continue;
  }
  src = src.replace(OLD_BUILD_MAP, NEW_BUILD_MAP);
  fs.writeFileSync(file, src, "utf8");
  patched++;
}

console.log(`Patched ${patched} files, skipped ${skipped}.`);
