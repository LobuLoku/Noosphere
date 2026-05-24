const fs = require("fs");
const fp = "c:/Noosphera/Wargame/02 Facções/Undermovement.md";
let text = fs.readFileSync(fp, "utf8");

const start = text.indexOf("MODELOS\n\n```dataviewjs");
if (start === -1) {
  console.error("Start marker not found");
  process.exit(1);
}

const endMarker = "\n---\n# TÁTICAS";
const end = text.indexOf(endMarker, start);
if (end === -1) {
  console.error("End marker not found");
  process.exit(1);
}

text = text.slice(0, start) + "---" + text.slice(end);
fs.writeFileSync(fp, text, "utf8");
console.log("Removed duplicate carousel (" + (end - start) + " chars)");
