import fs from "fs";
import path from "path";

const root = path.join(process.cwd(), "Wargame", "04 Utilities");
const markerRe =
  /const __naRoot = dv\.container\.createDiv\(\);\r?\n__naRoot\.innerHTML = __naHtml;/;

const extraLines = `
const __naTitleEl = __naRoot.querySelector(".w-title");
if (__naTitleEl) {
  __naTitleEl.style.setProperty("font-size", "14px", "important");
  __naTitleEl.style.setProperty("line-height", "1.35", "important");
  __naTitleEl.style.setProperty("display", "block", "important");
  __naTitleEl.style.setProperty("margin", "0", "important");
  __naTitleEl.style.setProperty("padding", "0", "important");
  __naTitleEl.style.setProperty("font-family", "Orbitron, system-ui, sans-serif", "important");
  __naTitleEl.style.setProperty("font-weight", "400", "important");
  __naTitleEl.style.setProperty("color", "#f5f0ff", "important");
  __naTitleEl.style.setProperty("text-transform", "uppercase", "important");
  __naTitleEl.style.setProperty("letter-spacing", "0.08em", "important");
  __naTitleEl.style.setProperty("text-shadow", "0 0 14px rgba(190, 99, 255, 0.38)", "important");
}
`.trimEnd();

function walk(d) {
  for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith(".md")) {
      let s = fs.readFileSync(p, "utf8");
      if (s.includes("__naTitleEl")) continue;
      if (!markerRe.test(s)) {
        console.log("SKIP pattern:", p);
        continue;
      }
      const eol = s.includes("\r\n") ? "\r\n" : "\n";
      const block = extraLines.replace(/\n/g, eol);
      const n = (s.match(markerRe) || []).length;
      if (n !== 1) console.log("WARN matches", n, p);
      s = s.replace(markerRe, (m) => `${m}${eol}${block}`);
      fs.writeFileSync(p, s, "utf8");
      console.log("OK", p);
    }
  }
}

walk(root);
