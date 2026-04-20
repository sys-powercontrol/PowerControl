import fs from 'fs';

function fixFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');

  // For GlobalDashboard.tsx
  if (file.includes('GlobalDashboard')) {
    const start = content.indexOf('  const StatCard');
    const end = content.indexOf('  );', start) + 4;
    
    // Check if the previous one is already up top
    content = content.slice(0, start) + content.slice(end);
    fs.writeFileSync(file, content);
    console.log('Fixed GlobalDashboard');
  } else {
    // SellerDashboard
    const start = content.indexOf('  const StatCard');
    const end = content.indexOf('  );', start) + 4;
    const block = content.slice(start, end);
    
    content = content.slice(0, start) + content.slice(end);
    
    // Add above default export
    const exportStart = content.indexOf('export default');
    content = content.slice(0, exportStart) + block.replace('  const StatCard', 'const StatCard') + '\n\n' + content.slice(exportStart);
    fs.writeFileSync(file, content);
    console.log('Fixed SellerDashboard');
  }
}

fixFile('src/pages/GlobalDashboard.tsx');
fixFile('src/pages/SellerDashboard.tsx');
