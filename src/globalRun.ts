import type {GlobalEnvironmentSnapshot} from './environmentHistory';
import {GLOBAL_RULES,GLOBAL_RUN_SEASONS,simulateSeason,type GlobalPlan} from './globalChapters';
import {placeGlobalPlan} from './globalPlacement';
import type {GlobalSiteId} from './globalLandscape';
export type GlobalRunState={steps:GlobalEnvironmentSnapshot[];beforeBudget:number;queue:GlobalPlan[];applied:GlobalPlan[];lastPlan:GlobalPlan[];before:number[];beforePlan:GlobalPlan[];values:number[];budget:number;season:number;runStart:number;running:boolean;hasRun:boolean};
export function createGlobalRun(id:string):GlobalRunState{return {steps:[],beforeBudget:100,queue:[],applied:[],lastPlan:[],before:[...GLOBAL_RULES[id].baseline],beforePlan:[],values:[...GLOBAL_RULES[id].baseline],budget:100,season:0,runStart:0,running:false,hasRun:false};}
export function queueGlobalPiece(id:GlobalSiteId,state:GlobalRunState,patch:number,choice:number):GlobalRunState{
 if(state.running)throw new Error('Wait for this simulation to finish.');
 if(state.applied.some(p=>p.patch===patch))throw new Error('This tile already has a completed intervention. Choose another tile.');
 return {...state,queue:placeGlobalPlan(id,state.queue,patch,choice,state.budget)};
}
export function submitGlobalRun(id:string,state:GlobalRunState):GlobalRunState{
 if(state.running||!state.queue.length)return state;
 const cost=state.queue.reduce((sum,p)=>sum+GLOBAL_RULES[id].choices[p.choice].cost,0);
 if(cost+4>state.budget)throw new Error('Keep four credits for care.');
 return {...state,steps:[],beforeBudget:state.budget,before:[...state.values],beforePlan:[...state.applied],lastPlan:[...state.queue],applied:[...state.applied,...state.queue],queue:[],budget:state.budget-cost-4,runStart:state.season,running:true};
}
export function advanceGlobalRun(id:string,state:GlobalRunState):GlobalRunState{
 if(!state.running)return state;
 const season=state.season+1;
 const values=simulateSeason(id,state.values,state.applied,state.season);
 return {...state,values,steps:[...(state.steps||[]),{month:season*3,values,plan:structuredClone(state.applied),budget:state.budget}],season,running:season-state.runStart<GLOBAL_RUN_SEASONS,hasRun:season-state.runStart>=GLOBAL_RUN_SEASONS||state.hasRun};
}
