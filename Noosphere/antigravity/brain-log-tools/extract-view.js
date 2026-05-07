const fs = require('fs');
const txt = fs.readFileSync('C:/Users/Matheus Farkas/.gemini/antigravity/brain/ecb3ec83-4938-4044-af56-1e43f77004dc/.system_generated/logs/overview.txt', 'utf8');
const lines = txt.split('\n');
let capturing = false;
let output = [];
for(let i=0; i<lines.length; i++){
    if(lines[i].includes('"step_index":418') || lines[i].includes('"step_index":419') || lines[i].includes('"step_index":420')) {
        if(lines[i].includes('view_file')) {
            capturing = true;
        }
    }
    if (capturing) {
        output.push(lines[i]);
        if (output.length > 50) break;
    }
}
console.log(output.join('\n').substring(0, 2000));
