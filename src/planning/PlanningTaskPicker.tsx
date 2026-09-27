import { useId, useState } from 'react';
import { Field } from '../ui';
import './planning-v3.css';

/** A read-only task projection. The caller filters eligible tasks with domain selectors. */
export interface PlanningTaskChoice { id: string; title: string; duration?: number }
export interface PlanningSelection { taskIds: string[]; mainTaskId?: string }
export interface PlanningTaskPickerProps {
  tasks: readonly PlanningTaskChoice[];
  value: PlanningSelection;
  onChange: (value: PlanningSelection) => void;
  onCreateTask?: () => void;
  onEditTask?: (taskId: string) => void;
  disabled?: boolean;
}

export function PlanningTaskPicker({ tasks, value, onChange, onCreateTask, onEditTask, disabled = false }: PlanningTaskPickerProps) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const byId = new Map(tasks.map(task => [task.id, task]));
  const choices = tasks.filter(task => !value.taskIds.includes(task.id) && task.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const remove = (taskId: string) => {
    onChange({ taskIds: value.taskIds.filter(item => item !== taskId), mainTaskId: value.mainTaskId === taskId ? undefined : value.mainTaskId });
    setAnnouncement('Task removed from these choices. The task itself is unchanged.');
  };
  const move = (index: number, direction: -1 | 1) => {
    const next = [...value.taskIds];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...value, taskIds: next });
    setAnnouncement(`${byId.get(value.taskIds[index])?.title ?? 'Task'} moved to priority ${target + 1}.`);
  };
  return <section className="planning-v3 planning-v3-stack" aria-labelledby={`${id}-title`}>
    <header><h2 id={`${id}-title`}>Choose what matters</h2><p className="planning-v3-muted">A main task is optional. Choices do not create calendar bookings.</p></header>
    <div className="planning-v3-announcement" role="status" aria-live="polite">{announcement}</div>
    {value.taskIds.length === 0 ? <p className="planning-v3-muted">No tasks chosen yet. You can leave this plan open.</p> : <ol className="planning-v3-selection">
      {value.taskIds.map((taskId, index) => {
        const task = byId.get(taskId);
        const title = task?.title ?? 'Unavailable task';
        const main = value.mainTaskId === taskId;
        return <li className={`planning-v3-card${main ? ' planning-v3-focus' : ''}`} key={taskId}>
          <span className="planning-v3-eyebrow">{main ? 'Main task' : `Priority ${index + 1}`}</span>
          <h3>{title}</h3>
          <p className="planning-v3-muted">{task ? task.duration === undefined ? 'Estimate not set' : `${task.duration} min estimated` : 'Review this choice before saving.'}</p>
          <div className="planning-v3-actions">
            <button type="button" aria-pressed={main} disabled={disabled || !task} onClick={() => onChange({ ...value, mainTaskId: main ? undefined : taskId })}>{main ? 'Clear main task' : 'Make main task'}</button>
            {onEditTask && task && <button type="button" disabled={disabled} onClick={() => onEditTask(taskId)}>Edit task</button>}
            <button type="button" disabled={disabled} aria-label={`Remove ${title} from plan`} onClick={() => remove(taskId)}>Remove</button>
          </div>
          <div className="planning-v3-actions" role="group" aria-label={`Priority for ${title}`}>
            <button type="button" disabled={disabled || index === 0} aria-label={`Move ${title} earlier`} onClick={() => move(index, -1)}>Move earlier</button>
            <button type="button" disabled={disabled || index === value.taskIds.length - 1} aria-label={`Move ${title} later`} onClick={() => move(index, 1)}>Move later</button>
          </div>
        </li>;
      })}
    </ol>}
    <Field label="Find a task"><input type="search" value={query} disabled={disabled} onChange={e => setQuery(e.target.value)} /></Field>
    <ul className="planning-v3-candidates" aria-label="Available tasks">
      {choices.map(task => <li key={task.id}><div><strong>{task.title}</strong><span className="planning-v3-muted">{task.duration === undefined ? 'Estimate not set' : `${task.duration} min estimated`}</span></div><button type="button" disabled={disabled} aria-label={`Choose ${task.title}`} onClick={() => { onChange({ ...value, taskIds: [...value.taskIds, task.id] }); setAnnouncement(`${task.title} added to your choices.`); }}>Choose</button></li>)}
    </ul>
    {!choices.length && <p className="planning-v3-muted">{query ? 'No matching tasks.' : 'No more tasks to choose.'}</p>}
    {onCreateTask && <button type="button" disabled={disabled} onClick={onCreateTask}>Create a task</button>}
  </section>;
}
