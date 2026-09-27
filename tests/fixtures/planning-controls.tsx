import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PlanningTaskPicker, type PlanningSelection, type PlanningTaskChoice } from '../../src/planning/PlanningTaskPicker';
import { PlanningWindowFields } from '../../src/planning/PlanningWindowFields';
import { ResetReview } from '../../src/planning/ResetReview';
import { EndDaySections } from '../../src/planning/EndDaySections';
import { WholeTemplatePreview } from '../../src/planning/WholeTemplatePreview';
import { PlanTodayForm, type PlanTodayDraft } from '../../src/planning/PlanTodayForm';
import type { WindowDraft } from '../../src/planning/windowDraft';
import '../../src/styles.css';
import './planning-controls.css';

// Test-only host. There is no backend, persistence, or production route for this fixture.
function Fixture() {
  const [tab, setTab] = useState('choices');
  const [events, setEvents] = useState<string[]>([]);
  const record = (event: string) => setEvents(values => [...values, event]);
  const [tasks, setTasks] = useState<PlanningTaskChoice[]>([{ id: 'alpha', title: 'Prepare sample proposal', duration: 45 }, { id: 'beta', title: 'Read sample notes' }, { id: 'gamma', title: 'Organize sample desk', duration: 15 }]);
  const [selection, setSelection] = useState<PlanningSelection>({ taskIds: [] });
  const [window, setWindow] = useState<WindowDraft>({ startDate: '2026-09-28', startTime: '09:00', endDate: '2026-09-28', endTime: '17:00' });
  const [plan, setPlan] = useState<PlanTodayDraft>({ date: '2026-09-28', selection: { taskIds: [] }, useWindow: false, window: { startDate: '', startTime: '', endDate: '', endTime: '' }, protectedSpareMinutes: '0' });
  const [revision, setRevision] = useState(12);
  const [pause, setPause] = useState(false);
  const [stop, setStop] = useState(false);
  const [tomorrow, setTomorrow] = useState(false);
  const [changedPlan, setChangedPlan] = useState('Existing synthetic reflection.');
  const [easierTomorrow, setEasierTomorrow] = useState('Existing synthetic next-day note.');
  const [journal, setJournal] = useState('Existing synthetic journal.');
  const [applied, setApplied] = useState(false);
  const [conflictsAcknowledged, setConflictsAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  return <main className="planning-fixture">
    <header className="planning-fixture-header"><h1>Planning controls</h1><p>Synthetic component fixture · no data is saved</p></header>
    <nav aria-label="Component fixture">{['choices', 'plan', 'reset', 'close', 'template'].map(name => <button type="button" key={name} aria-pressed={tab === name} onClick={() => setTab(name)}>{name}</button>)}</nav>
    <label><input type="checkbox" checked={busy} onChange={e => setBusy(e.target.checked)} /> Test pending save</label>
    {tab === 'choices' && <div className="planning-v3-stack">
      <PlanningWindowFields value={window} timezone="America/New_York" onChange={setWindow} disabled={busy} />
      <PlanningTaskPicker tasks={tasks} value={selection} onChange={setSelection} disabled={busy} onCreateTask={() => { setTasks(values => [...values, { id: `new-${values.length}`, title: 'New synthetic task' }]); record('create'); }} />
      <output aria-label="Selection draft">{JSON.stringify(selection)}</output>
    </div>}
    {tab === 'plan' && <><PlanTodayForm draft={plan} timezone="America/New_York" reviewedRevision={revision} tasks={tasks} onChange={setPlan} fixedCommitments={<p>No synthetic fixed commitments.</p>} capacity={<p>{plan.useWindow ? 'Capacity supplied by the caller' : 'Choose your available time to see capacity.'}</p>} disabled={busy} onSave={value => record(`save-plan:${value}`)} onCancel={() => record('cancel-plan')} /><output aria-label="Plan draft">{JSON.stringify(plan)}</output></>}
    {tab === 'reset' && <><button type="button" onClick={() => { setRevision(value => value + 1); setPause(false); }}>Replace preview</button>
      <ResetReview reviewedRevision={revision} remainingFromLabel="2:00 PM, America/New_York" nextFixedCommitment={<><h3>Next fixed commitment</h3><p>Sample appointment · 4:00–4:30 PM · unchanged</p></>} capacity={<p>Capacity supplied by the caller</p>} changes={[{ key: 'defer-beta', title: 'Read sample notes', action: 'Defer', before: 'Today · untimed', after: 'Tomorrow · untimed' }]} sessionConsequence={<p>Recording for Prepare sample proposal will pause. The task stays open.</p>} requiresPauseConfirmation pauseConfirmed={pause} onPauseConfirmedChange={setPause} disabled={busy} onApply={value => record(`apply:${value}`)} onCancel={() => record('cancel-reset')} />
    </>}
    {tab === 'close' && <EndDaySections dateLabel="Monday, September 28" commitments={<div className="planning-v3-card"><h3>Prepare sample proposal</h3><p>Unfinished · can stay open</p></div>} backlogCount={24} backlog={<ul>{Array.from({ length: 24 }, (_, index) => <li key={index}>Synthetic backlog task {index + 1}</li>)}</ul>} changedPlan={changedPlan} easierTomorrow={easierTomorrow} journal={journal} onChangedPlanChange={setChangedPlan} onEasierTomorrowChange={setEasierTomorrow} onJournalChange={setJournal} sessionConsequence={<p>Recording for Prepare sample proposal belongs to this day and will stop.</p>} requiresStopConfirmation stopConfirmed={stop} onStopConfirmedChange={setStop} planTomorrow={tomorrow} onPlanTomorrowChange={setTomorrow} disabled={busy} onKeepOpen={() => { record('keep-open'); setTab('choices'); }} onCloseDay={() => record(`close:${tomorrow}`)} />}
    {tab === 'template' && <WholeTemplatePreview title="Sample day" dateLabel="Tuesday, September 29" timezone="America/New_York" reviewedRevision={revision} items={[{ key: 'stable-row-a', title: 'Sample preparation', timeLabel: '9:00–9:30 AM', kindLabel: 'Routine', alreadyApplied: true, conflicts: [] }, { key: 'stable-row-b', title: 'Sample administration', timeLabel: '2:00–2:30 PM', kindLabel: 'Task', alreadyApplied: applied, conflicts: ['Sample appointment, 2:15–2:45 PM (fixed)'] }]} capacity={<p>Capacity supplied by the caller</p>} conflictsAcknowledged={conflictsAcknowledged} onConflictsAcknowledgedChange={setConflictsAcknowledged} disabled={busy} onApply={value => { record(`template:${value}`); setApplied(true); }} onCancel={() => record('cancel-template')} />}
    <output aria-label="Callback events">{JSON.stringify(events)}</output>
  </main>;
}

createRoot(document.getElementById('root')!).render(<Fixture />);
