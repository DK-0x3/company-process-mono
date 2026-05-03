const fs = require('fs');
const path = require('path');

const iconsDir = path.resolve(__dirname, '../assets/icons');
const outFile = path.resolve(__dirname, '../ui/smart-icon/types/icon-names.d.ts');

const files = fs.readdirSync(iconsDir);
const names = files
	.filter((f) => f.endsWith('.svg'))
	.map((f) => `'${f.replace('.svg', '')}'`);

const content = `// ⚡ auto-generated, do not edit
export type IconName = ${names.join(' | ')};
`;

fs.writeFileSync(outFile, content);
console.log('✅ Icon types generated:', outFile);
