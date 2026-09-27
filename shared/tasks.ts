import { notImplemented, type CommandContext } from './domain-core';
import type { Command } from './types';

export type TaskCommand = Extract<Command, { type: 'task.capture' | 'task.update' | 'task.resolve' | 'task.reopen' }>;

/** Task intent and explicit outcomes. Mutates the cloned state in `context`; the caller owns the revision. */
export function applyTaskCommand(_context: CommandContext, command: TaskCommand): void {
  notImplemented(command.type);
}
