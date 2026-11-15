import { useCallback, useEffect, useMemo, useState } from 'react';
import { Film, Search } from 'lucide-react';
import type { ActiveRoute, Channel, CommentItem, LibraryResponse, UserState, VideoItem } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { VideoCard } from './components/VideoCard';
import { ShortCard } from './components/ShortCard';
import { WatchView } from './components/WatchView';
import { ShortsView } from './components/ShortsView';
import { ChannelView } from './components/ChannelView';
import { UploadModal } from './components/UploadModal';

const CATEGORY_FILTERS = [
  'All',
  'FPV Freestyle',
  'Cinematic Aerial',
  'Alpine & Ridge',
  'Urban Architecture',
  'Cinewhoop',
  'Long Range',
  'Night & Fog',
];

export default function App() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [userState, setUserState] = useState<UserState>({
    pilotChannelId: 'ch_guest_pilot',
    subscribedChannelIds: [],
    likedVideoIds: [],
    dislikedVideoIds: [],
    savedVideoIds: [],
    historyVideoIds: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isDark, setIsDark] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeRoute, setActiveRoute] = useState<ActiveRoute>({ view: 'home' });
  const [uploadOpen, setUploadOpen] = useState(false);

  // Sync Tailwind dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Initial load from Express backend
  useEffect(() => {
    let active = true;
    fetch('/api/library')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load Droner.cloud library.');
        return res.json() as Promise<LibraryResponse>;
      })
      .then((data) => {
        if (!active) return;
        setVideos(data.videos);
        setChannels(data.channels);
        setUserState(data.userState);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Could not reach server.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const channelsById = useMemo(() => {
    const map = new Map<string, Channel>();
    for (const c of channels) map.set(c.id, c);
    return map;
  }, [channels]);

  const pilotChannel = channelsById.get(userState.pilotChannelId);

  const subscribedChannels = useMemo(
    () => channels.filter((c) => userState.subscribedChannelIds.includes(c.id)),
    [channels, userState.subscribedChannelIds],
  );

  const recordView = useCallback(async (videoId: string) => {
    try {
      const res = await fetch(`/api/videos/${videoId}/view`, { method: 'POST' });
      if (!res.ok) return;
      const data = (await res.json()) as { views: number; historyVideoIds: string[] };
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, views: data.views } : v)),
      );
      setUserState((prev) => ({ ...prev, historyVideoIds: data.historyVideoIds }));
    } catch {
      // Non-blocking view tally
    }
  }, []);

  const handleWatchVideo = useCallback(
    (videoId: string) => {
      setActiveRoute({ view: 'watch', videoId });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      recordView(videoId);
    },
    [recordView],
  );

  const handleOpenShort = useCallback((shortId: string) => {
    setActiveRoute({ view: 'shorts', shortId });
    window.scrollTo({ top: 0 });
  }, []);

  const handleReact = useCallback(async (videoId: string, action: 'like' | 'dislike') => {
    const res = await fetch(`/api/videos/${videoId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as {
      likes: number;
      dislikes: number;
      userState: UserState;
    };
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId ? { ...v, likes: data.likes, dislikes: data.dislikes } : v,
      ),
    );
    setUserState(data.userState);
  }, []);

  const handleToggleSave = useCallback(async (videoId: string) => {
    const res = await fetch(`/api/videos/${videoId}/save`, { method: 'POST' });
    if (!res.ok) return;
    const data = (await res.json()) as { savedVideoIds: string[] };
    setUserState((prev) => ({ ...prev, savedVideoIds: data.savedVideoIds }));
  }, []);

  const handleToggleSubscribe = useCallback(async (channelId: string) => {
    const res = await fetch(`/api/channels/${channelId}/subscribe`, { method: 'POST' });
    if (!res.ok) return;
    const data = (await res.json()) as {
      subscribers: number;
      subscribedChannelIds: string[];
    };
    setChannels((prev) =>
      prev.map((c) =>
        c.id === channelId ? { ...c, subscribers: data.subscribers } : c,
      ),
    );
    setUserState((prev) => ({
      ...prev,
      subscribedChannelIds: data.subscribedChannelIds,
    }));
  }, []);

  const handleAddComment = useCallback(async (videoId: string, text: string) => {
    const res = await fetch(`/api/videos/${videoId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const created = (await res.json()) as CommentItem;
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId ? { ...v, comments: [created, ...v.comments] } : v,
      ),
    );
  }, []);

  const handleLikeComment = useCallback(async (videoId: string, commentId: string) => {
    const res = await fetch(`/api/videos/${videoId}/comments/${commentId}/like`, {
      method: 'POST',
    });
    if (!res.ok) return;
    const updated = (await res.json()) as CommentItem;
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? {
              ...v,
              comments: v.comments.map((c) => (c.id === commentId ? updated : c)),
            }
          : v,
      ),
    );
  }, []);

  const handleDeleteVideo = useCallback(async (videoId: string) => {
    const res = await fetch(`/api/videos/${videoId}`, { method: 'DELETE' });
    if (!res.ok) return;
    const data = (await res.json()) as { deletedId: string; userState: UserState };
    setVideos((prev) => prev.filter((v) => v.id !== data.deletedId));
    setUserState(data.userState);
    setActiveRoute({ view: 'home' });
  }, []);

  const handleUpdatePilotProfile = useCallback(
    async (payload: {
      name: string;
      handle: string;
      primaryRig: string;
      location: string;
      bio: string;
    }) => {
      const res = await fetch('/api/pilot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) return;
      const updated = (await res.json()) as Channel;
      setChannels((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    },
    [],
  );

  // Filtered datasets
  const matchesSearchAndCategory = useCallback(
    (v: VideoItem) => {
      const q = searchQuery.trim().toLowerCase();
      if (selectedCategory !== 'All' && v.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const ch = channelsById.get(v.channelId);
      return (
        v.title.toLowerCase().includes(q) ||
        v.airframe.toLowerCase().includes(q) ||
        v.location.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q) ||
        (ch?.name.toLowerCase().includes(q) ?? false) ||
        (ch?.handle.toLowerCase().includes(q) ?? false)
      );
    },
    [searchQuery, selectedCategory, channelsById],
  );

  const allShorts = useMemo(() => videos.filter((v) => v.type === 'short'), [videos]);
  const filteredVideos = useMemo(
    () => videos.filter((v) => v.type === 'video' && matchesSearchAndCategory(v)),
    [videos, matchesSearchAndCategory],
  );
  const filteredShorts = useMemo(
    () => allShorts.filter(matchesSearchAndCategory),
    [allShorts, matchesSearchAndCategory],
  );

  const renderFeedPage = () => {
    if (activeRoute.view === 'subscriptions') {
      const subVideos = videos.filter((v) =>
        userState.subscribedChannelIds.includes(v.channelId),
      );
      return (
        <div className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto">
          <h1 className="font-display text-xl font-bold text-neutral-950 dark:text-white mb-5">
            Subscriptions
          </h1>
          {subVideos.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl">
              <p className="text-sm text-neutral-500">
                Subscribe to drone pilots to see their latest flights here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {subVideos.map((v) =>
                v.type === 'short' ? (
                  <ShortCard key={v.id} short={v} onOpenShort={handleOpenShort} />
                ) : (
                  <VideoCard
                    key={v.id}
                    video={v}
                    channel={channelsById.get(v.channelId)}
                    onWatch={handleWatchVideo}
                    onOpenChannel={(cid) => setActiveRoute({ view: 'channel', channelId: cid })}
                  />
                ),
              )}
            </div>
          )}
        </div>
      );
    }

    if (activeRoute.view === 'history' || activeRoute.view === 'liked' || activeRoute.view === 'saved') {
      const idList =
        activeRoute.view === 'history'
          ? userState.historyVideoIds
          : activeRoute.view === 'liked'
            ? userState.likedVideoIds
            : userState.savedVideoIds;
      const heading =
        activeRoute.view === 'history'
          ? 'Flight History'
          : activeRoute.view === 'liked'
            ? 'Liked Flights'
            : 'Watch Later';

      const items = idList
        .map((id) => videos.find((v) => v.id === id))
        .filter((v): v is VideoItem => Boolean(v));

      return (
        <div className="px-4 sm:px-6 py-6 max-w-[1600px] mx-auto">
          <h1 className="font-display text-xl font-bold text-neutral-950 dark:text-white mb-5">
            {heading}
          </h1>
          {items.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl">
              <p className="text-sm text-neutral-500">Nothing here yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
              {items.map((v) => (
                <VideoCard
                  key={v.id}
                  video={v}
                  channel={channelsById.get(v.channelId)}
                  onWatch={(vid) =>
                    v.type === 'short' ? handleOpenShort(vid) : handleWatchVideo(vid)
                  }
                  onOpenChannel={(cid) => setActiveRoute({ view: 'channel', channelId: cid })}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    // Default Home Feed (just like YouTube: Category Strip + Video Grid + Shorts Shelf)
    const firstRowVideos = filteredVideos.slice(0, 4);
    const remainingVideos = filteredVideos.slice(4);

    return (
      <div className="pb-14">
        {/* Sticky Category Filter Bar */}
        <div className="sticky top-14 z-30 bg-white/95 dark:bg-[#090909]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800/80 px-4 sm:px-6 py-2.5">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {CATEGORY_FILTERS.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-8 px-3.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                      : 'bg-neutral-100 dark:bg-[#171717] text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="sm:hidden px-4 pt-3">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search flights, airframes..."
              className="w-full h-9 pl-9 pr-3 rounded-full bg-neutral-100 dark:bg-[#141414] border border-neutral-300 dark:border-neutral-800 text-sm text-neutral-950 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="px-4 sm:px-6 pt-6 max-w-[1640px] mx-auto">
          {filteredVideos.length === 0 && filteredShorts.length === 0 ? (
            <div className="py-20 text-center border border-dashed border-neutral-300 dark:border-neutral-800 rounded-2xl">
              <p className="text-base font-semibold text-neutral-950 dark:text-white">
                No flights match your filter
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                Try clearing your search or uploading a new drone flight.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="mt-4 h-9 px-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black text-xs font-semibold cursor-pointer"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <>
              {/* First Video Grid Row */}
              {firstRowVideos.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                  {firstRowVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      channel={channelsById.get(video.channelId)}
                      onWatch={handleWatchVideo}
                      onOpenChannel={(cid) =>
                        setActiveRoute({ view: 'channel', channelId: cid })
                      }
                    />
                  ))}
                </div>
              )}

              {/* Shorts Shelf */}
              {filteredShorts.length > 0 && (
                <section className="my-10 pt-6 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-neutral-950 dark:bg-white text-white dark:text-black flex items-center justify-center">
                        <Film className="w-4 h-4" />
                      </span>
                      <h2 className="font-display text-lg font-bold text-neutral-950 dark:text-white">
                        Shorts
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveRoute({ view: 'shorts' })}
                      className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white cursor-pointer"
                    >
                      Watch all shorts
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredShorts.slice(0, 5).map((short) => (
                      <ShortCard
                        key={short.id}
                        short={short}
                        onOpenShort={handleOpenShort}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Remaining Videos Grid */}
              {remainingVideos.length > 0 && (
                <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8">
                  {remainingVideos.map((video) => (
                    <VideoCard
                      key={video.id}
                      video={video}
                      channel={channelsById.get(video.channelId)}
                      onWatch={handleWatchVideo}
                      onOpenChannel={(cid) =>
                        setActiveRoute({ view: 'channel', channelId: cid })
                      }
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="flex flex-col gap-3 animate-pulse">
              <div className="aspect-video rounded-xl bg-neutral-200 dark:bg-neutral-900" />
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-900 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-900 rounded w-5/6" />
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-900 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-10 text-center">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{error}</p>
        </div>
      );
    }

    if (activeRoute.view === 'shorts') {
      return (
        <ShortsView
          shorts={allShorts}
          initialShortId={activeRoute.shortId}
          channelsById={channelsById}
          userState={userState}
          onReact={handleReact}
          onToggleSubscribe={handleToggleSubscribe}
          onAddComment={handleAddComment}
          onOpenChannel={(cid) => setActiveRoute({ view: 'channel', channelId: cid })}
          onRecordView={recordView}
        />
      );
    }

    if (activeRoute.view === 'watch') {
      const targetVideo = videos.find((v) => v.id === activeRoute.videoId);
      if (!targetVideo) {
        return (
          <div className="p-12 text-center">
            <p className="text-sm text-neutral-500">Flight video unavailable.</p>
            <button
              type="button"
              onClick={() => setActiveRoute({ view: 'home' })}
              className="mt-4 h-9 px-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black text-xs font-semibold cursor-pointer"
            >
              Return Home
            </button>
          </div>
        );
      }

      const related = videos.filter((v) => v.id !== targetVideo.id && v.type === 'video');
      return (
        <WatchView
          video={targetVideo}
          channel={channelsById.get(targetVideo.channelId)}
          pilotChannel={pilotChannel}
          relatedVideos={related}
          channelsById={channelsById}
          userState={userState}
          onReact={handleReact}
          onToggleSave={handleToggleSave}
          onToggleSubscribe={handleToggleSubscribe}
          onAddComment={handleAddComment}
          onLikeComment={handleLikeComment}
          onWatchVideo={handleWatchVideo}
          onOpenChannel={(cid) => setActiveRoute({ view: 'channel', channelId: cid })}
          onDeleteVideo={handleDeleteVideo}
        />
      );
    }

    if (activeRoute.view === 'channel') {
      const targetChannel = channelsById.get(activeRoute.channelId) || pilotChannel;
      if (!targetChannel) return renderFeedPage();
      return (
        <ChannelView
          channel={targetChannel}
          videos={videos}
          channelsById={channelsById}
          userState={userState}
          onToggleSubscribe={handleToggleSubscribe}
          onWatchVideo={handleWatchVideo}
          onOpenShort={handleOpenShort}
          onOpenChannel={(cid) => setActiveRoute({ view: 'channel', channelId: cid })}
          onOpenUpload={() => setUploadOpen(true)}
          onUpdatePilotProfile={handleUpdatePilotProfile}
        />
      );
    }

    return renderFeedPage();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#090909] text-neutral-950 dark:text-neutral-50 flex flex-col">
      <Header
        searchQuery={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          if (activeRoute.view !== 'home') {
            setActiveRoute({ view: 'home' });
          }
        }}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        onNavigateHome={() => {
          setSearchQuery('');
          setSelectedCategory('All');
          setActiveRoute({ view: 'home' });
        }}
        onOpenUpload={() => setUploadOpen(true)}
        onOpenPilotChannel={() =>
          setActiveRoute({ view: 'channel', channelId: userState.pilotChannelId })
        }
        pilotChannel={pilotChannel}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          isOpen={sidebarOpen}
          activeRoute={activeRoute}
          onNavigate={(route) => {
            setActiveRoute(route);
            window.scrollTo({ top: 0 });
          }}
          subscribedChannels={subscribedChannels}
          pilotChannelId={userState.pilotChannelId}
        />

        <main className="flex-1 min-w-0">{renderMainContent()}</main>
      </div>

      <UploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        pilotChannelId={userState.pilotChannelId}
        onUploaded={(created) => {
          setVideos((prev) => [created, ...prev]);
          if (created.type === 'short') {
            setActiveRoute({ view: 'shorts', shortId: created.id });
          } else {
            setActiveRoute({ view: 'watch', videoId: created.id });
          }
        }}
      />
    </div>
  );
}
