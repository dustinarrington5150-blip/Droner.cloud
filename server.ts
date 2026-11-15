import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

interface CommentRecord {
  id: string;
  author: string;
  handle: string;
  avatarUrl: string;
  text: string;
  likes: number;
  likedByMe?: boolean;
  createdAt: string;
}

interface ChannelRecord {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bannerUrl: string;
  subscribers: number;
  bio: string;
  primaryRig: string;
  location: string;
}

interface VideoRecord {
  id: string;
  type: 'video' | 'short';
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  motionPreset?: string;
  durationSeconds: number;
  views: number;
  likes: number;
  dislikes: number;
  category: string;
  airframe: string;
  camera: string;
  location: string;
  resolution: string;
  fps: number;
  channelId: string;
  createdAt: string;
  isUserUpload?: boolean;
  comments: CommentRecord[];
}

interface UserStateRecord {
  pilotChannelId: string;
  subscribedChannelIds: string[];
  likedVideoIds: string[];
  dislikedVideoIds: string[];
  savedVideoIds: string[];
  historyVideoIds: string[];
}

interface LibraryStore {
  videos: VideoRecord[];
  channels: ChannelRecord[];
  userState: UserStateRecord;
}

const PORT = Number(process.env.PORT) || 3000;
const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const STORE_PATH = path.join(DATA_DIR, 'library.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86400 * 1000).toISOString();
}

