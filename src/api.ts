import { DashboardKeys, YouTubeStats, InstagramStats } from "./types";

function getKeysFromStorage(): DashboardKeys {
  const keys: DashboardKeys = {
    youtubeKey: "",
    youtubeChannels: [],
    instagramKey: "",
    instagramAccounts: [],
  };

  try {
    const ytKey = localStorage.getItem("f1_youtubeKey");
    const ytChannels = localStorage.getItem("f1_youtubeChannels");
    const igKey = localStorage.getItem("f1_instagramKey");
    const igAccounts = localStorage.getItem("f1_instagramAccounts");
    const displayStr = localStorage.getItem("f1_displayConfig");

    if (ytKey) keys.youtubeKey = ytKey;
    if (ytChannels) keys.youtubeChannels = JSON.parse(ytChannels);
    if (igKey) keys.instagramKey = igKey;
    if (igAccounts) keys.instagramAccounts = JSON.parse(igAccounts);
    if (displayStr) keys.display = JSON.parse(displayStr);
  } catch (e) {
    // Ignore parse errors
  }

  return keys;
}

export async function checkStatus(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  
  return {
    configured: {
      youtube: !!(keys.youtubeKey && keys.youtubeChannels && keys.youtubeChannels.length > 0),
      instagram: !!(keys.instagramKey && keys.instagramAccounts && keys.instagramAccounts.length > 0),
    }
  };
}

export async function fetchYouTubeData(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();

  if (!keys.youtubeKey || !keys.youtubeChannels || keys.youtubeChannels.length === 0) {
    throw new Error("Configuration missing");
  }

  const channelIds = keys.youtubeChannels.map((c: any) => c.channel_id).join(",");
  
  const channelsRes = await fetch(
    `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics,contentDetails&id=${channelIds}&key=${keys.youtubeKey}`
  );

  if (!channelsRes.ok) {
    throw new Error(`YouTube API Error: ${channelsRes.statusText}`);
  }
  
  const channelsData = await channelsRes.json();
  const uploadsPlaylists = channelsData.items?.map((item: any) => item.contentDetails?.relatedPlaylists?.uploads).filter(Boolean) || [];
  
  let videoLimit = keys.display?.videoLimit || 50;
  let videoIds: string[] = [];

  await Promise.all(uploadsPlaylists.map(async (playlistId: string) => {
    let nextPageToken = "";
    let fetchedCount = 0;
    
    while (fetchedCount < videoLimit) {
      const fetchCount = Math.min(50, videoLimit - fetchedCount);
      const pageTokenParam = nextPageToken ? `&pageToken=${nextPageToken}` : "";
      
      const playlistRes = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=${fetchCount}&playlistId=${playlistId}&key=${keys.youtubeKey}${pageTokenParam}`
      );
      
      if (!playlistRes.ok) break;
      
      const playlistData = await playlistRes.json();
      const ids = playlistData.items?.map((item: any) => item.contentDetails?.videoId).filter(Boolean) || [];
      videoIds = videoIds.concat(ids);
      fetchedCount += ids.length;
      
      nextPageToken = playlistData.nextPageToken;
      if (!nextPageToken) break;
    }
  }));

  let videosData = { items: [] as any[] };
  if (videoIds.length > 0) {
    const chunkedIds = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      chunkedIds.push(videoIds.slice(i, i + 50));
    }
    
    for (const chunk of chunkedIds) {
      const videosRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${chunk.join(',')}&key=${keys.youtubeKey}`
      );
      if (videosRes.ok) {
        const vData = await videosRes.json();
        videosData.items = videosData.items.concat(vData.items || []);
      }
    }
  }

  return {
    channels: channelsData.items || [],
    videos: videosData.items || []
  };
}

export async function fetchInstagramData(providedKeys?: DashboardKeys) {
  const keys = providedKeys || getKeysFromStorage();
  
  if (!keys.instagramKey || !keys.instagramAccounts || keys.instagramAccounts.length === 0) {
    throw new Error("Configuration missing");
  }

  const accountId = keys.instagramAccounts[0].business_account_id;
  const response = await fetch(
    `https://graph.facebook.com/v19.0/${accountId}?fields=followers_count,media_count,name,profile_picture_url&access_token=${keys.instagramKey}`
  );
  
  if (!response.ok) {
    throw new Error(`Instagram API Error: ${response.statusText}`);
  }
  
  return await response.json();
}
