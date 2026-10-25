import {describe,it,expect} from 'vitest';
import {environmentTimeline,historyStep,canBrowseEnvironmentHistory,type EnvironmentRun} from './environmentHistory';
import {createGame,advanceQuarter} from './simulation';
import {GLOBAL_SITES,globalPatchPlayable} from './globalLandscape';
import {createGlobalRun,queueGlobalPiece,submitGlobalRun,advanceGlobalRun} from './globalRun';
import {createRuntimeProgress} from './runtimeProgress';
describe('environment run history',()=>{
 for(const level of ['sf','senegal','mongolia','indonesia'] as const){
  it(`${level}: keeps navigation locked for the first run regardless of its snapshot count`,()=>{
   const state=createGame();
   const run:EnvironmentRun=level==='sf'?{kind:'sf',location:level,rain:35,before:state,steps:Array.from({length:4},()=>state)}:{kind:'global',location:level,site:level,before:{month:0,plan:[],values:[0,0,0],budget:100},steps:Array.from({length:12},(_,n)=>({month:(n+1)*3,plan:[],values:[0,0,0],budget:100}))};
   expect(canBrowseEnvironmentHistory([])).toBe(false);
   expect(canBrowseEnvironmentHistory([run])).toBe(false);
   expect(canBrowseEnvironmentHistory([run,{...run,steps:[]}])).toBe(false);
   expect(canBrowseEnvironmentHistory([run,structuredClone(run)])).toBe(true);
  });
 }

 it('browses quarterly snapshots across separate SF attempts without replacing their baselines',()=>{
  const first=createGame(),firstStep=advanceQuarter(first),secondStep=advanceQuarter(firstStep),restart=createGame();
  const history:EnvironmentRun[]=[{kind:'sf',location:'SF',rain:35,before:first,steps:[firstStep,secondStep]},{kind:'sf',location:'SF',rain:35,before:restart,steps:[advanceQuarter(restart)]}];
  const timeline=environmentTimeline(history);
  expect(timeline.map(v=>[v.runIndex,v.stepIndex])).toEqual([[0,0],[0,1],[1,0]]);
  expect(timeline[1].run.before).toBe(first);expect(timeline[2].run.before).toBe(restart);
  expect(historyStep(2,-1,timeline.length)).toBe(1);expect(historyStep(0,-1,3)).toBe(0);expect(historyStep(2,1,3)).toBe(2);expect(historyStep(0,1,0)).toBe(0);
 });
 it('captures twelve immutable global steps and starts a new run without erasing them',()=>{
  const id='senegal',tiles=GLOBAL_SITES[id].classes.flatMap((_,n)=>globalPatchPlayable(id,n)?[n]:[]);
  let run=submitGlobalRun(id,queueGlobalPiece(id,createGlobalRun(id),tiles[0],0));
  for(let i=0;i<12;i++)run=advanceGlobalRun(id,run);
  const saved=structuredClone(run.steps),history:EnvironmentRun[]=[{kind:'global',location:'Senegal',site:id,before:{month:0,plan:[],values:[18,14,45],budget:100},steps:run.steps}];
  run=submitGlobalRun(id,queueGlobalPiece(id,run,tiles[1],1));run=advanceGlobalRun(id,run);
  expect(history[0].steps).toEqual(saved);expect(run.steps).toHaveLength(1);expect(run.steps[0].month).toBe(39);
  expect(saved.map(v=>v.month)).toEqual([3,6,9,12,15,18,21,24,27,30,33,36]);
  const runtime=createRuntimeProgress();runtime.saveLevel(id,{run,environmentHistory:history,selected:null,plan:[],choice:0,values:run.values,season:run.season,running:true,explanation:null,guide:false,notice:''});
  expect(runtime.loadLevel(id)?.environmentHistory).toEqual(history);
 });
});
