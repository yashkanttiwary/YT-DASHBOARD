const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  { regex: /dark:text-white/g, replacement: 'dark:text-white' }, // Keep this, we'll fix specifics
  { regex: /hover:text-gray-900 dark:text-white/g, replacement: 'hover:text-gray-900 dark:hover:text-white' },
  { regex: /bg-white\/10 text-gray-900/g, replacement: 'bg-gray-200 dark:bg-white/10 text-gray-900' },
  { regex: /bg-gray-800 dark:bg-black\/80 text-\[9px\] font-mono text-gray-900 dark:text-white/g, replacement: 'bg-gray-800 dark:bg-black/80 text-[9px] font-mono text-white' },
  { regex: /bg-gray-800 dark:bg-black\/80 text-\[8px\] font-mono text-gray-900 dark:text-white/g, replacement: 'bg-gray-800 dark:bg-black/80 text-[8px] font-mono text-white' },
  { regex: /group-hover:text-\[\#00b300\] dark:text-\[\#00ff00\]/g, replacement: 'group-hover:text-[#00b300] dark:group-hover:text-[#00ff00]' },
  { regex: /text-gray-500 hover:text-gray-900 dark:text-white/g, replacement: 'text-gray-500 hover:text-gray-900 dark:hover:text-white' }
];

for (const { regex, replacement } of replacements) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync('src/App.tsx', content);

console.log('Classes fixed');
