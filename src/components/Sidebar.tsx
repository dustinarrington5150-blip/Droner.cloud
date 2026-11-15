import { Home, Film, Users, History, ThumbsUp, Clock, User } from 'lucide-react';
import type { ActiveRoute, Channel } from '../types';
import { MonochromeImage } from './MonochromeImage';

interface SidebarProps {
  isOpen: boolean;
  activeRoute: ActiveRoute;
  onNavigate: (route: ActiveRoute) => void;
  subscribedChannels: Channel[];
  pilotChannelId: string;
}

export function Sidebar({
  isOpen,
  activeRoute,
  onNavigate,
  subscribedChannels,
  pilotChannelId,
}: SidebarProps) {
  const navItems: Array<{
    id: ActiveRoute['view'];
    label: string;
    icon: typeof Home;
    route: ActiveRoute;
  }> = [
    { id: 'home', label: 'Home', icon: Home, route: { view: 'home' } },
    { id: 'shorts', label: 'Shorts', icon: Film, route: { view: 'shorts' } },
    { id: 'subscriptions', label: 'Subscriptions', icon: Users, route: { view: 'subscriptions' } },
  ];

  const libraryItems: Array<{
    id: ActiveRoute['view'];
    label: string;
    icon: typeof History;
    route: ActiveRoute;
  }> = [
    { id: 'history', label: 'History', icon: History, route: { view: 'history' } },
    { id: 'liked', label: 'Liked flights', icon: ThumbsUp, route: { view: 'liked' } },
    { id: 'saved', label: 'Watch later', icon: Clock, route: { view: 'saved' } },
    {
      id: 'channel',
      label: 'Your channel',
      icon: User,
      route: { view: 'channel', channelId: pilotChannelId },
    },
  ];

  const isRouteActive = (item: { id: ActiveRoute['view']; route: ActiveRoute }) => {
    if (item.id === 'channel' && activeRoute.view === 'channel') {
      return activeRoute.channelId === pilotChannelId;
    }
    return activeRoute.view === item.id;
  };

  if (!isOpen) {
    return (
      <aside
        aria-label="Mini navigation"
        className="hidden md:flex flex-col w-[72px] shrink-0 border-r border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-[#090909] py-3 px-1.5 gap-1 sticky top-14 h-[calc(100vh-3.5rem)]"
      >
        {[...navItems, ...libraryItems.slice(0, 3)].map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.route)}
              className={`flex flex-col items-center justify-center gap-1 py-3 px-1 rounded-xl text-[11px] font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900'
              }`}
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.2 : 1.75} />
              <span className="truncate max-w-full">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </aside>
    );
  }

  return (
    <aside
      aria-label="Primary navigation"
      className="w-60 shrink-0 border-r border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-[#090909] py-3 px-3 flex flex-col gap-4 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto"
    >
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.route)}
              className={`h-10 px-3 rounded-xl flex items-center gap-4 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.2 : 1.75} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="h-px bg-neutral-200 dark:bg-neutral-800 mx-2" />

      <div className="flex flex-col gap-1">
        <span className="px-3 pb-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          You
        </span>
        {libraryItems.map((item) => {
          const Icon = item.icon;
          const active = isRouteActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.route)}
              className={`h-10 px-3 rounded-xl flex items-center gap-4 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950'
                  : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.2 : 1.75} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="h-px bg-neutral-200 dark:bg-neutral-800 mx-2" />

      <div className="flex flex-col gap-1">
        <span className="px-3 pb-1 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
          Subscriptions
        </span>
        {subscribedChannels.length === 0 ? (
          <p className="px-3 py-2 text-xs text-neutral-500 dark:text-neutral-500">
            No pilot subscriptions yet.
          </p>
        ) : (
          subscribedChannels.map((channel) => {
            const active =
              activeRoute.view === 'channel' && activeRoute.channelId === channel.id;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => onNavigate({ view: 'channel', channelId: channel.id })}
                className={`h-10 px-3 rounded-xl flex items-center gap-3 text-sm transition-colors cursor-pointer ${
                  active
                    ? 'bg-neutral-200 dark:bg-neutral-800 font-semibold text-neutral-950 dark:text-white'
                    : 'text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900'
                }`}
              >
                <div className="w-6 h-6 rounded-full overflow-hidden border border-neutral-300 dark:border-neutral-700 shrink-0">
                  <MonochromeImage
                    src={channel.avatarUrl}
                    alt={channel.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="truncate">{channel.name}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
