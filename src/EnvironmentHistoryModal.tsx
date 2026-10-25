import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowRight,ChevronLeft,ChevronRight,X} from 'lucide-react';
import {EnvironmentHoverIntro} from './EnvironmentHoverIntro';
import {EnvironmentVisualSummary} from './EnvironmentVisualSummary';
import {dateLabel} from './simulation';
import {environmentTimeline,historyStep,canBrowseEnvironmentHistory,type EnvironmentRun} from './environmentHistory';

export function EnvironmentHistoryModal({history,baseline,onClose,onContinue,showTutorial=false}:{history:EnvironmentRun[];baseline?:EnvironmentRun;onClose:()=>void;onContinue?:()=>void;showTutorial?:boolean}){
 const timeline=useMemo(()=>environmentTimeline(history.length?history:baseline?[baseline]:[]),[history,baseline]);
 const [cursor,setCursor]=useState(Math.max(0,timeline.length-1));
 const afterRef=useRef<HTMLDivElement|null>(null),guideRef=useRef<HTMLElement|null>(null);
 const [showHoverIntro,setShowHoverIntro]=useState(showTutorial);
 const dismissHoverIntro=()=>setShowHoverIntro(false);
 const close=useRef<HTMLButtonElement|null>(null),dialog=useRef<HTMLElement|null>(null);
 const index=historyStep(cursor,0,timeline.length),entry=timeline[index];
 const canBrowse=canBrowseEnvironmentHistory(history);
 const move=(delta:number)=>{if(canBrowse)setCursor(v=>historyStep(v,delta,timeline.length));};
 useEffect(()=>{setCursor(Math.max(0,timeline.length-1));},[timeline.length]);
 useEffect(()=>{if(!showHoverIntro)close.current?.focus();},[showHoverIntro]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{
  if(e.key==='Escape')onClose();
  if(!showHoverIntro&&(e.key==='ArrowLeft'||e.key==='ArrowRight')&&e.target instanceof HTMLElement&&!e.target.closest('svg,input,select,textarea,[role="slider"]')){e.preventDefault();move(e.key==='ArrowLeft'?-1:1);}
  if(e.key==='Tab'){const nodes=Array.from((showHoverIntro?guideRef.current:dialog.current)?.querySelectorAll<HTMLElement>('button:not(:disabled),summary,[tabindex="0"],a[href]')||[]).filter(node=>node.getClientRects().length>0);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[timeline.length,canBrowse,onClose,showHoverIntro]);
 const month=entry?.run.steps[entry.stepIndex].month??0;
 return <div className="modal-backdrop environment-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section ref={dialog} className="modal environment-info environment-history-modal" role="dialog" aria-modal="true" aria-labelledby="environment-title">
  <button ref={close} className="modal-close" aria-label="Close environment info" onClick={onClose}><X size={21}/></button>
  <span className="field-label">{entry?`${entry.run.location.toUpperCase()} · ${dateLabel(month)}`:''}</span><h2 id="environment-title">Environment info</h2>
  {entry&&<EnvironmentVisualSummary key={`${entry.runIndex}-${entry.stepIndex}`} run={entry.run} stepIndex={entry.stepIndex} afterRef={afterRef}/>}
  <footer className="environment-history-footer"><nav className="environment-history-nav" aria-label="Simulation history"><button aria-label="Previous time step" title="Previous time step" disabled={!canBrowse||!entry||index===0} onClick={()=>move(-1)}><ChevronLeft size={20}/></button><button aria-label="Next time step" title="Next time step" disabled={!canBrowse||!entry||index===timeline.length-1} onClick={()=>move(1)}><ChevronRight size={20}/></button></nav><button className="environment-story-continue" onClick={onContinue??onClose}>Continue<ArrowRight size={16}/></button></footer>
 </section>{entry&&showHoverIntro&&<EnvironmentHoverIntro target={afterRef} guideRef={guideRef} onDismiss={dismissHoverIntro}/>}</div>;
}
