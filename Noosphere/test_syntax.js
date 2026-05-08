const fs = require('fs');
let content = fs.readFileSync('c:\\Noosphera\\temp_engine.js', 'utf8');
content = content.replace(/\$\{bid\}/g, 'sb_123');
content = content.replace(/\$\{JSON\.stringify\([^)]+\)\}/g, '\"favicon.png\"');
fs.writeFileSync('c:\\Noosphera\\temp_engine2.js', content);
