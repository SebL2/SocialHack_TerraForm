import {useState,type ReactNode} from 'react';
import {Check,ChevronDown,Flag} from 'lucide-react';
import type {CommunityScore,Phase,PlanItem,Schedule} from './community';
type Props={phase:Phase;threshold:number;reserveQuarters:number;plan:PlanItem[];schedule:Schedule;score?:CommunityScore|null;practiceDone:boolean;children?:ReactNode};
export function MissionObjectives({phase,threshold,reserveQuarters,plan,schedule,score,practiceDone,children}:Props){

 const treeCount=plan.filter(p=>p.action==='restore').length;
 const objectives=phase==='practice'?[
  {text:'Place a change on a tile',met:plan.length>0||practiceDone},
  {text:'Submit & see one year ahead',met:practiceDone},
 ]:[
  {text:`Reach ${threshold}+ pleased points`,met:!!score&&score.total>=threshold},
  {text:'Use at least 2 choice types',met:new Set(plan.map(p=>p.action)).size>=2},
  {text:'Keep path work staggered',met:score?score.accessOpen:schedule==='staggered'||plan.filter(p=>p.action==='housing').length<=1},
  {text:`Fund ${reserveQuarters*3} months of tree care${treeCount?` · ${treeCount*reserveQuarters} cr`:''}`,met:!!score&&score.reserveCovered},
 ];
 return <ObjectivesPanel objectives={objectives} name="Harry" score={phase==='challenge'?score?.total:null} showScore={phase==='challenge'}>{children}</ObjectivesPanel>;
}
export function ObjectivesPanel({objectives,name,score,showScore=true,children}:{objectives:{text:string;met:boolean}[];name:string;score?:number|null;showScore?:boolean;children?:ReactNode}){
 const [expanded,setExpanded]=useState(true);
 return <details className="mission-objectives" aria-label="Mission objectives" open={expanded} onToggle={e=>setExpanded(e.currentTarget.open)}><summary className="objective-heading"><Flag size={14}/><span>Objectives</span><small>{objectives.filter(o=>o.met).length}/{objectives.length}</small><ChevronDown size={13} aria-hidden="true"/></summary><div className="mission-objectives-body"><ul>{objectives.map(o=><li key={o.text} className={o.met?'objective-met':''}><span className="objective-check">{o.met&&<Check size={10}/>}</span>{o.text}</li>)}</ul>{showScore&&<div className="objective-pleased"><span>{name}’s pleased meter<strong>{score!=null?`${score}/100`:'Run to reveal'}</strong></span><progress max={100} value={score??0} aria-label={`${name}'s pleased score`}/></div>}{children}</div></details>;
}
