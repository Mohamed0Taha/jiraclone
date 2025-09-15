/*
  Machine-translate en.json into target locales with placeholder safety.
  Providers:
    - gtx (default): unofficial Google translate endpoint (no API key)
    - deepl: set DEEPL_API_KEY env var
    - google: set GOOGLE_API_KEY env var (Google Cloud Translation v2)

  Usage examples:
    node scripts/mt_fill_locales.js --locales=pt,it,hu,ro,pl,ru,da,no,et,lv
    node scripts/mt_fill_locales.js --provider=deepl --locales=pt,it --concurrency=3

  Notes:
    - Preserves Mustache placeholders like {{name}}
    - Preserves TaskPilot and URLs
    - Respects file structure and writes to resources/js/i18n/locales/<lc>.json
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '..', 'resources', 'js', 'i18n', 'locales');
const EN_PATH = path.join(LOCALES_DIR, 'en.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k,v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const list = (args.locales || '').split(',').map(s=>s.trim()).filter(Boolean);
const provider = (args.provider || 'gtx').toLowerCase();
const concurrency = Math.max(1, Math.min(5, parseInt(args.concurrency || '2', 10)));

function flatten(obj, prefix='', out={}){
  for(const [k,v] of Object.entries(obj)){
    const key = prefix? `${prefix}.${k}` : k;
    if(v && typeof v==='object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}
function unflatten(map){
  const root={};
  for(const [k,v] of Object.entries(map)){
    const parts=k.split('.');
    let cur=root;
    for(let i=0;i<parts.length-1;i++){
      const p=parts[i];
      if(!cur[p] || typeof cur[p]!=='object') cur[p]={};
      cur=cur[p];
    }
    cur[parts[parts.length-1]]=v;
  }
  return root;
}

const en = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
const enFlat = flatten(en);

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;
const URL_RE = /https?:\/\/[^\s]+/g;
const BRAND_RE = /TaskPilot/g;

function protect(s){
  const tokens=[];
  let idx=0;
  function rep(re, tag){
    s = s.replace(re, m => { tokens.push(m); return `⟦${tag}${idx++}⟧`; });
  }
  rep(PLACEHOLDER_RE, 'PH');
  rep(URL_RE, 'URL');
  rep(BRAND_RE, 'BR');
  return { s, tokens };
}
function restore(s, tokens){
  return s.replace(/⟦(PH|URL|BR)(\d+)⟧/g, (_, __, n)=> tokens[parseInt(n,10)]);
}

async function translate_gtx(lines, to){
  // Translate each line individually to be robust, with concurrency limit
  const out = new Array(lines.length);
  let i=0, active=0;
  return await new Promise((resolve) => {
    const next = () => {
      if(i>=lines.length && active===0) return resolve(out);
      while(active<concurrency && i<lines.length){
        const cur=i++;
        active++;
        const q = encodeURIComponent(lines[cur]);
        fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${to}&dt=t&q=${q}`)
          .then(r=>r.ok?r.json():Promise.reject(new Error(`HTTP ${r.status}`)))
          .then(j=>{
            const part = (j && j[0] && Array.isArray(j[0])) ? j[0].map(x=>x[0]).join('') : lines[cur];
            out[cur]=part;
          })
          .catch(()=>{ out[cur]=lines[cur]; })
          .finally(()=>{ active--; next(); });
      }
    };
    next();
  });
}

async function translate_deepl(lines, to){
  const key = process.env.DEEPL_API_KEY;
  if(!key) throw new Error('DEEPL_API_KEY not set');
  const params = new URLSearchParams();
  for(const l of lines){ params.append('text', l); }
  params.set('target_lang', to.toUpperCase());
  const r = await fetch('https://api-free.deepl.com/v2/translate', {
    method:'POST', headers:{'Authorization':`DeepL-Auth-Key ${key}`,'Content-Type':'application/x-www-form-urlencoded'}, body: params
  });
  if(!r.ok) throw new Error(`DeepL HTTP ${r.status}`);
  const j = await r.json();
  return (j.translations||[]).map(t=>t.text);
}

async function translate_googleCloud(lines, to){
  const key = process.env.GOOGLE_API_KEY;
  if(!key) throw new Error('GOOGLE_API_KEY not set');
  const r = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`,{
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ q: lines, source:'en', target: to, format:'text' })
  });
  if(!r.ok) throw new Error(`GoogleCloud HTTP ${r.status}`);
  const j = await r.json();
  return (j.data && j.data.translations||[]).map(t=>t.translatedText);
}

async function translateLines(lines, to){
  if(provider==='deepl') return await translate_deepl(lines, to);
  if(provider==='google') return await translate_googleCloud(lines, to);
  return await translate_gtx(lines, to);
}

const targets = list.length? list : ['pt','it','hu','ro','pl','ru','da','no','et','lv'];

(async () => {
  for(const lc of targets){
    const entries = Object.entries(enFlat);
    const protectedLines = entries.map(([k,v])=> protect(v));
    const lines = protectedLines.map(p=>p.s);
    const translated = await translateLines(lines, lc);
    const outFlat = {};
    for(let i=0;i<entries.length;i++){
      const [k,_] = entries[i];
      const restored = restore(translated[i] || enFlat[k], protectedLines[i].tokens);
      outFlat[k]=restored;
    }
    const outObj = unflatten(outFlat);
    const dest = path.join(LOCALES_DIR, `${lc}.json`);
    fs.writeFileSync(dest, JSON.stringify(outObj, null, 2)+'\n');
    console.log(`Translated ${lc} → ${dest}`);
  }
})();

