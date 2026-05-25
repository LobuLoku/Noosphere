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
    `const COLOR_COMMON = "#292932";
const COLOR_ELITE = "#20374E";
const COLOR_UNIQUE = "#402248";
const ACCENT_COMMON = "#be63ff";
const ACCENT_ELITE = "#e85a6b";
const ACCENT_UNIQUE = "#e8c048";`,
    `const COLOR_COMMON = "#1C1C24";
const COLOR_ELITE = "#20374E";
const COLOR_UNIQUE = "#402248";
const ACCENT = "#be63ff";`,
  ],
  [
    `  --tc-accent: \${ACCENT_COMMON};`,
    `  --tc-accent: \${ACCENT};`,
  ],
  [
    `    radial-gradient(ellipse 120% 70% at 50% 12%, color-mix(in srgb, var(--tc-accent) 14%, transparent), transparent 58%),
    linear-gradient(168deg, color-mix(in srgb, var(--tc-bg) 94%, var(--tc-accent) 6%) 0%, var(--tc-bg) 52%, color-mix(in srgb, var(--tc-bg) 88%, black 12%) 100%);`,
    `    linear-gradient(168deg, color-mix(in srgb, var(--tc-bg) 90%, white 10%) 0%, var(--tc-bg) 50%, color-mix(in srgb, var(--tc-bg) 84%, black 16%) 100%);`,
  ],
  [
    `#\${uid} .tc-card.tc-elite {
  --tc-bg: \${COLOR_ELITE};
  --tc-accent: \${ACCENT_ELITE};
}

#\${uid} .tc-card.tc-unique {
  --tc-bg: \${COLOR_UNIQUE};
  --tc-accent: \${ACCENT_UNIQUE};
}`,
    `#\${uid} .tc-card.tc-elite {
  --tc-bg: \${COLOR_ELITE};
}

#\${uid} .tc-card.tc-unique {
  --tc-bg: \${COLOR_UNIQUE};
}`,
  ],
  [
    `  color: var(--tc-accent) !important;
  margin: 0;
}

#\${uid} .tc-card.tc-unique .tc-title {
  color: var(--tc-accent) !important;
  text-shadow: 0 0 18px color-mix(in srgb, var(--tc-accent) 35%, transparent);
}`,
    `  color: #fff !important;
  margin: 0;
}`,
  ],
  [
    `#\${uid} .tc-card.tc-elite .tc-overflow-warn {
  background: rgba(232, 90, 107, 0.92) !important;
  color: #fff !important;
}
#\${uid} .tc-card.tc-unique .tc-overflow-warn {
  background: rgba(232, 192, 72, 0.92) !important;
  color: #1a1000 !important;
}`,
    `#\${uid} .tc-card.tc-elite .tc-overflow-warn,
#\${uid} .tc-card.tc-unique .tc-overflow-warn {
  background: rgba(190, 99, 255, 0.92) !important;
  color: #fff !important;
}`,
  ],
  [
    `#\${uid} .tc-stat-val.accent { color: var(--tc-accent) !important; }`,
    `#\${uid} .tc-stat-val.accent { color: #fff !important; }`,
  ],
  [
    `  color: var(--tc-accent) !important;
  margin-bottom: 6px;
  font-weight: 600;
}

#\${uid} .tc-gloss-line {
  margin-top: 4px;
  padding-left: 8px;
  border-left: 2px solid color-mix(in srgb, var(--tc-accent) 55%, transparent);
  color: #cfc4e4;`,
    `  color: #fff !important;
  margin-bottom: 6px;
  font-weight: 600;
}

#\${uid} .tc-gloss-line {
  margin-top: 4px;
  padding-left: 8px;
  border-left: 2px solid color-mix(in srgb, var(--tc-accent) 55%, transparent);
  color: rgba(255, 255, 255, 0.88);`,
  ],
  [
    `  color: var(--tc-accent) !important;
}
#\${uid} .tc-gloss-char strong { color: var(--tc-accent) !important; }
#\${uid} .tc-gloss-pass { border-left-color: color-mix(in srgb, var(--tc-accent) 45%, transparent); }
#\${uid} .tc-gloss-pass strong { color: var(--tc-accent) !important; }

#\${uid} .tc-effect-body {
  font-size: 0.68rem;
  line-height: 1.38;
  color: #e8dff8 !important;`,
    `  color: #fff !important;
}
#\${uid} .tc-gloss-char strong { color: #fff !important; }
#\${uid} .tc-gloss-pass { border-left-color: color-mix(in srgb, var(--tc-accent) 45%, transparent); }
#\${uid} .tc-gloss-pass strong { color: #fff !important; }

#\${uid} .tc-effect-body {
  font-size: 0.68rem;
  line-height: 1.38;
  color: rgba(255, 255, 255, 0.9) !important;`,
  ],
  [
    `  color: var(--tc-accent) !important;
  margin: 5px 0;
  letter-spacing: 0.04em;
  opacity: 0.9;
}`,
    `  color: rgba(255, 255, 255, 0.72) !important;
  margin: 5px 0;
  letter-spacing: 0.04em;
}`,
  ],
];

let updated = 0;
for (const fp of walk(cardsDir)) {
  if (path.basename(fp).toLowerCase().includes("template")) continue;
  let text = fs.readFileSync(fp, "utf8");
  if (!text.includes("const COLOR_COMMON")) continue;

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
