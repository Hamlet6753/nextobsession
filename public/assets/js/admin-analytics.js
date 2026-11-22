(() => {
 const $=id=>document.getElementById(id),form=$('analytics-filters'),table=$('analytics-table'),status=$('analytics-status');
 const definitions={pages:['path','page_kind','pageviews','clicks','sessions'],sources:['source','medium','campaign','pageviews','clicks','sessions'],targets:['action','target','clicks'],landings:['landing_path','sessions'],devices:['device','pageviews','clicks','sessions'],daily:['day','pageviews','clicks','sessions']};
 const labels={path:'Page',page_kind:'Page type',pageviews:'Views',clicks:'Clicks',sessions:'Sessions',source:'First source',medium:'Medium',campaign:'Campaign',action:'Click type',target:'Target',landing_path:'Landing page',device:'Device',day:'Day (UTC)'};
 let report=null,view='pages',controller;
 const number=value=>Number(value||0).toLocaleString('en');
 function defaults(){form.reset();const now=new Date(),from=new Date(now);from.setUTCDate(from.getUTCDate()-6);form.elements.from.value=from.toISOString().slice(0,10);form.elements.to.value=now.toISOString().slice(0,10);const min=new Date(now);min.setUTCDate(min.getUTCDate()-89);for(const key of ['from','to']){form.elements[key].max=now.toISOString().slice(0,10);form.elements[key].min=min.toISOString().slice(0,10);}}
 function fillSuggestions(id,values){$(id).replaceChildren(...[...new Set(values)].filter(Boolean).map(value=>{const option=document.createElement('option');option.value=value;return option;}));}
 function render(){
  document.querySelectorAll('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===view)));
  table.replaceChildren();if(!report)return;const data=report[view]||[];
  if(!data.length){const p=document.createElement('p');p.textContent='No matching events. Statistics start after installation and visitor consent.';table.append(p);return;}
  const grid=document.createElement('table'),head=document.createElement('thead'),body=document.createElement('tbody'),tr=document.createElement('tr');
  for(const key of definitions[view]){const th=document.createElement('th');th.scope='col';th.textContent=labels[key];tr.append(th);}head.append(tr);
  for(const row of data){const tr=document.createElement('tr');for(const key of definitions[view]){const td=document.createElement('td'),value=row[key]??'';
   if(['path','landing_path','source'].includes(key)&&value){const button=document.createElement('button');button.type='button';button.textContent=String(value);button.title='Filter by '+labels[key];button.addEventListener('click',()=>{form.elements[key].value=value;load();});td.append(button);}else td.textContent=['pageviews','clicks','sessions'].includes(key)?number(value):String(value||'-');tr.append(td);}body.append(tr);}
  grid.append(head,body);table.append(grid);
 }
 function chart(){const target=$('analytics-chart');target.replaceChildren();const daily=report?.daily||[];if(!daily.length){target.textContent='No events for this period.';return;}
  const start=Date.parse(report.from+'T00:00:00Z'),end=Date.parse(report.to+'T00:00:00Z'),days=[];const byDay=new Map(daily.map(row=>[row.day,row]));
  for(let time=start;time<=end;time+=86400000){const day=new Date(time).toISOString().slice(0,10);days.push(byDay.get(day)||{day,pageviews:0,clicks:0});}
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 1000 200');svg.setAttribute('role','img');svg.setAttribute('aria-label','Daily page views and clicks; exact values are in the Daily table.');
  const max=Math.max(1,...days.flatMap(row=>[row.pageviews||0,row.clicks||0]));const slot=1000/days.length;
  days.forEach((row,i)=>{for(const [j,key,color] of [[0,'pageviews','#ff728f'],[1,'clicks','#65b9ff']]){const rect=document.createElementNS(ns,'rect'),height=Number(row[key]||0)/max*175;rect.setAttribute('x',String(i*slot+j*slot*.42));rect.setAttribute('y',String(190-height));rect.setAttribute('width',String(slot*.38));rect.setAttribute('height',String(height));rect.setAttribute('fill',color);const title=document.createElementNS(ns,'title');title.textContent=row.day+': '+number(row[key])+' '+key;rect.append(title);svg.append(rect);}});target.append(svg);
 }
 async function load(){
  controller?.abort();controller=new AbortController();report=null;render();$('analytics-export').disabled=true;status.textContent='Loading...';
  for(const key of ['pageviews','clicks','sessions'])$('metric-'+key).textContent='-';$('analytics-chart').replaceChildren();
  const params=new URLSearchParams();for(const [key,value] of new FormData(form))if(value)params.set(key,value);
  try{const response=await fetch('/admin/api/analytics?'+params,{cache:'no-store',credentials:'same-origin',signal:controller.signal});const data=await response.json();if(!response.ok)throw Error(data.error||'Could not load analytics.');report=data;
   for(const key of ['pageviews','clicks','sessions'])$('metric-'+key).textContent=number(report.totals[key]);
   fillSuggestions('analytics-paths',report.pages.map(row=>row.path));fillSuggestions('analytics-sources',report.sources.map(row=>row.source));chart();render();$('analytics-export').disabled=false;status.textContent='Updated '+new Date().toLocaleTimeString()+'. '+report.from+' to '+report.to+' (UTC).';
  }catch(error){if(error.name!=='AbortError')status.textContent=error.message;}
 }
 form.addEventListener('submit',event=>{event.preventDefault();load();});$('analytics-reset').addEventListener('click',()=>{defaults();load();});
 document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>{view=button.dataset.view;render();}));
 $('analytics-export').addEventListener('click',()=>{if(!report)return;const columns=definitions[view],quote=value=>{let s=String(value??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};const lines=[columns.map(key=>quote(labels[key])).join(','),...(report[view]||[]).map(row=>columns.map(key=>quote(row[key])).join(','))];const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='analytics-'+view+'-'+report.from+'-'+report.to+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 defaults();load();
})();
