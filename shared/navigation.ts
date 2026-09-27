import type { NavId, NavIdV3, Settings } from './types';

/** Today / Plan / Tasks / Review / More. Used when no preference was ever saved. */
export const DEFAULT_NAV_ORDER_V3: readonly NavIdV3[] = ['home', 'schedule', 'tasks', 'history', 'more'];
export const LEGACY_NAV_ORDER: readonly NavId[] = ['home', 'schedule', 'goals', 'more'];

/**
 * Four-tab preference to five tabs: `goals` leaves the bar, `tasks` follows `schedule`,
 * `history` follows `tasks`, and the remaining destinations keep their relative order.
 */
export function convertLegacyNavOrder(order?: readonly NavId[]): NavIdV3[] {
  if (!order) return [...DEFAULT_NAV_ORDER_V3];
  const result: NavIdV3[] = [];
  for (const id of order) {
    if (id === 'goals') continue;
    result.push(id);
    if (id === 'schedule') result.push('tasks', 'history');
  }
  // A malformed stored order never hides a destination.
  for (const id of DEFAULT_NAV_ORDER_V3) if (!result.includes(id)) result.push(id);
  return result;
}

/**
 * The order the five-tab shell shows. A saved five-tab preference wins; otherwise the
 * four-tab preference is read through the conversion without being rewritten.
 */
export function effectiveNavOrder(settings: Pick<Settings, 'navOrder' | 'navOrderV3'>): NavIdV3[] {
  const stored = settings.navOrderV3;
  if (stored && stored.length === DEFAULT_NAV_ORDER_V3.length && DEFAULT_NAV_ORDER_V3.every(id => stored.includes(id))) return [...stored];
  return convertLegacyNavOrder(settings.navOrder);
}
