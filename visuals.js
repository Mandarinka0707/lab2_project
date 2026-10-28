(function(root){
'use strict';
const M=typeof module!=='undefined'?require('./model.js'):root.ISO;
const fractions=[0,.25,.5,.75,1];
const titles=['Начальное состояние','Первая четверть','Вторая четверть','Третья четверть','Конечное состояние'];
const fmt=v=>Number(v).toLocaleString('ru-RU',{maximumFractionDigits:4});
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function snapshots(result){return fractions.map((fraction,i)=>({fraction,title:titles[i],time:result.config.T*fraction,values:M.sample(result,result.config.T*fraction)}));}
function bounds(views){let min=0,max=1;for(const view of views)for(const v of view.values){min=Math.min(min,v);max=Math.max(max,v);}return {min,max};}
function radarSVG(initial,values,range,{title='',initialOnly=false}={}){
 const W=720,H=650,cx=360,cy=320,R=248,n=M.ids.length;
 const point=(i,r)=>{const a=-Math.PI/2+2*Math.PI*i/n;return [cx+Math.cos(a)*r,cy+Math.sin(a)*r];};
 const radius=v=>R*(v-range.min)/(range.max-range.min||1);
 const xy=p=>p.map(v=>v.toFixed(2)).join(',');
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><desc>25 характеристик u. Синяя линия — начальные значения; красная — выбранный момент. Общая шкала ${fmt(range.min)} … ${fmt(range.max)}.</desc><rect width="${W}" height="${H}" fill="white"/><text x="${cx}" y="24" text-anchor="middle" font-family="Arial" font-size="16" fill="#26384a">${esc(title)}</text><path d="M180,625h22" stroke="#2863ae" stroke-width="2"/><text x="208" y="629" font-family="Arial" font-size="12" fill="#26384a">Начальные u(0)</text>${initialOnly?'':'<path d="M385,625h22" stroke="#c44343" stroke-width="2"/><text x="413" y="629" font-family="Arial" font-size="12" fill="#26384a">Расчётные u(t)</text>'}`;
 for(let k=0;k<=4;k++){
  const r=R*k/4,v=range.min+(range.max-range.min)*k/4;
  svg+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#ccd3da"/><text x="${cx+6}" y="${cy-r-5}" font-size="12" fill="#586675">${fmt(v)}</text>`;
 }
 M.ids.forEach((id,i)=>{const end=point(i,R),label=point(i,R+26);svg+=`<g data-axis="${id}"><title>u${id} · ${esc(M.names[i])}; начало: ${fmt(initial[i])}; t: ${fmt(values[i])}</title><path d="M${cx},${cy}L${xy(end)}" stroke="#d9dfe5"/><text x="${label[0].toFixed(2)}" y="${label[1].toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="14" fill="#26384a">u${id}</text></g>`;});
 const series=(row,color,kind)=>`<polygon data-radar-series="${kind}" points="${row.map((v,i)=>xy(point(i,radius(v)))).join(' ')}" fill="${color}" fill-opacity=".035" stroke="${color}" stroke-width="2"/>`;
 svg+=series(initial,'#2863ae','initial');
 if(!initialOnly)svg+=series(values,'#c44343','current');
 values.forEach((v,i)=>{const p=point(i,radius(v));svg+=`<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="3" fill="${initialOnly?'#2863ae':'#c44343'}"><title>u${M.ids[i]} · ${esc(M.names[i])}: ${fmt(v)}</title></circle>`;});
 return svg+'</svg>';
}
const lineLayout={width:900,left:68,right:20,top:30,bottom:44};
function lineBounds(rows,{mode='auto',min,max}={}){
 if(mode==='manual'){
  if(!Number.isFinite(min)||!Number.isFinite(max)||!Number.isFinite(max-min)||max<=min)throw Error('Граница Y max должна быть больше Y min; обе границы должны быть конечными числами.');
  return {min,max};
 }
 let lo=Infinity,hi=-Infinity;
 for(const row of rows)for(const v of row){if(!Number.isFinite(v))throw Error('На графике обнаружено нечисловое значение.');lo=Math.min(lo,v);hi=Math.max(hi,v);}
 if(!Number.isFinite(lo))return {min:0,max:1};
 if(mode==='unit')return {min:Math.min(0,lo),max:Math.max(1,hi)};
 const pad=hi>lo?(hi-lo)*.08:Math.max(.0001,Math.abs(lo)*.01);
 return {min:lo-pad,max:hi+pad};
}
function timeWindow(result,from,to){
 if(!Number.isFinite(from)||!Number.isFinite(to)||from<0||to>result.config.T||to<=from)throw Error('Задайте интервал 0 ≤ t от < t до ≤ T.');
 const times=[from],values=[M.sample(result,from)];
 result.times.forEach((t,i)=>{if(t>from&&t<to){times.push(t);values.push(result.values[i].slice());}});
 times.push(to);values.push(M.sample(result,to));return {times,values};
}
function lineChartSVG(series,times,{height=320,width=900,scale='auto',min,max,threshold=null,yLabel='uᵢ(t)',chartId='main'}={}){
 const {left:L,right:R,top:TOP,bottom:B}=lineLayout,H=height,W=width;
 const range=lineBounds(series.map(s=>s.values),{mode:scale,min,max}),span=range.max-range.min;
 const from=times[0],to=times.at(-1);
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)throw Error('Некорректная ось времени.');
 const x=t=>L+(W-L-R)*(t-from)/(to-from),y=v=>TOP+(H-TOP-B)*(range.max-v)/span;
 const decimals=Math.max(2,Math.min(10,1-Math.floor(Math.log10(span/4))));
 const label=(v,d=decimals)=>Number(v).toLocaleString('ru-RU',{maximumFractionDigits:d});
 const clip='plot-'+String(chartId).replace(/[^a-zA-Z0-9_-]/g,'');
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(yLabel)}; t от ${from} до ${to}; Y от ${range.min} до ${range.max}"><defs><clipPath id="${clip}"><rect x="${L}" y="${TOP}" width="${W-L-R}" height="${H-TOP-B}"/></clipPath></defs><rect width="${W}" height="${H}" fill="white"/><text x="${L}" y="18" font-size="13" fill="#344b63" font-family="Arial">${esc(yLabel)}</text>`;
 for(let k=0;k<=4;k++){
  const v=range.min+span*k/4,yy=y(v);svg+=`<path d="M${L},${yy}H${W-R}" stroke="#e2e8ef"/><text x="${L-10}" y="${yy+4}" text-anchor="end" fill="#52667b" font-family="Arial" font-size="11">${label(v)}</text>`;
 }
 for(let k=0;k<=5;k++){
  const t=from+(to-from)*k/5,xx=x(t);svg+=`<path d="M${xx},${TOP}V${H-B}" stroke="#edf1f6"/><text x="${xx}" y="${H-24}" text-anchor="middle" fill="#52667b" font-family="Arial" font-size="11">${label(t,Math.max(2,Math.min(10,1-Math.floor(Math.log10((to-from)/5)))))}</text>`;
 }
 if(threshold!==null&&threshold>=range.min&&threshold<=range.max)svg+=`<path d="M${L},${y(threshold)}H${W-R}" stroke="#b18a38" stroke-dasharray="5 5"/><text x="${W-R}" y="${y(threshold)-5}" text-anchor="end" fill="#856621" font-size="10" font-family="Arial">Порог ${label(threshold)}</text>`;
 svg+=`<g clip-path="url(#${clip})">`;
 series.forEach((s,i)=>{
  if(s.values.length!==times.length)throw Error('Число значений не совпадает с осью времени.');
  const stride=Math.max(1,Math.ceil(times.length/1500));let d='';
  for(let k=0;k<times.length;k++){if(k%stride&&k!==times.length-1)continue;d+=(d?'L':'M')+x(times[k]).toFixed(3)+' '+y(s.values[k]).toFixed(3);}
  svg+=`<path data-series-id="${esc(s.id??i)}" d="${d}" fill="none" stroke="${esc(s.color)}" stroke-width="${series.length>10?1.6:2.3}" stroke-linecap="round" stroke-linejoin="round"/>`;
 });
 return svg+`</g><text x="${W/2}" y="${H-5}" text-anchor="middle" fill="#344b63" font-size="12" font-family="Arial">t — время, усл. ед.</text></svg>`;
}
const api={snapshots,bounds,radarSVG,lineBounds,timeWindow,lineChartSVG,lineLayout};
if(typeof module!=='undefined')module.exports=api;root.ISOVisuals=api;
})(typeof globalThis!=='undefined'?globalThis:this);
