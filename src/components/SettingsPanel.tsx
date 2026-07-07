import React, { useState, useEffect } from "react";
import { Settings, X, Save, Plus, Trash2, Unplug, HelpCircle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import type { DashboardKeys, YouTubeChannelConfig, InstagramAccountConfig } from "../types";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: DashboardKeys) => void;
}

export function SettingsPanel({ isOpen, onClose, onSave }: SettingsPanelProps) {
  const [youtubeKey, setYoutubeKey] = useState("");
  const [youtubeChannels, setYoutubeChannels] = useState<YouTubeChannelConfig[]>([]);
  const [instagramKey, setInstagramKey] = useState("");
  const [instagramAccounts, setInstagramAccounts] = useState<InstagramAccountConfig[]>([]);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setYoutubeKey(localStorage.getItem("f1_youtubeKey") || "");
      try {
        const yt = localStorage.getItem("f1_youtubeChannels");
        setYoutubeChannels(yt ? JSON.parse(yt) : []);
      } catch (e) { setYoutubeChannels([]); }

      setInstagramKey(localStorage.getItem("f1_instagramKey") || "");
      try {
        const ig = localStorage.getItem("f1_instagramAccounts");
        setInstagramAccounts(ig ? JSON.parse(ig) : []);
      } catch (e) { setInstagramAccounts([]); }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const ytChannelsString = JSON.stringify(youtubeChannels);
    const igAccountsString = JSON.stringify(instagramAccounts);

    localStorage.setItem("f1_youtubeKey", youtubeKey);
    localStorage.setItem("f1_youtubeChannels", ytChannelsString);
    localStorage.setItem("f1_instagramKey", instagramKey);
    localStorage.setItem("f1_instagramAccounts", igAccountsString);

    onSave({
      youtubeKey,
      youtubeChannels,
      instagramKey,
      instagramAccounts,
    });
    onClose();
  };

  const handleDisconnectYouTube = () => {
    setYoutubeKey("");
    setYoutubeChannels([]);
  };

  const handleDisconnectInstagram = () => {
    setInstagramKey("");
    setInstagramAccounts([]);
  };

  const addYouTubeChannel = () => {
    setYoutubeChannels([...youtubeChannels, { channel_id: "", name: "" }]);
  };

  const updateYouTubeChannel = (index: number, field: keyof YouTubeChannelConfig, value: string) => {
    const newChannels = [...youtubeChannels];
    newChannels[index] = { ...newChannels[index], [field]: value };
    setYoutubeChannels(newChannels);
  };

  const removeYouTubeChannel = (index: number) => {
    setYoutubeChannels(youtubeChannels.filter((_, i) => i !== index));
  };

  const addInstagramAccount = () => {
    setInstagramAccounts([...instagramAccounts, { handle: "", business_account_id: "" }]);
  };

  const updateInstagramAccount = (index: number, field: keyof InstagramAccountConfig, value: string) => {
    const newAccounts = [...instagramAccounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setInstagramAccounts(newAccounts);
  };

  const removeInstagramAccount = (index: number) => {
    setInstagramAccounts(instagramAccounts.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-sm w-full max-w-3xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2 text-white">
            <Settings className="w-4 h-4 text-[#00ff00]" />
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Connection Dashboard</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* How-to Guide */}
          <div className="bg-white/5 border border-white/10 rounded-sm overflow-hidden">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 text-gray-300">
                <HelpCircle className="w-4 h-4 text-[#00ff00]" />
                <span className="text-xs font-bold uppercase tracking-widest">Configuration Guide</span>
              </div>
              {showGuide ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>
            
            {showGuide && (
              <div className="p-4 space-y-4 text-xs font-mono text-gray-400 border-t border-white/10">
                <div className="space-y-2">
                  <h4 className="font-bold text-white uppercase font-sans text-[10px] tracking-widest">YouTube API Setup</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-[#00ff00] hover:underline">Google Cloud Console</a>.</li>
                    <li>Create a new project and enable the <strong>YouTube Data API v3</strong>.</li>
                    <li>Go to <strong>Credentials</strong>, click <strong>Create Credentials &gt; API Key</strong>.</li>
                    <li>To find your Channel ID: Go to your YouTube channel, right-click, select "View Page Source", and search for <code className="bg-black/50 px-1 rounded text-gray-300">data-channel-external-id</code>.</li>
                  </ol>
                </div>
                <div className="space-y-2 border-t border-white/10 pt-4">
                  <h4 className="font-bold text-white uppercase font-sans text-[10px] tracking-widest">Instagram API Setup</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>You need an Instagram <strong>Business</strong> or <strong>Creator</strong> account linked to a Facebook Page.</li>
                    <li>Go to <a href="https://developers.facebook.com/" target="_blank" rel="noreferrer" className="text-[#ff0055] hover:underline">Meta for Developers</a> and create an app.</li>
                    <li>Add the <strong>Instagram Graph API</strong> product to your app.</li>
                    <li>Use the Graph API Explorer to generate a User Access Token with <code className="bg-black/50 px-1 rounded text-gray-300">instagram_basic</code> and <code className="bg-black/50 px-1 rounded text-gray-300">instagram_manage_insights</code> permissions.</li>
                    <li>To find your Business Account ID: Make a request to <code className="bg-black/50 px-1 rounded text-gray-300">/me/accounts?fields=instagram_business_account</code>.</li>
                  </ol>
                </div>
              </div>
            )}
          </div>

          {/* YouTube Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-[#00ff00] font-mono text-sm uppercase tracking-wider font-bold">YouTube API Connection</h3>
              {youtubeKey && (
                <button onClick={handleDisconnectYouTube} className="text-xs font-bold text-gray-500 hover:text-red-500 uppercase flex items-center gap-1 transition-colors">
                  <Unplug className="w-3 h-3" /> Disconnect
                </button>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-widest">API Key</label>
              <input
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white font-mono text-sm focus:border-[#00ff00] focus:outline-none focus:ring-1 focus:ring-[#00ff00] transition-all"
                value={youtubeKey}
                onChange={(e) => setYoutubeKey(e.target.value)}
                placeholder="AIzaSy..."
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2 mt-4">
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-widest">Tracked Channels</label>
                <button onClick={addYouTubeChannel} className="text-[10px] font-bold text-[#00ff00] uppercase flex items-center gap-1 hover:opacity-80">
                  <Plus className="w-3 h-3" /> Add Channel
                </button>
              </div>
              {youtubeChannels.length === 0 ? (
                <div className="text-center p-4 border border-dashed border-white/10 rounded-sm text-gray-500 text-xs font-mono">
                  No channels configured. Add one to track its performance.
                </div>
              ) : (
                <div className="space-y-2">
                  {youtubeChannels.map((channel, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-white/5 p-2 rounded-sm border border-white/10">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-white/20 px-2 py-1 text-white font-mono text-sm focus:border-[#00ff00] focus:outline-none transition-all placeholder:text-gray-600"
                          value={channel.name}
                          onChange={(e) => updateYouTubeChannel(idx, "name", e.target.value)}
                          placeholder="Display Name (e.g., Main Channel)"
                        />
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-white/20 px-2 py-1 text-white font-mono text-sm focus:border-[#00ff00] focus:outline-none transition-all placeholder:text-gray-600"
                          value={channel.channel_id}
                          onChange={(e) => updateYouTubeChannel(idx, "channel_id", e.target.value)}
                          placeholder="Channel ID (e.g., UCkRf...)"
                        />
                      </div>
                      <button onClick={() => removeYouTubeChannel(idx)} className="p-2 text-gray-500 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Instagram Section */}
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-[#ff0055] font-mono text-sm uppercase tracking-wider font-bold">Instagram Graph API Connection</h3>
              {instagramKey && (
                <button onClick={handleDisconnectInstagram} className="text-xs font-bold text-gray-500 hover:text-red-500 uppercase flex items-center gap-1 transition-colors">
                  <Unplug className="w-3 h-3" /> Disconnect
                </button>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1 tracking-widest">Access Token</label>
              <input
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-white font-mono text-sm focus:border-[#ff0055] focus:outline-none focus:ring-1 focus:ring-[#ff0055] transition-all"
                value={instagramKey}
                onChange={(e) => setInstagramKey(e.target.value)}
                placeholder="EAABsbCS1..."
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2 mt-4">
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-widest">Tracked Accounts</label>
                <button onClick={addInstagramAccount} className="text-[10px] font-bold text-[#ff0055] uppercase flex items-center gap-1 hover:opacity-80">
                  <Plus className="w-3 h-3" /> Add Account
                </button>
              </div>
              {instagramAccounts.length === 0 ? (
                <div className="text-center p-4 border border-dashed border-white/10 rounded-sm text-gray-500 text-xs font-mono">
                  No accounts configured. Add one to track its performance.
                </div>
              ) : (
                <div className="space-y-2">
                  {instagramAccounts.map((account, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-white/5 p-2 rounded-sm border border-white/10">
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-white/20 px-2 py-1 text-white font-mono text-sm focus:border-[#ff0055] focus:outline-none transition-all placeholder:text-gray-600"
                          value={account.handle}
                          onChange={(e) => updateInstagramAccount(idx, "handle", e.target.value)}
                          placeholder="Handle (e.g., @your.ig)"
                        />
                        <input
                          type="text"
                          className="w-full bg-transparent border-b border-white/20 px-2 py-1 text-white font-mono text-sm focus:border-[#ff0055] focus:outline-none transition-all placeholder:text-gray-600"
                          value={account.business_account_id}
                          onChange={(e) => updateInstagramAccount(idx, "business_account_id", e.target.value)}
                          placeholder="Business Account ID (e.g., 12345)"
                        />
                      </div>
                      <button onClick={() => removeInstagramAccount(idx)} className="p-2 text-gray-500 hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-sm text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-sm text-xs font-black uppercase tracking-widest bg-white text-black hover:bg-gray-200 transition-colors flex items-center gap-2"
          >
            <Save className="w-3 h-3" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
