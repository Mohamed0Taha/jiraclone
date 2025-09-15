/*
  Translate en.json into native locales using OpenAI, preserving placeholders.
  - Reads from: resources/js/i18n/locales/en.json
  - Writes to:  resources/js/i18n/locales/<locale>.json
  - Requires: OPENAI_API_KEY in env

  Usage:
    OPENAI_API_KEY=... node scripts/openai_fill_locales.js --locales=pt,it,hu,ro,pl,ru,da,no,et,lv --model=gpt-4o-mini --batch=120 --concurrency=2

  Notes:
    - Preserves {{placeholders}}, TaskPilot, and URLs
    - Splits into batches to keep prompts small
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY not set. Please export it and re-run.');
  process.exit(1);
}

const LOCALES_DIR = path.join(__dirname, '..', 'resources', 'js', 'i18n', 'locales');
const EN_PATH = path.join(LOCALES_DIR, 'en.json');

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k,v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const targetLocales = (args.locales || 'pt,it,hu,ro,pl,ru,da,no,et,lv').split(',').map(s=>s.trim()).filter(Boolean);
const model = args.model || 'gpt-4o-mini';
const batchSize = Math.max(40, Math.min(200, parseInt(args.batch || '120', 10)));
const concurrency = Math.max(1, Math.min(4, parseInt(args.concurrency || '2', 10)));

function flatten(obj, prefix='', out={}){
  for(const [k,v] of Object.entries(obj)){
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
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
      if(!cur[p] || typeof cur[p]!== 'object') cur[p]={};
      cur=cur[p];
    }
    cur[parts[parts.length-1]] = v;
  }
  return root;
}

const en = JSON.parse(fs.readFileSync(EN_PATH,'utf8'));
const enFlat = flatten(en);
const allKeys = Object.keys(enFlat);

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;
const URL_RE = /https?:\/\/[^\s]+/g;
const BRAND_RE = /TaskPilot/g;

function protect(str){
  const tokens=[];
  let out=str;
  let n=0;
  const rep = (re, tag) => {
    out = out.replace(re, m => { tokens.push(m); return `⟦${tag}${n++}⟧`; });
  };
  rep(PLACEHOLDER_RE,'PH');
  rep(URL_RE,'URL');
  rep(BRAND_RE,'BR');
  return { out, tokens };
}
function restore(str, tokens){
  return str.replace(/⟦(PH|URL|BR)(\d+)⟧/g, (_, __, i) => tokens[parseInt(i,10)]);
}

function chunk(arr, size){
  const out=[]; for(let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out;
}

async function openaiTranslateBatch(pairs, to){
  const protectedPairs = pairs.map(([k,v])=>[k, protect(v)]);
  const inputObj = Object.fromEntries(protectedPairs.map(([k,{out}])=>[k,out]));
  const userPrompt = `Translate all values of this JSON from English to ${to}.\n`+
    `Rules:\n`+
    `- Return ONLY valid JSON.\n`+
    `- Keep keys unchanged.\n`+
    `- Preserve placeholders like ⟦PH#⟧, URLs ⟦URL#⟧, and brand tokens ⟦BR#⟧ intact.\n`+
    `- Keep concise, professional tone.\n`+
    `JSON to translate:\n`+
    JSON.stringify(inputObj);

  const body = {
    model,
    messages: [
      { role: 'system', content: 'You are a professional software localization expert. Output only valid JSON.' },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.2
  };
  const r = await fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{ 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type':'application/json' },
    body: JSON.stringify(body)
  });
  if(!r.ok){
    const errText = await r.text().catch(()=>String(r.status));
    throw new Error(`OpenAI HTTP ${r.status}: ${errText.slice(0,200)}`);
  }
  const j = await r.json();
  const txt = j.choices?.[0]?.message?.content?.trim() || '{}';
  let obj;
  try { obj = JSON.parse(txt); }
  catch(e){ throw new Error('OpenAI did not return valid JSON for a batch'); }

  // Restore tokens
  const restored = {};
  for(const [k,{tokens}] of protectedPairs){
    const translated = obj[k] ?? inputObj[k];
    restored[k] = restore(String(translated), tokens);
  }
  return restored;
}

async function translateLocale(lc){
  console.log(`\nTranslating ${lc} with ${model}...`);
  const kv = allKeys.map(k=>[k,enFlat[k]]);
  const parts = chunk(kv, batchSize);
  const outFlat = {};
  let i=0, active=0;
  await new Promise((resolve) => {
    const runNext = () => {
      if(i>=parts.length && active===0) return resolve();
      while(active<concurrency && i<parts.length){
        const idx=i++;
        active++;
        openaiTranslateBatch(parts[idx], lc)
          .then(res => { Object.assign(outFlat, res); })
          .catch(err => { console.error(`Batch ${idx} failed:`, err.message); Object.assign(outFlat, Object.fromEntries(parts[idx])); })
          .finally(()=>{ active--; runNext(); });
      }
    };
    runNext();
  });
  const outObj = unflatten(outFlat);
  const dest = path.join(LOCALES_DIR, `${lc}.json`);
  fs.writeFileSync(dest, JSON.stringify(outObj, null, 2)+'\n');
  console.log(`Wrote ${dest}`);
}

(async () => {
  for(const lc of targetLocales){
    try { await translateLocale(lc); } catch(e){ console.error(`Failed ${lc}:`, e.message); }
  }
})();

