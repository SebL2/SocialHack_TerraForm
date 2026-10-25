import {describe,it,expect} from 'vitest';
import {CHAPTERS,GLOBAL_RULES,GLOBAL_RUN_SEASONS,simulateSeason,globalPassed,globalScore} from './globalChapters';
describe('global restoration chapters',()=>{
 it('has the requested Senegal chapter and two distinct later issues',()=>{expect(CHAPTERS.map(c=>c.id)).toEqual(['sf','senegal','mongolia','indonesia']);expect(CHAPTERS[1].local).toBe('Faye');});
 for(const id of ['senegal','mongolia','indonesia']){
 it(`${id}: supports a balanced affordable winning plan and penalizes inaction`,()=>{const r=GLOBAL_RULES[id],plan=r.choices.map((_,choice)=>({patch:choice,choice})).filter(p=>p.choice!==2);expect(plan.reduce((s,p)=>s+r.choices[p.choice].cost,0)+4).toBeLessThanOrEqual(100);let values:number[]=[...r.baseline],idle:number[]=[...r.baseline];for(let s=0;s<GLOBAL_RUN_SEASONS;s++){values=simulateSeason(id,values,plan,s);idle=simulateSeason(id,idle,[],s);}expect(globalPassed(values,plan)).toBe(true);expect(globalPassed(idle,[])).toBe(false);expect(globalScore(values)).toBeGreaterThan(globalScore(idle));expect(values.every(v=>v>=0&&v<=100)).toBe(true);});
 }
 it('does not allow a high score to hide an unmet community need',()=>{expect(globalPassed([100,100,20],[{patch:1,choice:0},{patch:2,choice:1},{patch:3,choice:2}])).toBe(false);});
});
