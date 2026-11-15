export type VideoFormat = 'video' | 'short';

export interface CommentItem {
  id: string;
  author: string;
  handle: string;
  avatarUrl: string;
  text: string;
  likes: number;
  likedByMe?: boolean;
  createdAt: string;
}

export interface Channel {
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

export interface VideoItem {
  id: string;
  type: VideoFormat;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  motionPreset?: 'ridge-glide' | 'forest-chase' | 'nadir-orbit' | 'cliff-sweep' | 'canyon-dive' | 'bridge-thread' | 'glacier-skim';
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
  comments: CommentItem[];
}

export interface UserState {
  pilotChannelId: string;
  subscribedChannelIds: string[];
  likedVideoIds: string[];
  dislikedVideoIds: string[];
  savedVideoIds: string[];
  historyVideoIds: string[];
}

export interface LibraryResponse {
  videos: VideoItem[];
  channels: Channel[];
  userState: UserState;
}

export type ActiveRoute =
  | { view: 'home' }
  | { view: 'shorts'; shortId?: string }
  | { view: 'subscriptions' }
  | { view: 'history' }
  | { view: 'liked' }
  | { view: 'saved' }
  | { view: 'watch'; videoId: string }
  | { view: 'channel'; channelId: string };
