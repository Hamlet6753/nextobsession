export function htmlResponse(content, status = 200, {turnstile=false}={}) {
  const challenge=turnstile?' https://challenges.cloudflare.com':'';
  return new Response(content, { status, headers: {
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'Content-Security-Policy':`default-src 'none'; manifest-src 'self'; connect-src 'self'${challenge}; script-src 'self'${challenge}; frame-src ${turnstile?'https://challenges.cloudflare.com':"'none'"}; img-src https: http:; style-src 'self' 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`
  }});
}
