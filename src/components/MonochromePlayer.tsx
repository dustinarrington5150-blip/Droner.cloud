import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RectangleHorizontal,
  SkipForward,
  Crosshair,
  Contrast,
} from 'lucide-react';
import type { VideoItem } from '../types';
import { formatDuration } from '../lib/format';

interface MonochromePlayerProps {
  video: VideoItem;
  theaterMode: boolean;
  onToggleTheater: () => void;
  onNextVideo?: () => void;
  autoPlayNext?: boolean;
}

const SPEEDS = [0.5, 1, 1.25, 1.5, 2] as const;

export function MonochromePlayer({
  video,
  theaterMode,
  onToggleTheater,
  onNextVideo,
  autoPlayNext = false,
}: MonochromePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds || 60);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [forceMonochrome, setForceMonochrome] = useState(true);
  const [showReticle, setShowReticle] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);

  const hasRealVideo = Boolean(video.videoUrl);

  // Reset player state when video changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(video.durationSeconds || 60);
    setIsPlaying(true);
    setShowSpeedMenu(false);
  }, [video.id, video.durationSeconds]);

  // Sync HTML5 video element
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !hasRealVideo) return;
    el.playbackRate = playbackRate;
    el.muted = isMuted;
    el.volume = volume;
  }, [hasRealVideo, playbackRate, isMuted, volume]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !hasRealVideo) return;
    if (isPlaying) {
      el.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      el.pause();
    }
  }, [hasRealVideo, isPlaying, video.id]);

  // Load image for animated aerial flight canvas when no raw .mp4 file is attached
  useEffect(() => {
    if (hasRealVideo) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = video.thumbnailUrl;
    img.onload = () => {
      imgRef.current = img;
    };
  }, [hasRealVideo, video.thumbnailUrl]);

  // Animated 60fps aerial motion canvas for curated starter flights
  useEffect(() => {
    if (hasRealVideo) return;

    let rafId = 0;
    let lastTs = performance.now();

    const renderFrame = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      if (isPlaying && !isScrubbing) {
        setCurrentTime((prev) => {
          const next = prev + dt * playbackRate;
          if (next >= duration) {
            if (autoPlayNext && onNextVideo) {
              setTimeout(onNextVideo, 0);
            }
            return 0;
          }
          return next;
        });
      }

      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (canvas && img && img.complete && img.naturalWidth > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;
          ctx.clearRect(0, 0, w, h);

          // Derive smooth flight motion from elapsed time + preset
          const t = now * 0.00045 * playbackRate;
          const progress = duration > 0 ? currentTime / duration : 0;
          const preset = video.motionPreset || 'ridge-glide';

          let zoom = 1.12 + Math.sin(progress * Math.PI) * 0.1;
          let panX = Math.sin(t) * 0.035;
          let panY = Math.cos(t * 0.7) * 0.025;
          let roll = Math.sin(t * 0.8) * 0.012;

          if (preset === 'forest-chase') {
            zoom = 1.15 + ((progress * 2) % 1) * 0.18;
            panX = Math.sin(t * 2.1) * 0.045;
            panY = Math.cos(t * 1.4) * 0.02;
            roll = Math.sin(t * 2.1) * 0.035;
          } else if (preset === 'nadir-orbit') {
            zoom = 1.18 + Math.sin(t * 0.6) * 0.04;
            panX = Math.cos(t * 0.5) * 0.03;
            panY = Math.sin(t * 0.5) * 0.03;
            roll = (progress * 0.18) - 0.09;
          } else if (preset === 'cliff-sweep') {
            zoom = 1.14 + progress * 0.12;
            panX = (progress - 0.5) * 0.08;
            panY = Math.sin(t * 1.1) * 0.018;
            roll = Math.sin(t * 0.9) * 0.018;
          }

          ctx.save();
          ctx.translate(w / 2, h / 2);
          ctx.rotate(roll);
          ctx.scale(zoom, zoom);
          ctx.translate(-w / 2 + panX * w, -h / 2 + panY * h);
          ctx.filter = 'grayscale(100%) contrast(108%)';
          ctx.drawImage(img, 0, 0, w, h);
          ctx.restore();

          // Subtle radial monochrome vignette
          const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w * 0.72);
          vignette.addColorStop(0, 'rgba(0,0,0,0)');
          vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, w, h);
        }
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [hasRealVideo, isPlaying, isScrubbing, playbackRate, duration, autoPlayNext, onNextVideo, currentTime, video.motionPreset]);

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleSeek = (nextTime: number) => {
    const clamped = Math.max(0, Math.min(duration, nextTime));
    setCurrentTime(clamped);
    if (hasRealVideo && videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  };

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === ' ' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === 'm') {
        setIsMuted((m) => !m);
      } else if (e.key.toLowerCase() === 'f') {
        toggleFullscreen();
      } else if (e.key.toLowerCase() === 't') {
        onToggleTheater();
      } else if (e.key === 'ArrowRight') {
        handleSeek(currentTime + 5);
      } else if (e.key === 'ArrowLeft') {
        handleSeek(currentTime - 5);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className={`relative group bg-black overflow-hidden select-none ${
        theaterMode
          ? 'w-full aspect-video max-h-[76vh]'
          : 'w-full aspect-video rounded-xl border border-neutral-200 dark:border-neutral-800'
      }`}
    >
      {/* Media Surface */}
      {hasRealVideo && video.videoUrl ? (
        <video
          ref={videoRef}
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          playsInline
          onClick={togglePlay}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          onTimeUpdate={(e) => {
            if (!isScrubbing) setCurrentTime(e.currentTarget.currentTime);
          }}
          onEnded={() => {
            if (autoPlayNext && onNextVideo) {
              onNextVideo();
            } else {
              setIsPlaying(false);
            }
          }}
          className={`w-full h-full object-contain cursor-pointer transition-[filter] duration-200 ${
            forceMonochrome ? 'grayscale contrast-110' : ''
          }`}
        />
      ) : (
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          onClick={togglePlay}
          className="w-full h-full object-cover cursor-pointer"
        />
      )}

      {/* Optional Minimal Drone Reticle Overlay */}
      {showReticle && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-40 h-28 border border-white/25 relative flex items-center justify-center">
            <div className="w-4 h-px bg-white/70" />
            <div className="h-4 w-px bg-white/70 absolute" />
            <span className="absolute -bottom-5 left-0 font-mono text-[10px] text-white/70 tabular-nums">
              {video.resolution} · {video.fps}FPS
            </span>
            <span className="absolute -bottom-5 right-0 font-mono text-[10px] text-white/70">
              {video.airframe}
            </span>
          </div>
        </div>
      )}

      {/* Center Play Overlay when paused */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play video"
          className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
        >
          <Play className="w-7 h-7 fill-current ml-0.5" />
        </button>
      )}

      {/* Bottom Transport Scrim */}
      <div className="absolute inset-x-0 bottom-0 pt-14 pb-2.5 px-3 sm:px-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
        {/* Scrub Bar */}
        <div className="relative w-full h-4 flex items-center mb-1 group/scrub">
          <div className="w-full h-1 group-hover/scrub:h-1.5 bg-white/30 rounded-full overflow-hidden transition-all">
            <div
              className="h-full bg-white rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            aria-label="Seek timeline"
            onMouseDown={() => setIsScrubbing(true)}
            onMouseUp={() => setIsScrubbing(false)}
            onTouchStart={() => setIsScrubbing(true)}
            onTouchEnd={() => setIsScrubbing(false)}
            onChange={(e) => handleSeek(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            {onNextVideo && (
              <button
                type="button"
                onClick={onNextVideo}
                aria-label="Next flight"
                title="Next flight"
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            )}

            <div className="flex items-center gap-1 group/vol">
              <button
                type="button"
                onClick={() => setIsMuted((m) => !m)}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setVolume(next);
                  setIsMuted(next === 0);
                }}
                className="w-0 group-hover/vol:w-16 transition-all duration-200 accent-white cursor-pointer hidden sm:block"
              />
            </div>

            <span className="font-mono text-xs tabular-nums text-neutral-200 ml-1">
              {formatDuration(currentTime)} / {formatDuration(duration)}
            </span>
          </div>

          <div className="flex items-center gap-1 relative">
            {hasRealVideo && (
              <button
                type="button"
                onClick={() => setForceMonochrome((m) => !m)}
                title={forceMonochrome ? 'Monochrome grade active' : 'Original color'}
                aria-label="Toggle monochrome filter"
                className={`h-8 px-2.5 rounded-md text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                  forceMonochrome
                    ? 'bg-white text-black font-semibold'
                    : 'text-white/80 hover:bg-white/15'
                }`}
              >
                <Contrast className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">B&amp;W</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowReticle((r) => !r)}
              title="Toggle flight reticle"
              aria-label="Toggle flight reticle"
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                showReticle ? 'bg-white text-black' : 'hover:bg-white/15 text-white'
              }`}
            >
              <Crosshair className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSpeedMenu((s) => !s)}
                aria-label="Playback speed"
                className="h-8 px-2 rounded-md text-xs font-mono tabular-nums hover:bg-white/15 transition-colors cursor-pointer"
              >
                {playbackRate}x
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 bg-neutral-950 border border-neutral-800 rounded-lg py-1 min-w-[76px] shadow-xl">
                  {SPEEDS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => {
                        setPlaybackRate(spd);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full px-3 py-1.5 text-left font-mono text-xs tabular-nums transition-colors cursor-pointer ${
                        playbackRate === spd
                          ? 'bg-white text-black font-semibold'
                          : 'text-neutral-200 hover:bg-neutral-800'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleTheater}
              aria-label="Theater mode"
              title="Theater mode (t)"
              className="hidden lg:flex w-9 h-9 rounded-full items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
            >
              <RectangleHorizontal className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              title="Fullscreen (f)"
              className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors cursor-pointer"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
