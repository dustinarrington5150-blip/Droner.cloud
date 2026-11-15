import { useState } from 'react';
import { Aperture } from 'lucide-react';

interface MonochromeImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function MonochromeImage({ src, alt, className = '' }: MonochromeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-neutral-200 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-500 ${className}`}
        role="img"
        aria-label={alt}
      >
        <Aperture className="w-6 h-6 opacity-50" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`grayscale ${className}`}
      loading="lazy"
    />
  );
}
