import fs from 'node:fs';

const file = new URL('../js/data.js', import.meta.url);
const source = fs.readFileSync(file, 'utf8');
const commentBlock = String.raw`(?:\/\/ Privacy-safe bootstrap fallback\. Residential address data must come from the\n\/\/ authenticated cloud source and must never be embedded in the public frontend\.\n)*`;
const blockPattern = new RegExp(`${commentBlock}const OFFICIAL_TECHNICIANS_BASE = \\{[\\s\\S]*?\\n\\};\\n\\nconst OFFICIAL_PARTS_BASE`);
const match = source.match(blockPattern);

if (!match) {
  console.error('OFFICIAL_TECHNICIANS_BASE block not found');
  process.exit(2);
}

const block = match[0];
const entries = [...block.matchAll(/^\s*'([^']+)'\s*:\s*\{([^}]*)\}/gm)];
if (!entries.length) {
  console.error('No technician fallback entries found');
  process.exit(3);
}

const sanitizedEntries = entries.map((entry) => {
  const name = entry[1].replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const usernameMatch = entry[2].match(/'username'\s*:\s*'([^']*)'/);
  const username = usernameMatch ? `,'username':'${usernameMatch[1].replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : '';
  return `    '${name}':{'endereco':'','bairro':'','cep':'','municipio':'','uf':''${username}}`;
});

const replacement = `// Privacy-safe bootstrap fallback. Residential address data must come from the\n// authenticated cloud source and must never be embedded in the public frontend.\nconst OFFICIAL_TECHNICIANS_BASE = {\n${sanitizedEntries.join(',\n')}\n};\n\nconst OFFICIAL_PARTS_BASE`;
const next = source.replace(blockPattern, replacement);
const containsResidentialData = /OFFICIAL_TECHNICIANS_BASE = \{[\s\S]*?'endereco'\s*:\s*'[^']+'/m.test(next);

if (containsResidentialData) {
  console.error('Sanitization failed: residential fallback data remains');
  process.exit(4);
}

if (process.argv.includes('--check')) {
  if (next !== source) {
    console.error('Privacy migration required. Run with --apply.');
    process.exit(1);
  }
  console.log(`Privacy fallback clean (${entries.length} technician records checked).`);
  process.exit(0);
}

if (!process.argv.includes('--apply')) {
  console.log(`Would sanitize ${entries.length} technician fallback records. Use --apply to write changes.`);
  process.exit(0);
}

if (next === source) {
  console.log('No changes required.');
  process.exit(0);
}

fs.writeFileSync(file, next, 'utf8');
console.log(`Sanitized ${entries.length} technician fallback records without changing technician names or Firebase data paths.`);
