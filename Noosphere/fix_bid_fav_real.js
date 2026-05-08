const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');
text = text.replace('const BID="${bid}";', 'const BID="__BID__";');
text = text.replace('const FAV=${JSON.stringify(faviconURL || "")};', 'const FAV=__FAV__;');
fs.writeFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', text, 'utf8');
console.log('Replaced BID and FAV correctly this time!');
