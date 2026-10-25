import type {EnvironmentRun} from './environmentHistory';
import type {GlobalRunState} from './globalRun';
import type {ChapterId,GlobalPlan} from './globalChapters';
export type GlobalRunProgress={environmentHistory?:EnvironmentRun[];run?:GlobalRunState;view?:'grid'|'bev';rotation?:number;zoom?:number;armed?:number|null;selected:number|null;plan:GlobalPlan[];choice:number;values:number[];season:number;running:boolean;explanation:number|null;guide:boolean;notice:string};
// Owned by the mounted App. No browser storage: a reload creates a new run.
export function createRuntimeProgress(){
 const levels=new Map<ChapterId,GlobalRunProgress>();
 return {
  unlocked:0,tutorialComplete:false,sfStarted:false,sfWasRunning:false,
  unlock(level:number){this.unlocked=Math.max(this.unlocked,Math.min(3,level));return this.unlocked;},
  saveLevel(id:ChapterId,progress:GlobalRunProgress){levels.set(id,structuredClone(progress));},
  loadLevel(id:ChapterId){const progress=levels.get(id);return progress?structuredClone(progress):undefined;},
  hasLevel(id:ChapterId){return id==='sf'?this.sfStarted:levels.has(id);},
 };
}
