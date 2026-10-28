const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const M=require('../model.js'),V=require('../visuals.js');
const range=V.lineBounds([[.5795,.5799]],{mode:'auto'});
assert.ok(range.max-range.min<.001,'Auto scale must reveal small differences');
assert.ok(range.min<.5795&&range.max>.5799);
const constant=V.lineBounds([[.5,.5]],{mode:'auto'});
assert.ok(constant.min<.5&&constant.max>.5);
assert.deepEqual(V.lineBounds([[.2,.3]],{mode:'unit'}),{min:0,max:1});
assert.throws(()=>V.lineBounds([[.5]],{mode:'manual',min:1,max:0}));
assert.throws(()=>V.lineBounds([[.5]],{mode:'manual',min:NaN,max:1}));
assert.throws(()=>V.lineBounds([[.5]],{mode:'manual',min:-1e308,max:1e308}));
const outside=V.lineBounds([[-.3,1.8]],{mode:'auto'});
assert.ok(outside.min<-.3&&outside.max>1.8);
const expected=[.7050157748771981,.8465406086426358,.5567620367797422,.7771566762472057,.7833725767479243];
for(let i=0;i<5;i++){
 const r=M.simulate(M.makeConfig(i));
 assert.ok(Math.abs(r.final[0]-expected[i])<1e-12);
 const window=V.timeWindow(r,.113,2.777);
 assert.equal(window.times[0],.113);assert.equal(window.times.at(-1),2.777);
 assert.deepEqual(window.values[0],M.sample(r,.113));
 assert.deepEqual(window.values.at(-1),M.sample(r,2.777));
 assert.throws(()=>V.timeWindow(r,2,1));
 const series=M.ids.map((id,j)=>({id,color:'#2863ae',values:window.values.map(row=>row[j])}));
 const svg=V.lineChartSVG(series,window.times,{scale:'auto',chartId:'test-'+i});
 assert.equal((svg.match(/data-series-id=/g)||[]).length,25);
 assert.ok(svg.includes('clipPath'));
 assert.ok(!/NaN|Infinity/.test(svg));
 assert.ok(svg.includes('uᵢ(t)'));
 assert.equal(V.snapshots(r).length,5);
}
const series=[{id:7,color:'#123456',values:[.5795,.5799]}];
const svg=V.lineChartSVG(series,[0,3],{scale:'manual',min:.5794,max:.58,chartId:'zoom'});
const d=svg.match(/data-series-id="7" d="([^"]+)"/)[1];
const points=Array.from(d.matchAll(/[ML]([\d.-]+) ([\d.-]+)/g),m=>[+m[1],+m[2]]);
assert.ok(Math.abs(points[1][1]-points[0][1])>100,'Manual zoom must visibly separate .0004');
assert.ok(V.lineChartSVG(series,[0,3],{scale:'auto',width:560,height:235,chartId:'small'}).includes('viewBox="0 0 560 235"'));
console.log('PASS: auto/unit/manual Y, small differences, constant series, time window, 25 SVG curves, six-factor matrix dynamics, five radars and six disturbance profiles.');

// Regression checks: all 25 u trajectories are finite, plotted, and remain
// inside [0, 1] for the five demonstration presets. All six factors are used;
// the signed factor matrix contributes a centred direct perturbation.
for(let i=0;i<5;i++){
 const c=M.makeConfig(i), r=M.simulate(c);
 assert.deepEqual(c.factors.map(f=>f.type),Array(6).fill('profile'));
 assert.ok(c.factors.every((f,j)=>[0,0.25,0.5,0.75,1].every(x=>M.factor(f,x*c.T,c.T)>=-1e-9&&M.factor(f,x*c.T,c.T)<=1+1e-9)));
 assert.equal(r.values.length,151,'T=3, h=.02 should give 151 time samples');
 assert.equal(r.final.length,25);
 assert.equal(r.domainExit,null,'documented scenario should stay in [0,1]');
 assert.ok(r.values.every(row=>row.length===25&&row.every(Number.isFinite)));
 const before=r.final.slice();
 for(const j of [3,4,5]) {
  const altered=M.clone(c);altered.factors[j]={type:'constant',base:.9,amplitude:0,period:10,phase:0};
  const changed=M.simulate(altered);
  assert.notDeepEqual(changed.final,before,`Fak${j+1} should affect trajectories where matrix links exist`);
 }
 const all=M.ids.map((id,j)=>({id,color:'#2863ae',values:r.values.map(row=>row[j])}));
 const svg=V.lineChartSVG(all,r.times,{scale:'auto',chartId:'all-u-'+i});
 assert.equal((svg.match(/data-series-id=/g)||[]).length,25,'all 25 u curves must be drawn');
 assert.ok(!/NaN|Infinity/.test(svg));
}
