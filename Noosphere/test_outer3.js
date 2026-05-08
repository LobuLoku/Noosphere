const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');
const start = text.indexOf('```dataviewjs') + 13;
const end = text.lastIndexOf('```');
const scriptBody = text.substring(start, end);
try {
    new Function(scriptBody);
    console.log('Outer syntax is OK!');
} catch(e) {
    console.error('SyntaxError:', e.message);
    const lines = scriptBody.split('\n');
    let errLine = e.lineNumber || -1;
    console.log('Error around line', errLine);
    fs.writeFileSync('c:\\Noosphera\\temp_err_outer.js', scriptBody);
}
