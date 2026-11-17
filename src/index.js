import { homePage } from './pages/home.js';
import { creatorPage } from './pages/creator.js';
import { errorPage } from './pages/errors.js';
import { creatorApi, healthApi } from './routes/api.js';
import { DirectoryInputError } from './services/directory.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!['GET','HEAD'].includes(request.method)) {
      return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    }
    try {
      if (path.startsWith('/assets/') || /^\/(?:favicon\.svg|favicon-32x32\.png|apple-touch-icon\.png|icon-192\.png|icon-512\.png|icon-maskable-512\.png|logo\.svg|logo-1024\.png|site\.webmanifest)$/.test(path)) {
        if (!env.ASSETS) return new Response('Configure the ASSETS binding in Wrangler.', {status:503});
        return await env.ASSETS.fetch(request);
      }
      if (path === '/health') return Response.json({ok:true});
      if (path === '/api/health') return await healthApi(env);
      if (path === '/api/creators') return await creatorApi(url, env);
      if (path === '/') return await homePage(url, env);
      const match = path.match(/^\/creator\/([a-zA-Z0-9_.-]{1,64})$/);
      if (match) return await creatorPage(match[1], env);
      return errorPage('Not found', 'Page not found.', '', 404);
    } catch (error) {
      if (error instanceof DirectoryInputError) {
        if (path === '/api/creators') return Response.json({error:error.message},{status:400,headers:{'Cache-Control':'no-store'}});
        return errorPage('Invalid request', 'Please refresh your search.', error.message, 400);
      }
      console.error('Request failed',error);
      if (path === '/api/creators') return Response.json({error:'Could not load creators.'},{status:503,headers:{'Cache-Control':'no-store'}});
      if (path === '/api/health') return Response.json({ok:false,database:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
      return errorPage('Temporarily unavailable', 'Please try again shortly.', 'We could not load the directory.', 503);
    }
  }
};
