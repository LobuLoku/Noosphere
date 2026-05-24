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

const eliteFn = `function isEliteKw(k) {
  const x = stripD(k);
  return x === "elite";
}
`;

let updated = 0;
for (const fp of walk(cardsDir)) {
  if (path.basename(fp).toLowerCase().includes("template")) continue;
  let text = fs.readFileSync(fp, "utf8");
  if (!text.includes("function isUniqueKw(k)")) continue;
  if (text.includes("function isEliteKw(k)")) {
    console.log("skip (already patched):", path.relative(cardsDir, fp));
    continue;
  }

  text = text.replace(
    /function isUniqueKw\(k\) \{\s*\n\s*const x = stripD\(k\);\s*\n\s*return x === "unica" \|\| x === "unique" \|\| x === "unico";\s*\n\}/,
    (m) => m + "\n\n" + eliteFn.trim()
  );

  text = text.replace(
    `const isUnica = kws.some(isUniqueKw);
const uniqueKw = kws.find(isUniqueKw);
const otherKws = kws.filter((k) => !isUniqueKw(k));`,
    `const isUnica = kws.some(isUniqueKw);
const isElite = kws.some(isEliteKw);
const uniqueKw = kws.find(isUniqueKw);
const eliteKw = kws.find(isEliteKw);
const otherKws = kws.filter((k) => !isUniqueKw(k) && !isEliteKw(k));`
  );

  text = text.replace(
    `if (uniqueKw) specialMetaItems.push(String(uniqueKw).trim());
if (reacaoKw) specialMetaItems.push(String(reacaoKw).trim());`,
    `if (uniqueKw) specialMetaItems.push(String(uniqueKw).trim());
if (eliteKw) specialMetaItems.push(String(eliteKw).trim());
if (reacaoKw) specialMetaItems.push(String(reacaoKw).trim());`
  );

  text = text.replace(
    `const uniqueClass = isUnica ? " tc-unique" : "";`,
    `const uniqueClass = isUnica || isElite ? " tc-unique" : "";`
  );

  fs.writeFileSync(fp, text, "utf8");
  updated++;
  console.log("patched:", path.relative(cardsDir, fp));
}
console.log("Done:", updated, "files");
