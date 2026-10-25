import {ACTIONS,curveNumber,runoffMm,CELL_AREA} from './simulation';
import {GLOBAL_RULES} from './globalChapters';
import type {EnvironmentRun} from './environmentHistory';
export function environmentTileDetails(run:EnvironmentRun,stepIndex:number,id:number){
 if(!Number.isInteger(id)||id<0||id>=144)return null;
 if(run.kind==='sf'){
  const cell=run.steps[stepIndex]?.cells[id],old=run.before.cells[id];if(!cell||!old)return null;
  const action=cell.project?.action||cell.intervention;if(!action)return null;
  const status=cell.project?(cell.project.startsIn?`Queued · starts in ${cell.project.startsIn} months`:`Under construction · ${cell.project.remaining} months remaining`):action==='restore'?`Growing · ${cell.age} months old`:action==='protect'?'Protected green space':'Construction complete';
  const saved=(runoffMm(run.rain,curveNumber(old))-runoffMm(run.rain,curveNumber(cell)))*CELL_AREA/1000;
  const detail=action==='restore'?`Tree condition: ${Math.round(cell.condition*100)}%.`:action==='protect'?'Existing vegetation is being preserved.':`${Math.abs(saved).toFixed(2)} m³ ${saved>=0?'less':'more'} modeled runoff in the same storm.`;
  return{title:ACTIONS[action].title,tile:`Tile ${id%12+1}, ${Math.floor(id/12)+1}`,status,detail};
 }
 const after=run.steps[stepIndex],item=after?.plan.find(p=>p.patch===id);if(!item)return null;
 const choice=GLOBAL_RULES[run.site].choices[item.choice],existing=run.before.plan.some(p=>p.patch===id&&p.choice===item.choice);
 return{title:choice.name,tile:`Tile ${id%12+1}, ${Math.floor(id/12)+1}`,status:`${existing?'From an earlier run':'Added this run'} · year ${Number((after.month/12).toFixed(1))}`,detail:choice.result};
}
