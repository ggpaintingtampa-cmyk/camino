import { clipInterval, localDayRange } from '../../shared/capacity';
import { dateKey } from '../../shared/dates';
import { pendingBookingForTask } from '../../shared/planning';
import type { Block, SessionTarget, State, Task } from '../../shared/types';

/**
 * The direct task actions every screen shares. The shell owns their dialogs and sends the
 * commands, so a screen never builds its own start, switch or outcome logic.
 */
export interface TaskActions {
  /** Starts, or resumes paused work. Asks before pausing other running work. */
  start: (target: SessionTarget) => void;
  pause: (sessionId: string) => void;
  stop: (sessionId: string) => void;
  /** Records a complete outcome at once. */
  complete: (task: Task) => void;
  /** Opens the outcome choices: done, partly done, stop recording. */
  outcome: (task: Task, mode?: 'choices' | 'partial') => void;
  details: (taskId: string) => void;
  /** Opens the placement editor for the task. Nothing is booked until it is confirmed there. */
  plan: (task: Task) => void;
  capture: () => void;
  /** Outcome of a calendar entry: routine, appointment, or a booked task. */
  resolveBlock: (block: Block) => void;
  busy: boolean;
}

/**
 * The booking a new interval records under. A task booked for today starts under that
 * booking; a booking on another day stays untouched and the work is recorded unscheduled.
 * A routine always records under its own entry, which the domain fills in.
 */
export function bookingForStart(state: State, target: SessionTarget, now: string): string | undefined {
  if (target.kind === 'routine') return undefined;
  const booking = pendingBookingForTask(state, target.taskId);
  if (!booking) return undefined;
  const zone = state.settings.timezone;
  return clipInterval(booking, localDayRange(dateKey(now, zone), zone)) ? booking.id : undefined;
}

export function targetTitle(state: State, target: SessionTarget): string {
  return target.kind === 'task'
    ? state.tasks.find(task => task.id === target.taskId)?.title ?? 'this task'
    : state.blocks.find(block => block.id === target.blockId)?.title ?? 'this routine';
}
