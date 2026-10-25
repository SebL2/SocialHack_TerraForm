import {useMemo,useRef,useState,type PointerEvent,type RefObject} from 'react';
import {ThreeLandscape} from './ThreeLandscape';
import {compareEnvironment} from './environmentComparisonData';
import type {GameState} from './simulation';
import {EnvironmentTileTooltip} from './EnvironmentTileTooltip';
import {environmentTileDetails} from './environmentTileDetails';
import type {EnvironmentRun} from './environmentHistory';
const sfProps=(state:GameState)=>({state,selected:null,action:'retrofit' as const,view:'grid' as const,layer:'land' as const,storm:0,zoom:1,preview:false,thumbnail:true,onSelect:()=>{}});
export function EnvironmentVisualSummary({run,stepIndex,afterRef}:{run:EnvironmentRun;stepIndex:number;afterRef?:RefObject<HTMLDivElement|null>}){
 const [split,setSplit]=useState(50);
 const comparison=useRef<HTMLDivElement>(null);
 const moveDivider=(event:PointerEvent<HTMLDivElement>)=>{const bounds=comparison.current?.getBoundingClientRect();if(bounds){setSplit(Math.max(0,Math.min(100,(event.clientX-bounds.left)/bounds.width*100)));setInspected(null);}};
 const [inspected,setInspected]=useState<{id:number;x:number;y:number;belowY?:number;groundY?:number}|null>(null);
 const inspect=(id:number|null,point?:{x:number;y:number;belowY?:number;groundY?:number})=>setInspected(id===null?null:{id,x:point?.x||0,y:point?.y||0,belowY:point?.belowY,groundY:point?.groundY});
 const tileInfo=inspected?environmentTileDetails(run,stepIndex,inspected.id):null;
 const changed=useMemo(()=>run.kind==='sf'?compareEnvironment(run.before,run.steps[stepIndex],run.rain).changed:run.steps[stepIndex].plan.filter(p=>!run.before.plan.some(old=>old.patch===p.patch&&old.choice===p.choice)).map(p=>p.patch),[run,stepIndex]);
 const world=(after:boolean)=>run.kind==='sf'?<ThreeLandscape id="sf" sf={sfProps(after?run.steps[stepIndex]:run.before)} selected={null} thumbnail fixedThumbnail zoom={.95} emphasis={after?changed:[]} onInspect={after?inspect:undefined}/>:<ThreeLandscape id={run.site} plan={(after?run.steps[stepIndex]:run.before).plan} season={(after?run.steps[stepIndex]:run.before).month/3} selected={null} thumbnail fixedThumbnail zoom={.95} emphasis={after?changed:[]} onInspect={after?inspect:undefined}/>;
 return <div className="environment-visual-summary">
  <div ref={comparison} className="environment-comparison" aria-label="Before and after landscape comparison">
   <div className="environment-comparison-after environment-scene-world" ref={afterRef}>{world(true)}</div>
   <div className="environment-comparison-before environment-scene-world" style={{clipPath:`inset(0 ${100-split}% 0 0)`}} onPointerEnter={()=>setInspected(null)}>{world(false)}</div>
   <span className="environment-comparison-label before">Before</span><span className="environment-comparison-label after">After</span>
   <div className="environment-comparison-divider" role="slider" tabIndex={0} aria-label="Before and after comparison" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(split)} aria-valuetext={`${Math.round(split)}% before, ${Math.round(100-split)}% after`} style={{left:`${split}%`}} onPointerDown={event=>{event.preventDefault();event.currentTarget.focus();event.currentTarget.setPointerCapture(event.pointerId);moveDivider(event);}} onPointerMove={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))moveDivider(event);}} onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}} onKeyDown={event=>{const delta=event.shiftKey?10:2;if(['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();setInspected(null);setSplit(value=>event.key==='Home'?0:event.key==='End'?100:Math.max(0,Math.min(100,value+(['ArrowLeft','ArrowDown'].includes(event.key)?-delta:delta))));}}}>
    <span className="environment-comparison-handle" aria-hidden="true">‹ ›</span>
   </div>
   {tileInfo&&inspected&&<EnvironmentTileTooltip info={tileInfo} point={inspected} target={afterRef}/>}
  </div>
  <p className="environment-comparison-hint">Drag the divider to compare · Hover over the After tiles for details</p>
 </div>;
}
