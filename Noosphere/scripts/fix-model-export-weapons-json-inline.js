/**
 * One-off / repeatable fixes for model HUD notes:
 * - Remove duplicate bufferToBase64 block before // IMAGEM E DATA
 * - Harden INLINE_PATCH: escape < in embedded JSON + re-init dashboard after patch
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "Wargame", "02 Models");

const OLD_TAIL =
  'jel.textContent=JSON.stringify(W);\n}catch(_e){}\n}\n_patch(document.getElementById("${uid}"));\n})();';

const NEW_TAIL =
  'jel.textContent=JSON.stringify(W).replace(/</g,"\\\\u003c");\n}catch(_e){}\n}\nvar __nwr=document.getElementById("${uid}");\n_patch(__nwr);\nif(__nwr&&typeof window.initUnitDashboard==="function")try{window.initUnitDashboard(__nwr);}catch(__e){}\n})();';

const BUF_NEEDLE = "\n// ArrayBuffer to Base64 Helper\nfunction bufferToBase64(buf) {\n";

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

function stripSecondBufferToBase64(text) {
  const first = text.indexOf(BUF_NEEDLE);
  if (first === -1) return text;
  const second = text.indexOf(BUF_NEEDLE, first + BUF_NEEDLE.length);
  if (second === -1) return text;
  const resume = text.indexOf("\n\n// IMAGEM E DATA", second);
  if (resume === -1) return text;
  return text.slice(0, second) + text.slice(resume);
}

function patchFile(fp) {
  let text = fs.readFileSync(fp, "utf8");
  const orig = text;
  text = stripSecondBufferToBase64(text);
  if (!text.includes(OLD_TAIL)) {
    if (!text.includes("jel.textContent=JSON.stringify(W).replace(/</g")) {
      console.warn("SKIP tail pattern:", fp);
    }
  } else {
    text = text.split(OLD_TAIL).join(NEW_TAIL);
  }
  if (text !== orig) {
    fs.writeFileSync(fp, text, "utf8");
    return true;
  }
  return false;
}

let n = 0;
for (const fp of walk(ROOT).sort()) {
  if (patchFile(fp)) {
    n++;
    console.log("Updated:", path.relative(ROOT, fp));
  }
}
console.log("Done.", n, "files updated.");
