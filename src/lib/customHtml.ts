/**
 * A landing page the organizer uploaded as a file (Landing Page → Custom HTML): one .html page, its CSS and
 * scripts folded into it, plus the pictures it points at. These helpers prepare it for the sandboxed frame that
 * shows it (/events/<slug>/site on the live page, an srcdoc frame in the builder).
 */

export const MAX_PAGE_BYTES = 1_500_000;

/** A picture the page uses. url is "asset:<id>" until the event is saved, then a web address. */
export interface PageFile {
  id: string;
  name: string;
  url: string;
}

/** A quoted, bracketed or "="-led reference to a picture file: images/hero.jpg, ./hero.jpg, url(hero.jpg). */
const FILE_REF = /(["'(=])((?:\.{0,2}\/)?(?:[\w.-]+\/)*[\w.-]+\.(?:webp|jpe?g|png|gif|avif))(?=["')\s,;?#>])/gi;

const REMOTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

const baseName = (path: string) => path.split(/[?#]/)[0].split('/').pop()?.toLowerCase() ?? '';
const stem = (name: string) => name.replace(/\.[^.]+$/, '');

/** A file by name, then by name without its extension (a page that asks for .jpg can use an uploaded .webp). */
function findFile(files: PageFile[], ref: string): PageFile | undefined {
  const name = baseName(ref);
  return files.find((f) => f.name.toLowerCase() === name) ?? files.find((f) => stem(f.name.toLowerCase()) === stem(name));
}

/** Folds the picked .css and .js files into the page where it links them (keys are lowercase file names). */
export function inlineTextFiles(html: string, texts: Map<string, string>): string {
  const pick = (ref: string) => (REMOTE.test(ref) ? undefined : texts.get(baseName(ref)));
  return html
    .replace(/<link\b[^>]*>/gi, (tag) => {
      if (!/\brel=["']?stylesheet/i.test(tag)) return tag;
      const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
      const css = href ? pick(href) : undefined;
      return css === undefined ? tag : `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`;
    })
    .replace(/<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (tag, before: string, src: string, after: string) => {
      const js = pick(src);
      return js === undefined ? tag : `<script${before}${after}>${js.replace(/<\/script/gi, '<\\/script')}</script>`;
    });
}

/** Files the page asks for (pictures, style sheets, scripts) that were not uploaded with it. */
export function missingFiles(html: string, files: PageFile[]): string[] {
  const out = new Set<string>();
  for (const m of html.matchAll(FILE_REF)) {
    const ref = m[2];
    if (!REMOTE.test(ref) && !ref.startsWith('/') && !findFile(files, ref)) out.add(ref);
  }
  const local = (ref: string | undefined) => !!ref && !REMOTE.test(ref) && !ref.startsWith('/') && !ref.startsWith('#');
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    if (/\brel=["']?stylesheet/i.test(m[0])) {
      const href = /\bhref=["']([^"']+)["']/i.exec(m[0])?.[1];
      if (local(href)) out.add(href as string);
    }
  }
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) if (local(m[1])) out.add(m[1]);
  return [...out].slice(0, 12);
}

/**
 * What runs inside the frame next to the page: links and forms open in the whole window (not inside the frame),
 * "#section" links scroll the page, and saving to the browser works in memory (the frame is cut off from the
 * app's own storage, so the real one would throw).
 */
const BRIDGE =
  '<base target="_top"><script>(function(){' +
  'function mem(){var d={};return{getItem:function(k){return k in d?d[k]:null},setItem:function(k,v){d[k]=String(v)},removeItem:function(k){delete d[k]},clear:function(){d={}},key:function(i){return Object.keys(d)[i]||null},get length(){return Object.keys(d).length}}}' +
  "['localStorage','sessionStorage'].forEach(function(n){try{window[n].getItem('x')}catch(e){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}}});" +
  "document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a[href^=\"#\"]');if(!a)return;var id=a.getAttribute('href').slice(1);try{id=decodeURIComponent(id)}catch(_){}var el=id?document.getElementById(id):document.documentElement;if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth'})}},true);" +
  '})();</script>';

/** The page as the frame shows it: pictures pointed at their uploaded copies, plus the bridge above. */
export function frameDocument(html: string, files: PageFile[], resolve: (url: string) => string = (u) => u): string {
  const rewritten = html.replace(FILE_REF, (whole, lead: string, ref: string) => {
    if (REMOTE.test(ref)) return whole;
    const file = findFile(files, ref);
    return file ? lead + resolve(file.url) : whole;
  });
  const head = /<head\b[^>]*>/i.exec(rewritten) ?? /<html\b[^>]*>/i.exec(rewritten);
  if (!head) return BRIDGE + rewritten;
  const at = (head.index ?? 0) + head[0].length;
  return rewritten.slice(0, at) + BRIDGE + rewritten.slice(at);
}
