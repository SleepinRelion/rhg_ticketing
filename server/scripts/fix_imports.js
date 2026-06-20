import fs from 'fs';
import path from 'path';

function findFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      findFiles(path.join(dir, file), filter, fileList);
    } else if (filter.test(file)) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const files = findFiles(path.join(process.cwd(), 'client', 'src'), /\.jsx$/);

let totalFixed = 0;

for (const file of files) {
  if (file.includes('SearchableSelect.jsx')) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  
  // If the file uses SearchableSelect but doesn't import it
  if (content.includes('SearchableSelect') && !content.includes('import SearchableSelect')) {
    // Find relative path to ui/SearchableSelect.jsx
    const dir = path.dirname(file);
    const uiDir = path.join(process.cwd(), 'client', 'src', 'components', 'ui');
    let relativePath = path.relative(dir, uiDir).replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
    const importStatement = `import SearchableSelect from '${relativePath}/SearchableSelect.jsx';\n`;
    
    // Insert after last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLine + 1) + importStatement + content.slice(endOfLine + 1);
    } else {
        content = importStatement + content;
    }
    
    fs.writeFileSync(file, content);
    console.log(`Fixed imports in ${path.relative(process.cwd(), file)}`);
    totalFixed++;
  }
}

console.log(`Done. Fixed ${totalFixed} files.`);
