import {GLOBAL_RULES,type GlobalPlan} from './globalChapters';
import {globalPatchPlayable,type GlobalSiteId} from './globalLandscape';
export function placeGlobalPlan(id:GlobalSiteId,plan:GlobalPlan[],patch:number,choice:number,budget=100,reserve=4){
 if(!globalPatchPlayable(id,patch))throw new Error('Choose open land; mapped buildings and water are protected.');
 const rules=GLOBAL_RULES[id];if(!rules.choices[choice])throw new Error('Choose a restoration tool.');
 const previous=plan.find(p=>p.patch===patch);
 const nextCost=plan.reduce((sum,p)=>sum+rules.choices[p.choice].cost,0)-(previous?rules.choices[previous.choice].cost:0)+rules.choices[choice].cost;
 if(nextCost>budget-reserve)throw new Error('Keep four credits for care. Choose a less expensive change or remove a piece.');
 return previous?.choice===choice?plan:previous?plan.map(p=>p.patch===patch?{patch,choice}:p):[...plan,{patch,choice}];
}
export function globalPlacementError(id:GlobalSiteId,plan:GlobalPlan[],patch:number,choice:number):string|null{try{placeGlobalPlan(id,plan,patch,choice);return null;}catch(error){return error instanceof Error?error.message:'This tool cannot be placed here.';}}
