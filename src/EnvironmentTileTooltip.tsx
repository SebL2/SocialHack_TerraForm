import {useLayoutEffect,useRef,useState,type RefObject} from 'react';
import {createPortal} from 'react-dom';
type Info={tile:string;title:string;status:string;detail:string};
type Point={x:number;y:number;belowY?:number;groundY?:number};
type Position={left:number;top:number;pointer:number;placement:'above'|'below'|'side'};
export function EnvironmentTileTooltip({info,point,target}:{info:Info;point:Point;target?:RefObject<HTMLDivElement|null>}){
 const card=useRef<HTMLDivElement|null>(null),[position,setPosition]=useState<Position|null>(null);
 useLayoutEffect(()=>{const measure=()=>{const frame=target?.current,node=card.current;if(!frame||!node)return;const r=frame.getBoundingClientRect(),width=node.offsetWidth,height=node.offsetHeight,anchorX=r.left+point.x,above=r.top+point.y-height-14,below=r.top+(point.belowY??point.y)+14,left=Math.max(12,Math.min(window.innerWidth-width-12,anchorX-width/2));
  // Upper grid tiles open downward; lower tiles keep the card above the piece.
  let placement:Position['placement']=(point.groundY??point.y)<r.height*.36?'below':'above';
  if(placement==='below'&&below+height>window.innerHeight-12&&above>=12)placement='above';
  if(placement==='above'&&above<12&&below+height<=window.innerHeight-12)placement='below';
  let top=placement==='below'?below:above,pointer=anchorX-left,cardLeft=left;
  if(top<12||top+height>window.innerHeight-12){top=Math.max(12,Math.min(window.innerHeight-height-12,r.top+(point.groundY??point.y)-height/2));if(anchorX+18+width<=window.innerWidth-12){cardLeft=anchorX+18;pointer=-1;placement='side';}else if(anchorX-18-width>=12){cardLeft=anchorX-18-width;pointer=-1;placement='side';}}
  const next={left:cardLeft,top,pointer,placement};setPosition(previous=>previous&&previous.left===next.left&&previous.top===next.top&&previous.pointer===next.pointer&&previous.placement===next.placement?previous:next);
 };measure();const observer=new ResizeObserver(measure);if(target?.current)observer.observe(target.current);if(card.current)observer.observe(card.current);window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);return()=>{observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};},[point.x,point.y,point.belowY,point.groundY,target,info.title,info.status,info.detail]);
 return createPortal(<div ref={card} className="environment-tile-tooltip environment-floating-tooltip" data-placement={position?.placement} role="status" style={{left:position?.left||0,top:position?.top||0,visibility:position?'visible':'hidden'}}><small>{info.tile}</small><strong>{info.title}</strong><span>{info.status}</span><p>{info.detail}</p>{position&&position.pointer>=0&&<i className="environment-tile-tooltip-pointer" style={{left:Math.max(12,Math.min(218,position.pointer))}} aria-hidden="true"/>}</div>,document.body);
}
