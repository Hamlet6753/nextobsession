const status=document.getElementById('ignored-status');
async function post(path,data){
 const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
 const result=await response.json();if(!response.ok)throw new Error(result.error||'Operation failed.');return result;
}
document.getElementById('ignored-form').addEventListener('submit',async event=>{
 event.preventDefault();const button=event.submitter;button.disabled=true;
 const removeExisting=document.getElementById('ignored-remove').checked;
 if(removeExisting&&!confirm('Delete the listed profiles from the database and prevent future imports?')){button.disabled=false;return;}
 try{
  const result=await post('/admin/api/ignored',{usernames:document.getElementById('ignored-usernames').value,reason:document.getElementById('ignored-reason').value,removeExisting});
  status.textContent=`Saved ${result.ignored} exclusions; deleted ${result.removed} profiles. Reload to view the list. Cached public results can take up to 60 seconds to expire.`;
 }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
document.querySelectorAll('[data-unignore]').forEach(button=>button.addEventListener('click',async()=>{
 if(!confirm(`Remove the exclusion for ${button.dataset.unignore}? This will permit future imports.`))return;
 button.disabled=true;
 try{await post('/admin/api/unignore',{username:button.dataset.unignore});button.closest('tr').remove();status.textContent='Exclusion removed. No profile was restored.';}
 catch(error){status.textContent=error.message;button.disabled=false;}
}));
