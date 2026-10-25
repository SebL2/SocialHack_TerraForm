import {useEffect,useLayoutEffect,useRef,useState,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {useSpotlightTarget} from './useSpotlightTarget';
import {ArrowRight} from 'lucide-react';
export type TutorialStep=1|2|3|4;
export function Tutorial({step,worldRef,choicesRef,submitRef,onNext,onBack,placementError=''}:{placementError?:string;step:TutorialStep;worldRef:RefObject<HTMLElement|null>;choicesRef:RefObject<HTMLDivElement|null>;submitRef:RefObject<HTMLButtonElement|null>;onNext:()=>void;onBack:()=>void}){
 const cardRef=useRef<HTMLElement|null>(null);
 const [cardHeight,setCardHeight]=useState(0);
 const targetRef=step===1||step===3?worldRef:step===2?choicesRef:submitRef;
 const bounds=useSpotlightTarget(targetRef),rect={left:bounds.left-7,top:bounds.top-7,width:bounds.width+14,height:bounds.height+14},view={width:bounds.vw,height:bounds.vh};
 useEffect(()=>{targetRef.current?.scrollIntoView({behavior:document.documentElement.classList.contains('level-crossfading')?'instant':'smooth',block:step===1||step===3?'center':'end'});},[step,targetRef]);
 const cardWidth=Math.min(320,view.width-34),margin=18,gap=26;
 useLayoutEffect(()=>{
  const card=cardRef.current;if(!card)return;
  const measure=()=>setCardHeight(card.scrollHeight+4);
  measure();const observer=new ResizeObserver(measure);observer.observe(card);
  let mounted=true;void document.fonts.ready.then(()=>{if(mounted)measure();});
  return()=>{mounted=false;observer.disconnect();};
 },[step,cardWidth]);
 const left=step===1?(view.width-cardWidth)/2:Math.max(17,Math.min(view.width-cardWidth-17,rect.left+rect.width/2-cardWidth/2));
 const above=Math.max(0,rect.top-margin-gap),below=Math.max(0,view.height-(rect.top+rect.height)-margin-gap);
 const placeAbove=above>=cardHeight||above>=below;
 const available=Math.min(view.height-margin*2,step===1?view.height-margin*2:Math.max(1,placeAbove?above:below));
 const shownHeight=Math.min(cardHeight,available);
 const rawTop=step===1?(view.height-shownHeight)/2:placeAbove?rect.top-gap-shownHeight:rect.top+rect.height+gap;
 const top=Math.max(margin,Math.min(view.height-shownHeight-margin,rawTop));
 const hole={left:Math.max(0,rect.left),top:Math.max(0,rect.top),width:Math.max(0,Math.min(view.width,rect.left+rect.width)-Math.max(0,rect.left)),height:Math.max(0,Math.min(view.height,rect.top+rect.height)-Math.max(0,rect.top))};
 const d=`M0 0H${view.width}V${view.height}H0Z M${hole.left} ${hole.top}V${hole.top+hole.height}H${hole.left+hole.width}V${hole.top}Z`;
 return createPortal(<div className={`tutorial-layer step-${step}`}><svg className="tutorial-dimmer" width={view.width} height={view.height} aria-hidden="true"><path d={d} fill="rgba(20,24,29,.74)" fillRule="evenodd" style={{pointerEvents:'auto'}}/><rect x={hole.left} y={hole.top} width={hole.width} height={hole.height} rx="13" fill="rgba(215,220,218,.03)" stroke="#f0cf83" strokeWidth="2" style={{pointerEvents:'none'}}/></svg><section ref={cardRef} className="tutorial-card" role="dialog" aria-modal={step===1?'true':'false'} aria-labelledby="tutorial-title" style={{left,top,width:cardWidth,maxHeight:available,overflowY:'auto',visibility:cardHeight?'visible':'hidden'}}><div className="tutorial-speaker" style={{justifyContent:'flex-end'}}><span className="tutorial-count">{step} / 4</span></div><h2 id="tutorial-title">{step===1?'Wait...is that my apartment?':step===2?'What would you change?':step===3?'Where should it go?':'Here goes...'}</h2><p role={step===3&&placementError?'alert':undefined} className={step===3&&placementError?'tutorial-placement-error':undefined}>{step===3&&placementError?placementError:step===1?'The PDA projects Harry’s neighborhood. It seems to let him reshape land. He reluctantly presses a button...':step===2?'Four buttons are shown with environmental changes, and Harry picks...':step===3?'Click an outlined tile to place your tool. Invalid tiles will be outlined red':"Unsure what to expect, Harry submits his choice..."}</p><div className="tutorial-footer">{step===1?<button className="modal-primary" onClick={onNext} autoFocus>Try the PDA<ArrowRight size={16}/></button>:<><button onClick={onBack}>Back</button></>}</div><div className={`tutorial-pointer ${placeAbove?'points-down':'points-up'}`} aria-hidden="true"/></section></div>,document.body);
}
