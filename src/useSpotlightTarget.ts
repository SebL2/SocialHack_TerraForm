import {useLayoutEffect,useState,type RefObject} from 'react';
/** Track viewport coordinates, including document/ancestor scrolling and animated layout. */
export function useSpotlightTarget(target:RefObject<HTMLElement|null>){
 const [bounds,setBounds]=useState({left:0,top:0,width:0,height:0,vw:window.innerWidth,vh:window.innerHeight});
 useLayoutEffect(()=>{
  let frame=0,active=true;
  const measure=()=>{if(!active)return;const r=target.current?.getBoundingClientRect();if(!r)return;const next={left:r.left,top:r.top,width:r.width,height:r.height,vw:window.innerWidth,vh:window.innerHeight};setBounds(previous=>Object.keys(next).every(key=>Math.abs(previous[key as keyof typeof next]-next[key as keyof typeof next])<.1)?previous:next);};
  const track=()=>{measure();frame=requestAnimationFrame(track);};track();
  const observer=new ResizeObserver(measure);if(target.current)observer.observe(target.current);window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);window.visualViewport?.addEventListener('resize',measure);void document.fonts.ready.then(measure);
  return()=>{active=false;cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);window.visualViewport?.removeEventListener('resize',measure);};
 },[target]);
 return bounds;
}
