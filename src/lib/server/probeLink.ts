import https from 'node:https';
import dns from 'node:dns';
import net from 'node:net';
import type { IncomingHttpHeaders } from 'node:http';
import type { ProbeResult } from '@/lib/screenUrl';

/**
 * The "can this link go on the big screen?" check behind Live Screens → paste a link (/api/screen-probe).
 *
 * A browser cannot tell whether another site refuses to be shown inside a frame (X-Frame-Options, CSP
 * frame-ancestors): it just shows an error page. So the server asks the address itself and reads the answer's
 * headers, never its body. For YouTube and Vimeo it asks their oEmbed service, which says whether the owner allows
 * embedding. It only ever connects to public https addresses: every DNS answer and every redirect is checked, so it
 * cannot be used to reach the app's own network.
 */

const TIMEOUT_MS = 6000;
const MAX_REDIRECTS = 5;
const AGENT = 'Mozilla/5.0 (compatible; DayOneProject-ScreenCheck/1.0; +https://app.dayoneproject.xyz)';

/* ───────────────────────── Public addresses only ───────────────────────── */

function isPublicIPv4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = p;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false; // link-local, cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

/** The 16 bytes of an IPv6 address, or null if it is not one. */
function ipv6Bytes(ip: string): number[] | null {
  let text = ip.toLowerCase().split('%')[0];
  const v4 = text.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4) {
    const o = v4[1].split('.').map(Number);
    if (o.some((n) => n > 255)) return null;
    text = text.slice(0, -v4[1].length) + ((o[0] << 8) | o[1]).toString(16) + ':' + ((o[2] << 8) | o[3]).toString(16);
  }
  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 0) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  const bytes: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    const n = parseInt(g, 16);
    bytes.push(n >> 8, n & 255);
  }
  return bytes.length === 16 ? bytes : null;
}

function isPublicIp(ip: string): boolean {
  const family = net.isIP(ip);
  if (family === 4) return isPublicIPv4(ip);
  if (family !== 6) return false;
  const b = ipv6Bytes(ip);
  if (!b) return false;
  if (b.slice(0, 15).every((x) => x === 0) && (b[15] === 0 || b[15] === 1)) return false; // :: and ::1
  // ::ffff:a.b.c.d (IPv4-mapped) and 64:ff9b::/96 (NAT64) carry an IPv4 address.
  if (b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff) return isPublicIPv4(b.slice(12).join('.'));
  if (b[0] === 0 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b) return isPublicIPv4(b.slice(12).join('.'));
  if ((b[0] & 0xfe) === 0xfc) return false; // fc00::/7 unique local
  if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return false; // fe80::/10 link-local
  if (b[0] === 0xff) return false; // multicast
  if (b[0] === 0x20 && b[1] === 0x01 && b[2] === 0x0d && b[3] === 0xb8) return false; // documentation
  if (b[0] === 0x20 && b[1] === 0x02) return false; // 6to4
  return true;
}

type LookupDone = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void;

/** DNS for the connection itself: the address connected to is the one checked, so a rebinding answer cannot slip by. */
const safeLookup = ((hostname: string, options: dns.LookupOptions, callback: LookupDone) => {
  dns.lookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, []);
    if (!addresses.length || addresses.some((a) => !isPublicIp(a.address))) {
      return callback(Object.assign(new Error('Not a public address'), { code: 'EPRIVATE' }) as NodeJS.ErrnoException, []);
    }
    if (options.all) return callback(null, addresses);
    return callback(null, addresses[0].address, addresses[0].family);
  });
}) as net.LookupFunction;

/* ───────────────────────── One request, headers only ───────────────────────── */

interface Answer {
  status: number;
  headers: IncomingHttpHeaders;
  url: URL;
}

function checkTarget(url: URL): string | null {
  if (url.protocol !== 'https:') return 'Only https links can be shown.';
  if (url.username || url.password) return 'Remove the user name and password from the link.';
  if (url.port && url.port !== '443') return 'Links with a custom port cannot be shown.';
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host) && !isPublicIp(host)) return 'That address is not on the public internet.';
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return 'That address is not on the public internet.';
  return null;
}

function requestOnce(url: URL, signal: AbortSignal): Promise<Answer> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: 'https:',
        hostname: url.hostname.replace(/^\[|\]$/g, ''),
        port: 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        signal,
        headers: { 'user-agent': AGENT, accept: 'text/html,application/xhtml+xml,image/*,video/*;q=0.9,*/*;q=0.5', 'accept-encoding': 'identity' },
      },
      (res) => {
        // Headers are all we need: stop the body right away.
        res.destroy();
        resolve({ status: res.statusCode ?? 0, headers: res.headers, url });
      },
    );
    req.on('timeout', () => req.destroy(Object.assign(new Error('Timed out'), { code: 'ETIMEDOUT' })));
    req.on('error', reject);
    req.end();
  });
}

/** Follows redirects by hand so every hop is checked like the first address. */
async function fetchFinal(start: URL, signal: AbortSignal): Promise<Answer> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const bad = checkTarget(url);
    if (bad) throw Object.assign(new Error(bad), { code: 'EBLOCKED' });
    const answer = await requestOnce(url, signal);
    const location = answer.headers.location;
    if ([301, 302, 303, 307, 308].includes(answer.status) && location) {
      url = new URL(location, url);
      continue;
    }
    return answer;
  }
  throw Object.assign(new Error('Too many redirects'), { code: 'EREDIRECTS' });
}

/* ───────────────────────── Reading the answer ───────────────────────── */

const fail = (code: NonNullable<ProbeResult['problem']>['code'], message: string, hard = true): ProbeResult => ({ ok: false, problem: { code, message, hard } });

