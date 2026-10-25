import landcover from './data/sf-level-landcover.json';
import {siteInfo} from './neighborhood';
export type LandUse = 'water' | 'urban' | 'trees' | 'grass' | 'bare' | 'retrofit';
export type Action = 'restore' | 'retrofit' | 'housing' | 'protect';
export type Layer = 'land' | 'runoff';
export interface Cell { id:number; x:number; y:number; original:LandUse; use:LandUse; locked:boolean; inPark:boolean; curb:number; path:number; intervention:Action|null; age:number; condition:number; protected:boolean; project:null|{action:Action;remaining:number;startsIn?:number}; }
export interface Entry { month:number; reduction:number; homes:number; budget:number; }
export interface GameState { month:number; budget:number; homes:number; cells:Cell[]; history:Entry[]; log:string[]; autoMaintain:boolean; }
export const WIDTH=landcover.width, HEIGHT=landcover.height;
export const BBOX=landcover.bbox;
const lat=(BBOX[1]+BBOX[3])/2*Math.PI/180;
export const CELL_AREA=((BBOX[2]-BBOX[0])*111320*Math.cos(lat)/WIDTH)*((BBOX[3]-BBOX[1])*111320/HEIGHT);
export const ACTIONS:Record<Action,{title:string;subtitle:string;cost:number;duration:number;}>={
 restore:{title:'Street trees',subtitle:'Plant a greener edge to Alamo Square.',cost:12,duration:3},
 retrofit:{title:'Rain garden',subtitle:'Turn a paved curb into a planted bed.',cost:18,duration:3},
 housing:{title:'Permeable paths',subtitle:'Replace hard paths with porous paving.',cost:15,duration:3},
 protect:{title:'Protect park',subtitle:'Keep the existing park canopy intact.',cost:6,duration:0},
};
export function mapClass(code:number):LandUse { return code===80?'water':code===50?'urban':[10,95].includes(code)?'trees':[20,30,40,90,100].includes(code)?'grass':'bare'; }
export function createGame():GameState {
 const cells:Cell[]=landcover.classes.map((code,id)=>{
  const x=id%WIDTH,y=Math.floor(id/WIDTH),lng=BBOX[0]+(x+.5)/WIDTH*(BBOX[2]-BBOX[0]),lat=BBOX[3]-(y+.5)/HEIGHT*(BBOX[3]-BBOX[1]);
  const site=siteInfo(lng,lat);let use=mapClass(code);
  // Mapped public park lawn refines coarse built-up raster pixels; roads,
  // paths and preserved buildings still take priority below.
  if(site.inPark&&!site.inBuilding&&use==='urban')use='grass';
  // OSM centerlines refine narrow paving absent from the 10m raster.
  // Assumed half-widths (3m paths / 8m streets) are scenario parameters.
  if(!site.inBuilding&&((site.inPark&&site.path<3)||site.curb<8))use='urban';
  return {id,x,y,original:use,use,age:120,condition:1,protected:false,project:null,locked:site.inBuilding,inPark:site.inPark,curb:site.curb,path:site.path,intervention:null};
 });
 return {month:0,budget:100,homes:0,cells,history:[{month:0,reduction:0,homes:0,budget:100}],log:['Welcome to Steiner Street. Choose an intervention to preview a change near the Painted Ladies.'],autoMaintain:true};
}
// Educational parameter set: uniform soil group B, not a mapped SF soil survey.
// Forest/open-space endpoints follow TR-55 B-group values; urban and retrofit
// are illustrative mixed-cover values. Establishment interpolation is assumed.
export function curveNumber(cell:Cell):number {
 if(cell.use==='water')return 100;
 if(cell.use==='urban')return 92;
 if(cell.use==='retrofit')return 78;
 if(cell.use==='bare')return 86;
 if(cell.use==='grass')return 61;
 return 61-6*Math.min(1,cell.age/60)*cell.condition;
}
export function runoffMm(rain:number,cn:number):number {
 if(rain<=0)return 0;
 const s=25400/cn-254;
 return rain<=.2*s?0:(rain-.2*s)**2/(rain+.8*s);
}
export function metrics(state:GameState,rain=35){
 let baseline=0,current=0,green=0,protectedCells=0,projects=0;
 for(const cell of state.cells){
  if(!isPlayable(cell))continue;
  baseline+=runoffMm(rain,curveNumber({...cell,use:cell.original,age:120,condition:1}))*CELL_AREA/1000;
  current+=runoffMm(rain,curveNumber(cell))*CELL_AREA/1000;
  if(['trees','grass','retrofit'].includes(cell.use))green++;
  if(cell.protected)protectedCells++;
  if(cell.project)projects++;
 }
 const reduction=baseline>0?(baseline-current)/baseline*100:0;
 return {baseline,current,reduction,green,protectedCells,projects,retained:baseline-current};
}
export function isPlayable(cell:Cell):boolean {
 const loc=cellLocation(cell);
 return cell.use!=='water'&&loc.lat>=BBOX[1]&&loc.lat<=BBOX[3]&&loc.lng>=BBOX[0]&&loc.lng<=BBOX[2];
}
export function canAct(state:GameState,id:number,action:Action):string|null {
 const cell=state.cells[id];
 if(!cell||cell.use==='water')return 'Choose a land cell. The ocean and bay are not buildable.';
 if(!isPlayable(cell))return 'This cell is outside the mainland play area. Choose a plot in San Francisco.';
 if(state.month>=120)return 'This ten-year scenario is complete. Reset to explore another plan.';
 if(cell.locked)return 'Mapped buildings, including the Painted Ladies, are preserved. Choose public ground.';
 if(cell.project)return 'A project is already underway here.';
 if(cell.protected)return 'This green space is protected for this scenario.';
 if(state.budget<ACTIONS[action].cost)return 'You need more budget for this project.';
 if(action==='retrofit'&&!(cell.use==='urban'&&cell.curb<16&&!cell.inPark))return 'Choose a paved curb tile on Steiner Street for a rain garden.';
 if(action==='restore'&&!(cell.inPark&&cell.curb<65&&['grass','bare'].includes(cell.use)))return 'Choose a lawn-edge tile for new trees.';
 if(action==='housing'&&!(cell.inPark&&cell.path<9&&cell.use==='urban'))return 'Choose a paved park-path tile for permeable paving.';
 if(action==='protect'&&!(cell.inPark&&['grass','trees'].includes(cell.use)))return 'Choose existing green space inside Alamo Square.';
 return null;
}
export function applyAction(state:GameState,id:number,action:Action):GameState {
 if(canAct(state,id,action))return state;
 const next=structuredClone(state),cell=next.cells[id],spec=ACTIONS[action];
 next.budget-=spec.cost;
 if(action==='protect'){cell.protected=true;cell.intervention=action;}
 else cell.project={action,remaining:spec.duration};
 next.log=[`${spec.title}: ${spec.cost} credits committed.${spec.duration?` Ready in ${spec.duration} months.`:' This cell is now protected.'}`,...next.log].slice(0,12);
 return next;
}
export function advanceQuarter(state:GameState,rain=35):GameState {
 if(state.month>=120)return state;
 const next=structuredClone(state);
 let completed=0;
 // Reserve quarterly upkeep once. No hidden rainfall or random outcomes.
 const planted=next.cells.filter(c=>c.use==='trees'&&c.original!=='trees');
 const upkeep=planted.length;
 const maintained=next.autoMaintain&&next.budget>=upkeep;
 if(maintained)next.budget-=upkeep;
 for(let m=0;m<3;m++){
  for(const cell of next.cells){
   if(cell.use==='trees'&&cell.original!=='trees'){
    cell.age++;
    cell.condition=Math.max(.2,Math.min(1,cell.condition+(maintained?.015:-.025)));
   }
   if(cell.project){
    if((cell.project.startsIn||0)>0){cell.project.startsIn=(cell.project.startsIn||0)-1;continue;}
    cell.project.remaining--;
    if(cell.project.remaining<=0){
     const action=cell.project.action;
     if(action==='restore'){cell.use='trees';cell.age=0;cell.condition=.85;}
     if(action==='retrofit')cell.use='retrofit';
     if(action==='housing')cell.use='retrofit';
     cell.intervention=action;
     cell.project=null;completed++;
    }
   }
  }
  next.month++;
 }
 const result=metrics(next,rain);
 next.history.push({month:next.month,reduction:result.reduction,homes:next.homes,budget:next.budget});
 const text=completed?`${completed} project${completed===1?'':'s'} completed. See the changed surfaces in the top-down view.`:'Three months passed. Established green space keeps working; new planting takes time.';
 next.log=[text,...next.log].slice(0,12);
 if(planted.length&&!maintained)next.log.unshift('Planting condition declined: maintenance was off or the budget could not cover upkeep.');
 return next;
}
export function cellLocation(cell:Cell){return {lng:BBOX[0]+(cell.x+.5)/WIDTH*(BBOX[2]-BBOX[0]),lat:BBOX[3]-(cell.y+.5)/HEIGHT*(BBOX[3]-BBOX[1])};}
export function dateLabel(month:number){return new Intl.DateTimeFormat('en-US',{month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(2026,0+month,1)));}
