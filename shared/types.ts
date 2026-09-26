export type Area = 'personal' | 'company';
export type Tag = 'Personal' | 'Work';
export type NavId = 'home' | 'schedule' | 'goals' | 'more';
export interface Base { id:string; createdAt:string; updatedAt:string; archived?:boolean }
export interface Task extends Base {title:string; duration:number; tag:Tag; labels:string[]; goalId?:string; notes:string; status:'open'|'complete'|'partial'; remainingTaskId?:string}
export interface Block extends Base {taskId?:string; title:string; kind:'task'|'appointment'|'routine'; tag:Tag; start:string; end:string; notes:string; status:'pending'|'complete'|'missed'|'partial'|'attended'|'cancelled'; snoozedUntil?:string; actualStart?:string; actualEnd?:string; conflictReviewed?:boolean}
export interface Day extends Base {date:string; startedAt?:string; endedAt?:string; mood?:number; energy?:number; note:string; summary:string; journal:string; summaryEdited?:boolean}
export interface Goal extends Base {title:string; parentId?:string; targetDate:string; notes:string; status:'active'|'paused'|'completed'|'archived'; checked:boolean; pinned:boolean}
export type LogKind = 'steps'|'weight'|'workout'|'sleep'|'food'|'rocket';
export interface HealthLog extends Base {kind:LogKind; at:string; value?:number; duration?:number; start?:string; end?:string; quality?:number; category:string; description:string; notes:string}
export interface Reminder extends Base {title:string; body:string; startsAt:string; expiresAt?:string; pinned:boolean; dismissed:boolean; source:'owner'|'ai'}
export interface Ledger {area:Area; account:number; cash:number; earned:number; lost:number}
export interface Envelope extends Base {area:Area; title:string; amount:number; purpose:string; expiresAt:string; notes:string; status:'active'|'earned'|'lost'|'handled'|'cancelled'; resolvedAt?:string}
export interface Adjustment extends Base {area:Area; reason:string; before:Ledger; after:Ledger}
export interface TemplateBlock {title:string; kind:'task'|'appointment'|'routine'; tag:Tag; startMinute:number; duration:number; notes:string}
export interface DayTemplate extends Base {title:string; blocks:TemplateBlock[]}
export interface WeatherLocation extends Base {name:string; latitude:number; longitude:number; primary:boolean; postcode?:string}
export interface Settings {timezone:string; name:string; currency:'USD'; navOrder?:NavId[]}
export interface State {revision:number; settings:Settings; tasks:Task[]; blocks:Block[]; days:Day[]; goals:Goal[]; logs:HealthLog[]; reminders:Reminder[]; ledgers:Ledger[]; envelopes:Envelope[]; adjustments:Adjustment[]; templates:DayTemplate[]; locations:WeatherLocation[]}
export interface Snapshot extends State {serverNow:string}
type Draft<T extends Base> = Omit<T,'id'|'createdAt'|'updatedAt'> & {id?:string};
export type Command =
 | {type:'task.save'; task:Draft<Task>}
 | {type:'block.save'; block:Draft<Block>}
 | {type:'block.start'; id:string}
 | {type:'block.resolve'; id:string; outcome:'complete'|'missed'|'partial'|'attended'|'cancelled'; remainingDuration?:number; remainingStart?:string}
 | {type:'block.snooze'; id:string; until:string}
 | {type:'block.conflictReviewed'; id:string}
 | {type:'day.start'; date:string; mood?:number; energy?:number; note?:string; wakeAt?:string}
 | {type:'day.reopen'; id:string}
 | {type:'day.end'; id:string; summary?:string; journal?:string}
 | {type:'day.save'; id?:string; date?:string; summary:string; journal:string; note?:string}
 | {type:'day.checkin'; id:string; mood?:number; energy?:number; note?:string; wakeAt?:string}
 | {type:'day.regenerate'; id:string}
 | {type:'goal.save'; goal:Draft<Goal>}
 | {type:'log.save'; log:Draft<HealthLog>}
 | {type:'reminder.save'; reminder:Draft<Reminder>}
 | {type:'ledger.adjust'; area:Area; account:number; cash:number; earned:number; lost:number; reason:string}
 | {type:'envelope.create'; envelope:Omit<Draft<Envelope>,'status'|'resolvedAt'>}
 | {type:'envelope.resolve'; id:string; outcome:'earned'|'lost'|'extend'|'handled'|'cancelled'; expiresAt?:string}
 | {type:'template.save'; template:Draft<DayTemplate>}
 | {type:'template.apply'; id:string; date:string}
 | {type:'location.save'; location:Draft<WeatherLocation>}
 | {type:'record.archive'; collection:'tasks'|'blocks'|'goals'|'logs'|'reminders'|'templates'|'locations'; id:string; archived:boolean}
 | {type:'settings.save'; name:string; timezone:string; navOrder?:NavId[]};
export interface CommandEnvelope {requestId:string; baseRevision:number; command:Command}
export interface WeatherData {locationId:string; temperature:number|null; shortForecast:string; high:number|null; low:number|null; precipitation:number|null; fetchedAt:string; stale:boolean; attribution:string; periods:{name:string; temperature:number; forecast:string}[]}
