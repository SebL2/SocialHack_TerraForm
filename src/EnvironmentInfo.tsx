import {useLayoutEffect,useRef,useState,type RefObject} from 'react';
import {createPortal} from 'react-dom';
import {useSpotlightTarget} from './useSpotlightTarget';

export function EnvironmentDiscovery({target}:{target:RefObject<HTMLButtonElement|null>}){
 const card=useRef<HTMLElement|null>(null),bounds=useSpotlightTarget(target),[cardHeight,setCardHeight]=useState(0);
 useLayoutEffect(()=>{target.current?.scrollIntoView({behavior:'smooth',block:'center'});target.current?.focus({preventScroll:true});const measure=()=>{if(card.current)setCardHeight(card.current.scrollHeight);};measure();const observer=new ResizeObserver(measure);if(card.current)observer.observe(card.current);return()=>observer.disconnect();},[target]);
 const {vw,vh}=bounds,x=bounds.left-7,y=bounds.top-7,w=bounds.width+14,h=bounds.height+14,width=Math.min(300,vw-36),height=Math.min(cardHeight,vh-36),beside=x+w+28+width<=vw-18;
 const left=beside?x+w+28:Math.max(18,Math.min(vw-width-18,x)),top=beside?Math.max(18,Math.min(vh-height-18,y)):y+h+24+height<=vh-18?y+h+24:Math.max(18,y-height-24);
 return createPortal(<div className="tutorial-layer environment-discovery"><svg className="tutorial-dimmer" width={vw} height={vh} aria-hidden="true"><path d={`M0 0H${vw}V${vh}H0Z M${x} ${y}V${y+h}H${x+w}V${y}Z`} fill="rgba(20,24,29,.74)" fillRule="evenodd" style={{pointerEvents:'auto'}}/><rect x={x} y={y} width={w} height={h} rx="10" fill="none" stroke="#f0cf83" strokeWidth="2"/></svg><section ref={card} className="tutorial-card discovery-card" role="dialog" aria-modal="false" aria-labelledby="discovery-title" style={{left,top,width,maxHeight:vh-36,overflowY:'auto'}}><h2 id="discovery-title">Hmm… so what has happened?</h2><p>Let’s check it out over here.</p></section></div>,document.body);
}

export {EnvironmentHistoryModal as EnvironmentInfo} from './EnvironmentHistoryModal';
