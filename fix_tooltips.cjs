const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const sortDescriptions = `
const sortDescriptions: Record<string, { desc: string, impact: string }> = {
  recent: { desc: "Chronological order based on publish date.", impact: "Shows the latest uploads to analyze immediate initial traction." },
  views: { desc: "Total lifetime views.", impact: "Indicates overall reach and mass appeal of the content." },
  likes: { desc: "Total user likes.", impact: "Shows passive viewer satisfaction and content resonance." },
  velocity: { desc: "Views per hour since publish.", impact: "Identifies currently trending or viral content." },
  engagement: { desc: "Likes + Comments per view.", impact: "Shows active viewer involvement and community building." },
  comments: { desc: "Total user comments.", impact: "Indicates high active engagement and discussion generation." },
  score: { desc: "Algorithmic Matrix Score.", impact: "A composite metric predicting algorithmic favorability." }
};
`;

content = content.replace('export default function App() {', sortDescriptions + '\nexport default function App() {');

const replacement1 = `                        {(["recent", "views", "likes", "velocity", "engagement", "comments", "score"] as const).map(sort => (
                           <div key={sort} className="relative group">
                             <button 
                               onClick={() => setVideoSort(sort)}
                               className={\`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors \${videoSort === sort ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}\`}
                             >
                               {sort}
                             </button>
                             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900 dark:bg-black/95 border border-gray-700 dark:border-white/10 rounded shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 flex flex-col gap-1 hidden group-hover:flex">
                               <span className="text-[10px] font-bold text-white uppercase tracking-widest">{sort}</span>
                               <span className="text-[9px] text-gray-300">{sortDescriptions[sort].desc}</span>
                               <span className="text-[9px] text-[#00b300] dark:text-[#00ff00] font-mono mt-1">{sortDescriptions[sort].impact}</span>
                             </div>
                           </div>
                        ))}`;

const regex1 = /\{\(\[\"recent\", \"views\", \"likes\", \"velocity\", \"engagement\", \"comments\", \"score\"\] as const\)\.map\(sort => \([\s\S]*?<\/button>\s*\)\)\}/g;

content = content.replace(regex1, replacement1);

fs.writeFileSync('src/App.tsx', content);

console.log('Tooltips added');
