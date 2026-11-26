(() => {
  // Automatic first-party analytics. No IPs, account identity, search terms, full
  // referrer URLs or advertising click IDs are sent to the collector.
  if(location.hostname!=='nextobsession.fans'||location.pathname.startsWith('/admin')||navigator.webdriver)return;
  const sessionKey='no-analytics-session-v1',ttl=30*60*1000;
  let excluded=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';
  try{if(localStorage.getItem('no-analytics-consent-v1')==='denied')excluded=true;}catch{}
  if(excluded)return;
  const landing=location.pathname;
  const tag=value=>(value||'').replace(/[^a-zA-Z0-9_. /:@+-]/g,'').slice(0,80);
  const params=new URLSearchParams(location.search);
  let host='';try{host=new URL(document.referrer).hostname.toLowerCase().replace(/^www\./,'');}catch{}
  if(host===location.hostname)host='';
  const search=/^(?:www\.)?(?:google\.[a-z.]+|bing\.com|duckduckgo\.com|search\.yahoo\.com|yandex\.[a-z.]+)$/i.test(host);
  const first={source:tag(params.get('utm_source'))||host||'direct',medium:tag(params.get('utm_medium'))||(host?(search?'organic':'referral'):'none'),campaign:tag(params.get('utm_campaign')),landing_path:landing};
  let session;
  function getSession(){
    if(!session){try{session=JSON.parse(sessionStorage.getItem(sessionKey));}catch{}}
    if(!session||!session.id||Date.now()-session.at>ttl)session={id:crypto.randomUUID(),at:Date.now(),first};
    session.at=Date.now();try{sessionStorage.setItem(sessionKey,JSON.stringify(session));}catch{}
    return session;
  }
  // Analytics starts after window.load, runs one request at a time, and never
  // prevents navigation. A failing collector backs off across same-tab pages.
  const backoffKey='no-analytics-backoff-v1',queue=[],maxQueue=20;
  let ready=document.readyState==='complete',busy=false,unloading=false,scheduled=null,scheduledIdle=false,active=null,activeController=null,blockedUntil=0;
  try{const until=Number(sessionStorage.getItem(backoffKey));if(until>Date.now()&&until<=Date.now()+300000)blockedUntil=until;}catch{}
  function cancelScheduled(){
    if(scheduled===null)return;
    if(scheduledIdle&&window.cancelIdleCallback)window.cancelIdleCallback(scheduled);else clearTimeout(scheduled);
    scheduled=null;
  }
  function schedule(){
    if(!ready||busy||unloading||scheduled!==null||!queue.length||document.hidden)return;
    scheduledIdle=false;
    scheduled=setTimeout(()=>{
      scheduled=null;
      if(window.requestIdleCallback){scheduledIdle=true;scheduled=window.requestIdleCallback(()=>{scheduled=null;void flush();},{timeout:1500});}
      else void flush();
    },Math.max(350,blockedUntil-Date.now()));
  }
  async function flush(){
    if(!ready||busy||unloading||!queue.length||document.hidden)return;
    if(Date.now()<blockedUntil){schedule();return;}
    busy=true;active=queue.shift();activeController=new AbortController();
    const controller=activeController;
    const timeout=setTimeout(()=>controller.abort(),1200);
    try{
      const response=await fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body:active,credentials:'omit',cache:'no-store',signal:controller.signal});
      if(!response.ok)throw new Error('Analytics temporarily unavailable');
    }catch{
      if(!unloading){
        if(queue.length<maxQueue)queue.unshift(active);
        blockedUntil=Date.now()+60000;
        try{sessionStorage.setItem(backoffKey,String(blockedUntil));}catch{}
      }
    }finally{
      clearTimeout(timeout);active=null;activeController=null;busy=false;schedule();
    }
  }
  function send(event_type,action='',target=''){
    if(queue.length>=maxQueue)return;
    try{
      const s=getSession(),body=JSON.stringify({event_id:crypto.randomUUID(),session_id:s.id,event_type,path:location.pathname,page_kind:location.pathname==='/'&&location.search?'search':'home',action,target,...s.first});
      queue.push(body);schedule();
    }catch{}
  }
  window.addEventListener('load',()=>{ready=true;schedule();},{once:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  window.addEventListener('pageshow',()=>{unloading=false;schedule();});
  window.addEventListener('pagehide',()=>{
    unloading=true;cancelScheduled();
    if(Date.now()<blockedUntil)return;
    const pending=[...(active?[active]:[]),...queue];queue.length=0;
    activeController?.abort();
    // Beacon is best effort. If an in-flight event is repeated, event_id dedupes it.
    for(const body of pending){
      try{
        if(navigator.sendBeacon?.('/api/analytics',new Blob([body],{type:'application/json'})))continue;
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),1200);
        fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit',signal:controller.signal}).catch(()=>{}).finally(()=>clearTimeout(timer));
      }catch{}
    }
  });
  send('pageview');
  document.addEventListener('click',event=>{
    const element=event.target instanceof Element?event.target.closest('a[href],button'):null;
    if(!element)return;
    let action='button',target='';
    if(element.matches('a[href]')){
      try{const url=new URL(element.href,location.href);if(url.protocol==='mailto:')action='email';else if(!['http:','https:'].includes(url.protocol))return;else if(url.origin===location.origin){action='internal';target=url.pathname;}else{target=url.hostname;action=/(^|\.)onlyfans\.com$/i.test(url.hostname)?'onlyfans':element.closest('.creator-socials')?'social':element.closest('.profile-actions')?'creator-website':'external';}}catch{return;}
    }else if(element.matches('[data-related-next]'))action='carousel-next';
    else if(element.matches('[data-related-prev]'))action='carousel-prev';
    else if(element.matches('[data-image-url]'))action='image';
    else if(element.id==='random-photo-more')action='random-next';
    send('click',action,target);
  },{capture:true});
})();
