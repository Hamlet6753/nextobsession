export const BRAND_X_URL='https://x.com/xnextobsessionx';
export function brandXLink(label='Follow us on X',className='brand-x-link') {
 return `<a class="${className}" href="${BRAND_X_URL}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path fill="currentColor" d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.6 5.5 22H2.3l8.2-9.4L.8 2h6.5l4.5 6.8L18.9 2Zm-1.1 18h1.7L6.4 3.9H4.6L17.8 20Z"/></svg><span>${label}</span></a>`;
}
