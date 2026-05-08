const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');

const codeMatch = text.match(/\/\*[\s\n]*!ENGINE!\(function\(\)\{([\s\S]*?)!ENGINE![\s\n]*\*\//);
if (!codeMatch) { console.error('not found'); process.exit(1); }
let scriptBody = '(function(){' + codeMatch[1];

// Escape all special characters for JS template string
let escapedBody = scriptBody
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');

const newFunc = "function buildEngineScript() {\n" +
"  const BID = bid;\n" +
"  const FAV = JSON.stringify(faviconURL || '');\n" +
"  let code = `" + escapedBody + "`;\n" +
"  return code.replace('__BID__', BID).replace('__FAV__', FAV);\n" +
"}";

const startTag = 'function buildEngineScript() {';
const endTag = '!ENGINE!\n*/';
const startIdx = text.indexOf(startTag);
const endIdx = text.lastIndexOf(endTag);

const newText = text.substring(0, startIdx) + newFunc + text.substring(endIdx + endTag.length);
fs.writeFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', newText, 'utf8');
console.log('Fixed syntax perfectly using escaped template literal!');
