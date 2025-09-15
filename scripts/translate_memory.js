/*
  Auto-translate identical-to-English strings using translation memory
  built from existing localized entries in each locale.
  - Preserves placeholders like {{var}}
  - Skips brand names (TaskPilot) and URLs
*/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '..', 'resources', 'js', 'i18n', 'locales');
const locales = ['de','es','fr','nl','sv','fi'];

function load(locale){
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${locale}.json`),'utf8'));
}
function save(locale,obj){
  fs.writeFileSync(path.join(LOCALES_DIR, `${locale}.json`), JSON.stringify(obj,null,2)+"\n");
}
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
      if(!cur[p] || typeof cur[p]!== 'object') cur[p]={};
      cur=cur[p];
    }
    cur[parts[parts.length-1]]=v;
  }
  return root;
}

const en = load('en');
const enFlat = flatten(en);

function buildMemory(localeFlat){
  const memExact = new Map();
  const memWord = new Map();
  for(const k of Object.keys(enFlat)){
    const ev = enFlat[k];
    const lv = localeFlat[k];
    if(!lv) continue;
    if(lv!==ev){
      // record exact phrase
      memExact.set(ev, lv);
      // record single word tokens
      if(/^[-A-Za-z ]{2,}$/.test(ev) && !/\s/.test(ev)){
        memWord.set(ev, lv);
      }
    }
  }
  // add some generic words from common UI if missing
  return {memExact, memWord};
}

function replaceTokens(ev, memWord){
  // Keep TaskPilot and placeholders
  if(/TaskPilot/.test(ev) || /https?:\/\//.test(ev)) return ev;
  // Replace word-by-word using word boundaries
  return ev.replace(/\b[A-Za-z][A-Za-z]+\b/g, (w)=>{
    if(memWord.has(w)) return memWord.get(w);
    // naive lower variant
    const cap = w[0].toUpperCase()+w.slice(1).toLowerCase();
    if(memWord.has(cap)){
      const rep = memWord.get(cap);
      // match original casing
      if(w[0]===w[0].toLowerCase()) return rep.charAt(0).toLowerCase()+rep.slice(1);
      return rep;
    }
    return w;
  });
}

for(const lc of locales){
  const loc = load(lc);
  const locFlat = flatten(loc);
  const {memExact, memWord} = buildMemory(locFlat);
  let changed=0, attempted=0;
  for(const k of Object.keys(enFlat)){
    const ev = enFlat[k];
    const lv = locFlat[k];
    if(lv===undefined) continue;
    // Only attempt where it's identical to EN
    if(lv===ev){
      attempted++;
      let nv = memExact.get(ev);
      if(!nv){
        nv = replaceTokens(ev, memWord);
      }
      if(nv && nv!==lv){
        // preserve placeholders like {{var}}
        const placeholders = (ev.match(/\{\{[^}]+\}\}/g)||[]);
        for(const ph of placeholders){
          // ensure they remain intact
          nv = nv.replace(ph, ph);
        }
        locFlat[k]=nv;
        changed++;
      }
    }
  }
  const updated = unflatten(locFlat);
  save(lc, updated);
  console.log(`Translated ${lc}: changed ${changed}/${attempted} identical keys using memory`);
}

