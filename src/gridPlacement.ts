import {gridPatch} from './gridLandscape';
import {placeInPlan,type PlanItem,type Schedule} from './community';
import type {Action,GameState} from './simulation';
export function placeOnGrid(state:GameState,plan:PlanItem[],id:number,action:Action,schedule:Schedule){
 const cell=state.cells[id];if(!cell||!gridPatch(cell,action).length)throw new Error('Choose a tile with a matching lawn, path or curb.');
 return placeInPlan(state,plan,id,action,schedule);
}
export function gridPlacementError(state:GameState,plan:PlanItem[],id:number,action:Action,schedule:Schedule):string|null{
 try{placeOnGrid(state,plan,id,action,schedule);return null;}catch(error){return error instanceof Error?error.message:'This tool cannot be placed here.';}
}
