import { useState } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  Check,
  Trash2,
} from 'lucide-react';
import type { Channel, UserState, VideoItem } from '../types';
import { formatCompactNumber, formatDuration, formatRelativeDate } from '../lib/format';
import { MonochromeImage } from './MonochromeImage';
import { MonochromePlayer } from './MonochromePlayer';

interface WatchViewProps {
  video: VideoItem;
  channel: Channel | undefined;
  pilotChannel: Channel | undefined;
  relatedVideos: VideoItem[];
  channelsById: Map<string, Channel>;
  userState: UserState;
  onReact: (videoId: string, action: 'like' | 'dislike') => void;
  onToggleSave: (videoId: string) => void;
  onToggleSubscribe: (channelId: string) => void;
  onAddComment: (videoId: string, text: string) => Promise<void>;
  onLikeComment: (videoId: string, commentId: string) => void;
  onWatchVideo: (videoId: string) => void;
  onOpenChannel: (channelId: string) => void;
  onDeleteVideo: (videoId: string) => Promise<void>;
}

export function WatchView({
  video,
  channel,
  pilotChannel,
  relatedVideos,
  channelsById,
  userState,
  onReact,
  onToggleSave,
  onToggleSubscribe,
  onAddComment,
  onLikeComment,
  onWatchVideo,
  onOpenChannel,
  onDeleteVideo,
}: WatchViewProps) {
  const [theaterMode, setTheaterMode] = useState(false);
  const [autoPlayNext, setAutoPlayNext] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentFocused, setCommentFocused] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isLiked = userState.likedVideoIds.includes(video.id);
  const isDisliked = userState.dislikedVideoIds.includes(video.id);
  const isSaved = userState.savedVideoIds.includes(video.id);
  const isSubscribed = channel ? userState.subscribedChannelIds.includes(channel.id) : false;

  const nextVideo = relatedVideos[0];

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Clipboard fallback in restricted iframes
    }
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentText.trim();
    if (!trimmed || submittingComment) return;
    setSubmittingComment(true);
    try {
      await onAddComment(video.id, trimmed);
      setCommentText('');
      setCommentFocused(false);
    } finally {
      setSubmittingComment(false);
    }
  };

  const renderPrimaryDetails = () => (
    <>
      <h1 className="font-display text-lg sm:text-xl font-bold leading-snug text-neutral-950 dark:text-white mt-3">
        {video.title}
      </h1>

      {/* Channel + Actions Bar */}
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => channel && onOpenChannel(channel.id)}
            className="w-10 h-10 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 shrink-0 cursor-pointer"
          >
            <MonochromeImage
              src={channel?.avatarUrl || ''}
              alt={channel?.name || 'Pilot'}
              className="w-full h-full object-cover"
            />
          </button>

          <div className="min-w-0 mr-2">
            <button
              type="button"
              onClick={() => channel && onOpenChannel(channel.id)}
              className="font-semibold text-[15px] text-neutral-950 dark:text-white hover:underline truncate block cursor-pointer"
            >
              {channel?.name || 'Unknown Pilot'}
            </button>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
              {formatCompactNumber(channel?.subscribers || 0)} subscribers
            </p>
          </div>

          {channel && (
            <button
              type="button"
              onClick={() => onToggleSubscribe(channel.id)}
              className={`h-9 px-4 rounded-full text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isSubscribed
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-950 dark:text-white hover:bg-neutral-300 dark:hover:bg-neutral-700'
                  : 'bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-200'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Like / Dislike Segmented Control */}
          <div className="flex items-center h-9 rounded-full bg-neutral-100 dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => onReact(video.id, 'like')}
              className={`h-full px-3.5 flex items-center gap-1.5 text-sm font-medium transition-colors cursor-pointer ${
                isLiked
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                  : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
              <span className="tabular-nums">{formatCompactNumber(video.likes)}</span>
            </button>
            <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700" />
            <button
              type="button"
              onClick={() => onReact(video.id, 'dislike')}
              aria-label="Dislike"
              className={`h-full px-3 flex items-center justify-center transition-colors cursor-pointer ${
                isDisliked
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                  : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-current' : ''}`} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onToggleSave(video.id)}
            className={`h-9 px-3.5 rounded-full border text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isSaved
                ? 'bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-black dark:border-white'
                : 'bg-neutral-100 dark:bg-[#171717] border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            <span>{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="h-9 px-3.5 rounded-full bg-neutral-100 dark:bg-[#171717] border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedShare ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copiedShare ? 'Copied' : 'Share'}</span>
          </button>

          {video.isUserUpload && (
            <button
              type="button"
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3500);
                } else {
                  onDeleteVideo(video.id);
                }
              }}
              className={`h-9 px-3.5 rounded-full border text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                confirmDelete
                  ? 'bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-black dark:border-white'
                  : 'bg-neutral-100 dark:bg-[#171717] border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-800'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{confirmDelete ? 'Confirm delete' : 'Delete'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Description & Flight Specs Box */}
      <div
        onClick={() => !descExpanded && setDescExpanded(true)}
        className={`mt-4 rounded-xl bg-neutral-100 dark:bg-[#141414] border border-neutral-200 dark:border-neutral-800/90 p-3.5 sm:p-4 text-sm ${
          !descExpanded ? 'cursor-pointer hover:bg-neutral-200/60 dark:hover:bg-[#1a1a1a]' : ''
        } transition-colors`}
      >
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-neutral-950 dark:text-white tabular-nums">
          <span>{formatCompactNumber(video.views)} views</span>
          <span aria-hidden="true">·</span>
          <span>{formatRelativeDate(video.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{video.category}</span>
          <span aria-hidden="true">·</span>
          <span>{video.location}</span>
        </div>

        <p
          className={`mt-2 text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line ${
            descExpanded ? '' : 'line-clamp-2'
          }`}
        >
          {video.description}
        </p>

        {descExpanded && (
          <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-neutral-500 dark:text-neutral-400 block">Airframe</span>
              <span className="font-medium text-neutral-950 dark:text-white">{video.airframe}</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400 block">Camera &amp; Optics</span>
              <span className="font-medium text-neutral-950 dark:text-white">{video.camera}</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400 block">Capture Format</span>
              <span className="font-mono font-medium text-neutral-950 dark:text-white tabular-nums">
                {video.resolution} · {video.fps} fps
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDescExpanded((d) => !d);
          }}
          className="mt-2 text-xs font-semibold text-neutral-950 dark:text-white hover:underline cursor-pointer"
        >
          {descExpanded ? 'Show less' : 'Show flight specs'}
        </button>
      </div>

      {/* Comments Section */}
      <section className="mt-6">
        <h2 className="font-display text-base font-bold text-neutral-950 dark:text-white tabular-nums">
          {video.comments.length} {video.comments.length === 1 ? 'Comment' : 'Comments'}
        </h2>

        <form onSubmit={handlePostComment} className="mt-4 flex items-start gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 shrink-0">
            <MonochromeImage
              src={pilotChannel?.avatarUrl || ''}
              alt={pilotChannel?.name || 'You'}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <input
              type="text"
              value={commentText}
              onFocus={() => setCommentFocused(true)}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a flight note or comment..."
              className="w-full bg-transparent border-b border-neutral-300 dark:border-neutral-700 focus:border-neutral-950 dark:focus:border-white py-1.5 text-sm text-neutral-950 dark:text-white placeholder:text-neutral-500 focus:outline-none transition-colors"
            />
            {(commentFocused || commentText.trim().length > 0) && (
              <div className="mt-2.5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCommentText('');
                    setCommentFocused(false);
                  }}
                  className="h-8 px-3.5 rounded-full text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!commentText.trim() || submittingComment}
                  className="h-8 px-4 rounded-full text-xs font-semibold bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 disabled:opacity-40 transition-opacity cursor-pointer"
                >
                  Comment
                </button>
              </div>
            )}
          </div>
        </form>

        <div className="mt-6 flex flex-col gap-5">
          {video.comments.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No comments yet. Share feedback on this flight line.
            </p>
          ) : (
            video.comments.map((c) => (
              <div key={c.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 shrink-0">
                  <MonochromeImage
                    src={c.avatarUrl}
                    alt={c.author}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-neutral-950 dark:text-white">
                      {c.handle}
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {formatRelativeDate(c.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                    {c.text}
                  </p>
                  <button
                    type="button"
                    onClick={() => onLikeComment(video.id, c.id)}
                    className={`mt-1.5 inline-flex items-center gap-1 text-xs transition-colors cursor-pointer ${
                      c.likedByMe
                        ? 'text-neutral-950 dark:text-white font-semibold'
                        : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${c.likedByMe ? 'fill-current' : ''}`} />
                    <span className="tabular-nums">{c.likes > 0 ? c.likes : ''}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );

  const renderUpNext = () => (
    <aside className="flex flex-col gap-3">
      <div className="flex items-center justify-between pb-1 border-b border-neutral-200 dark:border-neutral-800">
        <span className="font-display text-sm font-bold text-neutral-950 dark:text-white">
          Up next
        </span>
        <button
          type="button"
          onClick={() => setAutoPlayNext((a) => !a)}
          className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400 cursor-pointer"
        >
          <span>Autoplay</span>
          <span
            className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
              autoPlayNext
                ? 'bg-neutral-950 dark:bg-white justify-end'
                : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
            }`}
          >
            <span
              className={`w-3 h-3 rounded-full ${
                autoPlayNext ? 'bg-white dark:bg-black' : 'bg-white dark:bg-neutral-300'
              }`}
            />
          </span>
        </button>
      </div>

      {relatedVideos.map((item) => {
        const ch = channelsById.get(item.channelId);
        return (
          <div key={item.id} className="group flex items-start gap-2.5">
            <button
              type="button"
              onClick={() => onWatchVideo(item.id)}
              className="relative w-40 aspect-video rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shrink-0 cursor-pointer"
            >
              <MonochromeImage
                src={item.thumbnailUrl}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-200"
              />
              <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/85 text-white font-mono text-[10px] tabular-nums">
                {formatDuration(item.durationSeconds)}
              </span>
            </button>
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onWatchVideo(item.id)}
                className="text-left cursor-pointer"
              >
                <h3 className="text-sm font-semibold leading-snug text-neutral-950 dark:text-white line-clamp-2 group-hover:underline">
                  {item.title}
                </h3>
              </button>
              <button
                type="button"
                onClick={() => ch && onOpenChannel(ch.id)}
                className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white mt-1 truncate block cursor-pointer"
              >
                {ch?.name || 'Pilot'}
              </button>
              <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 tabular-nums mt-0.5">
                <span>{formatCompactNumber(item.views)} views</span>
                <span aria-hidden="true">·</span>
                <span>{formatRelativeDate(item.createdAt)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </aside>
  );

  if (theaterMode) {
    return (
      <div className="w-full pb-12">
        <MonochromePlayer
          video={video}
          theaterMode={true}
          onToggleTheater={() => setTheaterMode(false)}
          onNextVideo={nextVideo ? () => onWatchVideo(nextVideo.id) : undefined}
          autoPlayNext={autoPlayNext}
        />
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-4 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="min-w-0">{renderPrimaryDetails()}</div>
          <div>{renderUpNext()}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-5 pb-12 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      <div className="min-w-0">
        <MonochromePlayer
          video={video}
          theaterMode={false}
          onToggleTheater={() => setTheaterMode(true)}
          onNextVideo={nextVideo ? () => onWatchVideo(nextVideo.id) : undefined}
          autoPlayNext={autoPlayNext}
        />
        {renderPrimaryDetails()}
      </div>
      <div>{renderUpNext()}</div>
    </div>
  );
}