function createInitialStore(): LibraryStore {
  const channels: ChannelRecord[] = [
    {
      id: 'ch_aero_noir',
      name: 'Aero Noir',
      handle: '@aero_noir',
      avatarUrl: '/src/assets/images/avatar_pilot_one_1794770083715.jpg',
      bannerUrl: '/src/assets/images/thumb_alpine_ridge_1794770082179.jpg',
      subscribers: 48200,
      bio: 'High-altitude monochrome cinema & long-range mountain ridge cruising. Every flight graded in pure silver halide black and white.',
      primaryRig: 'Custom 7" LR Deadcat / DJI O3 + RED Komodo',
      location: 'Chamonix, France',
    },
    {
      id: 'ch_kestrel_fpv',
      name: 'Kestrel FPV',
      handle: '@kestrel_fpv',
      avatarUrl: '/src/assets/images/avatar_pilot_two_1794770085742.jpg',
      bannerUrl: '/src/assets/images/thumb_fpv_forest_1794770081747.jpg',
      subscribers: 91400,
      bio: 'Proximity pine dives, canyon gaps, and single-take cinewhoop lines. Flying 6S custom carbon frames.',
      primaryRig: '5" Apex Freestyle 6S / Action 4 Monochrome LUT',
      location: 'Squamish, BC',
    },
    {
      id: 'ch_nadir_archive',
      name: 'Nadir Archive',
      handle: '@nadir_archive',
      avatarUrl: '/src/assets/images/avatar_pilot_one_1794770083715.jpg',
      bannerUrl: '/src/assets/images/thumb_brutalist_city_1794770082746.jpg',
      subscribers: 33900,
      bio: 'Orthographic architectural surveys, brutalist concrete geometry, and maritime basalt coastlines.',
      primaryRig: 'Inspire 3 / Zenmuse X9-8K Air',
      location: 'Reykjavik & Rotterdam',
    },
    {
      id: 'ch_guest_pilot',
      name: 'Solo Pilot',
      handle: '@solo_pilot',
      avatarUrl: '/src/assets/images/avatar_pilot_two_1794770085742.jpg',
      bannerUrl: '/src/assets/images/thumb_coastal_cliffs_1794770082654.jpg',
      subscribers: 1240,
      bio: 'Personal flight log on Droner.cloud. Uploading raw monochrome aerial tests and FPV shorts.',
      primaryRig: 'DJI Mavic 3 Pro + 5" Sub-250g',
      location: 'Pacific Northwest',
    },
  ];

  const videos: VideoRecord[] = [
    {
      id: 'vid_alpine_01',
      type: 'video',
      title: 'Aiguille Verte Ridge — 3,800m Cloud Inversion Long-Range Flight (4K B&W)',
      description:
        'Launched at first frost from 2,100m and climbed into a dense valley inversion layer. Headwind peaked at 42 km/h across the granite arête. Zero digital stabilization added—pure 7-inch balanced props and manual pitch curves.',
      thumbnailUrl: '/src/assets/images/thumb_alpine_ridge_1794770082179.jpg',
      videoUrl: null,
      motionPreset: 'ridge-glide',
      durationSeconds: 264,
      views: 184200,
      likes: 11400,
      dislikes: 84,
      category: 'Alpine & Ridge',
      airframe: 'Custom 7" Chimera LR 6S',
      camera: 'DJI O3 / ND16 Filter',
      location: 'Mont Blanc Massif, FR',
      resolution: '4K',
      fps: 60,
      channelId: 'ch_aero_noir',
      createdAt: daysAgo(2),
      comments: [
        {
          id: 'c_101',
          author: 'Kestrel FPV',
          handle: '@kestrel_fpv',
          avatarUrl: '/src/assets/images/avatar_pilot_two_1794770085742.jpg',
          text: 'The tonal separation between the mist and granite edges at 02:14 is unreal. What ND were you running?',
          likes: 47,
          createdAt: daysAgo(1),
        },
        {
          id: 'c_102',
          author: 'Marek Lindqvist',
          handle: '@marek_air',
          avatarUrl: '/src/assets/images/avatar_pilot_one_1794770083715.jpg',
          text: 'Monochrome fits alpine drone footage way better than oversaturated teal-and-orange.',
          likes: 29,
          createdAt: hoursAgo(16),
        },
      ],
    },
    {
      id: 'vid_forest_02',
      type: 'video',
      title: 'Old-Growth Pine Threading in Heavy Morning Fog — 5" Freestyle One-Take',
      description:
        'Six minutes of uninterrupted proximity flying beneath wet cedar and Douglas fir canopy. Tuned PID loop for crisp snap-backs around trunks with zero propwash oscillation.',
      thumbnailUrl: '/src/assets/images/thumb_fpv_forest_1794770081747.jpg',
      videoUrl: null,
      motionPreset: 'forest-chase',
      durationSeconds: 198,
      views: 249800,
      likes: 18200,
      dislikes: 112,
      category: 'FPV Freestyle',
      airframe: 'ImpulseRC Apex 5" 6S',
      camera: 'GoPro Hero 12 Log B&W',
      location: 'Squamish Valley, BC',
      resolution: '4K',
      fps: 120,
      channelId: 'ch_kestrel_fpv',
      createdAt: daysAgo(4),
      comments: [
        {
          id: 'c_201',
          author: 'Aero Noir',
          handle: '@aero_noir',
          avatarUrl: '/src/assets/images/avatar_pilot_one_1794770083715.jpg',
          text: 'Signal penetration through wet timber must have been brutal—cleanest lines all month.',
          likes: 64,
          createdAt: daysAgo(3),
        },
      ],
    },
    {
      id: 'vid_brutalist_03',
      type: 'video',
      title: 'Monolith Geometry: Top-Down Nadir Survey of Brutalist Concrete Towers',
      description:
        'High-noon solar shadows cut across post-war residential monoliths at 120m AGL. Shot strictly at 90-degree gimbal nadir angle for architectural symmetry.',
      thumbnailUrl: '/src/assets/images/thumb_brutalist_city_1794770082746.jpg',
      videoUrl: null,
      motionPreset: 'nadir-orbit',
      durationSeconds: 312,
      views: 92400,
      likes: 6150,
      dislikes: 41,
      category: 'Urban Architecture',
      airframe: 'DJI Inspire 3 Dual-Op',
      camera: 'Zenmuse X9-8K 35mm',
      location: 'Rotterdam, NL',
      resolution: '8K',
      fps: 24,
      channelId: 'ch_nadir_archive',
      createdAt: daysAgo(6),
      comments: [
        {
          id: 'c_301',
          author: 'ConcreteWing',
          handle: '@concrete_wing',
          avatarUrl: '/src/assets/images/avatar_pilot_two_1794770085742.jpg',
          text: 'Feels like an architectural blueprint come to life. Love the slow yaw reveal.',
          likes: 19,
          createdAt: daysAgo(5),
        },
      ],
    },
    {
      id: 'vid_cliffs_04',
      type: 'video',
      title: 'North Atlantic Basalt Cliffs — Storm Surge Low-Pass at 18m AGL',
      description:
        'Conformal-coated flight controller held steady in salt spray and 35-knot gusts along the black basalt shelf. Slow shutter speed preserves whitewater texture against obsidian rock.',
      thumbnailUrl: '/src/assets/images/thumb_coastal_cliffs_1794770082654.jpg',
      videoUrl: null,
      motionPreset: 'cliff-sweep',
      durationSeconds: 235,
      views: 318000,
      likes: 22900,
      dislikes: 95,
      category: 'Cinematic Aerial',
      airframe: 'DJI Mavic 3 Pro Cine',
      camera: 'Hasselblad 24mm 10-bit',
      location: 'Vik, Iceland',
      resolution: '4K',
      fps: 60,
      channelId: 'ch_nadir_archive',
      createdAt: daysAgo(9),
      comments: [],
    },
    {
      id: 'vid_night_05',
      type: 'video',
      title: 'Sub-Zero Ridge Traverse — High-Contrast Winter Telemetry Session',
      description:
        'Testing Li-Ion 4S2P pack sag at -14°C while sweeping parallel to wind-scoured snow cornices. Full flight telemetry logged without HUD clutter.',
      thumbnailUrl: '/src/assets/images/thumb_alpine_ridge_1794770082179.jpg',
      videoUrl: null,
      motionPreset: 'ridge-glide',
      durationSeconds: 410,
      views: 67500,
      likes: 4320,
      dislikes: 28,
      category: 'Long Range',
      airframe: 'Explorer LR4 Custom',
      camera: 'DJI O3 Raw Profile',
      location: 'Zermatt, Switzerland',
      resolution: '4K',
      fps: 60,
      channelId: 'ch_aero_noir',
      createdAt: daysAgo(12),
      comments: [],
    },
    {
      id: 'vid_cinewhoop_06',
      type: 'video',
      title: 'Rain-Soaked Timber Corridor — Slow-Motion Cinewhoop Tracking Line',
      description:
        'Ducted 3.5-inch rig hovering 40cm off moss-covered trails after a Pacific storm. Shot at 120fps and conformed to 24fps.',
      thumbnailUrl: '/src/assets/images/thumb_fpv_forest_1794770081747.jpg',
      videoUrl: null,
      motionPreset: 'forest-chase',
      durationSeconds: 154,
      views: 54100,
      likes: 3890,
      dislikes: 19,
      category: 'Cinewhoop',
      airframe: 'Cinelifter 35 Ducted',
      camera: 'Action 4 10-bit B&W',
      location: 'Olympic Peninsula, WA',
      resolution: '4K',
      fps: 120,
      channelId: 'ch_kestrel_fpv',
      createdAt: daysAgo(14),
      comments: [],
    },
    {
      id: 'short_canyon_01',
      type: 'short',
      title: '400m Sandstone Slot Dive — Zero Throttle Freefall',
      description: 'Inverted yaw spin off the canyon rim straight down the shadowed fissure.',
      thumbnailUrl: '/src/assets/images/short_canyon_dive_1794770083885.jpg',
      videoUrl: null,
      motionPreset: 'canyon-dive',
      durationSeconds: 28,
      views: 642000,
      likes: 51400,
      dislikes: 320,
      category: 'FPV Freestyle',
      airframe: '5" Freestyle 6S',
      camera: 'Vertical Hero 12',
      location: 'Moab, Utah',
      resolution: '4K',
      fps: 60,
      channelId: 'ch_kestrel_fpv',
      createdAt: hoursAgo(18),
      comments: [
        {
          id: 'cs_1',
          author: 'Aero Noir',
          handle: '@aero_noir',
          avatarUrl: '/src/assets/images/avatar_pilot_one_1794770083715.jpg',
          text: 'That pull-out inches from the river wash gave me chills.',
          likes: 184,
          createdAt: hoursAgo(10),
        },
      ],
    },
    {
      id: 'short_bridge_02',
      type: 'short',
      title: 'Steel Truss Underpass in Thick River Fog',
      description: 'Threading the underside lattice of a 1930s suspension span at dawn.',
      thumbnailUrl: '/src/assets/images/short_bridge_gap_1794770083616.jpg',
      videoUrl: null,
      motionPreset: 'bridge-thread',
      durationSeconds: 22,
      views: 418000,
      likes: 34200,
      dislikes: 145,
      category: 'Night & Fog',
      airframe: 'Avata 2 Vertical Mount',
      camera: 'O3 Vertical 9:16',
      location: 'Columbia River Gorge',
      resolution: '4K',
      fps: 60,
      channelId: 'ch_aero_noir',
      createdAt: daysAgo(1),
      comments: [],
    },
    {
      id: 'short_glacier_03',
      type: 'short',
      title: 'Skimming Seracs & Blue-Ice Crevasses in Pure B&W',
      description: 'Two meters above jagged glacier fractures where shadows go completely ink-black.',
      thumbnailUrl: '/src/assets/images/short_glacier_crevasse_1794770084023.jpg',
      videoUrl: null,
      motionPreset: 'glacier-skim',
      durationSeconds: 34,
      views: 289000,
      likes: 24700,
      dislikes: 76,
      category: 'Alpine & Ridge',
      airframe: 'Custom 5" Deadcat LR',
      camera: 'O3 Native Vertical',
      location: 'Vatnajökull, Iceland',
      resolution: '4K',
      fps: 60,
      channelId: 'ch_nadir_archive',
      createdAt: daysAgo(3),
      comments: [],
    },
    {
      id: 'short_cliff_04',
      type: 'short',
      title: 'Vertical Pull-Up Along Sheer Sea Stack',
      description: 'Single battery sprint up 140m of wet basalt wall into Atlantic cloud ceiling.',
      thumbnailUrl: '/src/assets/images/short_canyon_dive_1794770083885.jpg',
      videoUrl: null,
      motionPreset: 'canyon-dive',
      durationSeconds: 19,
      views: 156000,
      likes: 12900,
      dislikes: 52,
      category: 'Cinematic Aerial',
      airframe: 'Mavic 3 Pro Vertical',
      camera: '24mm f/2.8',
      location: 'Faroe Islands',
      resolution: '4K',
      fps: 60,
      channelId: 'ch_nadir_archive',
      createdAt: daysAgo(5),
      comments: [],
    },
  ];

  const userState: UserStateRecord = {
    pilotChannelId: 'ch_guest_pilot',
    subscribedChannelIds: ['ch_aero_noir', 'ch_kestrel_fpv'],
    likedVideoIds: ['vid_alpine_01'],
    dislikedVideoIds: [],
    savedVideoIds: ['vid_brutalist_03'],
    historyVideoIds: ['vid_alpine_01', 'short_canyon_01'],
  };

  return { videos, channels, userState };
}

