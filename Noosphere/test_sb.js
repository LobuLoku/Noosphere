const fs = require('fs');
const html = fs.readFileSync('C:\\Noosphera\\sb-new3.html', 'utf8');

function decodeSb(s){if(!s)return'';return String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&apos;/g,"'").replace(/&#x27;/gi,"'").replace(/&#(\d+);/g,function(_,n){return String.fromCharCode(parseInt(n,10));}).replace(/&#x([0-9a-f]+);/gi,function(_,h){return String.fromCharCode(parseInt(h,16));}).replace(/&amp;/g,'&');}

const scriptMatch = html.match(/<div class="js-sb-engine-script"[^>]*>([\s\S]*?)<\/div>/);
if (!scriptMatch) { console.log('Script not found'); process.exit(1); }

let code = scriptMatch[1];
const decoded = decodeSb(code);
console.log(decoded.substring(0, 500));
