const DEFAULT_ZONE = 'America/New_York';

export function validZone(zone: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(); return true; }
  catch { return false; }
}

export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function parts(iso: string, zone = DEFAULT_ZONE) {
  const instant = new Date(iso);
  if (!Number.isFinite(instant.getTime())) throw new RangeError('Invalid date/time.');
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant);
  const p = Object.fromEntries(values.map(v => [v.type, v.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), minute: Number(p.minute) };
}

export function dateKey(iso = new Date().toISOString(), zone = DEFAULT_ZONE): string {
  return parts(iso, zone).date;
}

export function today(zone = DEFAULT_ZONE): string { return dateKey(undefined, zone); }

export function minuteOfDay(iso: string, zone = DEFAULT_ZONE): number {
  const p = parts(iso, zone); return p.hour * 60 + p.minute;
}

export function timeLabel(iso: string, zone = DEFAULT_ZONE): string {
  return new Intl.DateTimeFormat('en-US', { timeZone: zone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

export function addDays(date: string, amount: number): string {
  if (!validDate(date) || !Number.isInteger(amount)) throw new RangeError('Invalid calendar date.');
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}

/** Wall-clock input to UTC. Reject spring gaps; choose the earlier fall-fold instant. */
export function localInstant(date: string, time: string, zone = DEFAULT_ZONE): string {
  if (!validDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !validZone(zone)) {
    throw new RangeError('Choose a valid date, time and time zone.');
  }
  const [hour, minute] = time.split(':').map(Number);
  const wall = Date.parse(`${date}T${time}:00Z`);
  const offsets = new Set<number>();
  // Probe both sides of transitions; supports fractional offsets and southern zones.
  for (const delta of [-172800000, -86400000, 0, 86400000, 172800000]) {
    const probe = wall + delta;
    const p = parts(new Date(probe).toISOString(), zone);
    const displayed = Date.parse(`${p.date}T${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}:00Z`);
    offsets.add(displayed - probe);
  }
  const matches = [...offsets].map(offset => wall - offset).filter(instant => {
    const p = parts(new Date(instant).toISOString(), zone);
    return p.date === date && p.hour === hour && p.minute === minute;
  }).sort((a, b) => a - b);
  if (!matches.length) throw new RangeError('This local time does not exist because the clocks move forward. Choose another time.');
  return new Date(matches[0]).toISOString();
}
