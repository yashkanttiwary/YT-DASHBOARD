const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const \[videoSort, setVideoSort\] = useState<"recent" \| "views" \| "likes" \| "velocity">\(("recent")\);/g;
content = content.replace(regex, 'const [videoSort, setVideoSort] = useState<"recent" | "views" | "likes" | "velocity" | "engagement" | "comments" | "score">("recent");');

const regex2 = /\(\["recent", "views", "likes", "velocity"\] as const\)/g;
content = content.replace(regex2, '(["recent", "views", "likes", "velocity", "engagement", "comments", "score"] as const)');

content = content.replace(
  'if (videoSort === "recent") {\n        return new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime();\n      }',
  `if (videoSort === "recent") {
        return new Date(b.snippet.publishedAt).getTime() - new Date(a.snippet.publishedAt).getTime();
      }
      if (videoSort === "comments") {
        return Number(b.statistics.commentCount || 0) - Number(a.statistics.commentCount || 0);
      }
      if (videoSort === "engagement") {
        const engA = Number(a.statistics.viewCount || 0) > 0 ? (Number(a.statistics.likeCount || 0) + Number(a.statistics.commentCount || 0)) / Number(a.statistics.viewCount) : 0;
        const engB = Number(b.statistics.viewCount || 0) > 0 ? (Number(b.statistics.likeCount || 0) + Number(b.statistics.commentCount || 0)) / Number(b.statistics.viewCount) : 0;
        return engB - engA;
      }
      if (videoSort === "score") {
        const getScore = (v: any) => {
          const views = Number(v.statistics.viewCount || 0);
          const likes = Number(v.statistics.likeCount || 0);
          const comments = Number(v.statistics.commentCount || 0);
          const eng = views > 0 ? ((likes + comments) / views * 100) : 0;
          const vel = calculateVelocity(v.snippet.publishedAt, views);
          return Math.min(99.9, ((vel * 0.5) + (eng * 10) + (views / 10000)));
        };
        return getScore(b) - getScore(a);
      }`
);

fs.writeFileSync('src/App.tsx', content);

console.log('Fixed sort logic');
