const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');

const startTag = 'let code = `';
const endTag = '`;\n  return code.replace';
const startIdx = text.indexOf(startTag);
const endIdx = text.lastIndexOf(endTag);

if (startIdx === -1 || endIdx === -1) { console.error('not found'); process.exit(1); }

let rawCode = text.substring(startIdx + startTag.length, endIdx);
// Evaluate the template string exactly as JS does
const engineScript = eval('`' + rawCode + '`');

try {
    new Function(engineScript);
    console.log('Inner syntax is OK!');
} catch (e) {
    console.error('Inner SyntaxError:', e.message);
}
