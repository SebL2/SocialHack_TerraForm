export type PreviewEdge='left'|'right'|'top'|'bottom';
export function atlasPreviewLayout({boardWidth,boardTop,viewportHeight,nodeX,nodeY,radius,cardWidth,cardHeight}:{boardWidth:number;boardTop:number;viewportHeight:number;nodeX:number;nodeY:number;radius:number;cardWidth:number;cardHeight:number}){
 const pad=12,gap=24,clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
 let left:number,top:number,edge:PreviewEdge;
 const roomRight=boardWidth-nodeX-radius-gap-pad,roomLeft=nodeX-radius-gap-pad;
 const minTop=80-boardTop,maxTop=viewportHeight-boardTop-cardHeight-pad;
 if(Math.max(roomRight,roomLeft)>=cardWidth){
  const onRight=roomRight>=roomLeft;
  left=onRight?nodeX+radius+gap:nodeX-radius-gap-cardWidth;
  top=clamp(nodeY-cardHeight/2,minTop,maxTop);edge=onRight?'left':'right';
 }else{
  left=clamp(nodeX-cardWidth/2,pad,boardWidth-cardWidth-pad);
  const below=nodeY+radius+gap,above=nodeY-radius-gap-cardHeight;
  const useBelow=below<=maxTop||above<minTop;
  top=useBelow?below:above;edge=useBelow?'top':'bottom';
 }
 const a=edge==='left'?{x:left,y:top+9}:edge==='right'?{x:left+cardWidth,y:top+9}:edge==='top'?{x:left+9,y:top}:{x:left+9,y:top+cardHeight};
 const b=edge==='left'?{x:left,y:top+cardHeight-9}:edge==='right'?{x:left+cardWidth,y:top+cardHeight-9}:edge==='top'?{x:left+cardWidth-9,y:top}:{x:left+cardWidth-9,y:top+cardHeight};
 const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},dx=mid.x-nodeX,dy=mid.y-nodeY,len=Math.hypot(dx,dy)||1;
 const tip={x:nodeX+dx/len*radius,y:nodeY+dy/len*radius};
 return {left,top,edge,a,b,tip,path:`M${tip.x} ${tip.y}L${a.x} ${a.y}L${b.x} ${b.y}Z`};
}
