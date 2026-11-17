import { escape } from '../lib/html.js';
import { CATEGORY_GROUPS, byId, filterParams } from '../services/filters.js';
function stateUrl(state, filters) {
  return '/?' + filterParams(filters, new URLSearchParams({q:state.q,sort:state.sort}));
}
export function filterPanel(state) {
  const selected=new Set(state.filters.categories);
  const groups=CATEGORY_GROUPS.map(group=>({label:group.label,html:group.items.map(item=>`<label class="filter-option" data-filter-title="${escape(item.label.toLowerCase())}"><input type="checkbox" name="category" value="${item.id}"${selected.has(item.id)?' checked':''}><span>${escape(item.label)}</span></label>`).join('')}));
  groups.push({label:'Location',html:`<label class="filter-field" for="filter-location">Location<input id="filter-location" type="search" name="location" maxlength="80" value="${escape(state.filters.location)}" placeholder="Country, city or location"></label>`});
  groups.push({label:'Price',html:`<label class="filter-option"><input type="radio" name="price" value=""${!state.filters.price?' checked':''}><span>Any price</span></label><label class="filter-option"><input type="radio" name="price" value="free"${state.filters.price==='free'?' checked':''}><span>Free</span></label><label class="filter-option"><input type="radio" name="price" value="paid"${state.filters.price==='paid'?' checked':''}><span>Paid</span></label>`});
  groups.sort((a,b)=>a.label.localeCompare(b.label,'en'));
  const count=selected.size+Boolean(state.filters.location)+Boolean(state.filters.price);
  return `<button type="button" class="button secondary filter-open" data-open-filters>Filters${count?' ('+count+')':''}</button><dialog id="filters-dialog" class="filters-dialog" aria-labelledby="filters-title"><div class="filters-header"><h2 id="filters-title">Filters</h2><button type="button" class="filter-close secondary" data-close-filters aria-label="Close filters">Close</button></div><div class="filters-body"><label class="filter-field" for="category-search">Find a category<input type="search" id="category-search" placeholder="Search categories" autocomplete="off"></label>${groups.map((group,index)=>`<details class="filter-group"${index===0 || group.html.includes(' checked') || (group.label==='Location' && state.filters.location) ? ' open' : ''}><summary>${escape(group.label)}</summary><div class="filter-options">${group.html}</div></details>`).join('')}</div><div class="filters-footer"><a class="button secondary" href="${escape(stateUrl(state,{categories:[],location:'',price:''}))}">Clear all</a><button type="submit">Apply filters</button></div></dialog>`;
}
export function filterChips(state) {
  const chips=state.filters.categories.map(id=>({label:byId.get(id).label,filters:{...state.filters,categories:state.filters.categories.filter(other=>other!==id)}}));
  if(state.filters.location)chips.push({label:'Location: '+state.filters.location,filters:{...state.filters,location:''}});
  if(state.filters.price)chips.push({label:state.filters.price==='free'?'Free':'Paid',filters:{...state.filters,price:''}});
  return chips.length?`<nav class="filter-chips" aria-label="Selected filters">${chips.map(chip=>`<a class="filter-chip" href="${escape(stateUrl(state,chip.filters))}" aria-label="${escape('Remove '+chip.label+' filter')}">${escape(chip.label)} <span aria-hidden="true">&times;</span></a>`).join('')}</nav>`:'';
}