function allowsOrigin(sources: string[], origin: string): boolean {
  let host = '';
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  return sources.some((raw) => {
    const s = raw.toLowerCase();
    if (s === '*' || s === 'https:' || s === origin.toLowerCase()) return true;
    const bare = s.replace(/^https?:\/\//, '');
    if (bare === host) return true;
    if (bare.startsWith('*.')) return host === bare.slice(2) || host.endsWith(bare.slice(1));
    return false;
  });
}

/** Whether the page may be shown in a frame on `origin`, from its CSP frame-ancestors or else X-Frame-Options. */
function framingBlockedBy(headers: IncomingHttpHeaders, origin: string): string | null {
  const csp = [headers['content-security-policy']].flat().filter((v): v is string => !!v);
  let sawAncestors = false;
  for (const header of csp) {
    for (const policy of header.split(',')) {
      const directive = policy.split(';').map((d) => d.trim()).find((d) => /^frame-ancestors(\s|$)/i.test(d));
      if (!directive) continue;
      sawAncestors = true;
      const sources = directive.split(/\s+/).slice(1).map((s) => s.replace(/^'|'$/g, ''));
      if (!sources.length || sources.includes('none') || !allowsOrigin(sources, origin)) return 'Content-Security-Policy: frame-ancestors';
    }
  }
  if (sawAncestors) return null; // browsers ignore X-Frame-Options when frame-ancestors is present
  const xfo = String(headers['x-frame-options'] ?? '').toLowerCase();
  if (/(^|[\s,])(deny|sameorigin)([\s,]|$)/.test(xfo)) return 'X-Frame-Options';
  return null;
}

function analyse(answer: Answer, origin: string): ProbeResult {
  const { status, headers } = answer;
  const type = String(headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();

  if (status === 404 || status === 410) return fail('not_found', 'The address was not found (404). Check the link.');
  if (status >= 500) return fail('server_error', `The site is not working right now (error ${status}). Try again in a moment.`);
  if ([401, 403, 429, 451].includes(status)) {
    return fail('protected', `The site answered “${status}” to our check. If the preview shows the page, it is fine to use.`, false);
  }
  if (status >= 400) return fail('not_found', `The address answered with an error (${status}). Check the link.`);
  if (answer.url.hostname === 'accounts.google.com') {
    return fail('protected', 'This link goes to a Google sign-in page. Share the file with “Anyone with the link” and paste that link.', false);
  }

  if (type.startsWith('image/')) return { ok: true, category: 'image', contentType: type };
  if (type.startsWith('video/')) return { ok: true, category: 'video', contentType: type };
  if (/mpegurl|dash\+xml/.test(type)) return fail('unsupported', 'Live streams (.m3u8 / .mpd) are not supported. Use a YouTube or Vimeo link, or an MP4 file.');

  const isPage = type === '' || type.startsWith('text/') || type === 'application/xhtml+xml' || type === 'application/pdf';
  if (!isPage) return fail('unsupported', 'This link is not a web page, picture or video, so it cannot be shown.');

  const blocked = framingBlockedBy(headers, origin);
  if (blocked) {
    return fail('blocked_framing', `This site does not allow itself to be shown inside another page (${blocked}). Choose its “embed” or “share” link if it has one, or show a screenshot instead.`);
  }
  return { ok: true, category: 'page', contentType: type || undefined };
}

/** YouTube and Vimeo say through oEmbed whether a video may be embedded; that is exact, unlike the page headers. */
async function checkOEmbed(url: URL, signal: AbortSignal): Promise<ProbeResult | null> {
  let endpoint: URL | null = null;
  let who = '';
  if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
    const id = url.pathname.match(/^\/embed\/([\w-]+)/)?.[1];
    if (id) {
      endpoint = new URL('https://www.youtube.com/oembed');
      endpoint.searchParams.set('url', `https://www.youtube.com/watch?v=${id}`);
      endpoint.searchParams.set('format', 'json');
      who = 'YouTube';
    }
  } else if (url.hostname === 'player.vimeo.com') {
    const id = url.pathname.match(/^\/video\/(\d+)/)?.[1];
    if (id) {
      endpoint = new URL('https://vimeo.com/api/oembed.json');
      endpoint.searchParams.set('url', `https://vimeo.com/${id}`);
      who = 'Vimeo';
    }
  }
  if (!endpoint) return null;
  const answer = await requestOnce(endpoint, signal);
  if (answer.status === 200) return { ok: true, category: 'page' };
  if (answer.status === 404 || answer.status === 400) return fail('not_found', `${who} cannot find this video. Check the link; it may be private or removed.`);
  if (answer.status === 401 || answer.status === 403) return fail('not_embeddable', `The owner of this ${who} video does not allow it to be shown on other sites. Use a video that allows embedding.`);
  return null;
}

/** Checks one pasted address as seen from a page on `origin`. Never throws: every outcome is a ProbeResult. */
export async function probeUrl(target: URL, origin: string): Promise<ProbeResult> {
  const bad = checkTarget(target);
  if (bad) return fail('invalid', bad);

  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), TIMEOUT_MS * 2);
  try {
    const embed = await checkOEmbed(target, controller.signal).catch(() => null);
    if (embed) return embed;
    return analyse(await fetchFinal(target, controller.signal), origin);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === 'EBLOCKED' || code === 'EPRIVATE') return fail('invalid', 'That address is not on the public internet.');
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return fail('unreachable', 'That address does not exist. Check the spelling of the link.');
    if (code === 'ETIMEDOUT' || controller.signal.aborted) return fail('unreachable', 'The site did not answer in time. Check the link or try again.');
    return fail('unreachable', 'We could not connect to that address. Check the link or try again.');
  } finally {
    clearTimeout(deadline);
  }
}
