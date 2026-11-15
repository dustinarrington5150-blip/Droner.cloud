import { useRef, useState } from 'react';
import { X, Upload, Film, Clapperboard, CheckCircle2 } from 'lucide-react';
import type { VideoFormat, VideoItem } from '../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  pilotChannelId: string;
  onUploaded: (video: VideoItem) => void;
}

const CATEGORIES = [
  'FPV Freestyle',
  'Cinematic Aerial',
  'Alpine & Ridge',
  'Urban Architecture',
  'Cinewhoop',
  'Long Range',
  'Night & Fog',
];

async function extractVideoMetadataAndThumb(
  file: File,
): Promise<{ durationSeconds: number; width: number; height: number; thumbBlob: Blob | null }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.preload = 'metadata';
    vid.muted = true;
    vid.playsInline = true;
    vid.src = url;

    const cleanup = () => URL.revokeObjectURL(url);

    vid.onloadeddata = () => {
      vid.currentTime = Math.min(1, (vid.duration || 1) * 0.25);
    };

    vid.onseeked = () => {
      try {
        const w = vid.videoWidth || 1280;
        const h = vid.videoHeight || 720;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.filter = 'grayscale(100%) contrast(108%)';
          ctx.drawImage(vid, 0, 0, w, h);
          canvas.toBlob(
            (blob) => {
              cleanup();
              resolve({
                durationSeconds: Math.round(vid.duration || 30),
                width: w,
                height: h,
                thumbBlob: blob,
              });
            },
            'image/jpeg',
            0.86,
          );
          return;
        }
      } catch {
        // Fallback if canvas capture fails
      }
      cleanup();
      resolve({
        durationSeconds: Math.round(vid.duration || 30),
        width: vid.videoWidth || 1280,
        height: vid.videoHeight || 720,
        thumbBlob: null,
      });
    };

    vid.onerror = () => {
      cleanup();
      resolve({ durationSeconds: 30, width: 1280, height: 720, thumbBlob: null });
    };
  });
}

async function generateSampleFlightWebm(format: VideoFormat): Promise<File> {
  const width = format === 'short' ? 540 : 960;
  const height = format === 'short' ? 960 : 540;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm',
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start();
  const totalFrames = 120; // 4 seconds @ 30fps

  for (let frame = 0; frame < totalFrames; frame++) {
    const p = frame / totalFrames;
    ctx.fillStyle = '#090909';
    ctx.fillRect(0, 0, width, height);

    // Horizon terrain ridges in monochrome
    for (let layer = 0; layer < 5; layer++) {
      const baseY = height * (0.38 + layer * 0.11);
      const shade = 28 + layer * 32;
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 24) {
        const ridge =
          Math.sin(x * 0.012 + p * 3.5 + layer * 1.7) * (24 + layer * 8) +
          Math.cos(x * 0.025 - p * 2.0) * 14;
        ctx.lineTo(x, baseY + ridge);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();
    }

    // Minimalist white altitude arc
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(width * 0.42, height * 0.5);
    ctx.lineTo(width * 0.58, height * 0.5);
    ctx.stroke();

    await new Promise((r) => setTimeout(r, 25));
  }

  recorder.stop();
  await new Promise<void>((res) => {
    recorder.onstop = () => res();
  });

  const blob = new Blob(chunks, { type: 'video/webm' });
  return new File([blob], `droner-flight-${format}-${Date.now()}.webm`, {
    type: 'video/webm',
  });
}

