import { avatarUrl } from '../lib/avatar.js';
import { normalizeSocialLinks } from '../lib/social-links.js';
import { DIRECTORY_FAQ } from '../config/faq.js';
import { creatorPath, safeUrl } from '../lib/html.js';
import { SITE_ORIGIN, canonicalUrl } from './seo.js';
const SITE_ID=SITE_ORIGIN+'/#website';
const BRAND_ID=SITE_ORIGIN+'/#organization';
const PAGE_TYPES={'/about':'AboutPage','/contact':'ContactPage'};
// Escape HTML script delimiters as JSON Unicode escapes, not HTML entities.
export function serializeSchema(value) {
 return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,char=>({'<':'\\u003c','>':'\\u003e','&':'\\u0026','\u2028':'\\u2028','\u2029':'\\u2029'}[char]));
}
export function schemaGraph(title,{url,description='',directory=false,adult=false,creator,rows,state,faq=false,relatedRows,category,discoveryLinks,collectionTitle,heading}={}) {
 const canonical=canonicalUrl(url,directory);
 const pageId=canonical+'#webpage';
 const graph=[
  {'@type':'Organization','@id':BRAND_ID,name:'NextObsession',url:SITE_ORIGIN+'/',logo:{'@type':'ImageObject',url:SITE_ORIGIN+'/logo-1024.png'}},
  {'@type':'WebSite','@id':SITE_ID,url:SITE_ORIGIN+'/',name:'NextObsession.fans',inLanguage:'en',publisher:{'@id':BRAND_ID}}
 ];
 let type=PAGE_TYPES[url?.pathname]||'WebPage';
 if(directory)type=state?.isSerp?'SearchResultsPage':'CollectionPage';
 if(creator)type='ItemPage';
 const page={'@type':type,'@id':pageId,url:canonical,name:title+' | NextObsession.fans',isPartOf:{'@id':SITE_ID},inLanguage:'en'};
 if(description)page.description=description;
 if(heading)page.headline=heading;
 if(category)page.about={'@type':'DefinedTerm',name:category.label,description:category.description};
 if(adult)page.isFamilyFriendly=false;
 if(creator){
  const personId=canonical+'#person';
  const person={'@type':'Person','@id':personId,name:creator.name||creator.username,alternateName:creator.username,url:canonical};
  if(creator.bio)person.description=creator.bio;
  const avatar=avatarUrl(creator.avatar_url);if(avatar)person.image=avatar;
  // The original account link is displayed on the page. Do not claim affiliation,
  // employment, gender, orientation, ratings or ownership of an arbitrary website.
  person.sameAs=[...new Set(['https://onlyfans.com/'+encodeURIComponent(creator.username.replace(/^@/,'')),...normalizeSocialLinks(creator.social_links).filter(link=>link.platform!=='link').map(link=>link.url)])];
  graph.push(person);page.mainEntity={'@id':personId};
  const image=safeUrl(creator.banner_url)||avatar;if(image)page.primaryImageOfPage={'@type':'ImageObject',url:image};
 }
 if(directory&&Array.isArray(rows)){
  const listId=canonical+'#creators';
  graph.push({'@type':'ItemList','@id':listId,name:collectionTitle || category?.title || (state?.isSerp?'Creator search results':'Explore creators'),numberOfItems:rows.length,itemListElement:rows.map((row,index)=>({'@type':'ListItem',position:index+1,name:row.name||row.username,url:SITE_ORIGIN+creatorPath(row.username)}))});
  page.mainEntity={'@id':listId};
 }
 if(creator&&Array.isArray(relatedRows)&&relatedRows.length){
  const sectionId=canonical+'#related-creators';
  const listId=canonical+'#related-creators-list';
  graph.push({'@type':'WebPageElement','@id':sectionId,name:'Discover more creators',isPartOf:{'@id':pageId},mainEntity:{'@id':listId}});
  graph.push({'@type':'ItemList','@id':listId,name:'Discover more creators',itemListOrder:'https://schema.org/ItemListUnordered',numberOfItems:relatedRows.length,itemListElement:relatedRows.map((row,index)=>({'@type':'ListItem',position:index+1,name:row.name||row.username,url:SITE_ORIGIN+creatorPath(row.username)}))});
  page.hasPart=[{'@id':sectionId}];
 }
 if(directory&&Array.isArray(discoveryLinks)&&discoveryLinks.length){
  const navId=canonical+'#quick-discovery';
  graph.push({'@type':'SiteNavigationElement','@id':navId,name:'Quick discovery',isPartOf:{'@id':pageId},hasPart:discoveryLinks.map(link=>({'@type':'SiteNavigationElement',name:link.label,url:new URL(link.href,SITE_ORIGIN).href}))});
  page.hasPart=[...(page.hasPart||[]),{'@id':navId}];
 }
 // Reflect the Home/back link and page heading; do not invent category pages.
 if(url&&url.pathname!=='/'){
  const crumbsId=canonical+'#breadcrumb';
  graph.push({'@type':'BreadcrumbList','@id':crumbsId,itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:SITE_ORIGIN+'/'},{'@type':'ListItem',position:2,name:title,item:canonical}]});
  page.breadcrumb={'@id':crumbsId};
 }
 if(faq){
  const faqId=canonical+'#faq';
  graph.push({'@type':'FAQPage','@id':faqId,url:faqId,name:'Frequently asked questions',isPartOf:{'@id':pageId},mainEntity:DIRECTORY_FAQ.map(item=>({'@type':'Question',name:item.question,acceptedAnswer:{'@type':'Answer',text:item.answer}}))});
  page.hasPart=[...(page.hasPart||[]),{'@id':faqId}];
 }
 graph.push(page);
 return {'@context':'https://schema.org','@graph':graph};
}
export function schemaMarkup(title,seo) {
 return '<script type="application/ld+json" data-site-schema>'+serializeSchema(schemaGraph(title,seo))+'</script>';
}
