import type {ComponentProps} from 'react';
import type {SFGrid} from './SFGrid';
import {ThreeLandscape} from './ThreeLandscape';
export function SFThreeGrid(props:ComponentProps<typeof SFGrid>){return <ThreeLandscape id="sf" sf={props} selected={props.selected} active={!props.thumbnail} thumbnail={props.thumbnail} rotation={props.rotation} zoom={props.zoom} recenter={props.recenter} top={props.view==='bev'} highlight={props.highlightPieces} placementHints={props.placementHints} eligible={props.placementHints?props.eligibleIds:[]} onSelect={props.onSelect} onRemove={props.onRemove}/>;}
