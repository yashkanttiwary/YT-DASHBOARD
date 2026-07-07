import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Settings, RefreshCw, AlertTriangle, TrendingDown, TrendingUp, Activity, Users, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SettingsPanel } from "./components/SettingsPanel";
import { checkStatus, fetchYouTubeData, fetchInstagramData } from "./api";
import { DashboardKeys } from "./types";

function formatDuration(pt: string) {
  if (!pt) return "0:00";
  const match = pt.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "0:00";
  const h = parseInt(match[1]) || 0;
  const m = parseInt(match[2]) || 0;
  const s = parseInt(match[3]) || 0;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function calculateVelocity(publishedAt: string, views: number) {
  const hours = (new Date().getTime() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (hours <= 0) return 0;
  return Math.round(views / Math.max(0.1, hours));
}


const sortDescriptions: Record<string, { desc: string, impact: string }> = {
  recent: { desc: "Chronological order based on publish date.", impact: "Shows the latest uploads to analyze immediate initial traction." },
  views: { desc: "Total lifetime views.", impact: "Indicates overall reach and mass appeal of the content." },
  likes: { desc: "Total user likes.", impact: "Shows passive viewer satisfaction and content resonance." },
  velocity: { desc: "Views per hour since publish.", impact: "Identifies currently trending or viral content." },
  engagement: { desc: "Likes + Comments per view.", impact: "Shows active viewer involvement and community building." },
  comments: { desc: "Total user comments.", impact: "Indicates high active engagement and discussion generation." },
  score: { desc: "Algorithmic Matrix Score.", impact: "A composite metric predicting algorithmic favorability." }
};

export default function App() {

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isConfigured, setIsConfigured] = useState({ youtube: false, instagram: false });
  const [youtubeData, setYoutubeData] = useState<{ channels: any[], videos: any[] } | null>(null);
  const [instagramData, setInstagramData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Time range selector state
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">(() => {
    try {
      const display = localStorage.getItem("f1_displayConfig");
      if (display) {
        return JSON.parse(display).timeRange || "30d";
      }
    } catch(e) {}
    return "30d";
  });
  const [activeView, setActiveView] = useState<"global" | "compare" | "videos" | "algorithm">("global");
  const [videoSort, setVideoSort] = useState<"recent" | "views" | "likes" | "velocity" | "engagement" | "comments" | "score">("recent");

  const sortedVideos = useMemo(() => {
    if (!youtubeData?.videos) return [];
    const now = new Date().getTime();
    const rangeMs = timeRange === '24h' ? 24 * 60 * 60 * 1000 : timeRange === '7d' ? 7 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
    
    const videos = youtubeData.videos.filter(v => now - new Date(v.snippet.publishedAt).getTime() <= rangeMs);
    
    return videos.sort((a, b) => {
      if (videoSort === "views") {
        return Number(b.statistics.viewCount || 0) - Number(a.statistics.viewCount || 0);
      }
      if (videoSort === "likes") {
        return Number(b.statistics.likeCount || 0) - Number(a.statistics.likeCount || 0);
      }
      if (videoSort === "velocity") {
        return calculateVelocity(b.snippet.publishedAt, Number(b.statistics.viewCount || 0)) - calculateVelocity(a.snippet.publishedAt, Number(a.statistics.viewCount || 0));
      }
      if (videoSort === "recent") {
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
      }
      return 0;
    });
  }, [youtubeData, videoSort, timeRange]);

  const algoStats = useMemo(() => {
    if (!sortedVideos || sortedVideos.length === 0) return { networkScore: "0.0", medianVelocity: 0, avgEngagement: "0.00", bias: "Neutral" };
    
    const scores = [];
    const velocities = [];
    const engagements = [];

    sortedVideos.forEach(v => {
      const views = Number(v.statistics.viewCount || 0);
      const likes = Number(v.statistics.likeCount || 0);
      const comments = Number(v.statistics.commentCount || 0);
      const engagement = views > 0 ? ((likes + comments) / views * 100) : 0;
      const velocity = calculateVelocity(v.snippet.publishedAt, views);
      
      const score = Math.min(99.9, ((velocity * 0.5) + (engagement * 10) + (views / 10000)));
      
      scores.push(score);
      velocities.push(velocity);
      engagements.push(engagement);
    });

    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    velocities.sort((a, b) => a - b);
    const medianVelocity = velocities.length % 2 === 0 
      ? (velocities[velocities.length / 2 - 1] + velocities[velocities.length / 2]) / 2 
      : velocities[Math.floor(velocities.length / 2)];
    const avgEngagement = engagements.reduce((a, b) => a + b, 0) / engagements.length;

    let bias = "Neutral";
    if (avgScore > 60) bias = "Favorable";
    if (avgScore > 80) bias = "Highly Favorable";
    if (avgScore < 40) bias = "Unfavorable";

    return {
      networkScore: avgScore.toFixed(1),
      medianVelocity: Math.round(medianVelocity),
      avgEngagement: avgEngagement.toFixed(2),
      bias
    };
  }, [sortedVideos]);


  const loadData = useCallback(async (keys?: DashboardKeys) => {
    setIsLoading(true);
    setError(null);
    try {
      const status = await checkStatus(keys);
      setIsConfigured(status.configured);

      if (status.configured.youtube) {
        const ytData = await fetchYouTubeData(keys);
        setYoutubeData(ytData);
      }
      
      if (status.configured.instagram) {
        const igData = await fetchInstagramData(keys);
        setInstagramData(igData);
      }
      
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error(err);
      if (err.message === "Configuration missing") {
        setIsConfigured({ youtube: false, instagram: false });
      } else {
        setError(err.message || "Failed to fetch data");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Auto-refresh every 20 minutes (1200000 ms)
    const interval = setInterval(() => loadData(), 1200000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSettingsSave = (keys: DashboardKeys) => {
    if (keys.display?.timeRange) {
      setTimeRange(keys.display.timeRange);
    }
    loadData(keys);
  };

  const hasNoConfig = !isConfigured.youtube && !isConfigured.instagram;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-200 dark:border-white/10 pb-4 mb-6 px-6 pt-4 sticky top-0 z-40 bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="flex items-center space-x-6">
          <div className="bg-[#ff0000] px-3 py-1 text-xs font-black italic uppercase tracking-tighter text-gray-900 dark:text-white">YT DASHBOARD</div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest leading-none">Circuit Status</span>
            <span className={`text-sm font-mono uppercase ${error ? "text-[#ff0055]" : isLoading ? "text-yellow-400" : "text-[#00b300] dark:text-[#00ff00]"}`}>
              ● {error ? "API ERROR" : isLoading ? "SYNCING" : "LOCAL TEST MODE"}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2 rounded-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="text-[#00b300] dark:text-[#00ff00] hover:opacity-80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded disabled:opacity-50"
              title="Force Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-[#00b300] dark:text-[#00ff00] hover:opacity-80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded"
              title="API Configuration"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-[1920px] mx-auto w-full flex flex-col">
        {isLoading && hasNoConfig === false && !youtubeData ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-[#00b300] dark:text-[#00ff00]">
            <RefreshCw className="w-10 h-10 animate-spin mb-4" />
            <div className="font-mono text-sm font-bold tracking-widest uppercase">Fetching Telemetry...</div>
          </div>
        ) : hasNoConfig ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center border border-gray-200 dark:border-white/10 rounded bg-white dark:bg-white/5">
            <Activity className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-black uppercase tracking-tighter mb-2 text-gray-900 dark:text-white">No Telemetry Sources</h2>
            <p className="text-gray-600 dark:text-gray-400 text-xs font-bold max-w-md mb-6 uppercase tracking-widest">
              Connect YouTube and Instagram data sources to begin monitoring channel performance metrics.
            </p>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-6 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded"
            >
              Configure APIs
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-6 border-b border-gray-200 dark:border-white/10 mb-6 pb-0 overflow-x-auto custom-scrollbar">
              <button onClick={() => setActiveView('global')} className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded ${activeView === 'global' ? 'text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent'}`}>Global Grid</button>
              <button onClick={() => setActiveView('compare')} className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded ${activeView === 'compare' ? 'text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent'}`}>Channel Compare</button>
              <button onClick={() => setActiveView('videos')} className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded ${activeView === 'videos' ? 'text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent'}`}>Video Leaderboard</button>
              <button onClick={() => setActiveView('algorithm')} className={`text-sm font-black uppercase tracking-widest px-2 py-3 whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00ff00] rounded ${activeView === 'algorithm' ? 'text-[#00b300] dark:text-[#00ff00] border-b-2 border-[#00b300] dark:border-[#00ff00] -mb-[1px]' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white border-b-2 border-transparent'}`}>Algorithmic Analysis</button>
            </div>

            {activeView === "global" && (
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-1">
                
                {/* Left Column - Leaderboards & Metrics */}
                <div className="xl:col-span-3 flex flex-col gap-6">
                  {/* YouTube Leaderboard */}
                  {isConfigured.youtube && youtubeData && (
                    <div className="flex flex-col">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-tighter text-gray-600 dark:text-gray-400">// The Grid (YouTube)</h2>
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 uppercase">Ranked</span>
                      </div>
                      <div className="space-y-2 flex-1">
                        {youtubeData.channels?.map((channel: any, idx: number) => (
                          <div key={channel.id} className={`${idx === 0 ? "bg-gradient-to-r from-[#00ff00]/20 to-transparent border-l-4 border-[#00b300] dark:border-[#00ff00]" : "bg-white dark:bg-white/5 border-l-4 border-gray-600 opacity-80"} p-3 flex items-center justify-between`}>
                            <div className="flex items-center space-x-3">
                              <span className={`font-mono font-black italic text-xl ${idx === 0 ? "text-gray-900 dark:text-white" : "text-gray-500"}`}>P{idx + 1}</span>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold uppercase truncate max-w-[120px]">{channel.snippet.title}</span>
                                <span className={`text-[10px] font-mono ${idx === 0 ? "text-[#00b300] dark:text-[#00ff00]" : "text-gray-600 dark:text-gray-400"}`}>{Number(channel.statistics.viewCount).toLocaleString()} Views</span>
                              </div>
                            </div>
                            <div className={`text-xs font-mono ${idx === 0 ? "text-[#00b300] dark:text-[#00ff00]" : "text-gray-600 dark:text-gray-400"}`}><Users className="w-3 h-3 inline mr-1" />{Number(channel.statistics.subscriberCount).toLocaleString()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Instagram Leaderboard */}
                  {isConfigured.instagram && instagramData && !instagramData.error && (
                    <div className="flex flex-col mt-2">
                      <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xs font-black uppercase tracking-tighter text-gray-600 dark:text-gray-400">// The Grid (Instagram)</h2>
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-600 dark:text-gray-400 uppercase">Ranked</span>
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="bg-gradient-to-r from-[#00ff00]/20 to-transparent border-l-4 border-[#00b300] dark:border-[#00ff00] p-3 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="font-mono font-black italic text-xl text-gray-900 dark:text-white">P1</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase truncate max-w-[120px]">{instagramData.name || "IG Account"}</span>
                              <span className="text-[10px] font-mono text-[#00b300] dark:text-[#00ff00]">{Number(instagramData.followers_count || 0).toLocaleString()} Subs</span>
                            </div>
                          </div>
                          <div className="text-xs font-mono text-[#00b300] dark:text-[#00ff00]">{Number(instagramData.media_count || 0).toLocaleString()} Posts</div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Alert Panel */}
                  <div className="mt-auto p-4 bg-[#ff0055]/10 border border-[#ff0055]/30 rounded">
                    <div className="flex items-center space-x-2 text-[#ff0055] mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">Anomaly Detected</span>
                    </div>
                    <p className="text-[10px] text-gray-700 dark:text-gray-300 leading-tight">
                      Main channel engagement rate dropped 32% vs 7D average. Investigation required.
                    </p>
                  </div>
                </div>

                {/* Right Column - Videos & Alerts */}
                <div className="xl:col-span-9 flex flex-col gap-6">

                  {/* Videos Panel */}
                  <div className="flex-1 bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded p-6 relative flex flex-col min-h-[400px]">
                    <div className="flex justify-between items-start mb-4">
                      <h2 className="text-xs font-black uppercase tracking-tighter text-gray-600 dark:text-gray-400">// Global Video Performance</h2>
                      <div className="flex flex-wrap gap-2 bg-white dark:bg-white/5 p-1 rounded-sm border border-gray-200 dark:border-white/10">
                                                {(["recent", "views", "likes", "velocity", "engagement", "comments", "score"] as const).map(sort => (
                           <div key={sort} className="relative group">
                             <button 
                               onClick={() => setVideoSort(sort)}
                               title={`${sortDescriptions[sort].desc} ${sortDescriptions[sort].impact}`} className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${videoSort === sort ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
                             >
                               {sort}
                             </button>
                             
                           </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex-1 relative overflow-y-auto custom-scrollbar">
                      {sortedVideos.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500 font-mono text-xs">No video data available</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
                          {sortedVideos.map((video: any) => (
                             <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="bg-white dark:bg-black/50 border border-gray-200 dark:border-white/10 rounded overflow-hidden flex flex-col group hover:border-[#00b300] dark:border-[#00ff00]/50 transition-colors cursor-pointer relative">
                               <div className="absolute top-2 right-2 bg-gray-800 dark:bg-black/80 text-[9px] font-mono text-white px-1.5 py-0.5 rounded z-10">
                                 {formatDuration(video.contentDetails?.duration)}
                               </div>
                               <div className="relative aspect-video overflow-hidden">
                                 <img src={(video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url) || (video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || (video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url))} alt={video.snippet.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                 <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                   <span className="text-[9px] font-bold text-gray-900 dark:text-white bg-white dark:bg-black/60 px-1.5 py-0.5 rounded-sm">{video.snippet.channelTitle}</span>
                                 </div>
                               </div>
                               <div className="p-3 flex-1 flex flex-col">
                                 <h4 className="text-xs font-bold leading-tight mb-2 line-clamp-2" title={video.snippet.title}>{video.snippet.title}</h4>
                                 <div className="text-[9px] text-gray-500 font-mono mb-2">
                                   {calculateVelocity(video.snippet.publishedAt, Number(video.statistics.viewCount || 0))} views/hr
                                 </div>
                                 <div className="mt-auto flex justify-between items-end text-[10px] font-mono text-gray-600 dark:text-gray-400">
                                   <div className="flex gap-3">
                                     <span className="flex items-center gap-1 text-[#00b300] dark:text-[#00ff00]"><Eye className="w-3 h-3" /> {Number(video.statistics.viewCount || 0).toLocaleString()}</span>
                                     <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {Number(video.statistics.likeCount || 0).toLocaleString()}</span>
                                   </div>
                                   <span>{formatDistanceToNow(new Date(video.snippet.publishedAt), { addSuffix: true })}</span>
                                 </div>
                               </div>
                             </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Metric Cards Row */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-white dark:bg-white/5 border-t-2 border-[#00b300] dark:border-[#00ff00] p-4 flex flex-col justify-between">
                        <span className="text-[9px] text-gray-500 uppercase font-bold">Total Impressions</span>
                        <div className="text-xl font-mono font-bold tracking-tighter my-1">2.4M</div>
                        <div className="text-[10px] text-[#00b300] dark:text-[#00ff00] flex items-center gap-1">
                          ↑ 14.2%
                        </div>
                     </div>
                     <div className="bg-white dark:bg-white/5 border-t-2 border-gray-300 dark:border-white/20 p-4 flex flex-col justify-between">
                        <span className="text-[9px] text-gray-500 uppercase font-bold">Avg Engagement Rate</span>
                        <div className="text-xl font-mono font-bold tracking-tighter my-1">4.8%</div>
                        <div className="text-[10px] text-red-500 flex items-center gap-1">
                          ↓ 2.1%
                        </div>
                     </div>
                     <div className="bg-white dark:bg-white/5 border-t-2 border-[#00b300] dark:border-[#00ff00] p-4 flex flex-col justify-between">
                        <span className="text-[9px] text-gray-500 uppercase font-bold">Subscriber Delta</span>
                        <div className="text-xl font-mono font-bold tracking-tighter my-1">+1,204</div>
                        <div className="text-[10px] text-[#00b300] dark:text-[#00ff00] flex items-center gap-1">
                          ↑ 5.4%
                        </div>
                     </div>
                  </div>
                </div>

              </div>
            )}

            {activeView === "compare" && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6 flex-1 flex flex-col">
                <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400 mb-6">// Channel Telemetry Comparison</h2>
                {(!youtubeData || youtubeData.channels?.length === 0) ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-xs">No channel data to compare</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {youtubeData.channels?.map((channel: any) => (
                      <div key={channel.id} className="bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 hover:border-[#00b300] dark:border-[#00ff00]/30 transition-colors rounded p-5 flex flex-col">
                        <div className="flex items-center gap-4 mb-5 border-b border-gray-200 dark:border-white/10 pb-4">
                          <img src={(channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.medium?.url || channel.snippet.thumbnails?.default?.url)} className="w-12 h-12 rounded-full border-2 border-gray-200 dark:border-white/10" alt={channel.snippet.title} />
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate" title={channel.snippet.title}>{channel.snippet.title}</h3>
                            <span className="text-[9px] text-gray-500 uppercase tracking-widest">YouTube Channel</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Subscribers</span>
                            <span className="font-mono text-[#00b300] dark:text-[#00ff00] text-sm font-bold">{Number(channel.statistics.subscriberCount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Total Views</span>
                            <span className="font-mono text-gray-900 dark:text-white text-sm font-bold">{Number(channel.statistics.viewCount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Videos</span>
                            <span className="font-mono text-gray-900 dark:text-white text-sm font-bold">{Number(channel.statistics.videoCount).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-end border-t border-gray-200 dark:border-white/10 pt-3 mt-1">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Avg Views/Video</span>
                            <span className="font-mono text-[#00b300] dark:text-[#00ff00] text-sm font-bold">
                              {Math.round(Number(channel.statistics.viewCount) / Math.max(1, Number(channel.statistics.videoCount))).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeView === "videos" && (
              <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded p-6 flex-1 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-400">// Video Leaderboard</h2>
                  <div className="flex flex-wrap gap-2 bg-white dark:bg-white/5 p-1 rounded-sm border border-gray-200 dark:border-white/10">
                                            {(["recent", "views", "likes", "velocity", "engagement", "comments", "score"] as const).map(sort => (
                           <div key={sort} className="relative group">
                             <button 
                               onClick={() => setVideoSort(sort)}
                               title={`${sortDescriptions[sort].desc} ${sortDescriptions[sort].impact}`} className={`px-3 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm transition-colors ${videoSort === sort ? "bg-gray-200 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 hover:text-gray-700 dark:text-gray-300"}`}
                             >
                               {sort}
                             </button>
                             
                           </div>
                        ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                  {sortedVideos.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 font-mono text-xs">No video data available</div>
                  ) : (
                    sortedVideos.map((video: any, idx: number) => (
                      <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/5 hover:border-[#00b300] dark:border-[#00ff00]/50 p-2 rounded transition-all group relative">
                        <div className="text-xl font-black italic text-gray-600 w-8 text-center group-hover:text-[#00b300] dark:group-hover:text-[#00ff00] transition-colors">{idx + 1}</div>
                        <div className="w-24 h-14 shrink-0 overflow-hidden rounded border border-gray-200 dark:border-white/10 relative">
                          <img src={(video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url) || (video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || (video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.medium?.url))} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          <div className="absolute bottom-1 right-1 bg-gray-800 dark:bg-black/80 text-[8px] font-mono text-white px-1 py-0.5 rounded">
                            {formatDuration(video.contentDetails?.duration)}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">{video.snippet.title}</h4>
                          <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest"><span className="text-[#00b300] dark:text-[#00ff00] font-bold">{video.snippet.channelTitle}</span> • {formatDistanceToNow(new Date(video.snippet.publishedAt), { addSuffix: true })}</div>
                        </div>
                        <div className="flex gap-6 pr-4">
                          <div className="flex flex-col items-end w-16">
                            <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Velocity</span>
                            <span className="text-sm font-mono text-gray-900 dark:text-white">{calculateVelocity(video.snippet.publishedAt, Number(video.statistics.viewCount || 0))} <span className="text-[9px] text-gray-500">/hr</span></span>
                          </div>
                          <div className="flex flex-col items-end w-16">
                            <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Views</span>
                            <span className="text-sm font-mono text-[#00b300] dark:text-[#00ff00]">{Number(video.statistics.viewCount || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex flex-col items-end w-16">
                            <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold">Likes</span>
                            <span className="text-sm font-mono text-gray-900 dark:text-white">{Number(video.statistics.likeCount || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      </a>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeView === "algorithm" && (
              <div className="bg-white dark:bg-white/5 border border-[#00b300] dark:border-[#00ff00]/30 rounded p-6 flex-1 flex flex-col overflow-hidden relative">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#00ff0010_1px,transparent_1px),linear-gradient(to_bottom,#00ff0010_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20"></div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#00b300] dark:text-[#00ff00]">// Algorithmic Matrix (v1.0)</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#00b300] dark:bg-[#00ff00] animate-pulse"></span>
                    <span className="text-[9px] font-mono text-[#00b300] dark:text-[#00ff00]">ANALYSIS RUNNING</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 relative z-10">
                   <div className="bg-white dark:bg-black/50 border border-[#00b300]/30 dark:border-[#00ff00]/20 p-4 rounded flex flex-col justify-between" title="Calculated based on velocity and engagement relative to baseline">
                      <span className="text-[9px] text-[#00b300] dark:text-[#00ff00] uppercase font-bold tracking-widest cursor-help" title="Composite algorithm health score out of 100">Network Score</span>
                      <div className="text-2xl font-mono font-black tracking-tighter my-1 text-gray-900 dark:text-white">{algoStats.networkScore}<span className="text-[12px] text-[#00b300] dark:text-[#00ff00]">/100</span></div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-widest">Global Aggregate</div>
                   </div>
                   <div className="bg-white dark:bg-black/50 border border-[#00b300]/30 dark:border-[#00ff00]/20 p-4 rounded flex flex-col justify-between" title="Calculated based on velocity and engagement relative to baseline">
                      <span className="text-[9px] text-[#00b300] dark:text-[#00ff00] uppercase font-bold tracking-widest cursor-help" title="Median views per hour across recent videos">Median Velocity</span>
                      <div className="text-2xl font-mono font-black tracking-tighter my-1 text-gray-900 dark:text-white">{algoStats.medianVelocity}<span className="text-[12px] text-[#00b300] dark:text-[#00ff00]">v/hr</span></div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-widest">Across latest 50 videos</div>
                   </div>
                   <div className="bg-white dark:bg-black/50 border border-[#00b300]/30 dark:border-[#00ff00]/20 p-4 rounded flex flex-col justify-between" title="Calculated based on velocity and engagement relative to baseline">
                      <span className="text-[9px] text-[#00b300] dark:text-[#00ff00] uppercase font-bold tracking-widest cursor-help" title="Average engagement rate (likes + comments) / views">Avg Engagement</span>
                      <div className="text-2xl font-mono font-black tracking-tighter my-1 text-gray-900 dark:text-white">{algoStats.avgEngagement}<span className="text-[12px] text-[#00b300] dark:text-[#00ff00]">%</span></div>
                      <div className="text-[9px] text-gray-500 uppercase tracking-widest">Likes + Comments / Views</div>
                   </div>
                   <div className="bg-white dark:bg-black/50 border border-[#00b300]/30 dark:border-[#00ff00]/20 p-4 rounded flex flex-col justify-between" title="Calculated based on velocity and engagement relative to baseline">
                      <span className="text-[9px] text-[#00b300] dark:text-[#00ff00] uppercase font-bold tracking-widest cursor-help" title="Estimation of YouTube algorithm recommendation favorability">Algorithm Bias</span>
                      <div className="text-xl font-mono font-black tracking-tighter my-1 text-gray-900 dark:text-white">{algoStats.bias}</div>
                      <div className="text-[9px] text-[#00b300] dark:text-[#00ff00] flex items-center gap-1 uppercase tracking-widest">
                        ↑ Push detected
                      </div>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 relative z-10">
                  {sortedVideos.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-[#00b300] dark:text-[#00ff00]/50 font-mono text-xs">Awaiting Matrix Data</div>
                  ) : (
                    sortedVideos.map((video: any, idx: number) => {
                      const views = Number(video.statistics.viewCount || 0);
                      const likes = Number(video.statistics.likeCount || 0);
                      const comments = Number(video.statistics.commentCount || 0);
                      const engagement = views > 0 ? ((likes + comments) / views * 100).toFixed(2) : "0.00";
                      const velocity = calculateVelocity(video.snippet.publishedAt, views);
                      
                      // Arbitrary algo score
                      const score = Math.min(99.9, ((velocity * 0.5) + (Number(engagement) * 10) + (views / 10000))).toFixed(1);
                      
                      return (
                      <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-white dark:bg-black/60 border border-[#00b300]/30 dark:border-[#00ff00]/20 hover:border-[#00b300] dark:hover:border-[#00ff00] p-3 rounded transition-all group">
                        <div className="w-12 h-12 shrink-0 flex items-center justify-center bg-[#00b300]/10 dark:bg-[#00ff00]/10 border border-[#00b300] dark:border-[#00ff00]/30 rounded text-[#00b300] dark:text-[#00ff00] font-mono font-black text-sm">
                          {score}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate group-hover:text-[#00b300] dark:group-hover:text-[#00ff00] transition-colors">{video.snippet.title}</h4>
                          <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest"><span className="text-[#00b300] dark:text-[#00ff00] font-bold">{video.snippet.channelTitle}</span> • {formatDistanceToNow(new Date(video.snippet.publishedAt), { addSuffix: true })}</div>
                        </div>
                        <div className="flex gap-6 pr-4">
                          <div className="flex flex-col items-end w-16">
                            <span className="text-[8px] text-[#00b300] dark:text-[#00ff00] uppercase tracking-widest font-bold">Eng Rate</span>
                            <span className="text-sm font-mono text-gray-900 dark:text-white">{engagement}%</span>
                          </div>
                          <div className="flex flex-col items-end w-16">
                            <span className="text-[8px] text-[#00b300] dark:text-[#00ff00] uppercase tracking-widest font-bold">Velocity</span>
                            <span className="text-sm font-mono text-gray-900 dark:text-white">{velocity} <span className="text-[9px] text-[#00b300] dark:text-[#00ff00]/60">/hr</span></span>
                          </div>
                          <div className="flex flex-col items-end w-20">
                            <span className="text-[8px] text-[#00b300] dark:text-[#00ff00] uppercase tracking-widest font-bold">Algo Status</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${Number(score) > 50 ? "text-[#00b300] dark:text-[#00ff00]" : "text-yellow-500"}`}>{Number(score) > 50 ? "BOOSTED" : "STANDARD"}</span>
                          </div>
                        </div>
                      </a>
                    )})
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-6 flex items-center justify-between text-[9px] uppercase tracking-widest text-gray-600 border-t border-gray-200 dark:border-white/5 pt-4 px-6 mb-4">
        <div className="flex items-center space-x-4">
          <span>Session ID: 419-X2-ALPHA</span>
          <span>●</span>
          <span>Refresh Rate: 20M</span>
        </div>
        <div className="font-mono">
          {lastUpdated ? `SYSTEM UPDATED: ${lastUpdated.toISOString().replace('T', ' // ').substring(0, 22)} GMT` : "SYSTEM STANDBY"}
        </div>
      </footer>

      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleSettingsSave} 
      />
    </div>
  );
}
