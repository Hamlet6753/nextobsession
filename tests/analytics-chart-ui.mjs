import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
class Element {
 constructor(){this.children=[];this.attrs={};this.listeners={};this.dataset={};this.value='';}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(key,value){this.attrs[key]=String(value);}
 addEventListener(key,fn){this.listeners[key]=fn;}
 click(){return this.listeners.click?.({preventDefault(){}});}
}
const ids=new Map();const get=id=>{if(!ids.has(id))ids.set(id,new Element());return ids.get(id);};
const form=get('analytics-filters');form.elements={from:new Element(),to:new Element()};form.reset=()=>{};
const buttons=(key,values)=>values.map(value=>{const b=new Element();b.dataset[key]=value;return b;});
const groups={granularity:buttons('granularity',['auto','hour','day','week','month']),series:buttons('series',['pageviews','clicks','sessions']),period:buttons('period',['today','yesterday','2','7','30','90']),view:buttons('view',['pages','daily'])};
const document={getElementById:get,createElement:()=>new Element(),createElementNS:()=>new Element(),querySelectorAll:selector=>groups[selector.match(/data-(\w+)/)?.[1]]||[]};
const calls=[];
const context={document,console,AbortController,Date,Number,Map,Set,Math,Blob,URLSearchParams,setTimeout,FormData:class{*[Symbol.iterator](){yield ['from',form.elements.from.value];yield ['to',form.elements.to.value];}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},fetch:async url=>{
 const params=new URLSearchParams(url.split('?')[1]);calls.push(params);
 const granularity=params.get('granularity')==='auto'?((Date.parse(params.get('to'))-Date.parse(params.get('from')))/86400000<=1?'hour':'day'):params.get('granularity');
 return {ok:true,json:async()=>({from:params.get('from'),to:params.get('to'),granularity,series:[{bucket:'2026-11-23T00:00:00Z',pageviews:0,clicks:0,sessions:0},{bucket:'2026-11-23T01:00:00Z',pageviews:1,clicks:0,sessions:1}],totals:{pageviews:1,clicks:0,sessions:1},pages:[],sources:[]})};
}};
vm.runInNewContext(readFileSync(new URL('../public/assets/js/admin-analytics.js',import.meta.url),'utf8'),context);
const settle=()=>new Promise(resolve=>setImmediate(resolve));await settle();
assert.equal(calls.at(-1).get('granularity'),'auto');assert.equal(get('analytics-chart').children[0].attrs.role,'img');
groups.period.find(b=>b.dataset.period==='2').click();await settle();assert(get('analytics-chart-range').textContent.includes('Hourly'));
groups.granularity.find(b=>b.dataset.granularity==='week').click();await settle();assert.equal(calls.at(-1).get('granularity'),'week');assert(get('analytics-chart-range').textContent.includes('Weekly'));
const count=()=>get('analytics-chart').children[0].children.filter(n=>n.attrs.points).length;assert.equal(count(),3);
groups.series[0].click();assert.equal(count(),2);assert.equal(groups.series[0].attrs['aria-pressed'],'false');
groups.view.find(b=>b.dataset.view==='daily').click();assert(get('analytics-table').children.length>0);
get('analytics-chart-export').click();assert.equal(get('analytics-chart-export').disabled,false);
console.log('PASS frontend initial load, auto hourly preset, weekly switching, series toggles, timeline and chart CSV export');
