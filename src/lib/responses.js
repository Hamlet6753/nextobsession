export function htmlResponse(content, status = 200, {turnstile=false,selfFrames=false,allowEmbedding=false}={}) {
  const nonce=crypto.randomUUID();
  content=content.replace('<script type="application/ld+json" data-site-schema>', '<script type="application/ld+json" data-site-schema nonce="'+nonce+'">');
  const challenge=turnstile?' https://challenges.cloudflare.com':'';
  return new Response(content, { status, headers: {
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Content-Security-Policy':`default-src 'none'; manifest-src 'self'; connect-src 'self'${challenge}; script-src 'self' 'nonce-${nonce}'${challenge}; frame-src ${[selfFrames?"'self'":'',turnstile?'https://challenges.cloudflare.com':''].filter(Boolean).join(' ')||"'none'"}; img-src https: http:; style-src 'self' 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors ${allowEmbedding?"'self'":"'none'"}`
  }});
}
