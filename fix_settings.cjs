const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsPanel.tsx', 'utf8');

const replacements = [
  { regex: /hover:text-gray-900 dark:text-white/g, replacement: 'hover:text-gray-900 dark:hover:text-white' },
];

for (const { regex, replacement } of replacements) {
  content = content.replace(regex, replacement);
}

fs.writeFileSync('src/components/SettingsPanel.tsx', content);

console.log('Settings Fixed');
