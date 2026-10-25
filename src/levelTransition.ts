import {flushSync} from 'react-dom';
/** Overlap a lightweight globe still with the live level: never keep two live 3D scenes. */
export function enterLevel(update:()=>void,globeStill?:string){
 const showLevel=()=>{flushSync(update);window.scrollTo({top:0,left:0,behavior:'instant'});};
 if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){showLevel();return;}
 const root=document.documentElement;
 root.classList.add('level-crossfading');
 root.classList.add('level-merge-fallback');
 const cover=document.createElement('div');cover.className='level-merge-cover';cover.setAttribute('aria-hidden','true');
 if(globeStill){const image=new Image();image.src=globeStill;image.alt='';cover.append(image);}
 document.body.append(cover);
 let done=false;const finish=()=>{if(done)return;done=true;cover.remove();root.classList.remove('level-crossfading','level-merge-fallback');};
 cover.addEventListener('animationend',event=>{if(event.target===cover)finish();});
 showLevel();setTimeout(finish,1200);
}

export function exitLevel(update:()=>void,onFinished?:()=>void){
 const source=document.querySelector<HTMLElement>('.game-shell');
 if(!source||window.matchMedia('(prefers-reduced-motion: reduce)').matches){update();onFinished?.();return;}
 const bounds=source.getBoundingClientRect(),copy=source.cloneNode(true) as HTMLElement;
 const originals=source.querySelectorAll('canvas'),copies=copy.querySelectorAll('canvas');
 originals.forEach((canvas,index)=>{
  // The owning renderer refreshes its drawing buffer synchronously before capture.
  canvas.dispatchEvent(new Event('terraform:capture-frame'));
  const still=document.createElement('canvas');still.width=Math.min(1600,canvas.width);still.height=Math.round(still.width*canvas.height/canvas.width);
  still.getContext('2d')?.drawImage(canvas,0,0,still.width,still.height);const image=new Image();image.src=still.toDataURL('image/webp',.92);image.alt='';image.style.cssText='display:block;width:100%;height:100%';copies[index]?.replaceWith(image);still.width=still.height=1;
 });
 copy.querySelectorAll('.modal-backdrop,.tutorial-layer,.environment-backdrop').forEach(element=>element.remove());
 copy.classList.add('level-exit-copy');copy.setAttribute('aria-hidden','true');copy.inert=true;
 Object.assign(copy.style,{position:'fixed',left:`${bounds.left}px`,top:`${bounds.top}px`,width:`${bounds.width}px`,height:`${bounds.height}px`,margin:'0'});
 document.documentElement.classList.add('level-exiting');document.body.append(copy);
 let done=false;const finish=()=>{if(done)return;done=true;copy.remove();document.documentElement.classList.remove('level-exiting');onFinished?.();};
 copy.addEventListener('animationend',event=>{if(event.target===copy)finish();});flushSync(update);setTimeout(finish,1250);
}
