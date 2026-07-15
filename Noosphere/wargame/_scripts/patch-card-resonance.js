const fs = require("fs");
const path = require("path");

const cardsDir = path.join(__dirname, "..", "04 Cartas");

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(fp, out);
    else if (ent.name.endsWith(".md")) out.push(fp);
  }
  return out;
}

const replacements = [
  [
    `function parseCost(val, fallback) {
  const n = parseInt(String(val ?? fallback ?? "1").replace(/\\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function apDiamonds(n) {`,
    `function parseCost(val, fallback) {
  const n = parseInt(String(val ?? fallback ?? "1").replace(/\\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseResonance(val, fallback) {
  const fb = fallback ?? 0;
  const raw = String(val ?? "").trim();
  if (raw === "" || raw === "—" || raw === "-") return fb;
  const n = parseInt(raw.replace(/\\D/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : fb;
}

function apDiamonds(n) {`,
  ],
  [
    `const resPoints = Math.min(4, parseCost(p.ressonancia ?? p.resonance, 1));`,
    `const resPoints = parseResonance(p.ressonancia ?? p.resonance, 0);`,
  ],
  [
    `const tierClass = isUnica ? " tc-unique" : (isElite ? " tc-elite" : "");`,
    `const tierClass = isUnica ? " tc-unique" : (isElite ? " tc-elite" : "");
const resOrbsClass = resPoints === 0 ? " tc-res-orbs--empty" : resPoints > 4 ? " tc-res-orbs--many" : "";
const cardResStyle = \`--tc-res-count:\${resPoints};--tc-res-orb:\${resPoints > 4 ? 12 : 16}px;--tc-res-gap:\${resPoints > 4 ? 4 : 8}px;\`;`,
  ],
  [
    `  --tc-comp-border: color-mix(in srgb, var(--tc-accent) 22%, transparent);
  position: relative;`,
    `  --tc-comp-border: color-mix(in srgb, var(--tc-accent) 22%, transparent);
  --tc-res-count: 0;
  --tc-res-orb: 16px;
  --tc-res-gap: 8px;
  position: relative;`,
  ],
  [
    `#\${uid} .tc-res-orbs {
  flex: 0 0 72px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  align-self: center;
  min-height: calc(4 * 16px + 3 * 8px);
  z-index: 2;
  padding: 0 4px 0 48px;
}
#\${uid} .tc-meta-rail {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  align-self: center;
  min-height: calc(4 * 16px + 3 * 8px);
  padding: 0 36px 0 2px;
  gap: 5px;
  z-index: 2;
  max-width: 46%;
}`,
    `#\${uid} .tc-res-orbs {
  flex: 0 0 72px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  align-self: center;
  min-height: 0;
  z-index: 2;
  padding: 0 4px 0 48px;
}
#\${uid} .tc-res-orbs:not(.tc-res-orbs--empty) {
  min-height: calc(var(--tc-res-count) * var(--tc-res-orb) + max(0, var(--tc-res-count) - 1) * var(--tc-res-gap));
}
#\${uid} .tc-res-orbs--empty {
  visibility: hidden;
  flex-basis: 0;
  width: 0;
  padding: 0;
  overflow: hidden;
}
#\${uid} .tc-res-orbs--many .tc-res-orb {
  margin: 2px 0;
}
#\${uid} .tc-meta-rail {
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  align-self: center;
  min-height: calc(max(var(--tc-res-count), 1) * var(--tc-res-orb) + max(0, max(var(--tc-res-count), 1) - 1) * var(--tc-res-gap));
  padding: 0 36px 0 2px;
  gap: 5px;
  z-index: 2;
  max-width: 46%;
}`,
  ],
  [
    `#\${uid} .tc-res-orb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  flex-shrink: 0;
  margin: 4px 0;
}`,
    `#\${uid} .tc-res-orb {
  width: var(--tc-res-orb, 16px);
  height: var(--tc-res-orb, 16px);
  border-radius: 50%;
  background: #ffffff;
  flex-shrink: 0;
  margin: calc(var(--tc-res-gap, 8px) / 2) 0;
}`,
  ],
  [
    `        <div class="tc-res-orbs" aria-label="\${resPoints} ponto\${resPoints !== 1 ? "s" : ""} de ressonância">\${resOrbsHtml}</div>`,
    `        <div class="tc-res-orbs\${resOrbsClass}" aria-label="\${resPoints} ponto\${resPoints !== 1 ? "s" : ""} de ressonância"\${resPoints === 0 ? ' aria-hidden="true"' : ""}>\${resOrbsHtml}</div>`,
  ],
  [
    `  <div class="tc-card\${tierClass}">`,
    `  <div class="tc-card\${tierClass}" style="\${cardResStyle}">`,
  ],
];

let updated = 0;
for (const fp of walk(cardsDir)) {
  if (path.basename(fp).toLowerCase().includes("template")) continue;
  let text = fs.readFileSync(fp, "utf8");
  if (!text.includes("const resPoints")) continue;

  let changed = false;
  for (const [from, to] of replacements) {
    if (text.includes(from)) {
      text = text.replace(from, to);
      changed = true;
    }
  }
  if (!changed) {
    console.log("skip (already patched):", path.relative(cardsDir, fp));
    continue;
  }

  fs.writeFileSync(fp, text, "utf8");
  updated++;
  console.log("patched:", path.relative(cardsDir, fp));
}
console.log("Done:", updated, "files");
