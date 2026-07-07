const fs = require('fs');
let content = fs.readFileSync('src/api.ts', 'utf8');
content = content.replace(
  'channels: channelsData.items || [],',
  'channels: channelsDataItems || [],'
);
fs.writeFileSync('src/api.ts', content);