function loadStore(): LibraryStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as LibraryStore;
      if (Array.isArray(parsed.videos) && Array.isArray(parsed.channels) && parsed.userState) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial seed store
  }
  const initial = createInitialStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2));
  return initial;
}

let store: LibraryStore = loadStore();

function saveStore(): void {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const safeExt = path.extname(file.originalname || '').replace(/[^a-zA-Z0-9.]/g, '') || '.mp4';
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${safeExt}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 250 * 1024 * 1024, // 250 MB max upload
  },
});

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(UPLOADS_DIR));

  app.get('/api/library', (_req, res) => {
    res.json(store);
  });

  app.post(
    '/api/videos',
    upload.fields([
      { name: 'video', maxCount: 1 },
      { name: 'thumbnail', maxCount: 1 },
    ]),
    (req, res) => {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const videoFile = files?.video?.[0];
      const thumbFile = files?.thumbnail?.[0];

      const body = req.body as Record<string, string | undefined>;
      const title = (body.title || '').trim();
      if (!title) {
        res.status(400).json({ error: 'Flight title is required.' });
        return;
      }

      const type: 'video' | 'short' = body.type === 'short' ? 'short' : 'video';
      const durationSeconds = Math.max(1, Math.round(Number(body.durationSeconds) || (type === 'short' ? 24 : 90)));
      const channelId = body.channelId || store.userState.pilotChannelId || 'ch_guest_pilot';

      const defaultThumb =
        type === 'short'
          ? '/src/assets/images/short_canyon_dive_1794770083885.jpg'
          : '/src/assets/images/thumb_alpine_ridge_1794770082179.jpg';

      const newVideo: VideoRecord = {
        id: `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        title,
        description: (body.description || 'Monochrome drone flight uploaded to Droner.cloud.').trim(),
        thumbnailUrl: thumbFile ? `/uploads/${thumbFile.filename}` : defaultThumb,
        videoUrl: videoFile ? `/uploads/${videoFile.filename}` : null,
        motionPreset: type === 'short' ? 'canyon-dive' : 'ridge-glide',
        durationSeconds,
        views: 1,
        likes: 0,
        dislikes: 0,
        category: (body.category || 'Cinematic Aerial').trim(),
        airframe: (body.airframe || 'Custom Drone Rig').trim(),
        camera: (body.camera || 'Onboard 4K Monochrome').trim(),
        location: (body.location || 'Unspecified Airspace').trim(),
        resolution: (body.resolution || '4K').trim(),
        fps: Number(body.fps) || 60,
        channelId,
        createdAt: new Date().toISOString(),
        isUserUpload: true,
        comments: [],
      };

      store.videos.unshift(newVideo);
      saveStore();
      res.status(201).json(newVideo);
    },
  );

  app.delete('/api/videos/:id', (req, res) => {
    const { id } = req.params;
    const idx = store.videos.findIndex((v) => v.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Video not found.' });
      return;
    }

    const [removed] = store.videos.splice(idx, 1);
    if (removed.videoUrl && removed.videoUrl.startsWith('/uploads/')) {
      const targetPath = path.join(UPLOADS_DIR, path.basename(removed.videoUrl));
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
    }
    if (removed.thumbnailUrl && removed.thumbnailUrl.startsWith('/uploads/')) {
      const thumbPath = path.join(UPLOADS_DIR, path.basename(removed.thumbnailUrl));
      if (fs.existsSync(thumbPath)) {
        fs.unlinkSync(thumbPath);
      }
    }

    store.userState.likedVideoIds = store.userState.likedVideoIds.filter((vid) => vid !== id);
    store.userState.dislikedVideoIds = store.userState.dislikedVideoIds.filter((vid) => vid !== id);
    store.userState.savedVideoIds = store.userState.savedVideoIds.filter((vid) => vid !== id);
    store.userState.historyVideoIds = store.userState.historyVideoIds.filter((vid) => vid !== id);
    saveStore();
    res.json({ deletedId: id, userState: store.userState });
  });

  app.post('/api/videos/:id/view', (req, res) => {
    const video = store.videos.find((v) => v.id === req.params.id);
    if (!video) {
      res.status(404).json({ error: 'Video not found.' });
      return;
    }
    video.views += 1;
    store.userState.historyVideoIds = [
      video.id,
      ...store.userState.historyVideoIds.filter((id) => id !== video.id),
    ].slice(0, 50);
    saveStore();
    res.json({ views: video.views, historyVideoIds: store.userState.historyVideoIds });
  });

  app.post('/api/videos/:id/react', (req, res) => {
    const video = store.videos.find((v) => v.id === req.params.id);
    if (!video) {
      res.status(404).json({ error: 'Video not found.' });
      return;
    }
    const action = (req.body as { action?: 'like' | 'dislike' }).action;
    if (action !== 'like' && action !== 'dislike') {
      res.status(400).json({ error: 'Invalid reaction.' });
      return;
    }

    const wasLiked = store.userState.likedVideoIds.includes(video.id);
    const wasDisliked = store.userState.dislikedVideoIds.includes(video.id);

    if (action === 'like') {
      if (wasLiked) {
        store.userState.likedVideoIds = store.userState.likedVideoIds.filter((id) => id !== video.id);
        video.likes = Math.max(0, video.likes - 1);
      } else {
        store.userState.likedVideoIds.push(video.id);
        video.likes += 1;
        if (wasDisliked) {
          store.userState.dislikedVideoIds = store.userState.dislikedVideoIds.filter((id) => id !== video.id);
          video.dislikes = Math.max(0, video.dislikes - 1);
        }
      }
    } else {
      if (wasDisliked) {
        store.userState.dislikedVideoIds = store.userState.dislikedVideoIds.filter((id) => id !== video.id);
        video.dislikes = Math.max(0, video.dislikes - 1);
      } else {
        store.userState.dislikedVideoIds.push(video.id);
        video.dislikes += 1;
        if (wasLiked) {
          store.userState.likedVideoIds = store.userState.likedVideoIds.filter((id) => id !== video.id);
          video.likes = Math.max(0, video.likes - 1);
        }
      }
    }

    saveStore();
    res.json({
      likes: video.likes,
      dislikes: video.dislikes,
      userState: store.userState,
    });
  });

  app.post('/api/videos/:id/save', (req, res) => {
    const video = store.videos.find((v) => v.id === req.params.id);
    if (!video) {
      res.status(404).json({ error: 'Video not found.' });
      return;
    }
    const exists = store.userState.savedVideoIds.includes(video.id);
    if (exists) {
      store.userState.savedVideoIds = store.userState.savedVideoIds.filter((id) => id !== video.id);
    } else {
      store.userState.savedVideoIds.unshift(video.id);
    }
    saveStore();
    res.json({ savedVideoIds: store.userState.savedVideoIds });
  });

  app.post('/api/videos/:id/comments', (req, res) => {
    const video = store.videos.find((v) => v.id === req.params.id);
    if (!video) {
      res.status(404).json({ error: 'Video not found.' });
      return;
    }
    const body = req.body as { text?: string };
    const text = (body.text || '').trim();
    if (!text) {
      res.status(400).json({ error: 'Comment cannot be empty.' });
      return;
    }

    const pilotChannel =
      store.channels.find((c) => c.id === store.userState.pilotChannelId) || store.channels[0];

    const newComment: CommentRecord = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      author: pilotChannel.name,
      handle: pilotChannel.handle,
      avatarUrl: pilotChannel.avatarUrl,
      text,
      likes: 0,
      likedByMe: false,
      createdAt: new Date().toISOString(),
    };

    video.comments.unshift(newComment);
    saveStore();
    res.status(201).json(newComment);
  });

  app.post('/api/videos/:id/comments/:commentId/like', (req, res) => {
    const video = store.videos.find((v) => v.id === req.params.id);
    if (!video) {
      res.status(404).json({ error: 'Video not found.' });
      return;
    }
    const comment = video.comments.find((c) => c.id === req.params.commentId);
    if (!comment) {
      res.status(404).json({ error: 'Comment not found.' });
      return;
    }
    if (comment.likedByMe) {
      comment.likedByMe = false;
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      comment.likedByMe = true;
      comment.likes += 1;
    }
    saveStore();
    res.json(comment);
  });

  app.post('/api/channels/:id/subscribe', (req, res) => {
    const channel = store.channels.find((c) => c.id === req.params.id);
    if (!channel) {
      res.status(404).json({ error: 'Channel not found.' });
      return;
    }
    const isSub = store.userState.subscribedChannelIds.includes(channel.id);
    if (isSub) {
      store.userState.subscribedChannelIds = store.userState.subscribedChannelIds.filter(
        (id) => id !== channel.id,
      );
      channel.subscribers = Math.max(0, channel.subscribers - 1);
    } else {
      store.userState.subscribedChannelIds.push(channel.id);
      channel.subscribers += 1;
    }
    saveStore();
    res.json({
      subscribers: channel.subscribers,
      subscribedChannelIds: store.userState.subscribedChannelIds,
    });
  });

  app.patch('/api/pilot', (req, res) => {
    const body = req.body as { name?: string; handle?: string; primaryRig?: string; location?: string; bio?: string };
    const pilot = store.channels.find((c) => c.id === store.userState.pilotChannelId);
    if (!pilot) {
      res.status(404).json({ error: 'Pilot channel not found.' });
      return;
    }
    if (body.name?.trim()) pilot.name = body.name.trim();
    if (body.handle?.trim()) {
      const clean = body.handle.trim().replace(/\s+/g, '_').toLowerCase();
      pilot.handle = clean.startsWith('@') ? clean : `@${clean}`;
    }
    if (body.primaryRig !== undefined) pilot.primaryRig = body.primaryRig.trim();
    if (body.location !== undefined) pilot.location = body.location.trim();
    if (body.bio !== undefined) pilot.bio = body.bio.trim();
    saveStore();
    res.json(pilot);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Droner.cloud server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
