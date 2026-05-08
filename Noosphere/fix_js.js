const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');

// Fix escCssUrl
text = text.replace('replace(/\\/g,"\\\\").replace(/\'/g,"\\\'")', 'replace(/\\\\/g,"\\\\\\\\").replace(/\\'/g,"\\\\'")');
// Wait, the string in the file right now is:
// replace(/\/g,"\").replace(/'/g,"\'")
text = text.replace('replace(/\\/g,"\\").replace(/\'/g,"\\\'")', 'replace(/\\\\/g,"\\\\\\\\").replace(/\\'/g,"\\\\'")');

// Let's just fix the whole function line
text = text.replace('function escCssUrl(s){ return String(s||"").replace(/\\/g,"\\").replace(/\'/g,"\\\'"); }', 
                    'function escCssUrl(s){ return String(s||"").replace(/\\\\/g,"\\\\\\\\").replace(/\\\'/g,"\\\\\'"); }');

// Fix u003c
text = text.replace('replace(/</g,"\\u003c")', 'replace(/</g,"\\\\u003c")');
text = text.replace('replace(/</g,"\u003c")', 'replace(/</g,"\\\\u003c")');

// Fix \s+
text = text.replace('replace(/\\s+/g," ").trim()', 'replace(/\\\\s+/g," ").trim()');

// Fix [\/:*?"<>|]
text = text.replace('replace(/[\\/:*?"<>|]/g,"_")', 'replace(/[\\\\/:*?"<>|]/g,"_")');

fs.writeFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', text, 'utf8');
console.log('Fixed broken JS literals!');
