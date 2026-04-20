import fs from 'fs';

function fixFile(file: string) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace `throw new Error("...", err)` or `throw new Error("...")` inside catch(err) with `{ cause: err }`
  // We can just use a regex
  
  // We look for:
  // catch (err) {
  //   throw new Error("...");
  // }
  
  const catchRegex = /catch\s*\(([^)]+)\)\s*\{([\s\S]*?)\}/g;
  content = content.replace(catchRegex, (match, errName, body) => {
     let errVar = errName;
     if (errName.includes(':')) {
        errVar = errName.split(':')[0].trim();
     }
     
     // Inside body, look for `throw new Error(something)`
     const throwRegex = /throw\s+new\s+Error\s*\(([^)]+)\)/g;
     const newBody = body.replace(throwRegex, (throwMatch: string, args: string) => {
        // if args already has a comma and object, skip
        if (args.includes('{ cause')) return throwMatch;
        return `throw new Error(${args}, { cause: ${errVar} })`;
     });
     return `catch (${errName}) {${newBody}}`;
  });
  
  fs.writeFileSync(file, content);
  console.log(`Fixed ${file}`);
}

fixFile('src/services/fiscalApi.ts');
