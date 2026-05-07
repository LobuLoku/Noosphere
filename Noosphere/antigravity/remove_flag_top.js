const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            if (!file.includes('Personagens')) {
                results = results.concat(walk(file));
            }
        } else {
            if (file.endsWith('.md')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('C:/Noosphera/Worldbuilding');
const templates = walk('C:/Noosphera/Recursos/Templates');
const allFiles = files.concat(templates);

let changedFiles = 0;
let totalRemoved = 0;

const regex = /^>[\s]*<mark class="flag-top".*?<\/mark>[\s]*\r?\n/gm;

allFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let matches = content.match(regex);
    
    if (matches) {
        let newContent = content.replace(regex, '');
        fs.writeFileSync(file, newContent, 'utf8');
        changedFiles++;
        totalRemoved += matches.length;
        console.log(`Modified: ${file} (removed ${matches.length})`);
    }
});

console.log(`\nDone! Modified ${changedFiles} files and removed ${totalRemoved} flag-top tags.`);
