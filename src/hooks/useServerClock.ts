import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Display time derived from the last server instant plus monotonic elapsed time, so a
 * changed device clock cannot move it. It is a display value only: every recorded instant
 * is stamped by the server when a command is accepted.
 */
export function useServerClock() {
  const anchor = useRef({ server: Date.now(), mono: performance.now() });
  const [now, setNow] = useState(() => new Date().toISOString());
  const read = useCallback(() => new Date(anchor.current.server + performance.now() - anchor.current.mono).toISOString(), []);
  const sync = useCallback((serverNow: string) => {
    const server = Date.parse(serverNow);
    if (!Number.isFinite(server)) return;
    anchor.current = { server, mono: performance.now() };
    setNow(new Date(server).toISOString());
  }, []);
  useEffect(() => {
    const tick = setInterval(() => setNow(read()), 1000);
    // A suspended tab does not tick; correct the display as soon as it is visible again.
    const visible = () => { if (!document.hidden) setNow(read()); };
    document.addEventListener('visibilitychange', visible);
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', visible); };
  }, [read]);
  return { now, sync };
}
