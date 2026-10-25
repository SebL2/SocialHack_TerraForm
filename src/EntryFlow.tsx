import {lazy,Suspense,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Flag,Lock} from 'lucide-react';
import {Button} from './components/ui/button';
import {CHAPTERS,type ChapterId} from './globalChapters';
import {enterLevel} from './levelTransition';
import {atlasPreviewLayout} from './atlasPreview';
import {ChapterPreview} from './ChapterPreview';
const GlobeDemo=lazy(()=>import('./components/globe-demo'));
export function HarryAvatar(){return <svg viewBox="0 0 72 72" className="harry-avatar" aria-label="Harry" role="img"><defs><clipPath id="harry-circle"><circle cx="36" cy="36" r="35"/></clipPath></defs><g clipPath="url(#harry-circle)"><path fill="#ddc389" d="M0 0h72v72H0z"/><path fill="#3a6d61" d="M8 76c0-20 10-29 28-29s28 9 28 29"/><path fill="#ca8c61" d="M30 42h13v15H30z"/><ellipse cx="36" cy="30" rx="17" ry="20" fill="#e4b184"/><path fill="#493b31" d="M19 31C9 8 36 1 47 12c10 1 10 15 5 22l-4-15c-10 6-17 4-24-1z"/><path d="M23 29h11v8H23zm15 0h11v8H38zM34 32h4" fill="none" stroke="#36504a" strokeWidth="2"/><circle cx="29" cy="33" r="1.5" fill="#353c35"/><circle cx="43" cy="33" r="1.5" fill="#353c35"/><path d="M31 43q5 4 10 0" fill="none" stroke="#9d6048" strokeWidth="1.5" strokeLinecap="round"/><path d="M26 54l10 8 11-8" fill="none" stroke="#b8d1a7" strokeWidth="2"/></g><circle cx="36" cy="36" r="35" fill="none" stroke="#efd899" strokeWidth="2"/></svg>;}
export function EntryFlow({onStart,unlocked=0,returning=false,returnLocation='sf',completion='none',onReturnDemo=()=>{},worldIntro=false,onWorldIntroContinue=()=>{}}:{onStart:(id:ChapterId)=>void;unlocked?:number;returning?:boolean;returnLocation?:ChapterId;completion?:'none'|'returning'|'thanks';onReturnDemo?:()=>void;worldIntro?:boolean;onWorldIntroContinue?:()=>void;hasProgress?:(id:ChapterId)=>boolean}){
 const [stage,setStage]=useState<'title'|'world'>(returning?'world':'title'),[welcome,setWelcome]=useState(!returning&&unlocked===0),[hover,setHover]=useState<ChapterId|null>(null),[preview,setPreview]=useState<ChapterId|null>(null);
 const [focus,setFocus]=useState<ChapterId|null>(returning?returnLocation:null),[focusKey,setFocusKey]=useState(0),[launching,setLaunching]=useState<ChapterId|null>(null);
 const boardRef=useRef<HTMLDivElement|null>(null),cardRef=useRef<HTMLDivElement|null>(null),focusTimer=useRef<ReturnType<typeof setTimeout>|null>(null),nodeElements=useRef<Partial<Record<ChapterId,HTMLDivElement>>>({}),captureFrame=useRef<(()=>string)|null>(null);
 const [placement,setPlacement]=useState<(ReturnType<typeof atlasPreviewLayout>&{id:ChapterId;boardWidth:number;boardHeight:number})|null>(null);
 useEffect(()=>()=>{if(focusTimer.current)clearTimeout(focusTimer.current);},[]);
 useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!launching){if(completion==='thanks')onReturnDemo();else{setPreview(null);setHover(null);}}};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[launching,completion,onReturnDemo]);
 useLayoutEffect(()=>{
  if(!hover||welcome||preview||stage!=='world'||launching||completion!=='none')return;
  const board=boardRef.current,card=cardRef.current,node=board?.querySelector<HTMLElement>(`[data-location="${hover}"] .pin-core`);
  if(!board||!card||!node)return;
  let frame=0,last='';const measure=()=>{const r=board.getBoundingClientRect(),n=node.getBoundingClientRect(),c=card.getBoundingClientRect();const signature=[r.width,r.height,r.top,n.left,n.top,c.width,c.height].map(v=>v.toFixed(1)).join(',');if(last!==signature){last=signature;setPlacement({...atlasPreviewLayout({boardWidth:r.width,boardTop:r.top,viewportHeight:window.innerHeight,nodeX:n.left+n.width/2-r.left,nodeY:n.top+n.height/2-r.top,radius:n.width/2,cardWidth:c.width,cardHeight:c.height}),id:hover,boardWidth:r.width,boardHeight:r.height});}frame=requestAnimationFrame(measure);};
  measure();return()=>cancelAnimationFrame(frame);
 },[hover,welcome,preview,stage,launching,completion]);
 const selected=CHAPTERS.find(c=>c.id===preview),peek=CHAPTERS.find(c=>c.id===hover);
 const picture=(id:ChapterId)=><img className="chapter-landscape-still" src={`/previews/${id}.webp?v=centered`} alt={`${CHAPTERS.find(c=>c.id===id)!.name} mapped landscape`} decoding="async"/>;
 const pin=(id:ChapterId)=>{const c=CHAPTERS.find(c=>c.id===id)!,locked=CHAPTERS.indexOf(c)>unlocked;return <div ref={element=>{if(element)nodeElements.current[id]=element;else delete nodeElements.current[id];}} className="location-node globe-node" data-location={id}><button className={`sf-pin ${locked?'chapter-locked':''}`} aria-label={`${c.name} — ${locked?'locked level':'open level preview'}`} tabIndex={stage==='title'||welcome||!!preview||!!launching||completion!=='none'?-1:0} onMouseEnter={()=>setHover(id)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(id)} onBlur={()=>setHover(null)} onClick={()=>{if(focusTimer.current)clearTimeout(focusTimer.current);setFocus(id);setFocusKey(k=>k+1);setPreview(id);setHover(null);}}>{!locked&&<span className="pin-pulse"/>}<span className="pin-core">{locked?<Lock size={16}/>:<Flag size={18} fill="currentColor"/>}</span><span className="pin-label">{c.name}</span></button></div>;};
 const goToSF=()=>{setWelcome(false);setFocus('sf');setFocusKey(k=>k+1);focusTimer.current=setTimeout(()=>setHover('sf'),1200);};
 const handedOff=useRef(false);
 useEffect(()=>{if(!launching)return;const timer=setTimeout(()=>{if(handedOff.current)return;handedOff.current=true;enterLevel(()=>onStart(launching),captureFrame.current?.());},420);return()=>clearTimeout(timer);},[launching,onStart]);
 const launch=(id:ChapterId)=>{if(launching)return;handedOff.current=false;setPreview(null);setHover(null);setFocus(id);setLaunching(id);};
 return <main inert={completion==='returning'} className={`globe-entry atlas-screen ${stage==='title'?'globe-title-stage':'globe-world-stage'} ${launching?'globe-launching':''}`}>
 <div className="title-un-silhouette" aria-hidden="true"/><div className="title-stars" aria-hidden="true"/>
 <header className="atlas-header" aria-hidden={stage==='title'} inert={stage==='title'||!!launching||completion!=='none'}><button onClick={()=>{setHover(null);setPreview(null);setStage('title');}}><ArrowLeft size={16}/>TerraForm</button></header>
 <div ref={boardRef} className="atlas-board globe-board" inert={completion!=='none'} onKeyDown={event=>{if(stage!=='world'||welcome||preview||launching||completion!=='none'||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();if(focusTimer.current)clearTimeout(focusTimer.current);const index=CHAPTERS.findIndex(c=>c.id===focus),id=CHAPTERS[(index+(event.key==='ArrowRight'?1:-1)+CHAPTERS.length)%CHAPTERS.length].id;setHover(null);setFocus(id);setFocusKey(k=>k+1);focusTimer.current=setTimeout(()=>nodeElements.current[id]?.querySelector('button')?.focus(),1200);}}><Suspense fallback={<div className="globe-loading" aria-hidden="true"/>}><GlobeDemo fromLevel={returning} title={stage==='title'} idle={stage==='title'||welcome} paused={!!hover||!!preview||completion!=='none'} focus={focus} focusKey={focusKey} launching={!!launching} onArrival={()=>{if(launching&&!handedOff.current){handedOff.current=true;enterLevel(()=>onStart(launching),captureFrame.current?.());}}} nodeElements={nodeElements} captureFrame={captureFrame}/></Suspense><div className="globe-node-layer" aria-hidden={stage==='title'}>{CHAPTERS.map(c=><div key={c.id}>{pin(c.id)}</div>)}</div>
 {peek&&!welcome&&!preview&&!launching&&completion==='none'&&stage==='world'&&<>
  {placement?.id===peek.id&&<svg className="preview-cone" viewBox={`0 0 ${placement.boardWidth} ${placement.boardHeight}`} preserveAspectRatio="none" aria-hidden="true"><path d={placement.path} fill="#efcf8612" stroke="#f1d18a" strokeOpacity=".6"/></svg>}
  <div ref={cardRef} className="node-preview" data-preview-location={peek.id} data-connector-edge={placement?.edge} style={{left:placement?.id===peek.id?placement.left:0,top:placement?.id===peek.id?placement.top:0,visibility:placement?.id===peek.id?'visible':'hidden'}}><div className="node-preview-image">{picture(peek.id)}</div><div><span>{peek.issue}</span><strong>{peek.name}</strong><p>{peek.region}</p></div></div>
 </>}
 </div>
 <div className="title-content globe-title-content" aria-hidden={stage!=='title'} inert={stage!=='title'}><h1>Terra<span>Form</span></h1><Button variant="unstyled" className="title-start" onClick={()=>setStage('world')}>Start</Button></div>
 {stage==='world'&&welcome&&<div className="entry-shade globe-welcome-shade"><section className="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title"><h2 id="welcome-title">Welcome to TerraForm!</h2><p>TerraForm is a grid terrain building simulation factoring social and environmental impact.</p><p>But first, something is stirring in San Francisco...</p><button className="modal-primary" autoFocus onClick={goToSF}>Go to San Francisco<ArrowRight size={17}/></button></section></div>}
 {selected&&!launching&&<ChapterPreview chapter={selected} unlocked={unlocked} onClose={()=>setPreview(null)} onStart={launch}/>}
 {worldIntro&&<WorldIntroModal onContinue={onWorldIntroContinue}/>}
 {completion==='thanks'&&<div className="entry-shade journey-thanks-backdrop"><section className="welcome-card journey-thanks-card" role="dialog" aria-modal="true" aria-labelledby="journey-thanks-title"><h2 id="journey-thanks-title">Thank you Social Hacks!</h2><button className="modal-primary" autoFocus onKeyDown={event=>{if(event.key==='Tab')event.preventDefault();}} onClick={()=>{onReturnDemo();requestAnimationFrame(()=>boardRef.current?.querySelector<HTMLElement>('.globe-canvas')?.focus());}}>Return to demo<ArrowRight size={17}/></button></section></div>}
 </main>;
}

function WorldIntroModal({onContinue}:{onContinue:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
 return <dialog ref={dialog} className="welcome-card world-intro-modal" aria-label="New places unlocked" onCancel={event=>{event.preventDefault();onContinue();}}>
  <p>The PDA also allows to see existing geographical problems around the world, new places have been unlocked, happy building!</p>
  <div className="world-intro-footer"><button className="modal-primary" autoFocus onClick={onContinue}>Continue<ArrowRight size={17}/></button></div>
 </dialog>;
}
