const fs = require('fs');
let content = fs.readFileSync('src/api.ts', 'utf8');

content = content.replace(
  'throw new Error(`YouTube API Error: ${channelsRes.statusText}`);',
  `let errorMsg = channelsRes.statusText;
  try {
    const errData = await channelsRes.json();
    if (errData.error?.message) errorMsg = errData.error.message;
  } catch(e) {}
  throw new Error(\`YouTube API Error: \${errorMsg}\`);`
);

content = content.replace(
  'throw new Error(`Instagram API Error: ${response.statusText}`);',
  `let errorMsg = response.statusText;
  try {
    const errData = await response.json();
    if (errData.error?.message) errorMsg = errData.error.message;
  } catch(e) {}
  throw new Error(\`Instagram API Error: \${errorMsg}\`);`
);

fs.writeFileSync('src/api.ts', content);

console.log('API Error handling improved');
