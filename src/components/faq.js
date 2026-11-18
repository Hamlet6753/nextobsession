import { DIRECTORY_FAQ } from '../config/faq.js';
import { escape } from '../lib/html.js';
export function directoryFaq() {
 return `<section class="directory-faq" id="faq" aria-labelledby="faq-title"><h2 id="faq-title">Frequently asked questions</h2><ol class="faq-list">${DIRECTORY_FAQ.map(item=>`<li><h3>${escape(item.question)}</h3><p>${escape(item.answer)}</p></li>`).join('')}</ol></section>`;
}
