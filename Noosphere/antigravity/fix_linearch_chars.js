const fs = require('fs');
const path = require('path');

const templatePath = path.join('C:', 'Noosphera', 'Worldbuilding', 'Templates', 'Template Pessoa - Dyrrachon.md');
const charactersDir = path.join('C:', 'Noosphera', 'Worldbuilding', 'Dyrrachon [ LineArch ]', 'Personagens');

const templateContent = fs.readFileSync(templatePath, 'utf8');

// Extrair blocos DataviewJS
const match = templateContent.match(/(```dataviewjs[\s\S]*?```\s*```dataviewjs[\s\S]*?```)/);
if (!match) {
    console.log("Erro: Nao achou dataviewjs no template");
    process.exit(1);
}
const dvBlocks = match[1];

let count = 0;
const files = fs.readdirSync(charactersDir);

for (const filename of files) {
    if (!filename.endsWith('.md')) continue;
    
    const filepath = path.join(charactersDir, filename);
    let content = fs.readFileSync(filepath, 'utf8');
    
    // Substituir dataviewjs blocks ate Visao Geral
    content = content.replace(/```dataviewjs[\s\S]*?(?=# Visão Geral)/, dvBlocks + '\n\n');

    // Consertar a infobox
    const lines = content.split('\n');
    let inInfobox = false;
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('>[!infobox]') || line.includes('> [!infobox]')) {
            inInfobox = true;
            lines[i] = '> [!infobox]';
            continue;
        }
        
        if (inInfobox) {
            if (line.startsWith('```dataviewjs')) {
                inInfobox = false;
            } else {
                if (!line.startsWith('>')) {
                    if (line.trim() === '') {
                        lines[i] = '>';
                    } else {
                        lines[i] = '> ' + line;
                    }
                }
            }
        }
    }
    
    fs.writeFileSync(filepath, lines.join('\n'), 'utf8');
    count++;
}

console.log(`Foram corrigidos ${count} personagens.`);
