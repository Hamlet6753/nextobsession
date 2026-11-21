(() => {
  const root=document.querySelector('[data-related-creators]');if(!root)return;
  const viewport=root.querySelector('.related-viewport'),track=root.querySelector('.related-track');
  const cards=[...track.children],prev=root.querySelector('[data-related-prev]'),next=root.querySelector('[data-related-next]');
  const controls=root.querySelector('.related-controls'),explore=root.querySelector('.related-explore'),status=root.querySelector('.related-status');
  let page=0,columns=1,pages=1,scrollTimer;
  // SSR describes all rendered cards. After responsive layout, reflect only the
  // cards kept in the active five-page carousel (including offscreen slides).
  const schemaScript=document.querySelector('script[data-site-schema]');
  let fullListItems=null;
  function syncSchema(total){
    if(!schemaScript)return;
    try {
      const schema=JSON.parse(schemaScript.textContent);
      const list=schema['@graph']?.find(node=>node['@type']==='ItemList'&&node['@id']?.endsWith('#related-creators-list'));
      if(!list)return;
      if(!fullListItems)fullListItems=list.itemListElement.slice();
      list.itemListElement=fullListItems.slice(0,total);list.numberOfItems=list.itemListElement.length;
      schemaScript.textContent=JSON.stringify(schema).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
    }catch{}
  }
  const offset=index=>cards[index].offsetLeft-cards[0].offsetLeft;
  function update(){prev.disabled=page===0;next.disabled=page>=pages-1;explore.hidden=page<pages-1;status.textContent=(page+1)+' / '+pages;}
  function move(target,instant=false){
    page=Math.max(0,Math.min(pages-1,target));update();
    viewport.scrollTo({left:offset(page*columns),behavior:instant||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  function layout(){
    columns=Number(getComputedStyle(root).getPropertyValue('--related-columns').trim())||1;
    const total=Math.min(cards.length,columns*5);pages=Math.max(1,Math.ceil(total/columns));
    cards.forEach((card,index)=>{card.hidden=index>=total;});
    syncSchema(total);controls.hidden=pages===1;move(page,true);
  }
  prev.addEventListener('click',()=>move(page-1));next.addEventListener('click',()=>move(page+1));
  viewport.addEventListener('keydown',event=>{if(event.target!==viewport)return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(page+(event.key==='ArrowRight'?1:-1));}});
  viewport.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{
    let closest=0,distance=Infinity;
    for(let i=0;i<pages;i++){const d=Math.abs(viewport.scrollLeft-offset(i*columns));if(d<distance){distance=d;closest=i;}}
    page=closest;update();
  },120);},{passive:true});
  if(typeof ResizeObserver==='function')new ResizeObserver(layout).observe(viewport);else window.addEventListener('resize',layout);
  layout();
})();
