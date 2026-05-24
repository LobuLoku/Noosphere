const fs = require("fs");
const path = require("path");

const script = fs.readFileSync(
  path.join(__dirname, "faction-model-carousel-v3.js"),
  "utf8"
);
const newBlock = "```dataviewjs\n" + script.trim() + "\n```";
const pattern =
  /```dataviewjs\s*\/\*\*\s*\n \* Carrossel de Modelos da Facção \(V2 - Anti-Error Patch\)\s*\*\/[\s\S]*?}\s*\n```/g;

const factionDir = path.join(__dirname, "..", "02 Facções");
const files = [
  "Casacas.md",
  "Chloriders.md",
  "Eidolon.md",
  "Linearchs.md",
  "Signalitas.md",
  "Technokratas.md",
  "Undermovement.md",
];

for (const name of files) {
  const fp = path.join(factionDir, name);
  const text = fs.readFileSync(fp, "utf8");
  const matches = text.match(pattern);
  if (!matches) {
    console.log("NO MATCH:", name);
    continue;
  }
  const newText = text.replace(pattern, newBlock);
  fs.writeFileSync(fp, newText, "utf8");
  console.log("Updated", name + ":", matches.length, "block(s)");
}
