import { escape } from '../lib/html.js';
import { shell } from '../components/layout.js';
import { htmlResponse } from '../lib/responses.js';
export function errorPage(title, heading, message, status, url) {
  return htmlResponse(shell(title, '<section class="hero"><h1>'+escape(heading)+'</h1>'+(message ? '<p>'+escape(message)+'</p>' : '')+'<a href="/">Back to discovery</a></section>',false,{url}),status);
}
