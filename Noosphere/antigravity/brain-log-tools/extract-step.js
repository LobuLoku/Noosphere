const fs = require('fs');
const txt = fs.readFileSync('C:/Users/Matheus Farkas/.gemini/antigravity/brain/c18e914a-868a-4711-b2a9-529120b286eb/.system_generated/logs/overview.txt', 'utf8');
const lines = txt.split('\n');
let capture = false;
for(let i=0; i<lines.length; i++) {
    if(lines[i].includes('write_to_file') && lines[i].includes('export-fixes.md')) capture = true;
    if(capture){
        console.log(lines[i].substring(0, 1500));
        if(lines[i+1] && lines[i+1].includes('"step_index":')) break;
    }
}
