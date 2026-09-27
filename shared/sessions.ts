import { notImplemented, type CommandContext } from './domain-core';
import type { Command } from './types';

export type SessionCommand = Extract<Command, { type: 'session.start' | 'session.pause' | 'session.resume' | 'session.switch' | 'session.stop' }>;

/** Recorded work. Mutates the cloned state in `context`; the caller owns the revision. */
export function applySessionCommand(_context: CommandContext, command: SessionCommand): void {
  notImplemented(command.type);
}
