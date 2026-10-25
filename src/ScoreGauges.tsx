import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';

export type ScoreGaugesProps={name:string;components:{label:string;max:number;value?:number|null;description:string;effect:string}[]};
export function ScoreGauges({name,components}:ScoreGaugesProps){
 const [active,setActive]=useState<number|null>(null),[position,setPosition]=useState<{left:number;top:number;pointer:number;below:boolean}|null>(null);
 const gauges=useRef<(HTMLDivElement|null)[]>([]),tooltip=useRef<HTMLDivElement>(null),closeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),tooltipId=useId();
 const cancelClose=()=>{if(closeTimer.current)clearTimeout(closeTimer.current);};
 const open=(index:number)=>{cancelClose();setActive(index);};
 const close=()=>{cancelClose();closeTimer.current=setTimeout(()=>setActive(null),120);};
 useEffect(()=>()=>cancelClose(),[]);
 useEffect(()=>{
  if(active===null)return;
  const dismiss=(event:PointerEvent)=>{const target=event.target as Node;if(!gauges.current[active]?.contains(target)&&!tooltip.current?.contains(target)){cancelClose();setActive(null);}};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){cancelClose();setActive(null);event.stopPropagation();}};
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape,true);
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape,true);};
 },[active]);
 useLayoutEffect(()=>{
  if(active===null){setPosition(null);return;}
  const place=()=>{const bar=gauges.current[active],card=tooltip.current;if(!bar||!card)return;const r=bar.getBoundingClientRect(),width=card.offsetWidth,height=card.offsetHeight,center=r.left+r.width/2,left=Math.max(12,Math.min(window.innerWidth-width-12,center-width/2)),below=r.top-height-12<12;setPosition({left,top:Math.max(12,Math.min(window.innerHeight-height-12,below?r.bottom+12:r.top-height-12)),pointer:Math.max(12,Math.min(width-12,center-left)),below});};
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
 },[active]);
 return <div className="score-gauges" role="group" aria-label={`${name}’s pleased score components`}>
  {components.map(({label,max,value:rawValue},index)=>{
   const value=rawValue==null?0:Math.max(0,Math.min(max,Math.round(rawValue)));
   return <div ref={element=>{gauges.current[index]=element;}} className={`score-gauge ${['environment','community','economy'][index]}`} key={label} onMouseEnter={()=>open(index)} onMouseLeave={close}>
    <span className="score-gauge-value">{rawValue!=null?value:'—'}<small>/{max}</small></span>
    <div className="score-gauge-track" role="meter" tabIndex={0} aria-label={label} aria-describedby={active===index?tooltipId:undefined} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-valuetext={rawValue!=null?`${value} of ${max} points`:'Run to reveal'} onFocus={()=>open(index)} onBlur={()=>{cancelClose();setActive(null);}} onClick={()=>open(index)} onKeyDown={event=>{if(event.key==='Escape'){cancelClose();setActive(null);event.stopPropagation();}}}>
     <span style={{height:`${value/max*100}%`}}/>
    </div>
    <span className="score-gauge-label">{label}</span>
   </div>;
  })}
  {active!==null&&createPortal(<div ref={tooltip} id={tooltipId} role="tooltip" className="score-gauge-tooltip" data-placement={position?.below?'below':'above'} style={{left:position?.left??0,top:position?.top??0,visibility:position?'visible':'hidden'}} onMouseEnter={cancelClose} onMouseLeave={close}>
   <strong>{components[active].label}</strong><p>{components[active].description}</p><p className="score-gauge-effect">{components[active].effect}</p><i aria-hidden="true" style={{left:position?.pointer??12}}/>
  </div>,document.body)}
 </div>;
}
