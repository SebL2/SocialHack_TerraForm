import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {PieceList} from './PieceMap';

describe('piece finder inventory',()=>{
 it('keeps completed pieces visible after the plan queue clears',()=>{
  const html=renderToStaticMarkup(<PieceList pieces={[{id:0,name:'Half-moon earthworks',status:'completed'},{id:14,name:'Assist native regrowth',status:'completed'}]} cost={0} onRemove={()=>{}}/>);
  expect(html).toContain('Half-moon earthworks');
  expect(html).toContain('Assist native regrowth');
  expect(html).toContain('Completed');
  expect(html).toContain('3, 2');
  expect(html).not.toContain('No pieces placed yet.');
  expect(html).not.toContain('aria-label="Remove');
 });
 it('only offers removal for planned pieces in a mixed inventory',()=>{
  const html=renderToStaticMarkup(<PieceList pieces={[{id:0,name:'Old planting',status:'completed'},{id:1,name:'New planting',status:'planned'},{id:2,name:'Path works',status:'building'}]} cost={12} onRemove={()=>{}}/>);
  expect(html).toContain('Remove New planting from tile 2');
  expect(html).not.toContain('Remove Old planting');
  expect(html).not.toContain('Remove Path works');
  expect(html).toContain('Under construction');
 });
});
