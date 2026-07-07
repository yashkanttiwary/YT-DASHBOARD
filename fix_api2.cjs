const fs = require('fs');
let content = fs.readFileSync('src/api.ts', 'utf8');

const replacement = `  // Separate channels into IDs and Handles
  const validIds = [];
  const handles = [];

  for (const c of keys.youtubeChannels) {
    const rawId = (c.channel_id || "").trim();
    if (!rawId) continue;
    if (rawId.startsWith("@")) {
      handles.push(rawId);
    } else {
      validIds.push(rawId);
    }
  }

  let channelsDataItems = [];

  // 1. Fetch by IDs (batch up to 50)
  if (validIds.length > 0) {
    for (let i = 0; i < validIds.length; i += 50) {
      const chunk = validIds.slice(i, i + 50).join(",");
      const channelsRes = await fetch(
        \`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=\${chunk}&key=\${keys.youtubeKey}\`
      );
      if (!channelsRes.ok) {
        let errorMsg = channelsRes.statusText;
        try {
          const errData = await channelsRes.json();
          if (errData.error?.message) errorMsg = errData.error.message;
        } catch(e) {}
        throw new Error(\`YouTube API Error: \${errorMsg}\`);
      }
      const data = await channelsRes.json();
      if (data.items) {
        channelsDataItems = channelsDataItems.concat(data.items);
      }
    }
  }

  // 2. Fetch by Handles (one by one, as forHandle doesn't support comma-separated list)
  for (const handle of handles) {
    const cleanHandle = handle.replace("@", "");
    const handleRes = await fetch(
      \`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forHandle=\${cleanHandle}&key=\${keys.youtubeKey}\`
    );
    if (handleRes.ok) {
      const data = await handleRes.json();
      if (data.items && data.items.length > 0) {
        channelsDataItems.push(data.items[0]);
      } else {
        // Fallback for legacy usernames
        const userRes = await fetch(
          \`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&forUsername=\${cleanHandle}&key=\${keys.youtubeKey}\`
        );
        if (userRes.ok) {
           const uData = await userRes.json();
           if (uData.items && uData.items.length > 0) {
             channelsDataItems.push(uData.items[0]);
           }
        }
      }
    }
  }

  const uploadsPlaylists = channelsDataItems.map((item) => item.contentDetails?.relatedPlaylists?.uploads).filter(Boolean) || [];`;

// Replace from 'const channelIds =' up to 'const uploadsPlaylists = ...'
const regex = /const channelIds = keys\.youtubeChannels\.map\(\(c: any\) => c\.channel_id\)\.join\(\",\"\);[\s\S]*?const uploadsPlaylists = channelsData\.items\?\.map\(\(item: any\) => item\.contentDetails\?\.relatedPlaylists\?\.uploads\)\.filter\(Boolean\) \|\| \[\];/m;

content = content.replace(regex, replacement);
fs.writeFileSync('src/api.ts', content);
console.log('Fixed API logic');
