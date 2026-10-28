'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const M=ISO,colors=['#087f78','#d8a145','#8d78bc','#67a6c0','#dd8b75','#89aa6f','#b3829e','#6e90ac','#aea158','#67b1a0','#b97b53','#9d94c7','#568e71','#a3937d','#d4a3a5','#78a4a1','#a9b366','#b68eb9','#749fca','#cb926c','#839e7b','#bdad83','#c28693','#91a5ab','#ad9cbd'];
let config=M.makeConfig(0),result=null,group='all',hiddenSeries=new Set(),dirty=false,currentTab='overview',radarView='0';
const fmt=(v,n=3)=>Number(v).toLocaleString('ru-RU',{minimumFractionDigits:n,maximumFractionDigits:n});
const esc=s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function notify(text,error=false){$('#message').hidden=!text;$('#message').textContent=text;$('#message').className=error?'error':'';}
function markDirty(){dirty=true;document.body.classList.add('dirty');$('#dirty').textContent='Есть изменения';$('#dirty').className='tag pending';$('#stat-status').textContent='Нужен пересчёт';$('#stat-explain').textContent='Показаны предыдущие траектории';}
function tab(name){currentTab=name;$$('.tab-panel').forEach(p=>p.hidden=p.id!==name);$$('.nav').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));const titles={disturbances:['Возмущения Fak₁–Fak₆','Изменение шести внешних факторов во времени по профилям из примера.','Возмущения'],overview:['Моделирование качества ПО','Расчёт системы уравнений и проверка выполнимости плана.','Обзор модели'],radars:['Лепестковые диаграммы','Сравнение 25 характеристик в начале, по четвертям и в конце расчёта.','Диаграммы'],parameters:['Параметры модели','Начальные значения, пороги и внешние факторы.','Параметры'],functions:['Функции связи','Коэффициенты функций системы уравнений.','Функции связи'],method:['Описание модели','Система уравнений, условия расчёта и численный метод.','Модель и метод']};$('#page-title').textContent=titles[name][0];$('#page-subtitle').textContent=titles[name][1];$('#crumb').textContent=titles[name][2];$('#tooltip').hidden=true;if(name==='overview'&&result)charts();if(name==='disturbances'&&result)factorCharts();}
function inputValue(el){return el.value.trim()===''?NaN:Number(el.value);}
function bindNumber(el,callback){el.addEventListener('input',()=>{callback(inputValue(el));markDirty();});}
function refreshEditors(){
 $('#preset').value=Number.isInteger(config.preset)?config.preset:0;
 ['quick-T','param-T'].forEach(id=>$('#'+id).value=config.T);['quick-h','param-h'].forEach(id=>$('#'+id).value=config.h);$('#param-external').value=config.external54;$('#external-label').textContent=fmt(config.external54,2);$('#step-label').textContent='h = '+fmt(config.h,3);
 const labels=M.factorNames;
 $('#quick-factors').innerHTML=config.factors.map((f,i)=>`<div class="quick-factor"><div class="range-heading"><span>Fak<sub>${M.factorIds[i]}</sub> · ${labels[i]}</span><strong id="factor-value-${i}">${fmt(f.base,2)}</strong></div><input type="range" min="0" max="1" step="0.01" value="${f.base}" data-factor="${i}" aria-label="${labels[i]} — базовое значение">${i>=3?'<small class="factor-context">Влияние учитывается по матрице связей</small>':''}</div>`).join('');
 $$('#quick-factors input').forEach(el=>el.oninput=()=>{const i=+el.dataset.factor;config.factors[i].base=+el.value;$('#factor-value-'+i).textContent=fmt(+el.value,2);$(`[data-fi="${i}"][data-field="base"]`).value=el.value;markDirty();});
 $('#factor-editor').innerHTML=config.factors.map((f,i)=>`<div class="factor-row"><strong>Fak<sub>${M.factorIds[i]}</sub><small>${labels[i]}</small>${i>=3?'<small>Прямое влияние по матрице связей</small>':''}</strong><select data-fi="${i}" data-field="type" aria-label="Закон Fak${M.factorIds[i]}"><option value="profile">Профиль как в примере</option><option value="constant">Постоянный</option><option value="linear">Линейный</option><option value="sin">Синусоида</option></select>${[['base','Базовое значение'],['amplitude','Амплитуда / наклон A'],['period','Период P'],['phase','Фаза φ, рад']].map(([key,label])=>`<label>${label}<input type="number" step=".01" value="${f[key]}" data-fi="${i}" data-field="${key}"></label>`).join('')}</div>`).join('');
 $$('#factor-editor select').forEach(el=>{el.value=config.factors[+el.dataset.fi].type;el.onchange=()=>{config.factors[+el.dataset.fi].type=el.value;markDirty();};});
 $$('#factor-editor input').forEach(el=>bindNumber(el,v=>{config.factors[+el.dataset.fi][el.dataset.field]=v;if(el.dataset.field==='base'){$(`[data-factor="${el.dataset.fi}"]`).value=v;$('#factor-value-'+el.dataset.fi).textContent=fmt(v,2);}}));
 $('#state-editor').innerHTML=M.ids.map((id,i)=>`<tr><td><b>u<sub>${id}</sub></b> · ${M.names[i]}<br><small>${i<6?'качество · ≥ порог':'дефект · ≤ порог'}</small></td>${['initial','stars','targets'].map(key=>`<td><input type="number" step=".01" value="${config[key][i]}" data-state="${i}" data-key="${key}" aria-label="u${id} ${key}"></td>`).join('')}</tr>`).join('');
 $$('#state-editor input').forEach(el=>bindNumber(el,v=>config[el.dataset.key][+el.dataset.state]=v));
 refreshFunctions();
}
const functionUses=Array(101);M.equations.forEach(e=>[e[1],e[2]].forEach((list,sign)=>list.forEach(([n,id])=>functionUses[n-1]={target:e[0],id,sign:sign?'−':'+'})));
function refreshFunctions(){const q=$('#function-search').value.trim().toLowerCase();$('#function-editor').innerHTML=config.functions.map((f,i)=>{const u=functionUses[i],token=`f${i+1} u${u.id} u${u.target}`;if(q&&!token.includes(q))return '';return `<tr><td><b>f<sub>${i+1}</sub>(u<sub>${u.id}</sub>)</b></td><td>${u.sign} · du<sub>${u.target}</sub>/dt</td>${['a','b','c','d'].map(k=>`<td><input type="number" step=".01" value="${f[k]}" data-fn="${i}" data-key="${k}" aria-label="f${i+1} коэффициент ${k}"></td>`).join('')}</tr>`;}).join('');$$('#function-editor input').forEach(el=>bindNumber(el,v=>config.functions[+el.dataset.fn][el.dataset.key]=v));}
function run(){
 try{notify('');M.validate(config);result=M.simulate(config);dirty=false;document.body.classList.remove('dirty');$('#dirty').textContent='Расчёт актуален';$('#dirty').className='tag muted';$('#stat-u1').textContent=fmt(result.final[0]);const delta=result.final[0]-config.initial[0];$('#stat-change').innerHTML=`<span class="positive">${delta>=0?'↗ +':'↘ '}${fmt(delta)}</span> за ${fmt(config.T,1)} усл. ед.`;$('#stat-count').textContent=result.count;$('#count-bar').style.width=(result.count/25*100)+'%';const qc=result.final.slice(0,6).filter((v,i)=>v>=config.targets[i]-1e-10).length;$('#stat-goals').textContent=`Качество ${qc}/6 · дефекты ${result.count-qc}/19`;
  $('#stat-status').textContent=result.domainExit!==null?'Вне диапазона':result.feasible?'План выполним':'Пороги не достигнуты';$('#stat-status').className='result-value '+(result.domainExit!==null?'bad':result.feasible?'':'warn');$('#stat-explain').textContent=result.domainExit!==null?`Первый выход: t ≈ ${fmt(result.domainExit,2)}`:result.firstHit!==null?`Пороги выполнены с t ≈ ${fmt(result.firstHit,2)} по сетке`:'Требуется изменение параметров плана';$('#domain-badge').textContent=result.domainExit===null?'✓ Траектория в [0; 1]':'! Траектория вне [0; 1]';$('#precision-value').textContent=result.rungeEstimate.toExponential(2);$('#precision-note').textContent=`max |uₕ − uₕ/₂| = ${result.maxDifference.toExponential(2)}`;$('#external-label').textContent=fmt(config.external54,2);$('#step-label').textContent='h = '+fmt(config.h,3);$('#snapshot-time').value=1000;
  $('#final-values-body').innerHTML=M.ids.map((id,i)=>`<tr><td><b>u<sub>${id}</sub></b> · ${esc(M.names[i])}</td><td>${fmt(config.initial[i],5)}</td><td><b>${fmt(result.final[i],5)}</b></td><td>${fmt(result.final[i]-config.initial[i],5)}</td></tr>`).join('');
  try{localStorage.setItem('iso-lab-project',JSON.stringify(config));}catch(e){}
  resetChartBounds();charts();snapshot();radars();
  if(result.domainExit!==null)notify('Решение вышло за нормированный диапазон [0; 1]. Значения не обрезаны. При этих параметрах план считается недопустимым.');
  if(result.maxDifference>1e-3)notify('Расхождение контрольного расчёта больше 0,001. Уменьшите шаг и повторите расчёт.');
 }catch(e){notify(e.message,true);markDirty();}
}
function resetChartBounds(){
 $('#chart-from').value=0;$('#chart-to').value=result.config.T;
 $('#chart-from').max=result.config.T;$('#chart-to').max=result.config.T;
 $('#chart-scale').value='auto';
 const range=ISOVisuals.lineBounds(result.values,{mode:'auto'});
 $('#chart-min').value=+range.min.toPrecision(8);$('#chart-max').value=+range.max.toPrecision(8);
}
function chartSVG(series,times,options={}){
 return ISOVisuals.lineChartSVG(series,times,{scale:options.forceUnit?'unit':'auto',...options});
}
function charts(){
 if(!result)return;
 $('#tooltip').hidden=true;
 $$('[data-group]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===group)));
 try{
  const from=inputValue($('#chart-from')),to=inputValue($('#chart-to'));
  const windowData=ISOVisuals.timeWindow(result,from,to);
  const focus=$('#chart-indicator').value,view=$('#chart-view').value;
  const scale=view==='separate'?'auto':$('#chart-scale').value;
  const min=inputValue($('#chart-min')),max=inputValue($('#chart-max'));
  $('#manual-scale').hidden=scale!=='manual';
  const indices=M.ids.map((_,i)=>i).filter(i=>group==='all'||(group==='quality'?i<6:i>=6));
  const visible=indices.filter(i=>focus==='all'?!hiddenSeries.has(i):M.ids[i]===Number(focus));
  const series=visible.map(i=>({id:M.ids[i],color:colors[i],values:windowData.values.map(row=>row[i])}));
  const range=ISOVisuals.lineBounds(series.map(s=>s.values),{mode:scale,min,max});
  const targets=visible.map(i=>result.config.targets[i]);
  const commonTarget=targets.length&&targets.every(t=>Math.abs(t-targets[0])<1e-10)?targets[0]:null;
  $('#chart-feedback').textContent='';$('#chart-feedback').hidden=true;
  $('#chart-summary').textContent=`Показано ${visible.length} из 25 · t: ${fmt(from,3)} … ${fmt(to,3)} · `+(view==='separate'?'у каждого графика своя шкала Y':`Y: ${fmt(range.min,6)} … ${fmt(range.max,6)}`);
  $('#chart-scale-note').textContent=view==='separate'?'Автошкала подбирается отдельно для каждого u. Сравнивайте численные значения, а не высоту линий между карточками.':'Близкие линии могут накладываться. Выберите один показатель, сузьте интервал времени или откройте режим «По отдельности».';
  $('#chart-scale').disabled=view==='separate';$('#manual-scale').hidden=view==='separate'||scale!=='manual';
  $('#combined-plot').hidden=view==='separate';$('#separate-plots').hidden=view!=='separate';
  $('#main-chart').innerHTML=chartSVG(series,windowData.times,{scale,min,max,threshold:commonTarget});
  $('#legend-caption').textContent=`Показатели и значения u при t = ${fmt(to,3)}. Нажатие скрывает / показывает линию.`;
  const end=windowData.values.at(-1);
  $('#legend').innerHTML=indices.map(i=>`<button data-series="${i}" class="${visible.includes(i)?'':'off'}" aria-pressed="${visible.includes(i)}"><i style="background:${colors[i]}"></i><span><b>u${M.ids[i]}</b> · ${esc(M.names[i])}</span><strong>${fmt(end[i],6)}</strong></button>`).join('');
  $$('[data-series]').forEach(el=>el.onclick=()=>{const i=+el.dataset.series;$('#chart-indicator').value='all';hiddenSeries.has(i)?hiddenSeries.delete(i):hiddenSeries.add(i);charts();});
  if(view==='separate'){
   $('#separate-plots').innerHTML=visible.length?visible.map(i=>{
    const a=windowData.values[0][i],b=end[i],delta=b-a;
    const one=[{id:M.ids[i],color:colors[i],values:windowData.values.map(row=>row[i])}];
    const limits=ISOVisuals.lineBounds([one[0].values]);
    return `<article class="mini-plot"><h3>u${M.ids[i]} · ${esc(M.names[i])}</h3><p>${fmt(a,6)} → ${fmt(b,6)} <span>Δu = ${delta>=0?'+':''}${fmt(delta,6)}</span></p>${chartSVG(one,windowData.times,{width:560,height:235,yLabel:'u'+M.ids[i]+'(t)',chartId:'u'+M.ids[i]})}<small>Y: ${fmt(limits.min,6)} … ${fmt(limits.max,6)}</small></article>`;
   }).join(''):'<p class="info-text">Все линии скрыты. Нажмите «Показать все линии».</p>';
  }
  const area=$('#main-chart');
  area.onpointermove=ev=>{
   const svg=area.querySelector('svg'),matrix=svg.getScreenCTM();if(!matrix)return;
   const point=svg.createSVGPoint();point.x=ev.clientX;point.y=ev.clientY;
   const local=point.matrixTransform(matrix.inverse()),L=ISOVisuals.lineLayout;
   const alpha=Math.max(0,Math.min(1,(local.x-L.left)/(L.width-L.left-L.right)));
   const t=from+alpha*(to-from),row=M.sample(result,t);
   $('#tooltip').innerHTML=`<b>u при t = ${fmt(t,4)}</b><section class="tooltip-values">`+visible.map(i=>`<div><span><i style="background:${colors[i]}"></i>u${M.ids[i]}</span><span>${fmt(row[i],6)}</span></div>`).join('')+'</section>';
   $('#tooltip').hidden=false;$('#tooltip').style.left=Math.max(8,Math.min(ev.clientX+16,window.innerWidth-$('#tooltip').offsetWidth-8))+'px';$('#tooltip').style.top=Math.max(8,Math.min(ev.clientY+15,window.innerHeight-$('#tooltip').offsetHeight-8))+'px';
  };
  area.onpointerleave=()=>$('#tooltip').hidden=true;
 }catch(error){$('#chart-feedback').textContent=error.message;$('#chart-feedback').hidden=false;return;}
 factorCharts();
}
function factorCharts(){
 if(!result)return;
 const fcolors=['#2764ff','#ff6b00','#10a34a','#ef2222','#8751ff','#9a4312'];
 const series=result.config.factors.map((f,i)=>({id:'Fak'+M.factorIds[i]+' '+M.factorNames[i],color:fcolors[i],values:result.times.map(t=>M.factor(f,t,result.config.T))}));
 const svg=chartSVG(series,result.times,{height:360,forceUnit:true,yLabel:'Fakⱼ(t)',chartId:'factor-profiles'});
 if($('#factor-chart-disturbances'))$('#factor-chart-disturbances').innerHTML=svg;
 if($('#factor-legend-disturbances'))$('#factor-legend-disturbances').innerHTML=M.factorIds.map((id,i)=>`<span><i style="background:${fcolors[i]}"></i>Fak${id} · ${esc(M.factorNames[i])}</span>`).join('');
 if($('#factor-chart'))$('#factor-chart').innerHTML=svg;
 if($('#factor-legend'))$('#factor-legend').innerHTML=$('#factor-legend-disturbances')?.innerHTML||'';
 if($('#factor-chart-parameters'))$('#factor-chart-parameters').innerHTML=svg;
 if($('#factor-legend-parameters'))$('#factor-legend-parameters').innerHTML=$('#factor-legend-disturbances')?.innerHTML||'';
}

function setRadarView(view){radarView=view;$$('[data-radar-view]').forEach(b=>{const selected=b.dataset.radarView===view;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});$$('[data-radar-card]').forEach(card=>card.hidden=view!=='all'&&card.dataset.radarCard!==view);}
function radars(){
 if(!result)return;const views=ISOVisuals.snapshots(result),range=ISOVisuals.bounds(views),initial=views[0].values;
 $('#radar-gallery').innerHTML=views.map((v,i)=>`<article class="card radar-card" data-radar-card="${i}"><div class="card-header"><div><h2>${v.title}</h2><p>t = ${fmt(v.time,3)} · ${['0','T/4','T/2','3T/4','T'][i]}</p></div><button class="button secondary small" data-radar-download="${i}">Скачать SVG</button></div><div class="radar-figure">${ISOVisuals.radarSVG(initial,v.values,range,{title:v.title+' · t = '+fmt(v.time,3),initialOnly:i===0})}</div></article>`).join('');
 $('#radar-key').innerHTML=M.ids.map((id,i)=>`<li><b>u${id}</b> — ${esc(M.names[i])}</li>`).join('');
 $$('[data-radar-download]').forEach(button=>button.onclick=()=>{if(dirty){notify('Сначала пересчитайте модель для актуальных диаграмм.',true);return;}const svg=button.closest('article').querySelector('svg').outerHTML;download('iso-lab-radar-'+button.dataset.radarDownload+'.svg',svg,'image/svg+xml;charset=utf-8');});
 setRadarView(radarView);
}
function snapshot(){if(!result)return;const fraction=+$('#snapshot-time').value/1000,t=fraction*result.config.T,row=M.sample(result,t);$('#snapshot-label').textContent='t = '+fmt(t,2);$$('[data-quarter]').forEach(b=>b.classList.toggle('active',Math.abs(+b.dataset.quarter-fraction)<.001));$('#snapshot-body').innerHTML=row.map((v,i)=>{const goal=result.config.targets[i],pass=i<6?v>=goal-1e-10:v<=goal+1e-10;return `<tr><td><span class="symbol">u<sub>${M.ids[i]}</sub></span> <span class="row-name">${M.names[i]}</span></td><td>${fmt(v,4)}</td><td>${i<6?'≥':'≤'} ${fmt(goal,2)}</td><td><span class="${pass?'pass':'fail'}">${pass?'✓ Достигнут':'○ Не достигнут'}</span></td></tr>`;}).join('');}
function download(name,body,type){const blob=new Blob([body],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#preset').innerHTML=M.presets.map((p,i)=>`<option value="${i}">${String(i+1).padStart(2,'0')} · ${p.name}</option>`).join('');$('#preset').onchange=()=>{config=M.makeConfig(+$('#preset').value);hiddenSeries.clear();refreshEditors();run();};
$$('.nav').forEach(b=>b.onclick=()=>tab(b.dataset.tab));$('#all-params').onclick=()=>tab('parameters');$('#method-link').onclick=()=>tab('method');$('#run-btn').onclick=run;
$('#open-radars').onclick=()=>tab('radars');if($('#open-disturbances'))$('#open-disturbances').onclick=()=>tab('disturbances');$$('[data-radar-view]').forEach(b=>b.onclick=()=>setRadarView(b.dataset.radarView));
for(const id of ['quick-T','param-T'])bindNumber($('#'+id),v=>{config.T=v;$('#'+(id==='quick-T'?'param-T':'quick-T')).value=v;});for(const id of ['quick-h','param-h'])bindNumber($('#'+id),v=>{config.h=v;$('#'+(id==='quick-h'?'param-h':'quick-h')).value=v;});bindNumber($('#param-external'),v=>config.external54=v);
$$('[data-group]').forEach(b=>b.onclick=()=>{group=b.dataset.group;$('#chart-indicator').value='all';$$('[data-group]').forEach(x=>x.classList.toggle('active',x===b));charts();});$('#snapshot-time').oninput=snapshot;$$('[data-quarter]').forEach(b=>b.onclick=()=>{$('#snapshot-time').value=+b.dataset.quarter*1000;snapshot();});
$('#bulk-apply').onclick=()=>{const v=inputValue($('#bulk-initial'));config.initial.fill(v);refreshEditors();markDirty();};$('#function-search').oninput=refreshFunctions;$('#bulk-family').onchange=()=>{const family=$('#bulk-family').value;$('#bulk-a').value=family==='cubic'?.02:0;$('#bulk-b').value=family==='linear'?0:.03;};$('#functions-apply').onclick=()=>{const family=$('#bulk-family').value,p=Object.fromEntries(['a','b','c','d'].map(k=>[k,inputValue($('#bulk-'+k))]));if(family==='linear'){p.a=0;p.b=0;}if(family==='quadratic')p.a=0;config.functions=config.functions.map(()=>({...p}));refreshFunctions();markDirty();};
$('#csv-btn').onclick=()=>{if(!result)return;if(dirty){notify('Сначала пересчитайте модель, чтобы CSV соответствовал текущим параметрам.',true);return;}download('iso-lab-trajectories.csv',M.csv(result),'text/csv;charset=utf-8');};$('#save-btn').onclick=()=>{try{M.validate(config);download('iso-lab-project.json',JSON.stringify(config,null,2),'application/json');}catch(e){notify(e.message,true);}};$('#import-btn').onclick=()=>$('#project-file').click();$('#project-file').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;try{if(file.size>2e6)throw Error('Размер проекта должен быть меньше 2 МБ.');config=M.upgradeConfig(JSON.parse(await file.text()));refreshEditors();run();notify('Проект загружен. Все параметры и результаты обновлены.');}catch(e){notify('Не удалось открыть проект: '+e.message,true);}ev.target.value='';};
const term=list=>list.map(([n,id])=>`f<sub>${n}</sub>(u<sub>${id}</sub>)`).join(' · ');
const factorTerm=i=>{const entries=M.factorEffectTerms(i);if(!entries.length)return '';const parts=entries.map(({id,sign},j)=>`${j?' ':''}${sign<0?'−':'+'} (Fak<sub>${id}</sub>(t) − 0,5)`).join('');return ` ${parts} · ${String(M.FACTOR_MATRIX_GAIN).replace('.',',')}`;};
$('#equation-list').innerHTML=M.equations.map((e,i)=>`<div class="equation">du<sub>${e[0]}</sub>/dt = (1/u<sub>${e[0]}</sub><sup>*</sup>) · [(${term(e[1])}) · (Fak<sub>1</sub>(t) + Fak<sub>2</sub>(t)) − (${term(e[2])}) · Fak<sub>3</sub>(t)${factorTerm(i)}]</div>`).join('');
try{const saved=JSON.parse(localStorage.getItem('iso-lab-project'));if(saved)config=M.upgradeConfig(saved);}catch(e){}

$('#chart-indicator').innerHTML='<option value="all">Все показатели</option>'+M.ids.map((id,i)=>`<option value="${id}">u${id} · ${esc(M.names[i])}</option>`).join('');
['chart-view','chart-scale','chart-from','chart-to','chart-min','chart-max'].forEach(id=>$('#'+id).addEventListener('change',charts));
$('#chart-indicator').onchange=()=>{group='all';$$('[data-group]').forEach(b=>b.classList.toggle('active',b.dataset.group==='all'));charts();};
$('#chart-reset').onclick=()=>{resetChartBounds();charts();};
$('#chart-show-all').onclick=()=>{hiddenSeries.clear();group='all';$('#chart-indicator').value='all';$$('[data-group]').forEach(b=>b.classList.toggle('active',b.dataset.group==='all'));charts();};
$('.brand').onclick=event=>{event.preventDefault();tab('overview');window.scrollTo({top:0,behavior:'smooth'});};

refreshEditors();run();
