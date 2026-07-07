const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  'border border-[#00b300] dark:border-[#00ff00]/20 hover:border-[#00b300] dark:border-[#00ff00]',
  'border border-[#00b300]/30 dark:border-[#00ff00]/20 hover:border-[#00b300] dark:hover:border-[#00ff00]'
);

// Also fix the 4 cards at the top of the algorithm page which have similar borders
content = content.replace(
  /border border-\[\#00b300\] dark:border-\[\#00ff00\]\/20/g,
  'border border-[#00b300]/30 dark:border-[#00ff00]/20'
);

fs.writeFileSync('src/App.tsx', content);

console.log('Algorithm borders fixed');
