(() => {
  const dialog=document.getElementById('filters-dialog');
  const open=document.querySelector('[data-open-filters]');
  if(!dialog||!open)return;
  const close=dialog.querySelector('[data-close-filters]');
  const search=dialog.querySelector('#category-search');
  const controls=[...dialog.querySelectorAll('input[name]')];
  let snapshot=[],previousOverflow='';
  const restore=()=>controls.forEach((control,index)=>{control.checked=snapshot[index].checked;control.value=snapshot[index].value;});
  open.addEventListener('click',()=>{
    snapshot=controls.map(control=>({checked:control.checked,value:control.value}));
    previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    dialog.showModal();search.focus();
  });
  close.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{restore();document.body.style.overflow=previousOverflow;open.focus({preventScroll:true});});
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const box=dialog.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();
  });
  search.addEventListener('input',()=>{
    const term=search.value.trim().toLowerCase();
    dialog.querySelectorAll('[data-filter-title]').forEach(option=>option.hidden=!option.dataset.filterTitle.includes(term));
    dialog.querySelectorAll('.filter-group').forEach(group=>{const options=[...group.querySelectorAll('[data-filter-title]')];group.hidden=options.length>0&&options.every(option=>option.hidden);if(term)group.open=true;});
  });
})();
