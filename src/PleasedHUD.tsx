import {useEffect,useRef} from 'react';
import {RotateCcw} from 'lucide-react';

export function PleasedHUD({name,score,threshold}:{name:string;score?:number|null;threshold:number}){
 const value=score??0;
 return <section className={`pleased-hud ${score!=null&&value>=threshold?'passed':''}`} aria-label={`${name}'s pleased meter`}>
  <div className="pleased-hud-heading"><strong>{name}’s pleased meter</strong><span>{score!=null?`${value}/100`:'—/100'}</span></div>
  <div className="pleased-track" role="progressbar" aria-label={`${name}'s pleased score`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={score!=null?`${value} of 100. Target ${threshold}.`:'Submit a plan to reveal your score'}><span style={{width:`${value}%`}}/><i style={{left:`${threshold}%`}}/></div>
  <p>{score!=null&&value>=threshold?'Target reached':`Target: ${threshold} pleased points`}</p>
 </section>;
}

export function PassModal({name,score,threshold,onWorldMap,onContinue,exploreWorld=false,finalLevel=false}:{name:string;score:number;threshold:number;onWorldMap:()=>void;onContinue:()=>void;exploreWorld?:boolean;finalLevel?:boolean}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const previous=document.activeElement;dialog.current?.showModal();return()=>{dialog.current?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};},[]);
 return <dialog ref={dialog} className={`modal pass-dialog ${finalLevel?'final-pass-dialog':''}`} aria-labelledby="pass-title" onCancel={e=>{e.preventDefault();if(exploreWorld)onWorldMap();else onContinue();}}>
  {!exploreWorld&&<span className="field-label">TARGET REACHED</span>}
  <h2 id="pass-title">You passed!</h2>
  {exploreWorld?<>{!finalLevel&&<p className="modal-lead">Explore other problems in the world!</p>}<div className="pass-actions"><button autoFocus className="modal-primary" onClick={onWorldMap}>Continue</button></div></>:<>
  <p className="modal-lead">{name} is pleased. You earned {score}/100 pleased points and reached the target of {threshold}.</p>
  <p>You can return to the world map or keep experimenting here.</p>
  <div className="pass-actions"><button autoFocus onClick={onContinue}>Keep playing</button><button className="modal-primary" onClick={onWorldMap}>Return to world map</button></div></>}
 </dialog>;
}

export function PleasedHUDControls({name,score,threshold,onRestart,restartDisabled=false}:{name:string;score?:number|null;threshold:number;onRestart:()=>void;restartDisabled?:boolean}){
 return <div className="pleased-hud-controls"><button className="restart-run" onClick={onRestart} disabled={restartDisabled} title="Restart run"><RotateCcw size={17}/><span>Restart run</span></button><PleasedHUD name={name} score={score} threshold={threshold}/></div>;
}
