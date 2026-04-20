import fs from 'fs';
let content = fs.readFileSync('src/services/fiscalApi.ts', 'utf8');

content = content.replace(
  /throw new Error\("Erro desconhecido ao comunicar com FocusNFe"\);/g,
  'throw new Error("Erro desconhecido ao comunicar com FocusNFe", { cause: err });'
);
content = content.replace(
  /throw new Error\("Erro desconhecido ao comunicar com WebmaniaBR"\);/g,
  'throw new Error("Erro desconhecido ao comunicar com WebmaniaBR", { cause: err });'
);
content = content.replace(
  /throw new Error\("Erro desconhecido ao cancelar NFe no FocusNFe"\);/g,
  'throw new Error("Erro desconhecido ao cancelar NFe no FocusNFe", { cause: err });'
);
content = content.replace(
  /throw new Error\("Erro desconhecido ao cancelar NFe no WebmaniaBR"\);/g,
  'throw new Error("Erro desconhecido ao cancelar NFe no WebmaniaBR", { cause: err });'
);
content = content.replace(
  /throw new Error\("Erro desconhecido ao consultar NFe no FocusNFe"\);/g,
  'throw new Error("Erro desconhecido ao consultar NFe no FocusNFe", { cause: err });'
);
content = content.replace(
  /throw new Error\("Erro desconhecido ao consultar NFe no WebmaniaBR"\);/g,
  'throw new Error("Erro desconhecido ao consultar NFe no WebmaniaBR", { cause: err });'
);

fs.writeFileSync('src/services/fiscalApi.ts', content);
