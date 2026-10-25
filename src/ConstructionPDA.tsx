import {useId,useLayoutEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Droplets,Fence,Flower2,HandCoins,Leaf,Route,ShieldCheck,TreePine,Waves,Wheat} from 'lucide-react';
const symbols={sf:[TreePine,Flower2,Route,ShieldCheck],senegal:[Droplets,TreePine,Fence,HandCoins],mongolia:[Fence,Waves,Wheat,HandCoins],indonesia:[Droplets,Leaf,ShieldCheck,Wheat]};
export function PDASymbol({level,index}:{level:string;index:number}){const Icon=(symbols[level as keyof typeof symbols]||symbols.sf)[index];return <><span className="pda-choice-number" aria-hidden="true">{index+1}</span><Icon size={31} strokeWidth={2.8}/></>;}
export function ConstructionPDA({children,level,items,total}:{children:ReactNode;level:string;items:number[];total:number}){
 const scanId=useId().replace(/:/g,'');
 const root=useRef<HTMLDivElement|null>(null),projector=useRef<HTMLDivElement|null>(null);
 const [beam,setBeam]=useState<{parent:HTMLElement;x:number;y:number;left:number;right:number;top:number;width:number;height:number}|null>(null);
 useLayoutEffect(()=>{
  const parent=root.current?.closest('main'),world=parent?.querySelector<HTMLElement>('.world');if(!parent||!world)return;
  let active=true,frame=0;
  const measure=()=>{
   if(!active)return;
   const a=parent.getBoundingClientRect(),b=world.getBoundingClientRect(),p=projector.current?.getBoundingClientRect();if(!p)return;
   const style=getComputedStyle(world),border=parseFloat(style.borderBottomWidth)||0,leftRadius=parseFloat(style.borderBottomLeftRadius)||0,rightRadius=parseFloat(style.borderBottomRightRadius)||0;
   const next={parent,x:p.left+p.width/2-a.left,y:p.top+p.height/2-a.top,left:b.left-a.left+leftRadius,right:b.right-a.left-rightRadius,top:b.bottom-a.top-border/2,width:parent.clientWidth,height:parent.clientHeight};
   setBeam(previous=>previous&&previous.parent===parent&&(['x','y','left','right','top','width','height'] as const).every(key=>Math.abs(previous[key]-next[key])<.1)?previous:next);
  };
  // CSS entrance/exit transforms change position without firing ResizeObserver.
  const track=()=>{measure();frame=requestAnimationFrame(track);};track();
  const observer=new ResizeObserver(measure);observer.observe(parent);observer.observe(world);if(root.current)observer.observe(root.current);window.addEventListener('resize',measure);void document.fonts.ready.then(measure);
  return()=>{active=false;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',measure);};
 },[]);
 const icons=symbols[level as keyof typeof symbols]||symbols.sf;
 return <>{beam&&createPortal(<svg data-projection-level={level} className="pda-hologram-beam" width={beam.width} height={beam.height} aria-hidden="true"><defs><clipPath id={`pda-scan-${scanId}`}><path d={`M${beam.x} ${beam.y}L${beam.left} ${beam.top}L${beam.right} ${beam.top}Z`}/></clipPath><pattern id={`pda-lines-${scanId}`} width="1" height="12" patternUnits="userSpaceOnUse"><path d="M0 1H2000" stroke="#bffff7" strokeWidth="1" strokeOpacity=".35"/><path d="M0 3H2000" stroke="#89f1ec" strokeWidth="2" strokeOpacity=".08"/></pattern><linearGradient id="pda-beam-light" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#91f5ef" stopOpacity=".42"/><stop offset=".8" stopColor="#71dfed" stopOpacity=".1"/><stop offset="1" stopColor="#71dfed" stopOpacity=".04"/></linearGradient><filter id="pda-beam-soft" x="-30%" y="-70%" width="160%" height="240%"><feGaussianBlur stdDeviation="3"/></filter><filter id="pda-contact-glow" x="-20%" y="-250%" width="140%" height="600%"><feGaussianBlur stdDeviation="7"/></filter></defs><path d={`M${beam.x} ${beam.y}L${beam.left} ${beam.top}L${beam.right} ${beam.top}Z`} fill="url(#pda-beam-light)" filter="url(#pda-beam-soft)"/><path d={`M${beam.left} ${beam.top}L${beam.x} ${beam.y}L${beam.right} ${beam.top}`} fill="none" stroke="#a4fbf2" strokeOpacity=".28" strokeWidth="6" filter="url(#pda-beam-soft)"/><g clipPath={`url(#pda-scan-${scanId})`}><rect className="pda-beam-scanlines" x={beam.left} y={beam.top-24} width={beam.right-beam.left} height={Math.max(0,beam.y-beam.top)+48} fill={`url(#pda-lines-${scanId})`}/><rect className="pda-beam-upward-flash" x={beam.left} y={beam.y-2} width={beam.right-beam.left} height="2" fill="#dcfffc" style={{'--sweep-rise':`${-(beam.y-beam.top)}px`} as CSSProperties}/></g><ellipse cx={(beam.left+beam.right)/2} cy={beam.top} rx={(beam.right-beam.left)/2} ry="5" fill="#91f5ef" opacity=".2" filter="url(#pda-contact-glow)"/><path d={`M${beam.x} ${beam.y}L${(beam.left+beam.right)/2} ${beam.top}`} stroke="#d1fff9" strokeWidth="5" strokeOpacity=".12" filter="url(#pda-beam-soft)"/></svg>,beam.parent)}
 <div ref={root} className="construction-pda"><div ref={projector} className="pda-projector" aria-hidden="true"><i/></div><div className="pda-aerial" aria-hidden="true"/><div className="pda-rocker" aria-hidden="true"><i/></div><i className="pda-screw screw-tl" aria-hidden="true"/><i className="pda-screw screw-tr" aria-hidden="true"/><i className="pda-screw screw-bl" aria-hidden="true"/><i className="pda-screw screw-br" aria-hidden="true"/>
 <div className="pda-display pda-plan-display" aria-label="Planned choices and total cost"><div className="pda-plan-slots">{Array.from({length:Math.max(10,items.length)},(_,i)=>{const Icon=items[i]===undefined?null:icons[items[i]];return <span key={`${i}-${items[i]??'empty'}`} className={Icon?'pda-plan-slot filled':'pda-plan-slot'}>{Icon?<Icon size={22} strokeWidth={2.3}/>:<span aria-hidden="true">_</span>}</span>;})}</div><div className="pda-plan-total" aria-live="polite"><span>TOTAL:</span><strong>{total}</strong></div></div>
 <div className="pda-keybed">{children}</div></div></>;
}
