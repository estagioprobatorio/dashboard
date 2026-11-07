import fs from 'fs';
import readline from 'readline';

async function countValidRows(filePath) {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let count = 0;
  let valid = 0;
  for await (const line of rl) {
    if (count > 0 && line.trim().length > 10) {
      if (/^"?[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{4}/.test(line)) {
        valid++;
      }
    }
    count++;
  }
  console.log(filePath, '=> Total lines:', count, 'Valid date rows:', valid);
}

async function main() {
  const files = fs.readdirSync('docs-planilhas').filter(f => f.endsWith('.csv'));
  for (const f of files) {
    await countValidRows('docs-planilhas/' + f);
  }
}

main().catch(console.error);
