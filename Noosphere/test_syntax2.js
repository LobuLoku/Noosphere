const fs = require('fs');
const content = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');
const startIdx = content.indexOf('function buildEngineScript() { return \x60') + 'function buildEngineScript() { return \x60'.length;
const endIdx = content.lastIndexOf('\x60; }');

const bid = 'sb_123';
const faviconURL = 'favicon.png';
const engineScript = eval('\x60' + content.substring(startIdx, endIdx) + '\x60');

try {
    new Function(engineScript);
    console.log('Syntax is OK!');
} catch (e) {
    console.error('SyntaxError:', e.message);
    fs.writeFileSync('c:\\Noosphera\\temp_engine3.js', engineScript);
}
