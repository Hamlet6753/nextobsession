export async function contactAddress(request,env,verify=fetch) {
 const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff'}});
 const url=new URL(request.url);
 const email=url.searchParams.get('topic')==='listing'?env.LISTING_EMAIL:env.CONTACT_EMAIL;
 if(request.headers.get('Origin')!==url.origin)return reply({error:'Invalid origin.'},403);
 if(!env.TURNSTILE_SECRET_KEY||!email)return reply({error:'Contact verification is not configured.'},503);
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return reply({error:'Contact configuration error.'},503);
 if(!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded'))return reply({error:'Invalid request type.'},415);
 // Bound streaming body before parsing, including requests without Content-Length.
 const reader=request.body?.getReader();let size=0;const chunks=[];
 if(reader){for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply({error:'Request too large.'},413);}chunks.push(value);}}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 const form=new URLSearchParams(new TextDecoder().decode(bytes));
 const token=form.get('cf-turnstile-response')||'';
 if(form.get('website')||!token||token.length>2048)return reply({error:'Please complete verification.'},400);
 if(env.CONTACT_RATE_LIMITER){const rate=await env.CONTACT_RATE_LIMITER.limit({key:request.headers.get('CF-Connecting-IP')||'unknown'});if(!rate.success)return reply({error:'Too many requests. Try again later.'},429);}
 try{
  const result=await verify('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token}),signal:AbortSignal.timeout(10000)});
  if(!result.ok)return reply({error:'Verification service unavailable.'},503);
  const checked=await result.json();
  if(!checked.success||checked.hostname!==url.hostname||checked.action!=='contact')return reply({error:'Verification failed. Refresh and try again.'},403);
  return reply({email});
 }catch{return reply({error:'Verification service unavailable. Please try again.'},503);}
}
