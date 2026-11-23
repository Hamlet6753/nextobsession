(() => {
 const $=id=>document.getElementById(id),form=$('analytics-filters'),table=$('analytics-table'),status=$('analytics-status');
 const definitions={pages:['path','page_kind','pageviews','clicks','sessions'],sources:['source','medium','campaign','pageviews','clicks','sessions'],targets:['action','target','clicks'],landings:['landing_path','sessions'],devices:['device','pageviews','clicks','sessions'],daily:['bucket','pageviews','clicks','sessions']};
 const labels={path:'Page',page_kind:'Page type',pageviews:'Views',clicks:'Clicks',sessions:'Sessions',source:'First source',medium:'Medium',campaign:'Campaign',action:'Click type',target:'Target',landing_path:'Landing page',device:'Device',bucket:'Period start (UTC)',day:'Day (UTC)'};
 let report=null,view='pages',controller,loadId=0,granularity='auto';
 const visible=new Set(['pageviews','clicks','sessions']);
 const number=value=>Number(value||0).toLocaleString('en');
 function defaults(){granularity='auto';document.querySelectorAll('[data-period]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.period==='7')));form.reset();const now=new Date(),from=new Date(now);from.setUTCDate(from.getUTCDate()-6);form.elements.from.value=from.toISOString().slice(0,10);form.elements.to.value=now.toISOString().slice(0,10);const min=new Date(now);min.setUTCDate(min.getUTCDate()-89);for(const key of ['from','to']){form.elements[key].max=now.toISOString().slice(0,10);form.elements[key].min=min.toISOString().slice(0,10);}}
 function fillSuggestions(id,values){$(id).replaceChildren(...[...new Set(values)].filter(Boolean).map(value=>{const option=document.createElement('option');option.value=value;return option;}));}
 function render(){
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
  table.replaceChildren();if(!report)return;const data=(view==='daily'?report.series:report[view])||[];
  if(!data.length){const p=document.createElement('p');p.textContent='No matching events. Statistics start after installation and visitor consent.';table.append(p);return;}
  const grid=document.createElement('table'),head=document.createElement('thead'),body=document.createElement('tbody'),tr=document.createElement('tr');
  for(const key of definitions[view]){const th=document.createElement('th');th.scope='col';th.textContent=labels[key];tr.append(th);}head.append(tr);
  for(const row of data){const tr=document.createElement('tr');for(const key of definitions[view]){const td=document.createElement('td'),value=row[key]??'';
   if(['path','landing_path','source'].includes(key)&&value){const button=document.createElement('button');button.type='button';button.textContent=String(value);button.title='Filter by '+labels[key];button.addEventListener('click',()=>{form.elements[key].value=value;load();});td.append(button);}else td.textContent=['pageviews','clicks','sessions'].includes(key)?number(value):String(value||'-');tr.append(td);}body.append(tr);}
  grid.append(head,body);table.append(grid);
 }
 function chart(){
  const target=$('analytics-chart');target.replaceChildren();const series=report?.series||[];
  $('analytics-chart-export').disabled=!report;
  document.querySelectorAll('[data-granularity]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.granularity===granularity)));
  if(!report)return;
  const unit={hour:'Hourly',day:'Daily',week:'Weekly',month:'Monthly'}[report.granularity];
  $('analytics-chart-range').textContent=`${report.from} to ${report.to} (UTC) - ${unit}`;
  if(!series.length){target.textContent='No events for this period.';return;}
  const ns='http://www.w3.org/2000/svg';
  const node=(tag,attrs={},text)=>{const el=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))el.setAttribute(key,String(value));if(text!==undefined)el.textContent=text;return el;};
  const svg=node('svg',{viewBox:'0 0 1000 330',role:'img','aria-label':`${unit} views, clicks and sessions in UTC. Exact values are available in the Timeline table and chart CSV.`});
  const left=65,right=975,top=20,bottom=275,width=right-left,height=bottom-top;
  const keys=['pageviews','clicks','sessions'].filter(key=>visible.has(key));
  const maximum=Math.max(1,...series.flatMap(row=>keys.map(key=>Number(row[key])||0)));
  const magnitude=10**Math.floor(Math.log10(maximum/4));
  const step=Math.max(1,[1,2,5,10].map(n=>n*magnitude).find(n=>n>=maximum/4)||magnitude*10);
  const max=Math.ceil(maximum/step)*step;
  for(let value=0;value<=max+step*.01;value+=step){const y=bottom-value/max*height;svg.append(node('line',{x1:left,x2:right,y1:y,y2:y,stroke:'#34343f'}),node('text',{x:left-12,y:y+4,'text-anchor':'end',fill:'#aaaab5','font-size':12},number(value)));}
  const x=index=>series.length===1?(left+right)/2:left+index/(series.length-1)*width;
  const short=bucket=>report.granularity==='hour'?bucket.slice(5,10)+' '+bucket.slice(11,16):report.granularity==='month'?bucket.slice(0,7):bucket.slice(5,10);
  const count=Math.min(series.length,report.granularity==='hour'?6:8),ticks=new Set();
  for(let i=0;i<count;i++)ticks.add(count===1?0:Math.round(i*(series.length-1)/(count-1)));
  for(const i of ticks)svg.append(node('text',{x:x(i),y:300,'text-anchor':'middle',fill:'#aaaab5','font-size':12},short(series[i].bucket)));
  const colors={pageviews:'#ff728f',clicks:'#65b9ff',sessions:'#45d6aa'};
  for(const key of keys){
   const points=series.map((row,i)=>`${x(i)},${bottom-row[key]/max*height}`).join(' ');
   svg.append(node('polyline',{points,fill:'none',stroke:colors[key],'stroke-width':2.5,'stroke-linejoin':'round'}));
   // Keep large ranges legible while retaining one hover target for every bucket.
   if(series.length<=100)series.forEach((row,i)=>{const dot=node('circle',{cx:x(i),cy:bottom-row[key]/max*height,r:3,fill:'#19191f',stroke:colors[key],'stroke-width':2});svg.append(dot);});
  }
  series.forEach((row,i)=>{const slot=width/Math.max(1,series.length-1),rect=node('rect',{x:Math.max(left,x(i)-slot/2),y:top,width:Math.min(slot,right-Math.max(left,x(i)-slot/2)),height,fill:'transparent'});rect.append(node('title',{},`${row.bucket} UTC\nViews: ${number(row.pageviews)}\nClicks: ${number(row.clicks)}\nSessions: ${number(row.sessions)}`));svg.append(rect);});
  if(!keys.length)svg.append(node('text',{x:500,y:150,'text-anchor':'middle',fill:'#aaaab5'},'Select a series above to display it.'));
  target.append(svg);
 }
 function exportCsv(columns,rows,filename){
  const quote=value=>{let s=String(value??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  const lines=[columns.map(key=>quote(labels[key])).join(','),...rows.map(row=>columns.map(key=>quote(row[key])).join(','))];
  const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 async function load(){
  controller?.abort();controller=new AbortController();const current=++loadId;report=null;render();$('analytics-export').disabled=true;$('analytics-chart-export').disabled=true;status.textContent='Loading...';
  for(const key of ['pageviews','clicks','sessions'])$('metric-'+key).textContent='-';$('analytics-chart').replaceChildren();
  const params=new URLSearchParams();for(const [key,value] of new FormData(form))if(value)params.set(key,value);
  params.set('granularity',granularity);
  try{const response=await fetch('/admin/api/analytics?'+params,{cache:'no-store',credentials:'same-origin',signal:controller.signal});const data=await response.json();if(current!==loadId)return;if(!response.ok)throw Error(data.error||'Could not load analytics.');report=data;
   for(const key of ['pageviews','clicks','sessions'])$('metric-'+key).textContent=number(report.totals[key]);
   fillSuggestions('analytics-paths',report.pages.map(row=>row.path));fillSuggestions('analytics-sources',report.sources.map(row=>row.source));chart();render();$('analytics-export').disabled=false;status.textContent='Updated '+new Date().toLocaleTimeString()+'. '+report.from+' to '+report.to+' (UTC).';
  }catch(error){if(current===loadId&&error.name!=='AbortError')status.textContent=error.message;}
 }
 form.addEventListener('submit',event=>{event.preventDefault();load();});$('analytics-reset').addEventListener('click',()=>{defaults();load();});
 document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;render();}));
 $('analytics-export').addEventListener('click',()=>{if(!report)return;exportCsv(definitions[view],(view==='daily'?report.series:report[view])||[],`analytics-${view}-${report.from}-${report.to}.csv`);});
 $('analytics-chart-export').addEventListener('click',()=>{if(report)exportCsv(['bucket','pageviews','clicks','sessions'],report.series,`analytics-chart-${report.granularity}-${report.from}-${report.to}.csv`);});
 document.querySelectorAll('[data-granularity]').forEach(button=>button.addEventListener('click',()=>{granularity=button.dataset.granularity;load();}));
 document.querySelectorAll('[data-series]').forEach(button=>button.addEventListener('click',()=>{const key=button.dataset.series;visible.has(key)?visible.delete(key):visible.add(key);button.setAttribute('aria-pressed',String(visible.has(key)));chart();}));
 document.querySelectorAll('[data-period]').forEach(button=>button.addEventListener('click',()=>{
  const now=new Date(),to=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())),from=new Date(to);
  if(button.dataset.period==='yesterday'){to.setUTCDate(to.getUTCDate()-1);from.setTime(to.getTime());}
  else from.setUTCDate(from.getUTCDate()-((Number(button.dataset.period)||1)-1));
  form.elements.from.value=from.toISOString().slice(0,10);form.elements.to.value=to.toISOString().slice(0,10);granularity='auto';
  document.querySelectorAll('[data-period]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));load();
 }));
 for(const key of ['from','to'])form.elements[key].addEventListener('change',()=>{granularity='auto';document.querySelectorAll('[data-period]').forEach(button=>button.setAttribute('aria-pressed','false'));});
 defaults();load();
})();
