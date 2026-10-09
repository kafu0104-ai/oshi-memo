// This Worker is deployed behind the Sites owner-only access gate.
const noIndex = { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Content-Type-Options': 'nosniff' };
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...noIndex, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
export function publicAddress(address) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(address)) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a===0 || a===10 || a===127 || a>=224 || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&(b===168||b===0||b===2)) || (a===100&&b>=64&&b<=127) || (a===198&&(b===18||b===19||b===51&&c===100)) || (a===203&&b===0&&c===113));
  }
  return /^[23][0-9a-f]{3}:/i.test(address) && !/^200[12]:/i.test(address);
}
export function publicUrl(input) {
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !url.hostname.includes('.') || /\.(localhost|local|internal|test|invalid|example)$/.test(url.hostname) || /[\[\]:]/.test(url.hostname) || /^\d+(\.\d+)*$/.test(url.hostname)) throw new Error('公開されているHTTPSのURLを入力してください。');
  url.hash = '';
  return url;
}
async function limitedBytes(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new Error('データが大きすぎます。'); }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('データを読み込めませんでした。');
  let size = 0; const chunks = [];
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); throw new Error('データが大きすぎます。'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
async function checkDNS(hostname, fetcher, signal) {
  // Workers fetch has no private-network binding. Check public DNS as well,
  // and revalidate every redirect rather than forwarding arbitrary locations.
  const results = await Promise.all(['A','AAAA'].map(async type => {
    const response = await fetcher(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`, { headers: { accept: 'application/dns-json' }, signal });
    if (!response.ok) throw new Error('接続先を確認できませんでした。');
    return JSON.parse(new TextDecoder().decode(await limitedBytes(response, 65536)));
  }));
  const addresses = results.flatMap(r => (r.Answer ?? []).filter(a => a.type === 1 || a.type === 28).map(a => a.data));
  if (!addresses.length || addresses.some(a => !publicAddress(a))) throw new Error('このURLは読み込めません。');
}
export async function readRemote(input, image, fetcher = fetch, scopeOrigin) {
  const signal = AbortSignal.timeout(25000);
  let url = publicUrl(input);
  for (let i = 0; i < 4; i++) {
    if (scopeOrigin && url.origin !== scopeOrigin) throw new Error('別サイトへの転送は探索しません。');
    await checkDNS(url.hostname, fetcher, signal);
    const response = await fetcher(url.href, { redirect: 'manual', signal, headers: { 'User-Agent': 'OshiMemo-EventImport/1.0', accept: image ? 'image/png,image/jpeg,image/webp' : 'text/html,application/xhtml+xml' } });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location'); await response.body?.cancel();
      if (!location || i === 3) throw new Error('転送先を読み込めません。');
      url = publicUrl(new URL(location, url).href); continue;
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (response.status !== 200 || !(image ? /^image\/(png|jpeg|webp)(;|$)/i : /^(text\/html|application\/xhtml\+xml)(;|$)/i).test(contentType)) {
      console.warn('official_import_upstream', JSON.stringify({host:url.hostname,status:response.status,contentType}));
      await response.body?.cancel(); throw new Error(`公式サイトから取得できませんでした（応答 ${response.status}）。時間をおいてお試しください。`);
    }
    const bytes = await limitedBytes(response, image ? 25000000 : 1500000);
    if (image) {
      let binary = ''; for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      return { html: `data:${contentType.split(';')[0]};base64,${btoa(binary)}`, url: url.href };
    }
    const sample = new TextDecoder().decode(bytes.subarray(0,4096));
    const charset = contentType.match(/charset=([\w-]+)/i)?.[1] ?? sample.match(/charset=["']?([\w-]+)/i)?.[1] ?? 'utf-8';
    return { html: new TextDecoder(charset).decode(bytes), url: url.href };
  }
  throw new Error('読み込めませんでした。');
}
// Studio publishes an empty HTML shell; follow only its declared public page snapshot.
export function studioPageUrl(html, sourceUrl) {
  const raw = html.match(/<script\b[^>]*\bid=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  if (!raw) return;
  try {
    const table = JSON.parse(raw);
    if (!Array.isArray(table) || table.length > 100000) return;
    const at = index => Number.isInteger(index) && index >= 0 ? table[index] : undefined;
    const unwrap = value => Array.isArray(value) && ['Reactive','ShallowReactive'].includes(value[0]) ? at(value[1]) : value;
    const root = unwrap(table[0]);
    const pinia = unwrap(at(root?.pinia));
    const project = at(at(pinia?.projectStore)?.project);
    const product = at(at(pinia?.productStore)?.product);
    const base = at(project?.snapshot_path);
    if (typeof base !== 'string' || !/^https:\/\/storage\.googleapis\.com\/studio-publish\/projects\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/$/.test(base)) return;
    const path = decodeURIComponent(new URL(sourceUrl).pathname).replace(/^\/|\/$/g, '') || '/';
    const pages = at(product?.pages);
    if (!Array.isArray(pages)) return;
    const page = pages.map(at).find(p => at(p?.type) === 'page' && at(p?.id) === path);
    const uuid = at(page?.uuid);
    if (typeof uuid !== 'string' || !/^[a-f0-9-]{36}$/i.test(uuid)) return;
    return `${base}page-views/${uuid}.json`;
  } catch { return; }
}
export function studioTextHtml(view) {
  const blocks = []; let count = 0;
  const escape = text => text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const walk = (node, depth = 0) => {
    if (!node || typeof node !== 'object' || depth > 100 || ++count > 20000) return;
    const content = node.content;
    if (['text','richText'].includes(content?.type) && typeof content.data === 'string' && !content.data.includes('{{')) {
      const text = content.data.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?>|<\/p>/gi,'\n').replace(/<[^>]*>/g,'');
      blocks.push(`<div>${escape(text).replace(/\n/g,'<br>')}</div>\n`);
    }
    if (Array.isArray(node.children)) node.children.forEach(child => walk(child, depth + 1));
  };
  walk(view);
  return blocks.join('');
}
export async function readOfficialPage(input, fetcher = fetch, scopeOrigin) {
  const page = await readRemote(input, false, fetcher, scopeOrigin);
  return enrichOfficialPage(page, fetcher);
}
export async function enrichOfficialPage(page, fetcher = fetch) {
  const snapshot = studioPageUrl(page.html, page.url);
  if (!snapshot) return page;
  let stage = 'fetch', failureType, status;
  try {
    const signal = AbortSignal.timeout(10000);
    // Fixed public storage origin/path, no redirects or arbitrary script execution.
    const response = await fetcher(snapshot, { redirect:'manual', signal, headers:{accept:'application/json'} });
    stage = 'response'; status = response.status;
    if (!response.ok || !/application\/json/i.test(response.headers.get('content-type') || '')) {
      failureType = status >= 300 && status < 400 ? 'HTTPRedirect' : !response.ok ? 'HTTPStatus' : 'ContentType';
      await response.body?.cancel();
      throw Error('snapshot');
    }
    stage = 'body';
    const bytes = await limitedBytes(response, 1500000);
    stage = 'json';
    const view = JSON.parse(new TextDecoder().decode(bytes));
    stage = 'html';
    const text = studioTextHtml(view);
    return {...page, method:'Studio', html: page.html.replace(/<\/body>/i, `${text}</body>`)};
  } catch (error) {
    // Log only fixed categories and status: never URLs, headers, bodies or exception messages.
    const errorType = failureType || (['AbortError','TimeoutError','SyntaxError','TypeError','Error'].includes(error?.name) ? error.name : 'UnknownError');
    console.warn('official_import_studio_failure', JSON.stringify({stage, errorType, status}));
    return {...page, warning:'このサイトの開催情報を取得できませんでした。時間をおいて再読み込みするか、公式サイトで内容を確認してください。'};
  }
}
export function createHandler(assets) {
  return { async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      if (!['/api/official-page','/api/goods-image'].includes(url.pathname)) return json({ error: '見つかりません。' }, 404);
      if (request.method !== 'POST') return json({ error: 'POSTのみ利用できます。' }, 405);
      if (request.headers.get('origin') !== url.origin) return json({ error: 'この画面から読み込んでください。' }, 403);
      try {
        const { url: target, scopeOrigin } = JSON.parse(new TextDecoder().decode(await limitedBytes(request, 4096)));
        if (typeof target !== 'string' || target.length > 2048) return json({ error: 'URLを確認してください。' }, 400);
        if (scopeOrigin !== undefined && (typeof scopeOrigin !== 'string' || publicUrl(scopeOrigin).origin !== scopeOrigin)) throw new Error('探索範囲が不正です。');
        return json(await (url.pathname === '/api/goods-image' ? readRemote(target, true) : readOfficialPage(target, fetch, scopeOrigin)));
      } catch (error) { return json({ error: /[ぁ-んァ-ン一-龯]/.test(error.message) ? error.message : '読み込めませんでした。URLと接続を確認してください。' }, 400); }
    }
    if (!['GET','HEAD'].includes(request.method)) return new Response(null, { status: 405 });
    if (url.pathname === '/robots.txt') return new Response('User-agent: *\nDisallow: /\n', { headers: { ...noIndex, 'Content-Type': 'text/plain' } });
    const asset = assets[url.pathname] ?? (!url.pathname.split('/').pop().includes('.') ? assets['/index.html'] : null);
    if (!asset) return new Response('Not found', { status: 404, headers: noIndex });
    return new Response(request.method === 'HEAD' ? null : Uint8Array.from(atob(asset.body), c => c.charCodeAt(0)), { headers: { ...noIndex, 'Content-Type': asset.type, 'Cache-Control': asset.type.startsWith('text/html') ? 'no-store' : 'private, max-age=3600' } });
  } };
}
