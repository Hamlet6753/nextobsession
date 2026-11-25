(() => {
 const dialog=document.getElementById('listing-dialog');
 if(!dialog||typeof dialog.showModal!=='function')return;
 const trigger=document.querySelector('[data-listing-contact]');
 const frame=dialog.querySelector('iframe');
 trigger.addEventListener('click',event=>{event.preventDefault();if(!frame.src)frame.src='/contact?topic=listing&embed=1';dialog.showModal();});
 dialog.querySelector('[data-listing-close]').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>trigger.focus());
})();
