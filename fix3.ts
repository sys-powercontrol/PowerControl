import fs from 'fs';
let content = fs.readFileSync('src/services/fiscalApi.ts', 'utf8');

content = content.replace(
  /throw new Error\("Erro desconhecido ([^)]+)"\);/g,
  'throw new Error("Erro desconhecido $1", { cause: err });'
);

fs.writeFileSync('src/services/fiscalApi.ts', content);
