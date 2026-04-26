import * as fs from 'fs';
let content = fs.readFileSync('firestore.rules', 'utf8');
let lines = content.split('\n');
lines = lines.slice(0, 204);
fs.writeFileSync('firestore.rules', lines.join('\n'));
