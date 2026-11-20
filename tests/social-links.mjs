import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {normalizeSocialLinks} from '../src/lib/social-links.js';
import {creatorSocialLinks} from '../src/components/social-links.js';
import {normalize} from '../src/admin/records.js';
import {creatorPage} from '../src/pages/creator.js';
const input=[{url:'https://instagram.com/test'},{url:'https://x.com/test'},{url:'https://snapchat.com/add/test'},{url:'https://example.org/a?x=1&y=2'}];
const links=normalizeSocialLinks(input);assert.deepEqual(links.map(x=>x.platform),['instagram','x','snapchat','link']);
assert.equal(normalizeSocialLinks([...input,input[0]]).length,4);
assert.equal(normalizeSocialLinks([{url:'https://instagram.com.evil.test/a'}])[0].platform,'link');
for(const value of [[{url:'javascript:alert(1)'}],[{url:'https://user:pass@example.org'}],{},'not json',Array(41).fill(input[0]),[{url:'https://example.com/\nfoo'}]])assert.throws(()=>normalizeSocialLinks(value,true));
assert.equal(normalizeSocialLinks('broken').length,0);
const rendered=creatorSocialLinks({social_links:JSON.stringify(input)});
assert(rendered.includes('aria-label="Instagram"'));assert(rendered.includes('x=1&amp;y=2'));assert(rendered.includes('nofollow noopener noreferrer'));assert(!creatorSocialLinks({}));
const record=normalize({username:'test',name:'Test',social_links:input});assert.equal(JSON.parse(record.social_links).length,4);assert(!Object.hasOwn(normalize({username:'test',name:'Test'}),'social_links'));
const row={username:'@test',name:'Test',bio:'Bio',social_links:JSON.stringify(input)};
const response=await creatorPage('test',{DB:{prepare:()=>({bind:()=>({first:async()=>row})})}},new URL('https://nextobsession.fans/creator/test'));
const html=await response.text();assert(html.includes('profile-stats-row'));assert(html.includes('creator-socials'));assert(html.includes('social-snapchat'));
// Exercise the public social extractor against controlled DOM fixtures.
const extract=(await import('../src/admin/extractors/social.js')).default;
const anchors=[...input,input[0],{url:'javascript:alert(1)'},{url:'https://user:pass@example.org'}].map(x=>({getAttribute:()=>x.url}));
globalThis.location={href:'https://onlyfans.com/test'};globalThis.document={querySelectorAll(selector){assert(selector.includes('a.m-tab-social[href]'));return anchors;}};
assert.equal(extract().length,4);

console.log('PASS social extraction, host matching, URL validation, duplicate removal, SSR icons and admin validation');
