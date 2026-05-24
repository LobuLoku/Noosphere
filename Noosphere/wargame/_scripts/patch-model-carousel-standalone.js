const fs = require("fs");
const path = require("path");

const modelsDir = path.join(__dirname, "..", "03 Models");

const INLINE_RESOLVE = `function resolveLinkedUtilityPageSim(pathStr) {
  let pg = dv.page(pathStr);
  if (pg) return pg;
  const baseName = pathStr.replace(/\\\\/g, "/").split("/").pop().replace(/\\.md$/i, "");
  const baseLower = baseName.toLowerCase();
  let found = null;
  function matchPage(q) {
    return q.file.name.replace(/\\.md$/i, "").toLowerCase() === baseLower;
  }
  dv.pages('"Wargame/04 Cartas"').forEach((q) => {
    if (found) return;
    if (matchPage(q)) found = q;
  });
  if (!found) {
    dv.pages('"Wargame/04 Utilities"').forEach((q) => {
      if (found) return;
      if (matchPage(q)) found = q;
    });
  }
  if (!found) {
    dv.pages().forEach((q) => {
      if (found) return;
      if (matchPage(q)) found = q;
    });
  }
  return found;
}

function equipImgRawSim(pg) {
  return pg.card_image || pg.utility_image || pg.model_image || "";
}

function equipTipoLegacySim(pg) {
  if (pg.tipo != null && String(pg.tipo).trim()) return String(pg.tipo).trim();
  const cat = pg.categoria ? String(pg.categoria).trim() : "";
  if (cat === "Arma") return "Weapon";
  if (cat === "Utilitário" || cat === "Utilitario") return "Utility";
  return "Weapon";
}`;

const OLD_WRAPPER = /function resolveLinkedUtilityPageSim\(pathStr\) \{\s*\n\s*return resolveLinkedUtilityPage\(pathStr\);\s*\n\}/;

const OLD_SCORE = `let scored = scoreSimilarModels(3);
if (!scored.length) {
  scored = scoreSimilarModels(2);
}`;

const FALLBACK_SCORE = `function scoreByFactionOrNoos() {
  const myNoos = norm(cur.noosphera || "");
  const myFacs = new Set();
  const fv = cur.faccao;
  if (fv) {
    const arr = Array.isArray(fv) ? fv : [fv];
    arr.forEach((f) => { if (f) myFacs.add(norm(f)); });
  }
  return allPages
    .map((q) => {
      if (!q || !q.file || q.file.path === myPath) return null;
      let s = 0;
      if (myNoos && norm(q.noosphera || "") === myNoos) s += 1;
      const qFacs = Array.isArray(q.faccao) ? q.faccao : (q.faccao ? [q.faccao] : []);
      qFacs.forEach((f) => { if (myFacs.has(norm(f))) s += 2; });
      return s > 0 ? { q, s } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const byScore = b.s - a.s;
      if (byScore !== 0) return byScore;
      return String(a.q.file.name).localeCompare(String(b.q.file.name));
    });
}

let scored = scoreSimilarModels(3);
if (!scored.length) {
  scored = scoreSimilarModels(2);
}
if (!scored.length) {
  scored = scoreSimilarModels(1);
}
if (!scored.length) {
  scored = scoreByFactionOrNoos().slice(0, 16);
}`;

const CHARS_LINE =
  /const chars = Array\.isArray\(p\.caracteristicas\) \? p\.caracteristicas : \(p\.caracteristicas \? String\(p\.caracteristicas\)\.split\(","\)\.map\(s => s\.trim\(\)\) : \[\]\);/;

const PASSIVAS_BLOCK = `const passivas = Array.isArray(p.passivas) ? p.passivas : (p.passivas ? String(p.passivas).split(",").map((s) => s.trim()) : []);
  const normPassModel = passivas.filter((c) => !SPECIAL_KWS.includes(String(c).toLowerCase()));
  const specPassModel = passivas.filter((c) => SPECIAL_KWS.includes(String(c).toLowerCase()));`;

const CARD_CLICK_NEEDLE = "  toggleArrows();\n})();`;";
const CARD_CLICK_REPL =
  "  toggleArrows();\n  cards.forEach(function(slot){\n    slot.addEventListener(\"click\", function(){\n      var p = slot.getAttribute(\"data-nav\");\n      if(!p || typeof app===\"undefined\") return;\n      var f = app.vault.getAbstractFileByPath(p);\n      if(f) app.workspace.getLeaf(false).openFile(f);\n    });\n  });\n})();`;";

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(fp, out);
    else if (ent.name.endsWith(".md")) out.push(fp);
  }
  return out;
}

let patched = 0;
for (const fp of walk(modelsDir)) {
  let text = fs.readFileSync(fp, "utf8");
  if (!text.includes("Carrossel — cartões alinhados")) continue;

  let changed = false;
  const orig = text;

  if (OLD_WRAPPER.test(text)) {
    text = text.replace(OLD_WRAPPER, INLINE_RESOLVE);
    changed = true;
  }

  if (text.includes("resolveImgSim(equipImgRaw(wp), ctx)")) {
    text = text.replace(/resolveImgSim\(equipImgRaw\(wp\), ctx\)/g, "resolveImgSim(equipImgRawSim(wp), ctx)");
    changed = true;
  }

  if (text.includes("loadoutTooltipSim") && text.includes("equipTipoLegacy(wp)")) {
    text = text.replace(
      /const tipo = wp \? equipTipoLegacy\(wp\) : "";/g,
      'const tipo = wp ? equipTipoLegacySim(wp) : "";'
    );
    changed = true;
  }

  if (CHARS_LINE.test(text)) {
    text = text.replace(CHARS_LINE, PASSIVAS_BLOCK);
    text = text.replace(
      /const specKwsModel = kws\.filter\(k => SPECIAL_KWS\.includes\(k\.toLowerCase\(\)\) \|\| isMercKwCarousel\(k\)\);/,
      "const specKwsModel = [...kws.filter((k) => SPECIAL_KWS.includes(k.toLowerCase()) || isMercKwCarousel(k)), ...specPassModel];"
    );
    text = text.replace(/\.\.\.chars\.map\(\(c\) => chip\(c,/g, "...normPassModel.map((c) => chip(c,");
    text = text.replace(/\.\.\.chars\.map\(c => chip\(c,/g, "...normPassModel.map(c => chip(c,");
    changed = true;
  }

  if (text.includes(OLD_SCORE) && !text.includes("scoreByFactionOrNoos")) {
    text = text.replace(OLD_SCORE, FALLBACK_SCORE);
    changed = true;
  }

  if (text.includes(CARD_CLICK_NEEDLE) && !text.includes('slot.getAttribute("data-nav")')) {
    text = text.replace(CARD_CLICK_NEEDLE, CARD_CLICK_REPL);
    changed = true;
  }

  if (changed && text !== orig) {
    fs.writeFileSync(fp, text, "utf8");
    console.log("patched:", path.relative(modelsDir, fp));
    patched++;
  }
}

console.log("Done:", patched, "files");
