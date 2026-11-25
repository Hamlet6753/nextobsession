(() => {
 const form=document.getElementById('contact-reveal');if(!form)return;
 const status=document.getElementById('contact-status');const result=document.getElementById('contact-result');
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='Verifying...';
  try{
   const response=await fetch(form.action,{method:'POST',body:new URLSearchParams(new FormData(form)),headers:{Accept:'application/json'},cache:'no-store'});
   const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not verify.');
   if(typeof data.email!=='string'||!/^\S+@\S+\.\S+$/.test(data.email))throw new Error('Invalid response.');
   const link=document.createElement('a');link.href='mailto:'+data.email;link.textContent=data.email;
   if(new URLSearchParams(location.search).get('topic')==='removal')link.href+='?subject='+encodeURIComponent('NextObsession profile removal request');
   if(new URLSearchParams(location.search).get('topic')==='listing')link.href+='?subject='+encodeURIComponent('NextObsession listing request');
   result.replaceChildren(link);result.hidden=false;status.textContent='Click the address to open your email application. No message has been sent.';button.hidden=true;
  }catch(error){status.textContent=error.message;const input=form.querySelector('[name=cf-turnstile-response]');if(input)input.value='';if(window.turnstile)window.turnstile.reset();}
  finally{button.disabled=false;}
 });
})();
