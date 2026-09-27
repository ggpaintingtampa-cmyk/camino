import type { ErrorDetails } from '../shared/contracts';
import type { CommandEnvelope, Snapshot } from '../shared/types';

let csrf = '';

/**
 * `uncertain` means the server may have applied the request: the connection dropped, the
 * server failed, or a success response could not be read. Only a readable 4xx answer is a
 * definitive rejection.
 */
export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public details?: ErrorDetails, public currentRevision?: number, public uncertain = false) { super(message); }
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers: body === undefined ? {} : { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('The connection dropped before Caminos could answer.', 0, 'NETWORK', undefined, undefined, true);
  }
  let result: unknown;
  try { result = await response.json(); } catch { result = undefined; }
  const payload = (result && typeof result === 'object' ? result : {}) as { error?: string | { message?: string; code?: string }; message?: string; code?: string; details?: ErrorDetails; currentRevision?: number };
  if (!response.ok) {
    const message = typeof payload.error === 'string' ? payload.error : payload.error?.message ?? payload.message ?? 'Unable to complete this request.';
    const code = payload.code ?? (typeof payload.error === 'object' ? payload.error?.code : undefined);
    throw new ApiError(message, response.status, code, payload.details, payload.currentRevision, response.status >= 500);
  }
  // A success status with an unreadable body is not proof of anything the caller can show.
  if (result === undefined || result === null || typeof result !== 'object') throw new ApiError('The server answered, but the response could not be read.', response.status, 'UNREADABLE_RESPONSE', undefined, undefined, true);
  return result as T;
}

export async function session() { const s = await api<{ authenticated: boolean; csrfToken: string; ownerConfigured?: boolean }>('/api/session'); csrf = s.csrfToken; return s; }
export async function login(password: string) { await session(); await api('/api/login', { password }); return session(); }
export async function logout() { await api('/api/logout', {}); csrf = ''; }
export async function snapshot() {
  const value = await api<Snapshot>('/api/snapshot');
  if (typeof value.revision !== 'number' || typeof value.serverNow !== 'string') throw new ApiError('The server answered, but the response could not be read.', 200, 'UNREADABLE_RESPONSE', undefined, undefined, true);
  return value;
}
export async function mutate(envelope: CommandEnvelope) {
  const value = await api<{ snapshot: Snapshot }>('/api/commands', envelope);
  if (!value.snapshot || typeof value.snapshot.revision !== 'number' || typeof value.snapshot.serverNow !== 'string') throw new ApiError('The server answered, but the response could not be read.', 200, 'UNREADABLE_RESPONSE', undefined, undefined, true);
  return value;
}
