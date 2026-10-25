import {useState,type ReactNode} from 'react';
import {X} from 'lucide-react';
import {PlanningTools} from './GameChrome';

export function PieceMap({count,infoControl,planControls,children}:{count:number;infoControl?:ReactNode;planControls?:ReactNode;children:(highlight:boolean)=>ReactNode}){
 const [highlight,setHighlight]=useState(false);
 return <>{children(highlight)}<PlanningTools count={count} infoControl={infoControl} onHighlight={setHighlight}>{planControls}</PlanningTools></>;
}

export type MapPiece={id:number;name:string;status:'planned'|'building'|'completed'};
export function PieceList({pieces,cost,onRemove,disabled=false,children}:{pieces:MapPiece[];cost:number;onRemove:(id:number)=>void;disabled?:boolean;children?:ReactNode}){
 return <div className="sf-plan-controls-body"><div className="pieces-plan-heading"><span>{pieces.length} {pieces.length===1?'piece':'pieces'}</span><small>{cost} cr planned</small></div><div className="in-map-plan-list">
  {pieces.length?pieces.map(piece=><div key={piece.id}><span>{piece.name}<small>Tile {piece.id%12+1}, {Math.floor(piece.id/12)+1} · {piece.status==='building'?'Under construction':piece.status==='completed'?'Completed':'Planned'}</small></span>{piece.status==='planned'&&<button aria-label={`Remove ${piece.name} from tile ${piece.id+1}`} disabled={disabled} onClick={()=>onRemove(piece.id)}><X size={13}/></button>}</div>):<small>No pieces placed yet.</small>}
 </div>{children}</div>;
}
