import { adminRoute } from './admin/routes.js';
import { randomPhotosPage } from './pages/random-photos.js';
import { randomPhotoApi } from './services/random-photo.js';
import { productionUrl, robotsResponse, sitemapResponse } from './services/seo.js';
import { informationPage } from './pages/information.js';
import { contactPage } from './pages/contact.js';
import { contactAddress } from './routes/contact.js';
import { homePage } from './pages/home.js';
import { creatorPage } from './pages/creator.js';
import { errorPage } from './pages/errors.js';
import { creatorApi, healthApi } from './routes/api.js';
import { DirectoryInputError } from './services/directory.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if(path === '/admin' || path.startsWith('/admin/')) return await adminRoute(request,env);
    if(request.method==='POST'&&path==='/api/contact-address'){
      try{return await contactAddress(request,env);}catch{return Response.json({error:'Contact verification temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
    }
    if (!['GET','HEAD'].includes(request.method)) {
      return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
    }
    try {
      if((url.hostname==='nextobsession.fans'&&url.protocol==='http:')||url.hostname==='www.nextobsession.fans'){url.protocol='https:';url.hostname='nextobsession.fans';return Response.redirect(url.href,301);}
      if(path.length>1&&path.endsWith('/')){url.pathname=path.replace(/\/+$/,'');return Response.redirect(url.href,301);}
      if (path.startsWith('/assets/') || /^\/(?:favicon\.svg|favicon-32x32\.png|apple-touch-icon\.png|icon-192\.png|icon-512\.png|icon-maskable-512\.png|logo\.svg|logo-1024\.png|site\.webmanifest)$/.test(path)) {
        if (!env.ASSETS) return new Response('Configure the ASSETS binding in Wrangler.', {status:503});
        return await env.ASSETS.fetch(request);
      }
      if(path==='/robots.txt')return robotsResponse(url);
      if(path==='/llms.txt'){
        if(!productionUrl(url))return new Response('Not found',{status:404,headers:{'X-Robots-Tag':'noindex'}});
        return await env.ASSETS.fetch(request);
      }
      if(path==='/sitemap.xml')return await sitemapResponse(url,env);
      if(path==='/contact')return contactPage(url,env);
      const information=informationPage(path,url,env);if(information)return information;
      if (path === '/health') return Response.json({ok:true});
      if (path === '/api/health') return await healthApi(env);
      if (path === '/api/creators') return await creatorApi(url, env);
      if (path === '/api/random-photo') return await randomPhotoApi(url, env);
      if (path === '/random-photos') return await randomPhotosPage(url, env);
      if (path === '/') return await homePage(url, env);
      const match = path.match(/^\/creator\/([a-zA-Z0-9_.-]{1,64})$/);
      if (match) return await creatorPage(match[1], env, url);
      return errorPage('Not found', 'Page not found.', '', 404,url);
    } catch (error) {
      if (error instanceof DirectoryInputError) {
        if (path === '/api/creators') return Response.json({error:error.message},{status:400,headers:{'Cache-Control':'no-store'}});
        return errorPage('Invalid request', 'Please refresh your search.', error.message, 400,url);
      }
      console.error('Request failed',error);
      if (path === '/api/random-photo') return Response.json({error:'Could not load a photo.'},{status:503,headers:{'Cache-Control':'no-store'}});
      if (path === '/api/creators') return Response.json({error:'Could not load creators.'},{status:503,headers:{'Cache-Control':'no-store'}});
      if (path === '/api/health') return Response.json({ok:false,database:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
      return errorPage('Temporarily unavailable', 'Please try again shortly.', 'We could not load the directory.', 503,url);
    }
  }
};
