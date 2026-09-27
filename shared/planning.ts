import { notImplemented, type CommandContext } from './domain-core';
import type { Command } from './types';

export type PlanningCommand = Extract<Command, { type: 'dayPlan.save' | 'task.defer' | 'task.plan' | 'plan.apply' }>;

/** Day plans, placements and reviewed plan changes. Mutates the cloned state in `context`; the caller owns the revision. */
export function applyPlanningCommand(_context: CommandContext, command: PlanningCommand): void {
  notImplemented(command.type);
}
