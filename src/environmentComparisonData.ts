import {metrics,type GameState} from './simulation';
export function compareEnvironment(before:GameState,after:GameState,rain:number){
 const beforeWater=metrics(before,rain).current,afterWater=metrics(after,rain).current;
 const changed=after.cells.filter(c=>{const old=before.cells[c.id];return !old||c.use!==old.use||c.intervention!==old.intervention||c.protected!==old.protected||c.project?.action!==old.project?.action||(c.intervention==='restore'&&(c.age!==old.age||c.condition!==old.condition));}).map(c=>c.id);
 return {changed,waterSaved:beforeWater-afterWater,rows:[
  {label:`Runoff · ${rain} mm storm`,before:beforeWater,after:afterWater,unit:'m³',digits:3},
  {label:'Tree-covered tiles',before:before.cells.filter(c=>c.use==='trees').length,after:after.cells.filter(c=>c.use==='trees').length,unit:'tiles',digits:0},
  {label:'Protected green tiles',before:before.cells.filter(c=>c.protected).length,after:after.cells.filter(c=>c.protected).length,unit:'tiles',digits:0},
  {label:'Credits remaining',before:before.budget,after:after.budget,unit:'cr',digits:0},
 ]};
}
