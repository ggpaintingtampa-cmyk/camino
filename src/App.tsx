import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, Bell, BellRing, Book, Calendar, ChevronRight, CircleAlert, CloudSunRain, Cog, Compass, Gamepad, Heart, HeartPulse, LayoutGrid, LogOut, Mail, Moon, Plus, RefreshCw, Rocket, Sun, Target, Wallet, type LucideIcon } from 'lucide-react';
import type { TaskView } from '../shared/contracts';
import { openDay } from '../shared/domain-core';
import { effectiveNavOrder } from '../shared/navigation';
import { pendingBookingForTask } from '../shared/planning';
import { recordedMinutes, runningSession, sameTarget, unfinishedSessionForTarget } from '../shared/sessions';
import type { Block, SessionTarget, Task } from '../shared/types';
import * as api from './api';
import { DesktopRail, parseRoute, PhoneNavigation, routeHash, type View } from './components/AppNavigation';
import { SaveNotice } from './components/SaveNotice';
import { SwitchDialog } from './components/SwitchDialog';
import { bookingForStart, targetTitle, type TaskActions } from './components/taskActions';
import { TaskOutcomeDialog } from './components/TaskOutcomeDialog';
import { GoalsPage, HealthPage, HistoryPage, MoneyPage, RemindersPage, RocketPage, SettingsPage, WeatherPage } from './features';
import { HomePage } from './HomePage';
import { useCommandRunner } from './hooks/useCommandRunner';
import { MissingPage } from './MissingPage';
import { EndDayDialog, ResolveDialog, SchedulePage, StartDayDialog, TaskEditor, TemplatesPage } from './planning';
import { QuickCapture } from './planning/QuickCapture';
import { TaskDetails } from './planning/TaskDetails';
import { SetupPage } from './SetupPage';
import { TaskListPage } from './TaskListPage';
import { Modal, type PageProps } from './ui';

export type { View } from './components/AppNavigation';

/** Supporting tools, reached from More and from the desktop rail. None is needed for the daily loop. */
const TOOLS: { id: View; label: string; detail: string; icon: LucideIcon; rail?: boolean }[] = [
  { id: 'goals', label: 'Goals', detail: 'Longer paths and their next steps', icon: Target, rail: true },
  { id: 'health', label: 'Health', detail: 'Sleep, movement, meals and weight', icon: HeartPulse, rail: true },
  { id: 'rocket', label: 'Rocket League', detail: 'Practice with intention', icon: Rocket },
  { id: 'money', label: 'Envelopes', detail: 'Personal and company funds', icon: Mail, rail: true },
  { id: 'reminders', label: 'Reminders', detail: 'In-app reminders, shown while Caminos is open', icon: BellRing },
  { id: 'templates', label: 'Day templates', detail: 'A familiar rhythm to start from', icon: LayoutGrid },
  { id: 'missing', label: 'Review missing data', detail: 'A quiet catch-up, at your pace', icon: CircleAlert },
  { id: 'weather', label: 'Weather', detail: 'Home and the places you work', icon: CloudSunRain },
  { id: 'settings', label: 'Settings', detail: 'Personal preferences', icon: Cog },
];
/** Record types other than a task. A task has its own direct button. */
const ADD_OTHER: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'appointment', label: 'Appointment', icon: Calendar }, { id: 'goal', label: 'Goal', icon: Target }, { id: 'health', label: 'Health', icon: Heart },
  { id: 'food', label: 'Food', icon: Sun }, { id: 'rocket', label: 'Rocket League', icon: Gamepad }, { id: 'journal', label: 'Journal', icon: Book },
  { id: 'reminder', label: 'Reminder', icon: Bell }, { id: 'envelope', label: 'Envelope', icon: Wallet },
];
const ADD_DESTINATION: Record<string, View> = { goal: 'goals', health: 'health', food: 'health', rocket: 'rocket', journal: 'history', reminder: 'reminders', envelope: 'money' };
const TASK_VIEWS: readonly TaskView[] = ['all', 'today', 'later'];

class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error
      ? <div className="signin"><h1>A screen needs a fresh start.</h1><p>Your saved records are still on the server.</p><button onClick={() => location.reload()}>Reload Caminos</button></div>
      : this.props.children;
  }
}
export default function App() { return <Boundary><Caminos/></Boundary>; }

