const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');

const start = text.indexOf('`dataviewjs') + 13;
const end = text.lastIndexOf('`');
const script = text.substring(start, end);

try {
    new Function(script);
    console.log('Outer syntax is OK!');
} catch(e) {
    console.error('SyntaxError:', e.message);
    const lines = script.split('\n');
    lines.forEach((l, i) => console.log((i+1) + ': ' + l));
}
