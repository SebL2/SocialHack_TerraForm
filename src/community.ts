import {ACTIONS,CELL_AREA,advanceQuarter,applyAction,canAct,createGame,curveNumber,metrics,runoffMm,type Action,type GameState} from './simulation';
export type Phase='practice'|'challenge';
export type PlanItem={id:number;action:Action};
export type Schedule='together'|'staggered';
export const SCENARIOS=[{name:'A neighborhood for everyone',budget:100,rain:35,threshold:75,reserveQuarters:4},{name:'A wetter season',budget:100,rain:60,threshold:80,reserveQuarters:6}] as const;
export type CommunityScore={total:number;environment:number;community:number;economy:number;passed:boolean;reserve:number;reserveCovered:boolean;accessOpen:boolean;variety:number;waterTarget:number;maxConcurrent:number;residents:{name:string;role:string;points:number;max:number;reaction:string}[];reasons:string[]};
export type Checkpoint={label:string;state:GameState};
export type RunReport={phase:Phase;level:number;before:GameState;final:GameState;plan:PlanItem[];schedule:Schedule;checkpoints:Checkpoint[];score:CommunityScore;cost:number;upkeep:number;explanations:Explanation[]};
export type Explanation={title:string;area:number;waterSaved:number;environment:string;community:string;economy:string;};
export function freshScenario(level=0){const state=createGame();state.budget=SCENARIOS[level].budget;state.history[0].budget=state.budget;return state;}
export function planCost(plan:PlanItem[]){return plan.reduce((sum,p)=>sum+ACTIONS[p.action].cost,0);}
export function placeInPlan(before:GameState,plan:PlanItem[],id:number,action:Action,schedule:Schedule):PlanItem[]{
 const previous=plan.find(p=>p.id===id);
 if(previous?.action===action)return plan;
 const next=previous?plan.map(p=>p.id===id?{id,action}:p):[...plan,{id,action}];
 preparePlan(before,next,schedule);
 return next;
}
export function preparePlan(before:GameState,plan:PlanItem[],schedule:Schedule){let state=before;const seen=new Set<number>();let buildingIndex=0;for(const p of plan){if(seen.has(p.id))throw new Error('A patch can only have one intervention.');seen.add(p.id);const error=canAct(state,p.id,p.action);if(error)throw new Error(error);state=applyAction(state,p.id,p.action);if(p.action!=='protect'){if(schedule==='staggered')state.cells[p.id].project!.startsIn=buildingIndex*3;buildingIndex++;}}return state;}
function overlap(plan:PlanItem[],schedule:Schedule){const jobs=plan.filter(p=>p.action!=='protect').map((p,i)=>({...p,start:schedule==='staggered'?i*3:0}));let max=0,paths=0;for(let month=0;month<=jobs.length*3;month++){const active=jobs.filter(p=>month>=p.start&&month<p.start+3);max=Math.max(max,active.length);paths=Math.max(paths,active.filter(p=>p.action==='housing').length);}return {max,paths};}
export function scoreCommunity(before:GameState,final:GameState,plan:PlanItem[],schedule:Schedule,level=0):CommunityScore{
 const scenario=SCENARIOS[level],types=new Set(plan.map(p=>p.action)),completed=plan.filter(p=>final.cells[p.id].intervention===p.action),trees=completed.filter(p=>p.action==='restore'),protectedPlots=completed.filter(p=>p.action==='protect'),paths=completed.filter(p=>p.action==='housing');
 const treeCondition=trees.length?trees.reduce((n,p)=>n+final.cells[p.id].condition,0)/trees.length:0;
 const establishment=trees.length?trees.reduce((n,p)=>n+Math.min(1,final.cells[p.id].age/60)*final.cells[p.id].condition,0)/trees.length:0;
 const waterTarget=2*(runoffMm(scenario.rain,92)-runoffMm(scenario.rain,78))*CELL_AREA/1000;
 const waterSaved=metrics(final,scenario.rain).current-metrics(before,scenario.rain).current;
 const waterPoints=25*Math.min(1,Math.max(0,-waterSaved)/Math.max(.001,waterTarget));
 const naturePoints=Math.min(15,15*establishment+Math.min(10,protectedPlots.length*10));
 const environment=Math.round(waterPoints+naturePoints),activity=overlap(plan,schedule),accessOpen=activity.paths<=1;
 const visitor=Math.round(Math.min(15,(trees.length?8*treeCondition:0)+(paths.length?7:0)+(protectedPlots.length?5:0)));
 const worker=plan.length?Math.max(0,10-4*Math.max(0,activity.max-1)):0;
 const caretaker=trees.length?Math.round(10*treeCondition):protectedPlots.length?10:plan.length?5:0;
 const reserve=trees.length*scenario.reserveQuarters,reserveCovered=final.budget>=reserve;
 const economy=plan.length?Math.round(25*(reserve===0?1:Math.min(1,final.budget/reserve))):0;
 const community=visitor+worker+caretaker,total=plan.length?Math.min(100,environment+community+economy):0;
 const residents=[
  {name:'Maya',role:'Park visitor',points:visitor,max:15,reaction:trees.length&&paths.length?'The plan adds planting and improves a path. That supports both comfort and getting around.':trees.length?'The new planting is establishing. Comfortable shade will take longer to develop.':paths.length?'The path is improved. I would also like the plan to care for the park’s greenery.':protectedPlots.length?'I’m glad the existing green space is protected. Could we also improve a route or add planting?':'The runoff work helps, but my comfort and route needs are still unmet.'},
  {name:'Luis',role:'Nearby worker',points:worker,max:10,reaction:activity.max<=1?'Works were staggered: only one construction patch was active at a time. Local access faced less simultaneous disruption.':`${activity.max} construction patches were active together. The work created illustrative installation tasks, but also overlapping disruption.`},
  {name:'Sam',role:'Park caretaker',points:caretaker,max:10,reaction:trees.length?(treeCondition>=.8?'The new planting stayed in good condition with care.': 'Some new planting lost condition. Maintenance needs attention.'):(protectedPlots.length?'Protecting established vegetation keeps an existing asset in place.':'The plan improves surfaces, but does little to establish or protect vegetation.')},
 ];
 const reasons:string[]=[];if(total<scenario.threshold)reasons.push(`Reach ${scenario.threshold} pleased points (currently ${total}).`);if(types.size<2)reasons.push('Use at least two intervention types.');if(!accessOpen)reasons.push('Stagger path works: this scenario allows only one path patch under construction at a time.');if(!reserveCovered)reasons.push(`Keep ${reserve} credits for the next ${scenario.reserveQuarters*3} months of tree care.`);if(!plan.length)reasons.push('Add interventions to your plan.');
 return {total,environment,community,economy,passed:reasons.length===0,reserve,reserveCovered,accessOpen,variety:types.size,waterTarget,maxConcurrent:activity.max,residents,reasons};
}
export function explainSelection(before:GameState,final:GameState,item:PlanItem,rain:number):Explanation{
 const a=before.cells[item.id],b=final.cells[item.id];const waterSaved=(runoffMm(rain,curveNumber(a))-runoffMm(rain,curveNumber(b)))*CELL_AREA/1000;
 const details:Record<Action,{environment:string;community:string;economy:string}>={
  retrofit:{environment:'The paved curb cell became a planted rain-garden cell. Its assumed curve number changed from 92 to 78, lowering generated runoff in the benchmark storm.',community:'The planted bed offers a public-space improvement and an installation task. Its design footprint occupies space; actual drainage connections and accessibility have not been assessed.',economy:'Installation used 18 credits. This prototype does not yet charge rain-garden upkeep; real projects would need it.'},
  restore:{environment:'Trees established on the park edge. Their runoff parameter improves gradually with age and condition. The young planting is not treated as mature canopy.',community:'Maya values planting near public space. Future shade is an illustrative comfort opportunity, not a calculated temperature or health benefit.',economy:'Planting used 12 credits. Each planted patch costs 1 additional credit per quarter. Skipping care reduces planting condition.'},
  housing:{environment:'A mapped paved park-path cell was replaced with assumed porous paving, changing its curve number from 92 to 78. The houses were preserved.',community:'The improved route addresses Maya’s access priority. During construction, this path patch was temporarily affected; simultaneous path works can violate the scenario access rule.',economy:'The path upgrade used 15 credits and creates one illustrative installation task. Material lifetime and ongoing paving maintenance are outside this prototype.'},
  protect:{environment:'Existing green space was protected. Protection prevents later conversion in this scenario; it does not create an immediate runoff reduction.',community:'Maya and Sam value retaining established vegetation. This choice preserves an existing asset instead of adding a new one.',economy:'Protection used 6 scenario credits. It creates no construction task or new planting upkeep in this model.'},
 };
 return {title:ACTIONS[item.action].title,area:CELL_AREA,waterSaved,...details[item.action]};
}
export function buildReport(before:GameState,final:GameState,plan:PlanItem[],schedule:Schedule,phase:Phase,level:number,checkpoints:Checkpoint[]):RunReport{const cost=planCost(plan);return {before,final,plan,schedule,phase,level,checkpoints,score:scoreCommunity(before,final,plan,schedule,level),cost,upkeep:before.budget-final.budget-cost,explanations:plan.map(p=>explainSelection(before,final,p,SCENARIOS[level].rain))};}
export function forecast(before:GameState,plan:PlanItem[],schedule:Schedule,level=0){let state=preparePlan(before,plan,schedule);const checkpoints:Checkpoint[]=[{label:'Construction',state}];for(let i=0;i<12;i++){state=advanceQuarter(state,SCENARIOS[level].rain);if(i===3)checkpoints.push({label:'One year',state});}checkpoints.push({label:'Three years',state});return buildReport(before,state,plan,schedule,'challenge',level,checkpoints);}
