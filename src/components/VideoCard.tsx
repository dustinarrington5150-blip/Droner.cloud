import type { Channel, VideoItem } from '../types';
import { formatCompactNumber, formatDuration, formatRelativeDate } from '../lib/format';
import { MonochromeImage } from './MonochromeImage';

interface VideoCardProps {
  video: VideoItem;
  channel: Channel | undefined;
  onWatch: (videoId: string) => void;
  onOpenChannel: (channelId: string) => void;
}

export function VideoCard({ video, channel, onWatch, onOpenChannel }: VideoCardProps) {
  return (
    <article className="group flex flex-col gap-3">
      <button
        type="button"
        onClick={() => onWatch(video.id)}
        className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
      >
        <MonochromeImage
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 text-white font-mono text-[11px] font-medium tabular-nums">
          {formatDuration(video.durationSeconds)}
        </span>
      </button>

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => channel && onOpenChannel(channel.id)}
          aria-label={`Open ${channel?.name || 'pilot'} channel`}
          className="w-9 h-9 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 shrink-0 mt-0.5 cursor-pointer"
        >
          <MonochromeImage
            src={channel?.avatarUrl || ''}
            alt={channel?.name || 'Pilot'}
            className="w-full h-full object-cover"
          />
        </button>

        <div className="min-w-0 flex-1 flex flex-col">
          <button
            type="button"
            onClick={() => onWatch(video.id)}
            className="text-left cursor-pointer"
          >
            <h3 className="text-[15px] font-semibold leading-snug text-neutral-950 dark:text-white line-clamp-2 group-hover:underline decoration-neutral-400 underline-offset-2">
              {video.title}
            </h3>
          </button>

          <button
            type="button"
            onClick={() => channel && onOpenChannel(channel.id)}
            className="text-left text-[13px] text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white mt-1 truncate cursor-pointer"
          >
            {channel?.name || 'Unknown Pilot'}
          </button>

          <div className="flex items-center gap-1.5 text-[13px] text-neutral-500 dark:text-neutral-400 tabular-nums">
            <span>{formatCompactNumber(video.views)} views</span>
            <span aria-hidden="true">·</span>
            <span>{formatRelativeDate(video.createdAt)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