export function UploadModal({
  isOpen,
  onClose,
  pilotChannelId,
  onUploaded,
}: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  const [format, setFormat] = useState<VideoFormat>('video');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | Blob | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string>('');
  const [durationSeconds, setDurationSeconds] = useState<number>(45);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('FPV Freestyle');
  const [airframe, setAirframe] = useState('Custom 5" FPV 6S');
  const [camera, setCamera] = useState('O3 / Monochrome LUT');
  const [location, setLocation] = useState('');
  const [uploading, setUploading] = useState(false);
  const [generatingSample, setGeneratingSample] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleVideoSelected = async (file: File) => {
    setError('');
    setVideoFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));
    }
    const meta = await extractVideoMetadataAndThumb(file);
    setDurationSeconds(meta.durationSeconds);
    if (meta.height > meta.width) {
      setFormat('short');
    } else {
      setFormat('video');
    }
    if (meta.thumbBlob) {
      setThumbFile(meta.thumbBlob);
      setThumbPreview(URL.createObjectURL(meta.thumbBlob));
    }
  };

  const handleCreateSampleClip = async () => {
    setGeneratingSample(true);
    setError('');
    try {
      const sampleFile = await generateSampleFlightWebm(format);
      await handleVideoSelected(sampleFile);
      if (!title.trim()) {
        setTitle(
          format === 'short'
            ? 'Ridge Line Vertical Pass — Monochrome Test'
            : 'High-Altitude Monochrome Ridge Sweep',
        );
      }
      if (!location.trim()) setLocation('Cascade Range, WA');
    } catch {
      setError('Could not generate sample clip in this browser.');
    } finally {
      setGeneratingSample(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a flight title.');
      return;
    }

    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('type', format);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('airframe', airframe.trim());
      formData.append('camera', camera.trim());
      formData.append('location', location.trim() || 'Open Airspace');
      formData.append('durationSeconds', String(durationSeconds));
      formData.append('channelId', pilotChannelId);
      if (videoFile) {
        formData.append('video', videoFile);
      }
      if (thumbFile) {
        formData.append(
          'thumbnail',
          thumbFile instanceof File
            ? thumbFile
            : new File([thumbFile], 'thumb.jpg', { type: 'image/jpeg' }),
        );
      }

      const res = await fetch('/api/videos', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || 'Upload failed.');
      }

      const created = (await res.json()) as VideoItem;
      onUploaded(created);
      onClose();
      // Reset fields
      setVideoFile(null);
      setThumbFile(null);
      setThumbPreview('');
      setTitle('');
      setDescription('');
      setLocation('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-[#111111] border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="h-14 px-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h2 id="upload-modal-title" className="font-display text-base font-bold text-neutral-950 dark:text-white">
            Upload drone flight
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload dialog"
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-500 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5 max-h-[82vh] overflow-y-auto">
          {/* Format Toggle */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormat('video')}
              className={`h-11 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                format === 'video'
                  ? 'bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-black dark:border-white'
                  : 'border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
              }`}
            >
              <Clapperboard className="w-4 h-4" />
              <span>Standard Video (16:9)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormat('short')}
              className={`h-11 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                format === 'short'
                  ? 'bg-neutral-950 text-white border-neutral-950 dark:bg-white dark:text-black dark:border-white'
                  : 'border-neutral-300 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Short (9:16)</span>
            </button>
          </div>

          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const dropped = e.dataTransfer.files?.[0];
              if (dropped && dropped.type.startsWith('video/')) {
                handleVideoSelected(dropped);
              }
            }}
            className="rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-[#0b0b0b] p-5 flex flex-col items-center justify-center text-center gap-2.5"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleVideoSelected(f);
              }}
            />

            {videoFile ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle2 className="w-7 h-7 text-neutral-950 dark:text-white" />
                <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                  {videoFile.name}
                </p>
                <p className="font-mono text-xs text-neutral-500 tabular-nums">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB · {durationSeconds}s
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold underline text-neutral-700 dark:text-neutral-300 cursor-pointer"
                >
                  Replace video file
                </button>
              </div>
            ) : (
              <>
                <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-950 dark:text-white">
                    Drop drone flight video here or browse files
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    MP4, WebM, MOV up to 250 MB · Auto-graded to monochrome B&amp;W
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 px-4 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black text-xs font-semibold cursor-pointer"
                  >
                    Select video file
                  </button>
                  <button
                    type="button"
                    disabled={generatingSample}
                    onClick={handleCreateSampleClip}
                    className="h-9 px-4 rounded-full border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    {generatingSample ? 'Recording clip...' : 'Generate sample flight clip'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Preview + Optional Custom Upload */}
          <div className="flex items-center gap-4">
            <div className="w-32 aspect-video rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shrink-0 flex items-center justify-center text-[11px] text-neutral-500">
              {thumbPreview ? (
                <img src={thumbPreview} alt="Flight thumbnail preview" className="w-full h-full object-cover grayscale" />
              ) : (
                <span>Auto thumbnail</span>
              )}
            </div>
            <div className="flex-1">
              <input
                ref={thumbInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setThumbFile(f);
                    setThumbPreview(URL.createObjectURL(f));
                  }
                }}
              />
              <button
                type="button"
                onClick={() => thumbInputRef.current?.click()}
                className="h-8 px-3 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                Upload custom thumbnail
              </button>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                Captured automatically from your flight video, or pick your own still.
              </p>
            </div>
          </div>

          {/* Metadata Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Flight Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Granite Ridge Dive at Dawn — 5in Freestyle"
                className="w-full h-10 px-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Location / Airspace
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Dolomites, Italy"
                className="w-full h-10 px-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Drone Airframe
              </label>
              <input
                type="text"
                value={airframe}
                onChange={(e) => setAirframe(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Camera / Lens
              </label>
              <input
                type="text"
                value={camera}
                onChange={(e) => setCamera(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Flight Notes
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Wind conditions, battery setup, ND filter, or route notes..."
                className="w-full p-3 rounded-lg bg-white dark:bg-[#090909] border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white"
              />
            </div>
          </div>

          {error && <p className="text-xs font-medium text-neutral-950 dark:text-white underline">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-full text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="h-10 px-6 rounded-full bg-neutral-950 dark:bg-white text-white dark:text-black text-sm font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-40 cursor-pointer"
            >
              {uploading ? 'Publishing...' : `Publish ${format === 'short' ? 'Short' : 'Video'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
