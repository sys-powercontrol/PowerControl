import fs from 'fs';
import path from 'path';

function processFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Regex to catch `if (currentUser?.role !== 'master')`
  // and `if (user?.email !== "sys.powercontrol@gmail.com")`
  // and `if (!company && window.location.pathname !== '/company')`
  
  // This is a more permissive regex. We look for any `if (...) { \n return ( \n ... \n ); \n }`
  // that appears before `const [` or `const { data:`
  
  // Actually, I can just use a simple regex replacing:
  // `if\s*\((?:!canView|!canManage|!canAccess|user\?[^)]+|currentUser\?[^)]+|![a-zA-Z]+)\)\s*\{[\s\S]*?(?:return\s*\([\s\S]*?\);\s*)\}`
  
  const rulesOfHooksRegex = /if\s*\([^)]+\)\s*\{\s*return\s*\([\s\S]*?\);\s*\}/g;
  
  const matches = [...content.matchAll(rulesOfHooksRegex)];
  
  let modified = false;
  
  if (matches.length > 0) {
     for (const match of matches) {
        const block = match[0];
        
        // Ensure this block is somewhat near the top, i.e., before the first `return (` that isn't inside it.
        // Or we just check if there are `use` hooks after it.
        const blockIndex = content.indexOf(block);
        const codeAfter = content.slice(blockIndex + block.length);
        if (codeAfter.includes('useQuery(') || codeAfter.includes('useMutation(') || codeAfter.includes('useState(') || codeAfter.includes('useMemo(')) {
           // Move it
           const before = content.slice(0, blockIndex);
           const after = content.slice(blockIndex + block.length);
           content = before + after;
           
           const returnIndex = content.lastIndexOf('  return (');
           if (returnIndex !== -1) {
              content = content.slice(0, returnIndex) + block + '\n\n' + content.slice(returnIndex);
              console.log('Fixed block in', filePath);
              modified = true;
           } else {
              content = before + block + after; // put back
           }
        }
     }
     
     if (modified) {
       fs.writeFileSync(filePath, content, 'utf8');
     }
  }
}

function walkDir(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

walkDir('./src/pages');
