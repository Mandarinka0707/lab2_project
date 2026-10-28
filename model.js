(function(root){
'use strict';
const ids=[1,7,8,9,10,11,34,35,36,37,38,39,40,41,42,43,44,46,47,48,50,51,52,53,57];
const names=['Функциональные возможности','Пригодность','Правильность','Способность к взаимодействию','Защищённость','Согласованность системы','Невыполнение функций спецификации','Несоответствие программной документации','Недостатки документации','Отсутствие файлов поставки','Отсутствие запланированной функции','Отсутствие элементов интерфейса','Противоречия функций и ТЗ','Противоречия функций и нормативов','Противоречия алгоритмов','Ошибки вычислений','Противоречия при инсталляции','Ошибки сетевого обмена','Ошибки использования внешних данных','Несовместимость форматов','Недостатки учёта информации','Недостатки защиты от искажений','Несоответствие средств криптографии','Недостатки антивирусной защиты','Ошибки надёжности'];
// Six entries and their numbering follow the factor list in the source document.
const factorIds=[1,2,3,4,5,6];
const factorNames=['Опыт разработчиков','Опыт эксплуатационного персонала','Трудоёмкость разработки','Курс рубля к доллару (нормированный)','Деловая репутация разработчиков','Деловая репутация эксплуатирующей организации'];
// Signed direct factor links read from the supplied 25×(u,Fak) matrix.
// +1: increasing factor raises du/dt; -1: increasing factor lowers du/dt.
// The source equations below remain the base dynamics; this matrix adds a
// centred, normalized perturbation so the sign matrix does not shift the
// baseline merely because factors are in [0,1]. The gain is an explicit
// calibration assumption because the supplied matrix contains signs, not magnitudes.
const factorMatrix=[
 [ 1, 0, 0, 0, 0, 0], // u1
 [ 0, 1, 0, 0, 0, 0], // u7
 [ 0, 0, 0, 0, 0, 0], // u8
 [ 0, 0, 0, 1, 0, 0], // u9
 [ 0, 0, 0, 0, 1, 0], // u10
 [ 0, 0, 0, 0, 0, 1], // u11
 [-1, 0, 0, 0, 0, 0], // u34
 [ 0,-1, 0, 0, 0, 0], // u35
 [ 0, 0,-1, 0, 0, 0], // u36
 [ 0, 0, 0,-1, 0, 0], // u37
 [ 0, 0, 0, 0,-1, 0], // u38
 [ 0, 0, 0, 0, 0,-1], // u39
 [ 0, 1, 1, 0,-1, 0], // u40
 [ 1, 1, 0, 0, 1, 0], // u41
 [ 0, 1, 0,-1,-1, 1], // u42
 [ 0, 1, 1, 0, 0, 1], // u43
 [ 0, 1, 0,-1, 0, 1], // u44
 [ 0, 1, 1,-1, 0, 0], // u46
 [ 0,-1,-1, 0, 0, 0], // u47
 [ 0, 0, 0, 0, 1,-1], // u48
 [ 1,-1, 0, 0, 0, 0], // u50
 [ 0,-1, 0, 1, 0, 0], // u51
 [ 1,-1, 0, 1, 0,-1], // u52
 [ 0,-1, 0, 0, 0,-1], // u53
 [ 0,-1, 0, 0, 1, 0]  // u57
];
const FACTOR_MATRIX_GAIN=0.1;
const profileStarts=[.5,.3875,.1,0,.1875,.35];
const defaultFactor=(i=0)=>({type:'profile',profile:i+1,base:profileStarts[i]??.5,amplitude:0,period:10,phase:0});
// [target, positive [function,argument], negative [function,argument]]
const equations=[
[1,[[1,7],[2,8],[3,9]],[[4,34],[5,35]]],
[7,[[6,8],[7,10]],[[8,36],[9,37]]],
[8,[[10,1],[11,7]],[[12,38],[13,39]]],
[9,[[14,10],[15,11]],[[16,40],[17,41]]],
[10,[[18,9],[19,11]],[[20,42],[21,43]]],
[11,[[22,10],[23,7]],[[24,44],[25,46]]],
[34,[[26,35],[27,36]],[[28,47],[29,48]]],
[35,[[30,34],[31,37]],[[32,50],[33,51]]],
[36,[[34,34],[35,35]],[[36,52],[37,53]]],
[37,[[38,36],[39,38]],[[40,54],[41,57]]],
[38,[[42,37],[43,39]],[[44,7],[45,8]]],
[39,[[46,38],[47,40]],[[48,9],[49,10]]],
[40,[[50,39],[51,41]],[[52,11],[53,34]]],
[41,[[54,40],[55,42]],[[56,35],[57,36]]],
[42,[[58,41],[59,43]],[[60,37],[61,38]]],
[43,[[62,42],[63,44]],[[64,39],[65,40]]],
[44,[[66,43],[67,46]],[[68,41],[69,42]]],
[46,[[70,44],[71,47]],[[72,43],[73,44]]],
[47,[[74,46],[75,48]],[[76,34],[77,35]]],
[48,[[78,47],[79,50]],[[80,36],[81,37]]],
[50,[[82,48],[83,51]],[[84,38],[85,39]]],
[51,[[86,50],[87,52]],[[88,40],[89,41]]],
[52,[[90,51],[91,53]],[[92,42],[93,43]]],
[53,[[94,52],[95,57]],[[96,44],[97,46]]],
[57,[[98,53],[99,7]],[[100,47],[101,48]]]
];
const presets=[
{name:'Базовый план',description:'Умеренные ресурсы и нагрузка',f:[.55,.30,.35],factorStarts:[.50,.3875,.10,0,.1875,.35],quality:.4,defect:.65,target:.65,limit:.4,scale:1,kind:'linear'},
{name:'Усиление команды',description:'Выше опыт разработчиков и персонала',f:[.85,.65,.25],factorStarts:[.85,.65,.25,.15,.75,.65],quality:.4,defect:.65,target:.65,limit:.4,scale:1,kind:'linear'},
{name:'Высокая трудоёмкость',description:'Рост нагрузки при прежних ресурсах',f:[.55,.30,.85],factorStarts:[.55,.30,.65,.05,.20,.35],quality:.4,defect:.65,target:.65,limit:.4,scale:1,kind:'linear'},
{name:'Периодические факторы',description:'Переменная нагрузка, квадратичные связи',f:[.70,.50,.40],factorStarts:[.70,.50,.40,.10,.55,.50],quality:.4,defect:.65,target:.65,limit:.4,scale:1,kind:'quadratic'},
{name:'Подготовленная система',description:'Лучшие стартовые показатели, кубические связи',f:[.75,.55,.30],factorStarts:[.75,.55,.30,.20,.75,.75],quality:.7,defect:.4,target:.65,limit:.4,scale:1,kind:'cubic'}
];
function clone(x){return JSON.parse(JSON.stringify(x));}
// Experimental initial conditions for the five comparison plans.
// These are explicitly illustrative assumptions, not measured/dissertation data.
const initialPlans=[
 // 0 — baseline: individually varied starting values for all 25 indicators
 [.55,.62,.58,.48,.68,.57, .60,.45,.50,.35,.55,.40,.65,.50,.58,.42,.35,.48,.52,.38,.45,.40,.32,.36,.47],
 // 1 — stronger team: quality indicators start higher; defect indicators lower
 [.62,.62,.61,.58,.62,.61, .38,.40,.42,.38,.40,.39,.42,.40,.42,.38,.38,.40,.40,.38,.40,.38,.36,.38,.40],
 // 2 — high workload: quality starts lower and defects start higher
 [.42,.48,.45,.38,.52,.43, .72,.60,.66,.58,.70,.62,.76,.65,.70,.62,.55,.64,.68,.60,.63,.58,.52,.56,.66],
 // 3 — periodic factors: intermediate, intentionally non-uniform starting profile
 [.58,.60,.54,.50,.63,.55, .55,.48,.57,.40,.60,.44,.62,.54,.61,.45,.38,.52,.56,.42,.49,.44,.35,.40,.50],
 // 4 — prepared system: highest initial quality and relatively few defects
 [.58,.58,.58,.56,.60,.58, .55,.54,.55,.52,.55,.53,.56,.54,.56,.52,.52,.54,.54,.52,.55,.52,.50,.52,.55]
];
function makeConfig(preset=0){
 const p=presets[preset];
 const c={version:3,preset,title:p.name,T:3,h:.02,external54:.5,initial:initialPlans[preset].slice(),stars:ids.map((_,i)=>i<6?3:1),targets:ids.map((_,i)=>i<6?.55:p.limit),factors:Array.from({length:6},(_,i)=>({...defaultFactor(i),base:p.factorStarts[i]})),functions:Array.from({length:101},()=>({a:0,b:0,c:0,d:0}))};
 // Demonstration coefficients, not measurements: every f has its own editable record.
 equations.forEach((e,i)=>{
  e[1].forEach(([n])=>{c.functions[n-1]={a:0,b:0,c:i<6?.12:.025,d:i<6?(i===0?.45:.29):.045};});
  e[2].forEach(([n])=>{c.functions[n-1]={a:0,b:0,c:i<6?.06:.1,d:i<6?.10:.35};});
 });
 if(p.kind==='quadratic')c.functions.forEach(f=>{f.b=.03;});
 if(p.kind==='cubic')c.functions.forEach(f=>{f.b=.005;f.a=.005;});
 
 return c;
}
function upgradeConfig(project){const c=clone(project);if(c.version<3){c.factors=Array.from({length:6},(_,i)=>defaultFactor(i));c.version=3;}if(c.factors.length===3)c.factors.push(defaultFactor(3),defaultFactor(4),defaultFactor(5));validate(c);return c;}
function factor(f,t,T=1){
 if(f.type==='profile'){
  const x=Math.max(0,Math.min(1,t/Math.max(T,1e-12))),i=f.profile||1;
  const starts=[.5,.3875,.1,0,.1875,.35],base=starts[i-1]??.5,shift=f.base-base;
  let v;
  if(i===1)v=.5+.5*x*x;
  else if(i===2)v=.325+.125*Math.sin(2*Math.PI*x/.7+Math.PI/6);
  else if(i===3)v=.1+.6*Math.sin(Math.PI*x/1.3);
  else if(i===4)v=x;
  else if(i===5)v=.125+.125*Math.sin(2*Math.PI*x/.7+Math.PI/6);
  else v=x<=.65?.35+.35*(1-Math.cos(Math.PI*x/.65))/2:.7-.18*Math.pow((x-.65)/.35,2);
  return v+shift*(1-x);
 }
 return f.type==='sin'?f.base+f.amplitude*Math.sin(2*Math.PI*t/f.period+f.phase):f.type==='linear'?f.base+f.amplitude*t:f.base;
}
function poly(p,x){return ((p.a*x+p.b)*x+p.c)*x+p.d;}
function validate(c){
 const finite=(x)=>typeof x==='number'&&Number.isFinite(x);
 if(!c||![1,2,3].includes(c.version))throw Error('Неподдерживаемый формат проекта.');
 if(!finite(c.T)||c.T<=0||c.T>10000||!finite(c.h)||c.h<=0||c.h>c.T||Math.ceil(c.T/c.h)>30000)throw Error('Интервал должен быть положительным; число шагов — не более 30 000.');
 for(const key of ['initial','stars','targets'])if(!Array.isArray(c[key])||c[key].length!==25||!c[key].every(finite))throw Error('Проверьте 25 значений '+key+'.');
 if(c.stars.some(v=>v<=0))throw Error('Все нормирующие значения u* должны быть больше нуля.');
 if(c.initial.some(v=>v<0||v>1)||c.targets.some(v=>v<0||v>1)||!finite(c.external54)||c.external54<0||c.external54>1)throw Error('Начальные значения, пороги и u54 должны принадлежать [0; 1].');
 if(!Array.isArray(c.functions)||c.functions.length!==101||c.functions.some(f=>!f||!['a','b','c','d'].every(k=>finite(f[k]))))throw Error('Нужны коэффициенты всех 101 функций.');
 if(!Array.isArray(c.factors)||![3,6].includes(c.factors.length))throw Error('Нужны шесть факторов (или три в проекте прежней версии).');
 c.factors.forEach(f=>{
  if(!f||!['constant','sin','linear','profile'].includes(f.type)||!['base','amplitude','period','phase'].every(k=>finite(f[k]))||f.period<=0)throw Error('Некорректные параметры фактора.');
  const samples=Array.from({length:201},(_,k)=>factor(f,c.T*k/200,c.T));
  const lo=f.type==='sin'?f.base-Math.abs(f.amplitude):Math.min(f.base,...samples);
  const hi=f.type==='sin'?f.base+Math.abs(f.amplitude):Math.max(f.base,...samples);
  if(lo<0||hi>1)throw Error('Возмущения должны оставаться в [0; 1] на всём интервале.');
 });
 return c;
}
function factorEffect(t,c,rowIndex){
 const F=c.factors.map(f=>factor(f,t,c.T));
 return FACTOR_MATRIX_GAIN*factorMatrix[rowIndex].reduce((sum,sign,j)=>sum+sign*(F[j]-.5),0);
}
function factorEffectTerms(rowIndex){
 return factorMatrix[rowIndex].map((sign,j)=>sign?{id:factorIds[j],sign}:null).filter(Boolean);
}
function rhs(t,y,c){
 const F=c.factors.map(f=>factor(f,t,c.T));const val={54:c.external54};ids.forEach((id,i)=>val[id]=y[i]);
 const product=(arr)=>arr.reduce((z,[n,id])=>z*poly(c.functions[n-1],val[id]),1);
 return equations.map((e,i)=>{
  const source=(product(e[1])*(F[0]+F[1])-product(e[2])*F[2]);
  const matrixEffect=FACTOR_MATRIX_GAIN*factorMatrix[i].reduce((sum,sign,j)=>sum+sign*(F[j]-.5),0);
  return (source+matrixEffect)/c.stars[i];
 });
}
function integrate(c,h=c.h){
 validate(c);if(!Number.isFinite(h)||h<=0)throw Error('Некорректный шаг.');
 let y=c.initial.slice(),t=0;const times=[0],values=[y.slice()];let domainExit=null;
 const add=(a,b,k)=>a.map((v,i)=>v+k*b[i]);
 const steps=Math.ceil(c.T/h-1e-12);
 for(let n=0;n<steps;n++){
  const dt=Math.min(h,c.T-t);if(dt<=1e-14)break;
  const k1=rhs(t,y,c),k2=rhs(t+dt/2,add(y,k1,dt/2),c),k3=rhs(t+dt/2,add(y,k2,dt/2),c),k4=rhs(t+dt,add(y,k3,dt),c);
  y=y.map((v,i)=>v+dt*(k1[i]+2*k2[i]+2*k3[i]+k4[i])/6);t=n===steps-1?c.T:t+dt;
  if(y.some(v=>!Number.isFinite(v)||Math.abs(v)>1e6))throw Error('Решение расходится. Уменьшите интервал, шаг или коэффициенты.');
  if(domainExit===null&&y.some(v=>v < -1e-9 || v > 1+1e-9))domainExit=t;
  times.push(t);values.push(y.slice());
 }
 const meets=(row)=>row.every((v,i)=>i<6?v>=c.targets[i]-1e-10:v<=c.targets[i]+1e-10);
 const final=values.at(-1),count=final.filter((v,i)=>i<6?v>=c.targets[i]-1e-10:v<=c.targets[i]+1e-10).length;
 const hit=values.findIndex(meets);
 return {times,values,final,count,met:meets(final),feasible:meets(final)&&domainExit===null,firstHit:hit<0?null:times[hit],domainExit};
}
function simulate(c){
 const result=integrate(c);const fine=integrate(c,c.h/2);
 const maxDifference=Math.max(...result.final.map((v,i)=>Math.abs(v-fine.final[i])));
 return {...result,maxDifference,rungeEstimate:maxDifference/15,config:clone(c)};
}
function sample(r,t){let k=r.times.findIndex(x=>x>=t-1e-10);if(k<0)k=r.times.length-1;if(k===0||Math.abs(r.times[k]-t)<1e-10)return r.values[k].slice();const a=(t-r.times[k-1])/(r.times[k]-r.times[k-1]);return r.values[k].map((v,i)=>r.values[k-1][i]+a*(v-r.values[k-1][i]));}
function csv(r){return '\uFEFF'+['t;'+ids.map(id=>'u'+id).join(';'),...r.times.map((t,i)=>[t,...r.values[i]].map(v=>v.toFixed(8)).join(';'))].join('\r\n');}
const api={ids,names,factorIds,factorNames,factorMatrix,FACTOR_MATRIX_GAIN,equations,presets,makeConfig,upgradeConfig,validate,factor,poly,factorEffect,factorEffectTerms,rhs,integrate,simulate,sample,csv,clone};
if(typeof module!=='undefined')module.exports=api;root.ISO=api;
})(typeof globalThis!=='undefined'?globalThis:this);
