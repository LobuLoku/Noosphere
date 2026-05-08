const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');

const startTag = 'function buildEngineScript() { return \x60';
const endTag = '\x60; }';
const startIdx = text.indexOf(startTag);
const endIdx = text.lastIndexOf(endTag);

let scriptBody = text.substring(startIdx + startTag.length, endIdx);

scriptBody = scriptBody.replace('const BID="\";', 'const BID="__BID__";');
scriptBody = scriptBody.replace('const FAV=\;', 'const FAV=__FAV__;');
scriptBody = scriptBody.replace(/\\\\/g, '\\');

const newFunc = "function buildEngineScript() {\n" +
"  const BID = bid;\n" +
"  const FAV = JSON.stringify(faviconURL || '');\n" +
"  const code = buildEngineScript.toString().match(/\\/\\*!ENGINE!([\\s\\S]*?)!ENGINE!\\*\\//)[1];\n" +
"  return code.replace('__BID__', BID).replace('__FAV__', FAV);\n" +
"}\n" +
"/*\n!ENGINE!" + scriptBody + "\n!ENGINE!\n*/";

const newText = text.substring(0, startIdx) + newFunc + text.substring(endIdx + endTag.length);
fs.writeFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', newText, 'utf8');
console.log('Success!');
