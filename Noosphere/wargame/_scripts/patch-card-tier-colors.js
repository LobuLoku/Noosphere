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

const colorConstsOld = `const ACCENT_NORMAL = "#E54F6D";
const ACCENT_UNIQUE = "#F8C630";`;

const colorConstsNew = `const COLOR_COMMON = "#2E0738";
const COLOR_ELITE = "#83283B";
const COLOR_UNIQUE = "#CEB762";
const ACCENT_COMMON = "#d4a8e8";
const ACCENT_ELITE = "#ffc4cc";
const ACCENT_UNIQUE = "#2a2210";`;

const cardCssOld = `#\${uid} .tc-card {
  --tc-accent: \${ACCENT_NORMAL};
  --tc-block-gap: 7px;
  --tc-comp-border: color-mix(in srgb, var(--tc-accent) 7%, transparent);
  position: relative;
  width: min(100%, 420px);
  aspect-ratio: 1246 / 2079;
  background:
    radial-gradient(ellipse 120% 80% at 50% 18%, color-mix(in srgb, var(--tc-accent) 14%, transparent), transparent 55%),
    linear-gradient(168deg, rgba(22, 8, 38, 0.98) 0%, rgba(8, 3, 16, 0.99) 48%, rgba(12, 5, 22, 1) 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.65);
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 28%) auto minmax(0, 1fr);
  padding: 0;
}

#\${uid} .tc-card.tc-unique {
  --tc-accent: \${ACCENT_UNIQUE};
}`;

const cardCssNew = `#\${uid} .tc-card {
  --tc-bg: \${COLOR_COMMON};
  --tc-accent: \${ACCENT_COMMON};
  --tc-block-gap: 7px;
  --tc-comp-border: color-mix(in srgb, var(--tc-accent) 7%, transparent);
  position: relative;
  width: min(100%, 420px);
  aspect-ratio: 1246 / 2079;
  background:
    radial-gradient(ellipse 120% 80% at 50% 18%, color-mix(in srgb, var(--tc-bg) 55%, white 45%), transparent 55%),
    linear-gradient(168deg, color-mix(in srgb, var(--tc-bg) 85%, black 15%) 0%, var(--tc-bg) 50%, color-mix(in srgb, var(--tc-bg) 90%, black 10%) 100%);
  border: none;
  border-radius: 8px;
  box-shadow: 0 28px 70px rgba(0, 0, 0, 0.65);
  overflow: hidden;
  display: grid;
  grid-template-rows: auto minmax(0, 28%) auto minmax(0, 1fr);
  padding: 0;
}

#\${uid} .tc-card.tc-elite {
  --tc-bg: \${COLOR_ELITE};
  --tc-accent: \${ACCENT_ELITE};
}

#\${uid} .tc-card.tc-unique {
  --tc-bg: \${COLOR_UNIQUE};
  --tc-accent: \${ACCENT_UNIQUE};
}`;

const titleOld = `#\${uid} .tc-card.tc-unique .tc-title {
  color: var(--tc-accent) !important;
}`;

const titleNew = `#\${uid} .tc-card.tc-elite .tc-title,
#\${uid} .tc-card.tc-unique .tc-title {
  color: var(--tc-accent) !important;
}`;

const overflowOld = `#\${uid} .tc-card.tc-unique .tc-overflow-warn {
  background: rgba(248, 198, 48, 0.96) !important;
  color: #1a1000 !important;
}`;

const overflowNew = `#\${uid} .tc-card.tc-elite .tc-overflow-warn {
  background: rgba(131, 40, 59, 0.96) !important;
  color: #fff !important;
}
#\${uid} .tc-card.tc-unique .tc-overflow-warn {
  background: rgba(206, 183, 98, 0.96) !important;
  color: #1a1000 !important;
}`;

let updated = 0;
for (const fp of walk(cardsDir)) {
  if (path.basename(fp).toLowerCase().includes("template")) continue;
  let text = fs.readFileSync(fp, "utf8");
  if (!text.includes("function isUniqueKw(k)")) continue;
  if (!text.includes('ACCENT_NORMAL = "#E54F6D"') && text.includes("COLOR_COMMON")) {
    console.log("skip (already patched):", path.relative(cardsDir, fp));
    continue;
  }

  text = text.replace(colorConstsOld, colorConstsNew);
  text = text.replace(
    'const uniqueClass = isUnica || isElite ? " tc-unique" : "";',
    'const tierClass = isUnica ? " tc-unique" : (isElite ? " tc-elite" : "");'
  );
  text = text.replace(cardCssOld, cardCssNew);
  text = text.replace(titleOld, titleNew);
  text = text.replace(overflowOld, overflowNew);
  text = text.replace(
    '<div class="tc-card${uniqueClass}">',
    '<div class="tc-card${tierClass}">'
  );

  fs.writeFileSync(fp, text, "utf8");
  updated++;
  console.log("patched:", path.relative(cardsDir, fp));
}
console.log("Done:", updated, "files");
