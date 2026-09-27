import { BookOpenText, CalendarDays, Home, ListChecks, Menu, type LucideIcon } from 'lucide-react';
import type { NavIdV3 } from '../../shared/types';

export type View = 'home' | 'schedule' | 'tasks' | 'history' | 'more' | 'goals' | 'health' | 'rocket' | 'money' | 'reminders' | 'weather' | 'settings' | 'templates' | 'missing';
const VIEWS: readonly View[] = ['home', 'schedule', 'tasks', 'history', 'more', 'goals', 'health', 'rocket', 'money', 'reminders', 'weather', 'settings', 'templates', 'missing'];

export interface Destination { id: NavIdV3; label: string; icon: LucideIcon }
/** One configuration for the phone bar and the desktop rail. Route identities stay stable. */
export const DESTINATIONS: Record<NavIdV3, Destination> = {
  home: { id: 'home', label: 'Today', icon: Home },
  schedule: { id: 'schedule', label: 'Plan', icon: CalendarDays },
  tasks: { id: 'tasks', label: 'Tasks', icon: ListChecks },
  history: { id: 'history', label: 'Review', icon: BookOpenText },
  more: { id: 'more', label: 'More', icon: Menu },
};

/** Readable aliases resolve to the same views; they never create a second screen. */
const ALIASES: Record<string, View> = { today: 'home', plan: 'schedule', review: 'history' };

export interface Route { view: View; params: URLSearchParams }
export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const name = ALIASES[path] ?? path;
  return { view: (VIEWS as readonly string[]).includes(name) ? name as View : 'home', params: new URLSearchParams(query) };
}
/** Only non-sensitive context belongs in a route: a date or a list filter, never writing. */
export function routeHash(view: View, params?: Record<string, string | undefined>): string {
  const query = new URLSearchParams(Object.entries(params ?? {}).filter((entry): entry is [string, string] => !!entry[1])).toString();
  return `#/${view}${query ? `?${query}` : ''}`;
}
/** The main destination a view belongs to. Supporting tools live under More. */
export function destinationFor(view: View): NavIdV3 {
  if (view === 'home' || view === 'tasks' || view === 'history') return view;
  if (view === 'schedule' || view === 'templates') return 'schedule';
  return 'more';
}

export interface NavigationProps { order: readonly NavIdV3[]; view: View; onGo: (view: View) => void }

export function PhoneNavigation({ order, view, onGo }: NavigationProps) {
  const current = destinationFor(view);
  return <nav className="bottom-nav v3-phone-nav" aria-label="Main navigation">
    {order.map(id => { const { label, icon: Icon } = DESTINATIONS[id]; const selected = current === id; return <a key={id} href={routeHash(id)} aria-current={selected ? 'page' : undefined} className={selected ? 'selected' : ''} onClick={event => { event.preventDefault(); onGo(id); }}>
      <Icon size={21} aria-hidden="true"/><span>{label}</span>
    </a>; })}
  </nav>;
}

export function DesktopRail({ order, view, onGo, secondary }: NavigationProps & { secondary: { id: View; label: string; icon: LucideIcon }[] }) {
  const current = destinationFor(view);
  return <aside className="sidebar v3-rail">
    <nav aria-label="Main navigation">
      {order.map(id => { const { label, icon: Icon } = DESTINATIONS[id]; const selected = current === id && (id !== 'more' || view === 'more'); return <a key={id} href={routeHash(id)} aria-current={selected ? 'page' : undefined} className={selected ? 'selected' : ''} onClick={event => { event.preventDefault(); onGo(id); }}>
        <Icon size={19} aria-hidden="true"/>{label}
      </a>; })}
    </nav>
    <div className="sidebar-divider"/>
    <nav aria-label="Supporting tools">
      {secondary.map(({ id, label, icon: Icon }) => <a key={id} href={routeHash(id)} aria-current={view === id ? 'page' : undefined} className={view === id ? 'selected' : ''} onClick={event => { event.preventDefault(); onGo(id); }}>
        <Icon size={18} aria-hidden="true"/>{label}
      </a>)}
    </nav>
  </aside>;
}
