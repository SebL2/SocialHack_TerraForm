import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {ArrowRight,Lock,MapPin,X} from 'lucide-react';
import {CHAPTERS,type ChapterId} from './globalChapters';

export function ChapterPreview({chapter,unlocked,onClose,onStart}:{chapter:(typeof CHAPTERS)[number];unlocked:number;onClose:()=>void;onStart:(id:ChapterId)=>void}){
 const dialog=useRef<HTMLElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const previous=document.activeElement;close.current?.focus({preventScroll:true});
  const key=(event:KeyboardEvent)=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}
   if(event.key==='Tab'){const buttons=dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)');if(!buttons?.length)return;const first=buttons[0],last=buttons[buttons.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}
  };
  window.addEventListener('keydown',key);return()=>{window.removeEventListener('keydown',key);if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};
 },[onClose]);
 return createPortal(<div className="entry-shade chapter-preview-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
  <section ref={dialog} className="chapter-preview" role="dialog" aria-modal="true" aria-labelledby="chapter-title">
   <button ref={close} className="modal-close" aria-label="Close chapter preview" onClick={onClose}><X size={20}/></button>
   <header className="chapter-preview-top"><h2 id="chapter-title">{chapter.name}</h2><p>{chapter.description}</p></header>
   <div className="chapter-preview-body">
    <div className="chapter-preview-world"><img className="chapter-landscape-still" src={`/previews/${chapter.id}.webp?v=centered`} alt={`${chapter.name} mapped landscape`} decoding="async"/><div className="preview-world-caption"><MapPin size={13}/>{chapter.region}</div></div>
    <section className="chapter-issues" aria-labelledby="chapter-issues-title"><h3 id="chapter-issues-title">Key issues in this landscape</h3><ul>{chapter.keyIssues.map(issue=><li key={issue}>{issue}</li>)}</ul></section>
   </div>
   <footer className="chapter-preview-footer">{CHAPTERS.indexOf(chapter)<=unlocked?<button className="chapter-start" onClick={()=>onStart(chapter.id)}>Continue<ArrowRight size={20}/></button>:<p className="locked-chapter-note"><Lock size={17}/>Complete {CHAPTERS[CHAPTERS.indexOf(chapter)-1].name} to unlock this level.</p>}</footer>
  </section>
 </div>,document.body);
}
