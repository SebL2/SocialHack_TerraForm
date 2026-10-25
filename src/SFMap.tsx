import {type ComponentProps,type ReactNode} from 'react';
import {SFThreeGrid as SFGrid} from './SFThreeGrid';
import {PieceMap} from './PieceMap';
export function SFMap({planControls,infoControl,...props}:ComponentProps<typeof SFGrid>&{planControls?:ReactNode;infoControl?:ReactNode}){
 const pieces=new Set(props.state.cells.filter(c=>c.intervention||c.project||c.protected).map(c=>c.id));
 for(const item of props.plans||[])pieces.add(item.id);
 return <PieceMap count={pieces.size} infoControl={infoControl} planControls={planControls}>{highlight=><SFGrid {...props} highlightPieces={highlight}/>}</PieceMap>;
}
