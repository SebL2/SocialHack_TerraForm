import type {GameState} from './simulation';
import type {GlobalPlan} from './globalChapters';
import type {GlobalSiteId} from './globalLandscape';
export type GlobalEnvironmentSnapshot={month:number;plan:GlobalPlan[];values:number[];budget:number};
export type EnvironmentRun=
 |{kind:'sf';location:string;rain:number;before:GameState;steps:GameState[]}
 |{kind:'global';location:string;site:GlobalSiteId;before:GlobalEnvironmentSnapshot;steps:GlobalEnvironmentSnapshot[]};
export function environmentTimeline(history:EnvironmentRun[]){return history.flatMap((run,runIndex)=>run.steps.map((_,stepIndex)=>({run,runIndex,stepIndex})));}
export function historyStep(index:number,delta:number,length:number){return Math.max(0,Math.min(Math.max(0,length-1),index+delta));}

export function canBrowseEnvironmentHistory(history:EnvironmentRun[]){return history.filter(run=>run.steps.length>0).length>=2;}
