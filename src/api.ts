import { DashboardKeys, YouTubeStats, InstagramStats } from "./types";

function getHeaders(keys?: DashboardKeys): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (keys) {
    if (keys.youtubeKey) headers["x-youtube-key"] = keys.youtubeKey;
    if (keys.youtubeChannels?.length) headers["x-youtube-channels"] = JSON.stringify(keys.youtubeChannels);
    if (keys.instagramKey) headers["x-instagram-key"] = keys.instagramKey;
    if (keys.instagramAccounts?.length) headers["x-instagram-accounts"] = JSON.stringify(keys.instagramAccounts);
  } else {
    // Attempt to load from localStorage if not passed
    const ytKey = localStorage.getItem("f1_youtubeKey");
    const ytChannels = localStorage.getItem("f1_youtubeChannels");
    const igKey = localStorage.getItem("f1_instagramKey");
    const igAccounts = localStorage.getItem("f1_instagramAccounts");
    
    if (ytKey) headers["x-youtube-key"] = ytKey;
    if (ytChannels) headers["x-youtube-channels"] = ytChannels;
    if (igKey) headers["x-instagram-key"] = igKey;
    if (igAccounts) headers["x-instagram-accounts"] = igAccounts;
  }
  return headers;
}

export async function checkStatus(keys?: DashboardKeys) {
  const res = await fetch("/api/status", { headers: getHeaders(keys) });
  if (!res.ok) throw new Error("Failed to check status");
  return res.json();
}

export async function fetchYouTubeData(keys?: DashboardKeys) {
  const res = await fetch("/api/youtube", { headers: getHeaders(keys) });
  if (!res.ok) {
    if (res.status === 400) throw new Error("Configuration missing");
    throw new Error("YouTube API Error");
  }
  return res.json();
}

export async function fetchInstagramData(keys?: DashboardKeys) {
  const res = await fetch("/api/instagram", { headers: getHeaders(keys) });
  if (!res.ok) {
    if (res.status === 400) throw new Error("Configuration missing");
    throw new Error("Instagram API Error");
  }
  return res.json();
}
