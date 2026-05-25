#!/usr/bin/env node
/**
 * Scans Wargame/ + Worldbuilding/ and updates:
 *   - Recursos/site-nav.json
 *   - noosphera-site-shell.html (and copies) between NS_NAV markers
 *
 * Run before site export, or open INDEX.md in Obsidian (dataview block does the same).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const NAV_JSON = path.join(ROOT, "Recursos/site-nav.json");
const SHELL_FILES = [
  path.join(ROOT, "noosphera-site-shell.html"),
  path.join(ROOT, "custom-head-live.html"),
  path.join(ROOT, "shell-new.html"),
];

const WARGAME_HIGHLIGHTS = [
  { l: "⚔ Buscador de Modelos", p: "Wargame/Buscador de Modelos.md" },
  { l: "🏰 Buscador de Facções", p: "Wargame/Buscador de Facções.md" },
  { l: "🎴 Buscador de Cartas", p: "Wargame/Buscador de Cartas.md" },
  { l: "🛠 Squad Builder", p: "Wargame/Squad Builder.md" },
];

const UNIVERSE_HIGHLIGHTS = [
  { l: "📚 Buscador de Lore", p: "Worldbuilding/Buscador de Lore.md" },
  { l: "👤 Buscador de Pessoas", p: "Worldbuilding/Buscador de Pessoas.md" },
  { l: "🗺 Buscador de Locais", p: "Worldbuilding/Buscador de Locais.md" },
  { l: "📜 Buscador de Contos", p: "Worldbuilding/Buscador de Contos.md" },
];

const SKIP_BASENAMES = new Set([
  "buscador de lore",
  "buscador de pessoas",
  "buscador de locais",
  "buscador de contos",
]);

const SKIP_REALM_DIRS = new Set(["contos"]);

const WARGAME_SKIP_FILES = /^template/i;

function norm(s) {
  return String(s || "").trim();
}

function labelFromFile(filePath) {
  return path.basename(filePath, ".md");
}

function listMdFiles(dirAbs) {
  if (!fs.existsSync(dirAbs)) return [];
  return fs
    .readdirSync(dirAbs, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.md$/i.test(e.name))
    .map((e) => path.join(dirAbs, e.name))
    .sort((a, b) => labelFromFile(a).localeCompare(labelFromFile(b), "pt"));
}

function vaultPath(absPath) {
  return absPath.replace(/\\/g, "/").replace(/^\.\//, "").slice(ROOT.length + 1);
}

function buildWargameFolders() {
  const folders = [];
  const wargameRoot = path.join(ROOT, "Wargame");
  if (!fs.existsSync(wargameRoot)) return folders;

  const numberedDirs = fs
    .readdirSync(wargameRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{2}\s/.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name, "pt", { numeric: true }));

  for (const ent of numberedDirs) {
    const dirAbs = path.join(wargameRoot, ent.name);
    const dirName = ent.name;

    if (dirName.startsWith("01 ")) {
      const glossDir = path.join(dirAbs, "Glossários");
      const coreItems = listMdFiles(dirAbs)
        .filter((f) => !vaultPath(f).includes("/Glossários/"))
        .map((f) => ({ l: labelFromFile(f), p: vaultPath(f) }));
      if (coreItems.length) folders.push({ name: dirName, items: coreItems });

      const glossItems = listMdFiles(glossDir).map((f) => ({
        l: labelFromFile(f),
        p: vaultPath(f),
      }));
      if (glossItems.length) folders.push({ name: "Glossários", items: glossItems });
      continue;
    }

    const subdirs = fs
      .readdirSync(dirAbs, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name, "pt"));

    if (subdirs.length) {
      for (const sub of subdirs) {
        const subAbs = path.join(dirAbs, sub.name);
        const items = listMdFiles(subAbs)
          .filter((f) => !WARGAME_SKIP_FILES.test(labelFromFile(f)))
          .map((f) => ({ l: labelFromFile(f), p: vaultPath(f) }));
        if (!items.length) continue;
        folders.push({ name: `${dirName} — ${sub.name}`, items });
      }
      continue;
    }

    const items = listMdFiles(dirAbs)
      .filter((f) => !WARGAME_SKIP_FILES.test(labelFromFile(f)))
      .map((f) => ({ l: labelFromFile(f), p: vaultPath(f) }));
    if (items.length) folders.push({ name: dirName, items });
  }

  return folders;
}

function isSkippableWorldMd(relFromRealm, baseName) {
  const low = baseName.toLowerCase();
  if (SKIP_BASENAMES.has(low)) return true;
  if (/^buscador de /i.test(baseName)) return true;
  if (/^home\s-/i.test(baseName)) return true;
  return false;
}

function buildUniversoRealms() {
  const wbRoot = path.join(ROOT, "Worldbuilding");
  if (!fs.existsSync(wbRoot)) return [];

  const realms = [];
  const realmDirs = fs
    .readdirSync(wbRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b, "pt"));

  for (const realmName of realmDirs) {
    if (SKIP_REALM_DIRS.has(realmName.toLowerCase())) continue;
    const realmAbs = path.join(wbRoot, realmName);
    const sectionMap = new Map();

    function walk(dirAbs) {
      const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
      for (const ent of entries) {
        const abs = path.join(dirAbs, ent.name);
        if (ent.isDirectory()) {
          walk(abs);
          continue;
        }
        if (!/\.md$/i.test(ent.name)) continue;
        const relFromRealm = path.relative(realmAbs, abs).replace(/\\/g, "/");
        const base = labelFromFile(abs);
        if (isSkippableWorldMd(relFromRealm, base)) continue;

        const parentRel = path.dirname(relFromRealm);
        const sectionKey =
          !parentRel || parentRel === "."
            ? "Geral"
            : parentRel.split("/").join(" › ");

        if (!sectionMap.has(sectionKey)) sectionMap.set(sectionKey, []);
        sectionMap.get(sectionKey).push({ l: base, p: vaultPath(abs) });
      }
    }

    walk(realmAbs);
    if (!sectionMap.size) continue;

    const sections = [...sectionMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "pt"))
      .map(([name, items]) => ({
        name,
        items: items.sort((a, b) => a.l.localeCompare(b.l, "pt")),
      }));

    realms.push({ name: realmName, sections });
  }

  return realms;
}

function buildSiteNav() {
  return {
    wargame: {
      highlights: WARGAME_HIGHLIGHTS.filter((h) => fs.existsSync(path.join(ROOT, h.p))),
      folders: buildWargameFolders(),
    },
    universo: {
      highlights: UNIVERSE_HIGHLIGHTS.filter((h) => fs.existsSync(path.join(ROOT, h.p))),
      realms: buildUniversoRealms(),
    },
    generatedAt: new Date().toISOString(),
  };
}

function navToShellJs(nav) {
  const wg = JSON.stringify(nav.wargame);
  const un = JSON.stringify(nav.universo);
  return `/*NS_NAV_BEGIN*/
var WARGAME=${wg};
var UNIVERSO=${un};
/*NS_NAV_END*/`;
}

function patchShellFile(filePath, navJs) {
  if (!fs.existsSync(filePath)) return false;
  let text = fs.readFileSync(filePath, "utf8");
  const re = /\/\*NS_NAV_BEGIN\*\/[\s\S]*?\/\*NS_NAV_END\*\//;
  if (!re.test(text)) {
    console.warn("Skip (no NS_NAV markers):", filePath);
    return false;
  }
  text = text.replace(re, navJs);
  fs.writeFileSync(filePath, text, "utf8");
  return true;
}

function main() {
  const nav = buildSiteNav();
  fs.mkdirSync(path.dirname(NAV_JSON), { recursive: true });
  fs.writeFileSync(NAV_JSON, JSON.stringify(nav, null, 2), "utf8");
  console.log("Wrote", NAV_JSON);

  const navJs = navToShellJs(nav);
  let patched = 0;
  for (const f of SHELL_FILES) {
    if (patchShellFile(f, navJs)) {
      patched++;
      console.log("Patched", f);
    }
  }
  console.log(`Done. ${patched} shell file(s) updated.`);
}

main();
