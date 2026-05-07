const fs = require('fs');
const txt = fs.readFileSync('C:/Users/Matheus Farkas/.gemini/antigravity/brain/ecb3ec83-4938-4044-af56-1e43f77004dc/.system_generated/logs/overview.txt', 'utf8');
const lines = txt.split('\n');
let lastView = "";
for (let i = 0; i < 414; i++) {
    if (lines[i] && lines[i].includes('view_file') && lines[i].includes('export-fixes.md')) {
        lastView = lines[i] + "\n" + (lines[i+1] || "");
    }
}
console.log(lastView.substring(0, 1500));
