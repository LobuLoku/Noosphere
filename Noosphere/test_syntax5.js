const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');

const codeMatch = text.match(/\/\*\n?!ENGINE!([\s\S]*?)!ENGINE!\n?\*\//);
let code = codeMatch[1];
code = code.replace('__BID__', 'sb_123').replace('__FAV__', '""');

try {
    new Function(code);
    console.log('Syntax is 100% OK!');
} catch (e) {
    console.error('SyntaxError:', e.message);
    fs.writeFileSync('c:\\Noosphera\\temp_err.js', code);
}
