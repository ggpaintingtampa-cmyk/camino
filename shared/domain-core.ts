import type { ErrorDetails } from './contracts';
import type { Base, State } from './types';

export class DomainError extends Error {
  readonly statusCode: number;
  constructor(message: string, public readonly code = 'INVALID_COMMAND', public readonly status = 400, public readonly details?: ErrorDetails) {
    super(message); this.name = 'DomainError'; this.statusCode = status;
  }
}

/** One command works on one cloned state with one trusted command time. */
export interface CommandContext { state: State; now: string }

export function fail(message: string, code = 'INVALID_COMMAND', status = 400, details?: ErrorDetails): never { throw new DomainError(message, code, status, details); }
export function find<T extends { id: string }>(list: T[], id: string): T {
  const record = list.find(item => item.id === id);
  if (!record) fail('This record could not be found. Refresh and try again.', 'NOT_FOUND', 404);
  return record;
}
export function live<T extends Base>(list: T[], id: string): T {
  const record = find(list, id);
  if (record.archived) fail('Restore this record before changing it.', 'ARCHIVED', 409);
  return record;
}
export function createBase(now: string, id?: string): Base { return { id: id || crypto.randomUUID(), createdAt: now, updatedAt: now }; }
export function upsert<T extends Base>(list: T[], draft: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }, now: string): T {
  const old = draft.id ? list.find(item => item.id === draft.id) : undefined;
  const record = { ...draft, ...createBase(now, draft.id), createdAt: old?.createdAt || now } as T;
  if (old) list[list.indexOf(old)] = record; else list.push(record);
  return record;
}
export function bump(record: Base, now: string) { record.updatedAt = now; }
/** Declared in the contract, accepted by the schema, not yet delivered by its phase. Never a silent no-op. */
export function notImplemented(type: string): never { fail(`${type} is not available in this build yet.`, 'NOT_IMPLEMENTED', 501); }
