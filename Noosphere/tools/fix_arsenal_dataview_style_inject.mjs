import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "Wargame", "04 Utilities");

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

const MARKER = "dv.container.innerHTML = `";

function fixFile(filePath) {
  let text = fs.readFileSync(filePath, "utf8");
  const i = text.indexOf(MARKER);
  if (i < 0) return false;
  const k = text.indexOf("<style>", i);
  if (k < 0) return false;
  const cssStart = k + "<style>".length;
  const kEnd = text.indexOf("</style>", cssStart);
  if (kEnd < 0) return false;
  const css = text.slice(cssStart, kEnd).trim();
  const htmlStart = kEnd + "</style>".length;
  const htmlEnd = text.indexOf("`;", htmlStart);
  if (htmlEnd < 0) return false;
  const html = text.slice(htmlStart, htmlEnd).trim();

  const titleFix =
    `\nconst __naTitleEl = __naRoot.querySelector(".w-title");\n` +
    `if (__naTitleEl) {\n` +
    `  __naTitleEl.style.setProperty("font-size", "14px", "important");\n` +
    `  __naTitleEl.style.setProperty("line-height", "1.35", "important");\n` +
    `  __naTitleEl.style.setProperty("display", "block", "important");\n` +
    `  __naTitleEl.style.setProperty("margin", "0", "important");\n` +
    `  __naTitleEl.style.setProperty("padding", "0", "important");\n` +
    `  __naTitleEl.style.setProperty("font-family", "Orbitron, system-ui, sans-serif", "important");\n` +
    `  __naTitleEl.style.setProperty("font-weight", "400", "important");\n` +
    `  __naTitleEl.style.setProperty("color", "#f5f0ff", "important");\n` +
    `  __naTitleEl.style.setProperty("text-transform", "uppercase", "important");\n` +
    `  __naTitleEl.style.setProperty("letter-spacing", "0.08em", "important");\n` +
    `  __naTitleEl.style.setProperty("text-shadow", "0 0 14px rgba(190, 99, 255, 0.38)", "important");\n` +
    `}`;

  const newBlock =
    `dv.container.innerHTML = "";\n` +
    `const __naCss = \`${css}\`;\n` +
    `const __naHtml = \`${html}\`;\n` +
    `const __naSt = dv.container.createEl("style");\n` +
    `__naSt.textContent = __naCss;\n` +
    `const __naRoot = dv.container.createDiv();\n` +
    `__naRoot.innerHTML = __naHtml;` +
    titleFix;

  const rest = text.slice(htmlEnd + 2);
  text = text.slice(0, i) + newBlock + rest;
  fs.writeFileSync(filePath, text, "utf8");
  return true;
}

const files = walk(ROOT);
let n = 0;
for (const f of files.sort()) {
  if (fixFile(f)) {
    n++;
    console.log("OK", path.relative(ROOT, f));
  }
}
console.log("--- total:", n);