type EditorTarget = { task?: Task; block?: Block; appointment?: boolean; planning?: boolean };

function Caminos() {
  const [setupToken] = useState(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('token'));
  useEffect(() => { if (setupToken) history.replaceState(null, '', '#/setup'); }, [setupToken]);
  const [auth, setAuth] = useState<boolean | null>(null);
  const [ownerConfigured, setConfigured] = useState(true);
  const [password, setPassword] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState('');
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  const [addPage, setAddPage] = useState<{ id: View; kind?: string; key: number } | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string | undefined>();
  const [capture, setCapture] = useState(false);
  const [addOther, setAddOther] = useState(false);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [resolve, setResolve] = useState<Block | null>(null);
  const [dayDialog, setDayDialog] = useState<'start' | 'end' | null>(null);
  const [details, setDetails] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ taskId: string; mode: 'choices' | 'partial' } | null>(null);
  const [switching, setSwitching] = useState<{ target: SessionTarget; runningId: string } | null>(null);

  const runner = useCommandRunner({ enabled: auth === true, onSignedOut: useCallback(() => setAuth(false), []) });
  const { snapshot: state, now, run, runReviewed, busy } = runner;
  const view = route.view;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const session = await api.session();
        if (!alive) return;
        setConfigured(session.ownerConfigured !== false);
        setAuth(session.authenticated);
      } catch (error) { if (alive) { setSignInError((error as Error).message); setAuth(false); } }
    })();
    const onHash = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', onHash);
    return () => { alive = false; window.removeEventListener('hashchange', onHash); };
  }, []);

  // A switch was offered for a recording that has ended meanwhile: there is nothing left to pause.
  useEffect(() => { if (switching && state && !runningSession(state)) setSwitching(null); }, [switching, state]);

  const go = useCallback((id: View, kind?: string, params?: Record<string, string | undefined>) => {
    setAddPage(kind ? { id, kind, key: Date.now() } : null);
    const hash = routeHash(id, params);
    if (location.hash !== hash) location.hash = hash.slice(1);
    setRoute(parseRoute(hash));
    setCapture(false); setAddOther(false);
    document.querySelector('.content')?.scrollTo(0, 0);
  }, []);

  const actions = useMemo<TaskActions>(() => ({
    busy,
    start: target => {
      if (!state) return;
      const running = runningSession(state);
      if (running && !sameTarget(running.target, target)) { setSwitching({ target, runningId: running.id }); return; }
      const booking = bookingForStart(state, target, now);
      void run({ type: 'session.start', target, ...(booking ? { plannedBlockId: booking } : {}) }, { label: unfinishedSessionForTarget(state, target) ? 'Resume recording' : 'Start recording' });
    },
    pause: sessionId => { void run({ type: 'session.pause', id: sessionId }); },
    stop: sessionId => { void run({ type: 'session.stop', id: sessionId }); },
    complete: task => { void run({ type: 'task.resolve', id: task.id, outcome: 'complete' }, { label: 'Mark task done' }); },
    outcome: (task, mode = 'choices') => { setDetails(null); setOutcome({ taskId: task.id, mode }); },
    details: taskId => setDetails(taskId),
    plan: task => { setDetails(null); setEditor({ task, block: state ? pendingBookingForTask(state, task.id) : undefined, planning: true }); },
    capture: () => setCapture(true),
    resolveBlock: block => setResolve(block),
  }), [busy, state, now, run]);

  if (auth === null) return <div className="signin"><Compass size={40}/><h1>Caminos</h1><p>Opening your day…</p></div>;
  if (!auth && setupToken && !ownerConfigured) return <SetupPage token={setupToken} onReady={async () => { await api.session(); setConfigured(true); setAuth(true); }}/>;
  if (!auth) return <main className="signin">
    <div className="brand-mark"><Compass size={30}/></div>
    <p className="eyebrow">Your life. A little clearer.</p>
    <h1>Welcome to Caminos.</h1>
    <p className="muted">A private place for your days, goals and everything that matters.</p>
    <form className="stack" onSubmit={async event => {
      event.preventDefault(); setSigningIn(true); setSignInError('');
      try { await api.login(password); setPassword(''); setAuth(true); }
      catch (error) { setSignInError((error as Error).message); }
      finally { setSigningIn(false); }
    }}>
      <label className="field"><span>Your password</span><input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required/></label>
      <button disabled={signingIn || !ownerConfigured} className="primary">{signingIn ? 'Signing in…' : 'Open my day'}<ArrowRight size={18}/></button>
    </form>
    {runner.saveState.kind === 'signed-out' && <p className="notice warning" role="status">{runner.saveState.label}: {runner.saveState.message}</p>}
    {!ownerConfigured && <p className="notice">Your private account needs its initial setup before sign-in. Use the owner setup command on the server.</p>}
    {signInError && <p role="alert" className="notice warning">{signInError}</p>}
    <p className="suite-signature">by Morgan</p>
  </main>;
  if (!state) return <main className="signin"><h1>Opening your day…</h1>{!runner.online && <p>Caminos cannot reach the server right now.</p>}<button onClick={() => void runner.refresh()}>Try again</button></main>;

  const page: PageProps = { state, now, run, runReviewed, saveState: runner.saveState, add: addPage?.id === view, addKind: addPage?.kind };
  const activeDay = openDay(state);
  const order = effectiveNavOrder(state.settings);
  const running = runningSession(state);
  const initialTaskView = TASK_VIEWS.find(candidate => candidate === route.params.get('view')) ?? 'all';
  const outcomeTask = outcome ? state.tasks.find(task => task.id === outcome.taskId) : undefined;
  const pickAddOther = (kind: string) => { setAddOther(false); if (kind === 'appointment') { setEditor({ appointment: true }); return; } go(ADD_DESTINATION[kind], kind); };
  const signOut = async () => { await api.logout(); runner.reset(); setAuth(false); await api.session(); };

  return <div className="app redesign-v2 redesign-v3" data-view={view}>
    <a className="v3-skip" href="#main">Skip to content</a>
    <header className="brand-bar">
      <a href={routeHash('home')} className="brand" onClick={event => { event.preventDefault(); go('home'); }}><span className="brand-mark"><Compass size={23}/></span><span>Caminos<small>by Morgan</small></span></a>
      <button type="button" className={`day-toggle ${activeDay ? '' : 'day-start'}`} onClick={() => setDayDialog(activeDay ? 'end' : 'start')}>{activeDay ? <Moon size={17}/> : <Sun size={17}/>}<span>{activeDay ? 'End day' : 'Start day'}</span></button>
    </header>
    <DesktopRail order={order} view={view} onGo={go} secondary={TOOLS.filter(tool => tool.rail)}/>
    <main id="main" className="content" tabIndex={-1}>
      <div className={`page ${view === 'schedule' ? 'schedule-page' : ''}`} key={`${view}-${addPage?.key ?? ''}`}>
        <SaveNotice state={runner.saveState} busy={busy} online={runner.online} onRetry={() => void runner.retry()} onDismiss={runner.dismiss} onDiscardSignedOut={runner.discardSignedOut} onReconnect={() => void runner.refresh()}/>
        {view === 'home' ? <HomePage {...page} go={go} actions={actions} onStartDay={() => setDayDialog('start')} onChangePlan={date => { setScheduleDate(date); go('schedule'); }}/>
          : view === 'schedule' ? <SchedulePage {...page} initialDate={scheduleDate} onResolve={setResolve}/>
          : view === 'tasks' ? <TaskListPage {...page} actions={actions} initialView={initialTaskView} onViewChange={next => history.replaceState(null, '', routeHash('tasks', { view: next === 'all' ? undefined : next }))}/>
          : view === 'history' ? <HistoryPage {...page}/>
          : view === 'goals' ? <GoalsPage {...page}/>
          : view === 'health' ? <HealthPage {...page}/>
          : view === 'rocket' ? <RocketPage {...page}/>
          : view === 'money' ? <MoneyPage {...page}/>
          : view === 'reminders' ? <RemindersPage {...page}/>
          : view === 'weather' ? <WeatherPage {...page}/>
          : view === 'settings' ? <SettingsPage {...page}/>
          : view === 'templates' ? <TemplatesPage {...page}/>
          : view === 'missing' ? <MissingPage {...page}/>
          : <div className="v2-more v3-more">
              <h1>More</h1>
              <ul className="v3-tool-list">{TOOLS.map(({ id, label, detail, icon: Icon }) => <li key={id}><a href={routeHash(id)} onClick={event => { event.preventDefault(); go(id); }}><span className="destination-icon"><Icon size={20} aria-hidden="true"/></span><span><strong>{label}</strong><small>{detail}</small></span><ChevronRight size={18} aria-hidden="true"/></a></li>)}</ul>
              <div className="account-actions">
                <button type="button" onClick={() => void runner.refresh()}><RefreshCw size={17}/>Refresh</button>
                <a href="/api/export" download>Export my records</a>
                <button type="button" onClick={signOut}><LogOut size={17}/>Sign out</button>
              </div>
            </div>}
      </div>
    </main>
    <button type="button" className="add-button v3-add-task" onClick={() => setCapture(true)}><Plus size={20} aria-hidden="true"/><span>Task</span></button>
    <PhoneNavigation order={order} view={view} onGo={go}/>

    {capture && <Modal className="v3-sheet" title="Add a task" onClose={() => setCapture(false)}>
      <QuickCapture run={run} autoFocus onAddDetails={taskId => { setCapture(false); setDetails(taskId); }} onPlan={taskId => { const task = state.tasks.find(candidate => candidate.id === taskId); setCapture(false); if (task) setEditor({ task, planning: true }); }}/>
      <button type="button" className="text-button" onClick={() => { setCapture(false); setAddOther(true); }}>Add something else…</button>
    </Modal>}
    {addOther && <Modal className="add-menu-sheet" title="Add something else" onClose={() => setAddOther(false)}>
      <div className="add-grid">{ADD_OTHER.map(({ id, label, icon: Icon }) => <button type="button" key={id} onClick={() => pickAddOther(id)}><span className="add-tile-icon"><Icon size={22} aria-hidden="true"/></span><span>{label}</span></button>)}</div>
    </Modal>}
    {editor && <TaskEditor {...page} {...editor} onClose={() => setEditor(null)}/>}
    {details && <TaskDetails key={details} taskId={details} state={state} now={now} run={run} onClose={() => setDetails(null)} onPlan={actions.plan} onOutcome={actions.outcome} onStart={task => { setDetails(null); actions.start({ kind: 'task', taskId: task.id }); }} onPause={sessionId => { setDetails(null); actions.pause(sessionId); }}/>}
    {outcome && outcomeTask && <TaskOutcomeDialog key={outcome.taskId} task={outcomeTask} state={state} now={now} run={run} initialMode={outcome.mode} onClose={() => setOutcome(null)}/>}
    {switching && running && <SwitchDialog runningTitle={targetTitle(state, running.target)} runningMinutes={recordedMinutes(running, now)} targetTitle={targetTitle(state, switching.target)} verb={unfinishedSessionForTarget(state, switching.target) ? 'resume' : 'start'} busy={busy}
      onCancel={() => setSwitching(null)}
      onConfirm={async () => {
        const booking = bookingForStart(state, switching.target, now);
        // The switch names the recording the owner saw. If another one runs by now, the server refuses it.
        if (await run({ type: 'session.switch', expectedRunningSessionId: switching.runningId, target: switching.target, ...(booking ? { plannedBlockId: booking } : {}) })) setSwitching(null);
      }}/>}
    {dayDialog === 'start' && <StartDayDialog {...page} onClose={() => setDayDialog(null)}/>}
    {dayDialog === 'end' && activeDay && <EndDayDialog {...page} day={activeDay} onClose={() => setDayDialog(null)} onResolve={setResolve} onOpenTask={taskId => setDetails(taskId)} onPlanTomorrow={date => { setScheduleDate(date); setDayDialog(null); go('schedule'); }}/>}
    {resolve && <ResolveDialog block={state.blocks.find(block => block.id === resolve.id) ?? resolve} state={state} now={now} run={run} onClose={() => setResolve(null)}/>}
  </div>;
}
