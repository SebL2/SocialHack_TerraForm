import {describe,it,expect} from 'vitest';
import {GLOBAL_SITES,globalPatchPlayable,type GlobalSiteId} from './globalLandscape';
import {GLOBAL_RULES,GLOBAL_RUN_SEASONS} from './globalChapters';
import {advanceGlobalRun,createGlobalRun,queueGlobalPiece,submitGlobalRun} from './globalRun';
import {createRuntimeProgress} from './runtimeProgress';
for(const id of ['senegal','mongolia','indonesia'] as GlobalSiteId[]){
 describe(`${id} planning and simulation flow`,()=>{
  const tiles=GLOBAL_SITES[id].classes.flatMap((_,patch)=>globalPatchPlayable(id,patch)?[patch]:[]);
  it('clears only the queue on submit, charges once, and keeps the submitted pieces visible',()=>{
   let run=createGlobalRun(id);run=queueGlobalPiece(id,run,tiles[0],0);run=queueGlobalPiece(id,run,tiles[1],1);
   const next=submitGlobalRun(id,run);
   expect(next.queue).toEqual([]);expect(next.applied).toEqual(run.queue);expect(next.lastPlan).toEqual(run.queue);
   expect(next.budget).toBe(100-GLOBAL_RULES[id].choices[0].cost-GLOBAL_RULES[id].choices[1].cost-4);
   expect(submitGlobalRun(id,next)).toBe(next);expect(()=>queueGlobalPiece(id,next,tiles[2],2)).toThrow('Wait');
  });
  it('finishes after twelve seasons and supports another plan on the changed landscape',()=>{
   let run=submitGlobalRun(id,queueGlobalPiece(id,createGlobalRun(id),tiles[0],0));
   for(let s=0;s<GLOBAL_RUN_SEASONS-1;s++)run=advanceGlobalRun(id,run);
   expect(run.running).toBe(true);run=advanceGlobalRun(id,run);expect(run.running).toBe(false);expect(run.hasRun).toBe(true);
   expect(run.season).toBe(12);expect(run.values.every(v=>Number.isFinite(v)&&v>=0&&v<=100)).toBe(true);
   expect(()=>queueGlobalPiece(id,run,tiles[0],1)).toThrow('completed');
   const previous=run;run=submitGlobalRun(id,queueGlobalPiece(id,run,tiles[1],1));
   expect(run.before).toEqual(previous.values);expect(run.beforePlan).toEqual(previous.applied);expect(run.applied).toHaveLength(2);
   for(let s=0;s<12;s++)run=advanceGlobalRun(id,run);
   expect(run.running).toBe(false);expect(run.season).toBe(24);expect(run.queue).toEqual([]);
  });
  it('restores a partially completed run without losing its submitted pieces or budget',()=>{
   const run=advanceGlobalRun(id,submitGlobalRun(id,queueGlobalPiece(id,createGlobalRun(id),tiles[0],0)));
   const runtime=createRuntimeProgress();runtime.saveLevel(id,{run,selected:null,plan:[],choice:0,values:run.values,season:run.season,running:true,explanation:null,guide:false,notice:''});
   const restored=runtime.loadLevel(id)!.run!;expect(restored).toEqual(run);
   expect(advanceGlobalRun(id,restored).budget).toBe(run.budget);expect(restored.applied).toHaveLength(1);
  });
 });
}
