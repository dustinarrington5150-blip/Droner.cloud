import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import type { Channel, UserState, VideoItem } from '../types';
import { formatCompactNumber } from '../lib/format';
import { MonochromeImage } from './MonochromeImage';
import { VideoCard } from './VideoCard';
import { ShortCard } from './ShortCard';

interface ChannelViewProps {
  channel: Channel;
  videos: VideoItem[];
  channelsById: Map<string, Channel>;
  userState: UserState;
  onToggleSubscribe: (channelId: string) => void;
  onWatchVideo: (videoId: string) => void;
  onOpenShort: (shortId: string) => void;
  onOpenChannel: (channelId: string) => void;
  onOpenUpload: () => void;
  onUpdatePilotProfile: (data: {
    name: string;
    handle: string;
    primaryRig: string;
    location: string;
    bio: string;
  }) => Promise<void>;
}

export function ChannelView({
  channel,
  videos,
  channelsById,
  userState,
  onToggleSubscribe,
  onWatchVideo,
  onOpenShort,
  onOpenChannel,
  onOpenUpload,
  onUpdatePilotProfile,
}: ChannelViewProps) {
  const [activeTab, setActiveTab] = useState<'videos' | 'shorts' | 'about'>('videos');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(channel.name);
  const [handle, setHandle] = useState(channel.handle);
  const [primaryRig, setPrimaryRig] = useState(channel.primaryRig);
  const [location, setLocation] = useState(channel.location);
  const [bio, setBio] = useState(channel.bio);
  const [saving, setSaving] = useState(false);

  const isOwnChannel = channel.id === userState.pilotChannelId;
  const isSubscribed = userState.subscribedChannelIds.includes(channel.id);

  const channelVideos = videos.filter((v) => v.channelId === channel.id && v.type === 'video');
  const channelShorts = videos.filter((v) => v.channelId === channel.id && v.type === 'short');
  const totalViews = videos
    .filter((v) => v.channelId === channel.id)
    .reduce((sum, v) => sum + v.views, 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdatePilotProfile({ name, handle, primaryRig, location, bio });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 pb-16">
      {/* Banner */}
      <div className="mt-4 h-36 sm:h-52 w-full rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <MonochromeImage
          src={channel.bannerUrl}
          alt={`${channel.name} aerial banner`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Pilot Header */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 shrink-0">
            <MonochromeImage
              src={channel.avatarUrl}
              alt={channel.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-neutral-950 dark:text-white tracking-tight">
              {channel.name}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600 dark:text-neutral-400 tabular-nums">
              <span className="font-mono text-xs">{channel.handle}</span>
              <span aria-hidden="true">·</span>
              <span>{formatCompactNumber(channel.subscribers)} subscribers</span>
              <span aria-hidden="true">·</span>
              <span>
                {channelVideos.length + channelShorts.length} flights
              </span>
            </div>
            <p className="mt-1.5 text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl line-clamp-2">
              {channel.bio}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {isOwnChannel ? (
            <>
              <button
                type="button"
                onClick={onOpenUpload}
                className="h-9 px-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Upload flight
              </button>
              <button
                type="button"
                onClick={() => {
                  setName(channel.name);
                  setHandle(channel.handle);
                  setPrimaryRig(channel.primaryRig);
                  setLocation(channel.location);
                  setBio(channel.bio);
                  setEditing((prev) => !prev);
                }}
                className="h-9 px-4 rounded-full border border-neutral-300 dark:border-neutral-700 text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-900 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit profile</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onToggleSubscribe(channel.id)}
              className={`h-10 px-5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                isSubscribed
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-950 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700'
                  : 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          )}
        </div>
      </div>

      {/* Inline Profile Editor */}
      {editing && isOwnChannel && (
        <form
          onSubmit={handleSaveProfile}
          className="mt-5 p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#121212] grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Pilot / Channel Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Handle
            </label>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
              className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm font-mono text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Primary Drone Rig
            </label>
            <input
              type="text"
              value={primaryRig}
              onChange={(e) => setPrimaryRig(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Home Airspace
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
              Bio
            </label>
            <textarea
              rows={2}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full p-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-9 px-4 rounded-full text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-sm font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save profile'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Channel Tabs */}
      <div className="mt-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-6">
        {(
          [
            { id: 'videos', label: `Videos (${channelVideos.length})` },
            { id: 'shorts', label: `Shorts (${channelShorts.length})` },
            { id: 'about', label: 'Gear & Info' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'border-neutral-950 dark:border-white text-neutral-950 dark:text-white'
                : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'videos' &&
          (channelVideos.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                No horizontal flight videos on this channel yet.
              </p>
              {isOwnChannel && (
                <button
                  type="button"
                  onClick={onOpenUpload}
                  className="mt-4 h-9 px-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black text-sm font-semibold cursor-pointer"
                >
                  Upload your first flight
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {channelVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  channel={channelsById.get(video.channelId)}
                  onWatch={onWatchVideo}
                  onOpenChannel={onOpenChannel}
                />
              ))}
            </div>
          ))}

        {activeTab === 'shorts' &&
          (channelShorts.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                No vertical shorts uploaded on this channel yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {channelShorts.map((short) => (
                <ShortCard key={short.id} short={short} onOpenShort={onOpenShort} />
              ))}
            </div>
          ))}

        {activeTab === 'about' && (
          <div className="max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-6 py-2">
            <div>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Primary Rig
              </span>
              <p className="mt-1 text-sm font-medium text-neutral-950 dark:text-white">
                {channel.primaryRig}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Airspace
              </span>
              <p className="mt-1 text-sm font-medium text-neutral-950 dark:text-white">
                {channel.location}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Total Channel Views
              </span>
              <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-neutral-950 dark:text-white">
                {totalViews.toLocaleString()} views
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                Color Standard
              </span>
              <p className="mt-1 text-sm font-medium text-neutral-950 dark:text-white">
                Silver Halide Monochrome
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
