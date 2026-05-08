const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', 'utf8');

const fixes = {
    'â€”': '—',
    'âš¡': '⚡',
    'ðŸ”´': '🔴',
    'â ¤ï¸ ': '❤️',
    'ðŸ›¡ï¸ ': '🛡️',
    'âš”ï¸ ': '⚔️',
    'ðŸ”«': '🔫',
    'âš ï¸ ': '⚠️',
    'Ã¡': 'á',
    'Ã§': 'ç',
    'Ã£': 'ã',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã¢': 'â',
    'Ãª': 'ê',
    'Ãµ': 'õ',
    'Ã€': 'À',
    'Ã': 'Á'
};

for (const [bad, good] of Object.entries(fixes)) {
    text = text.split(bad).join(good);
}

fs.writeFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', text, 'utf8');

// Now do the same for all models just to be absolutely sure no emojis/dashes are broken
const modelsDir = 'c:\\Noosphera\\Wargame\\02 Models';
const walkSync = function(dir, filelist) {
    const files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
        if (fs.statSync(dir + '\\\\' + file).isDirectory()) {
            filelist = walkSync(dir + '\\\\' + file, filelist);
        } else {
            if (file.endsWith('.md')) filelist.push(dir + '\\\\' + file);
        }
    });
    return filelist;
};

const models = walkSync(modelsDir);
for (const modelPath of models) {
    let mText = fs.readFileSync(modelPath, 'utf8');
    let changed = false;
    for (const [bad, good] of Object.entries(fixes)) {
        if (mText.includes(bad)) {
            mText = mText.split(bad).join(good);
            changed = true;
        }
    }
    if (changed) fs.writeFileSync(modelPath, mText, 'utf8');
}

console.log('Fixed all specific characters!');
