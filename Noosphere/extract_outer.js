const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');
const start = text.indexOf('```dataviewjs') + 13;
const end = text.lastIndexOf('```');
const script = text.substring(start, end);
fs.writeFileSync('c:\\Noosphera\\test_outer2.js', script, 'utf8');
