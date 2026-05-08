const fs = require('fs');
let text = fs.readFileSync('c:\\Noosphera\\backup_corrupted\\Squad Builder.md', 'utf8');

const regex = /[^\x00-\x7F]+/g;
text = text.replace(regex, (match) => {
    try {
        const decoded = Buffer.from(match, 'latin1').toString('utf8');
        if (decoded.includes('\uFFFD')) {
            return match; // fallback if it decodes to garbage
        }
        return decoded;
    } catch(e) {
        return match;
    }
});

// Let's check what remains
const weird = new Set();
const regex2 = /[^\x00-\x7F]+/g;
let match2;
while ((match2 = regex2.exec(text)) !== null) {
    if (match2[0].includes('Ã') || match2[0].includes('Â') || match2[0].length > 1) {
        weird.add(match2[0]);
    }
}
console.log('Weird remaining:', Array.from(weird).slice(0, 50));

fs.writeFileSync('c:\\Noosphera\\Wargame\\Squad Builder.md', text, 'utf8');
