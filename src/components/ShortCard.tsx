import type { VideoItem } from '../types';
import { formatCompactNumber } from '../lib/format';
import { MonochromeImage } from './MonochromeImage';

interface ShortCardProps {
  short: VideoItem;
  onOpenShort: (shortId: string) => void;
}

export function ShortCard({ short, onOpenShort }: ShortCardProps) {
  return (
    <article className="group flex flex-col gap-2">
      <button
        type="button"
        onClick={() => onOpenShort(short.id)}
        className="relative aspect-[9/16] w-full rounded-xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:focus-visible:outline-white"
      >
        <MonochromeImage
          src={short.thumbnailUrl}
          alt={short.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1 text-white">
          <span className="text-xs font-mono tabular-nums text-neutral-200">
            {formatCompactNumber(short.views)} views
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onOpenShort(short.id)}
        className="text-left cursor-pointer"
      >
        <h3 className="text-sm font-semibold leading-snug text-neutral-950 dark:text-white line-clamp-2 group-hover:underline decoration-neutral-400 underline-offset-2">
          {short.title}
        </h3>
      </button>
    </article>
  );
}
