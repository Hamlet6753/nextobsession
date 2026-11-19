(() => {
  const $=id=>document.getElementById(id);
  const fields=[['username','Username'],['name','Name'],['bio','Bio','textarea'],['location','Location'],['website','Website'],['avatar_url','Avatar URL'],['banner_url','Banner URL'],['age','Age','number'],['gender','Gender','gender'],['subscription_type','Subscription type','access'],['subscription_currency','Currency (USD, EUR, ...)'],['subscription_price_cents','Regular price (cents)','number'],['subscription_current_price_cents','Current price (cents)','number'],['pricing_checked_at','Pricing checked at (ISO date)'],...['posts','photos','videos','likes','subscribers','followers','streams','audios','media'].map(k=>[k,k[0].toUpperCase()+k.slice(1),'number'])];
  const controls={};let current=null,mode='create',importing=false,stop=false;
  for(const [key,label,type] of fields){
    const wrapper=document.createElement('div');if(type==='textarea')wrapper.className='admin-field-wide';
    const caption=document.createElement('label');caption.htmlFor='field-'+key;caption.textContent=label;
    const input=document.createElement(type==='textarea'?'textarea':['gender','access'].includes(type)?'select':'input');
    input.id='field-'+key;input.name=key;
    if(input.tagName==='SELECT')for(const [value,text] of type==='gender'?[['','Not specified'],['female','Female'],['male','Male'],['nonbinary','Non-binary'],['other','Other']]:[['','Unknown'],['free','Free'],['paid','Paid'],['unknown','Unknown (explicit)']]){const option=document.createElement('option');option.value=value;option.textContent=text;input.append(option);}
    else if(type==='number'){input.type='number';input.step='1';input.min=key==='age'?'18':'0';if(key==='age')input.max='120';}
    if(type==='textarea')input.rows=5;
    if(key==='username')input.readOnly=true;
    if(key==='name')input.required=true;
    controls[key]=input;wrapper.append(caption,input);$('admin-fields').append(wrapper);
  }
  function dirty(){return current&&fields.some(([key])=>controls[key].value!==String(current[key]??''));}
  function canReplace(){return !dirty()||confirm('Discard unsaved edits in the current form?');}
  function edit(record,exists){
    current={...record};mode=exists?'update':'create';for(const [key] of fields)controls[key].value=record[key]??'';
    $('admin-editor').hidden=false;$('admin-editor-title').textContent=(exists?'Edit ':'New ')+record.username;$('admin-save-status').textContent='';
    $('admin-public-link').hidden=!exists;$('admin-public-link').href='/creator/'+encodeURIComponent(record.username.replace(/^@/,''));
  }
  async function request(path,body){
    const response=await fetch('/admin/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',credentials:'same-origin'});
    let data;try{data=await response.json();}catch{throw Error('Sign in again or check the server configuration.');}
    if(!response.ok)throw Error(data.error||'Request failed.');return data;
  }
  function normalized(value){let text=value.trim();if(/^https?:/i.test(text)){const url=new URL(text);if(!['onlyfans.com','www.onlyfans.com'].includes(url.hostname))throw Error('Only OnlyFans URLs are allowed.');text=url.pathname.replace(/^\/+|\/+$/g,'');}text=text.replace(/^@/,'').toLowerCase();if(!/^[a-z0-9_.-]{1,64}$/.test(text))throw Error('Invalid username: '+value);return '@'+text;}
  $('admin-import').addEventListener('click',async()=>{
    if(importing)return;let names;
    try{names=[...new Set($('admin-usernames').value.split(/[\s,;]+/).filter(Boolean).map(normalized))];if(!names.length||names.length>5)throw Error('Enter 1 to 5 profiles.');}catch(error){$('admin-status').textContent=error.message;return;}
    importing=true;stop=false;$('admin-import').disabled=true;$('admin-stop').hidden=false;$('admin-results').replaceChildren();
    try{for(let i=0;i<names.length&&!stop;i++){
      $('admin-status').textContent='Importing '+(i+1)+' / '+names.length+': '+names[i];const item=document.createElement('li');$('admin-results').append(item);
      let result;try{result=await request('scrape',{username:names[i]});}catch(error){item.textContent=names[i]+': '+error.message;stop=true;$('admin-status').textContent='Stopped after an error.';break;}
      item.textContent=names[i]+': '+result.status+(result.error?' - '+result.error:'');
      if(result.record){const button=document.createElement('button');button.type='button';button.textContent=result.exists?'Review existing':'Review draft';button.addEventListener('click',()=>{if(canReplace())edit(result.record,result.exists);});item.append(button);}
      if(['blocked','rate_limited'].includes(result.status)){stop=true;$('admin-status').textContent='Stopped at access restriction.';}
    }if(!stop)$('admin-status').textContent='Import finished. Review and save each profile.';else if($('admin-status').textContent.startsWith('Stopping'))$('admin-status').textContent='Stopped.';
    }finally{importing=false;$('admin-import').disabled=false;$('admin-stop').hidden=true;}
  });
  $('admin-stop').addEventListener('click',()=>{stop=true;$('admin-status').textContent='Stopping after the current profile...';});
  $('admin-load').addEventListener('click',async()=>{if(!canReplace())return;try{const handle=normalized($('admin-load-username').value);const data=await request('creator?username='+encodeURIComponent(handle));if(!data.record)throw Error('Profile not found. Use New manually.');edit(data.record,true);$('admin-load-status').textContent='Loaded.';}catch(error){$('admin-load-status').textContent=error.message;}});
  $('admin-new').addEventListener('click',()=>{if(!canReplace())return;try{edit({username:normalized($('admin-load-username').value)},false);$('admin-load-status').textContent='New draft.';}catch(error){$('admin-load-status').textContent=error.message;}});
  $('admin-form').addEventListener('submit',async event=>{event.preventDefault();const record=Object.fromEntries(fields.map(([key])=>[key,controls[key].value]));$('admin-save').disabled=true;try{const data=await request('save',{record,mode});edit(data.record,true);$('admin-save-status').textContent='Saved. Public listings may take up to 60 seconds to refresh.';}catch(error){$('admin-save-status').textContent=error.message;}finally{$('admin-save').disabled=false;}});
  window.addEventListener('beforeunload',event=>{if(dirty()){event.preventDefault();event.returnValue='';}});
})();
