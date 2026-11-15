import { useEffect, useRef, useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Share2,
  Check,
  Play,
  Pause,
  Volume2,
  VolumeX,
  X,
  Send,
} from 'lucide-react';
import type { Channel, UserState, VideoItem } from '../types';
import { formatCompactNumber, formatRelativeDate } from '../lib/format';
import { MonochromeImage } from './MonochromeImage';

interface ShortsViewProps {
  shorts: VideoItem[];
  initialShortId?: string;
  channelsById: Map<string, Channel>;
  userState: UserState;
  onReact: (videoId: string, action: 'like' | 'dislike') => void;
  onToggleSubscribe: (channelId: string) => void;
  onAddComment: (videoId: string, text: string) => Promise<void>;
  onOpenChannel: (channelId: string) => void;
  onRecordView: (videoId: string) => void;
}

export function ShortsView({
  shorts,
  initialShortId,
  channelsById,
  userState,
  onReact,
  onToggleSubscribe,
  onAddComment,
  onOpenChannel,
  onRecordView,
}: ShortsViewProps) {
  const initialIndex = initialShortId
    ? Math.max(
        0,
        shorts.findIndex((s) => s.id === initialShortId),
      )
    : 0;

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const currentShort = shorts[activeIndex] || shorts[0];

  useEffect(() => {
    if (initialShortId) {
      const idx = shorts.findIndex((s) => s.id === initialShortId);
      if (idx !== -1) setActiveIndex(idx);
    }
  }, [initialShortId, shorts]);

  useEffect(() => {
    if (!currentShort) return;
    setProgress(0);
    setIsPlaying(true);
    onRecordView(currentShort.id);
  }, [currentShort?.id]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(shorts.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shorts.length]);

  // Sync HTML5 video for uploaded shorts
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !currentShort?.videoUrl) return;
    el.muted = isMuted;
    if (isPlaying) {
      el.play().catch(() => setIsPlaying(false));
    } else {
      el.pause();
    }
  }, [isPlaying, isMuted, currentShort?.id, currentShort?.videoUrl]);

  // Load image + animate canvas for seeded vertical shorts
  useEffect(() => {
    if (!currentShort || currentShort.videoUrl) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = currentShort.thumbnailUrl;
    img.onload = () => {
      imgRef.current = img;
    };
  }, [currentShort?.id, currentShort?.thumbnailUrl, currentShort?.videoUrl]);

  useEffect(() => {
    if (!currentShort || currentShort.videoUrl) return;
    let rafId = 0;
    let last = performance.now();
    const total = currentShort.durationSeconds || 24;

    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;

      if (isPlaying) {
        setProgress((prev) => {
          const next = prev + (dt / total) * 100;
          return next >= 100 ? 0 : next;
        });
      }

      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (canvas && img && img.complete && img.naturalWidth > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          const t = now * 0.0007;
          const zoom = 1.12 + Math.sin(t * 0.9) * 0.06;
          const panX = Math.sin(t * 1.1) * 0.03;
          const panY = Math.cos(t * 0.8) * 0.04;

          ctx.clearRect(0, 0, w, h);
          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.scale(zoom, zoom);
          ctx.translate(-w / 2 + panX * w, -h / 2 + panY * h);
          ctx.filter = 'grayscale(100%) contrast(112%)';
          ctx.drawImage(img, 0, 0, w, h);
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [currentShort, isPlaying]);

  if (!currentShort) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] text-neutral-500">
        <p className="text-base font-medium">No drone shorts uploaded yet.</p>
      </div>
    );
  }

  const channel = channelsById.get(currentShort.channelId);
  const isLiked = userState.likedVideoIds.includes(currentShort.id);
  const isDisliked = userState.dislikedVideoIds.includes(currentShort.id);
  const isSubscribed = channel ? userState.subscribedChannelIds.includes(channel.id) : false;

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentInput.trim();
    if (!text) return;
    await onAddComment(currentShort.id, text);
    setCommentInput('');
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full flex items-center justify-center gap-4 sm:gap-6 px-3 sm:px-6 py-4 overflow-hidden">
      {/* Main Vertical Short Frame + Right Action Rail */}
      <div className="flex items-end gap-3 sm:gap-4 h-full max-h-[820px]">
        <div className="relative h-full aspect-[9/16] max-w-[calc(100vw-5rem)] rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl">
          {currentShort.videoUrl ? (
            <video
              ref={videoRef}
              src={currentShort.videoUrl}
              poster={currentShort.thumbnailUrl}
              loop
              playsInline
              onClick={() => setIsPlaying((p) => !p)}
              onTimeUpdate={(e) => {
                const d = e.currentTarget.duration || 1;
                setProgress((e.currentTarget.currentTime / d) * 100);
              }}
              className="w-full h-full object-cover grayscale contrast-110 cursor-pointer"
            />
          ) : (
            <canvas
              ref={canvasRef}
              width={540}
              height={960}
              onClick={() => setIsPlaying((p) => !p)}
              className="w-full h-full object-cover cursor-pointer"
            />
          )}

          {/* Top Controls */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'Pause short' : 'Play short'}
              className="pointer-events-auto w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button
              type="button"
              onClick={() => setIsMuted((m) => !m)}
              aria-label={isMuted ? 'Unmute short' : 'Mute short'}
              className="pointer-events-auto w-9 h-9 rounded-full bg-black/55 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Bottom Scrim & Metadata */}
          <div className="absolute inset-x-0 bottom-0 pt-24 pb-4 px-4 bg-gradient-to-t from-black/90 via-black/45 to-transparent text-white">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => channel && onOpenChannel(channel.id)}
                className="w-9 h-9 rounded-full overflow-hidden border border-white/40 shrink-0 cursor-pointer"
              >
                <MonochromeImage
                  src={channel?.avatarUrl || ''}
                  alt={channel?.name || 'Pilot'}
                  className="w-full h-full object-cover"
                />
              </button>
              <button
                type="button"
                onClick={() => channel && onOpenChannel(channel.id)}
                className="text-sm font-semibold hover:underline truncate cursor-pointer"
              >
                {channel?.handle || '@pilot'}
              </button>
              {channel && (
                <button
                  type="button"
                  onClick={() => onToggleSubscribe(channel.id)}
                  className={`h-7 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                    isSubscribed
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              )}
            </div>

            <h2 className="mt-2.5 text-sm font-semibold leading-snug line-clamp-2">
              {currentShort.title}
            </h2>
            <p className="mt-1 text-xs text-neutral-300 font-mono tabular-nums">
              {currentShort.airframe} · {currentShort.location}
            </p>
          </div>

          {/* Bottom Progress Line */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-white/25">
            <div className="h-full bg-white transition-[width] duration-100" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Vertical Action Rail */}
        <div className="flex flex-col items-center gap-4 pb-2">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onReact(currentShort.id, 'like')}
              aria-label="Like short"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isLiked
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              <ThumbsUp className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <span className="text-xs font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
              {formatCompactNumber(currentShort.likes)}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => onReact(currentShort.id, 'dislike')}
              aria-label="Dislike short"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                isDisliked
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              <ThumbsDown className={`w-5 h-5 ${isDisliked ? 'fill-current' : ''}`} />
            </button>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              Dislike
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => setShowComments((s) => !s)}
              aria-label="Toggle short comments"
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                showComments
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                  : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <span className="text-xs font-medium tabular-nums text-neutral-800 dark:text-neutral-200">
              {currentShort.comments.length}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                } catch {}
                setCopiedId(currentShort.id);
                setTimeout(() => setCopiedId(null), 1800);
              }}
              aria-label="Share short"
              className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              {copiedId === currentShort.id ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
            </button>
            <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
              {copiedId === currentShort.id ? 'Copied' : 'Share'}
            </span>
          </div>
        </div>
      </div>

      {/* Comments Drawer (Desktop Side Panel or Overlay) */}
      {showComments && (
        <div className="w-80 h-full max-h-[820px] rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#121212] flex flex-col overflow-hidden shrink-0">
          <div className="h-12 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <span className="font-display text-sm font-bold text-neutral-950 dark:text-white tabular-nums">
              Comments ({currentShort.comments.length})
            </span>
            <button
              type="button"
              onClick={() => setShowComments(false)}
              aria-label="Close comments"
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {currentShort.comments.length === 0 ? (
              <p className="text-xs text-neutral-500">No comments yet. Drop the first line.</p>
            ) : (
              currentShort.comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 shrink-0">
                    <MonochromeImage src={c.avatarUrl} alt={c.author} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-neutral-950 dark:text-white">{c.handle}</span>
                      <span className="text-neutral-500">{formatRelativeDate(c.createdAt)}</span>
                    </div>
                    <p className="text-xs text-neutral-800 dark:text-neutral-200 mt-1 leading-relaxed">
                      {c.text}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSubmitComment} className="p-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 h-9 px-3 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-xs text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
            />
            <button
              type="submit"
              disabled={!commentInput.trim()}
              aria-label="Send comment"
              className="w-9 h-9 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black flex items-center justify-center disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Prev / Next Vertical Stepper */}
      <div className="hidden md:flex flex-col items-center gap-3 ml-2">
        <button
          type="button"
          disabled={activeIndex === 0}
          onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
          aria-label="Previous short"
          className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-950 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
        <span className="font-mono text-xs tabular-nums text-neutral-500">
          {activeIndex + 1}/{shorts.length}
        </span>
        <button
          type="button"
          disabled={activeIndex >= shorts.length - 1}
          onClick={() => setActiveIndex((i) => Math.min(shorts.length - 1, i + 1))}
          aria-label="Next short"
          className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-950 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-30 flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
