/** View-only quarter turns. Geographic cell IDs and simulation data do not move. */
export function rotateGrid(x:number,y:number,turns:number,width:number,height:number){
 const q=((Math.trunc(turns)%4)+4)%4,dx=x-width/2,dy=y-height/2;
 const [rx,ry]=q===1?[-dy,dx]:q===2?[-dx,-dy]:q===3?[dy,-dx]:[dx,dy];
 return{x:width/2+rx,y:height/2+ry};
}
export function unrotateGrid(x:number,y:number,turns:number,width:number,height:number){return rotateGrid(x,y,-turns,width,height);}

/** Ground-plane coordinates: overhead uses equal square axes with no depth tilt. */
export function projectGridPlane(x:number,y:number,overhead=false){return overhead?{x,y}:{x:(x-y)/2,y:(x+y)/4};}
export function unprojectGridPlane(x:number,y:number,overhead=false){return overhead?{x,y}:{x:x+2*y,y:2*y-x};}

/** Rotate the board toward north-up while lifting the viewing angle to 90°. */
export function projectGridSwing(x:number,y:number,progress:number){
 const t=Math.max(0,Math.min(1,progress)),angle=(1-t)*Math.PI/4,scale=Math.SQRT1_2+(1-Math.SQRT1_2)*t,tilt=Math.sin((30+60*t)*Math.PI/180),c=Math.cos(angle),s=Math.sin(angle);
 return{x:scale*(c*x-s*y),y:scale*tilt*(s*x+c*y)};
}
export function unprojectGridSwing(x:number,y:number,progress:number){
 const t=Math.max(0,Math.min(1,progress)),angle=(1-t)*Math.PI/4,scale=Math.SQRT1_2+(1-Math.SQRT1_2)*t,tilt=Math.sin((30+60*t)*Math.PI/180),c=Math.cos(angle),s=Math.sin(angle),a=x/scale,b=y/(scale*tilt);
 return{x:c*a+s*b,y:-s*a+c*b};
}
