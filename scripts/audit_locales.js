/* Audits locale files for key parity, English leakage, and common corruption.
   Prints a summary per locale. Non-destructive. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.join(__dirname, '..', 'resources', 'js', 'i18n', 'locales');
const locales = ['en','de','es','fr','nl','sv','fi'];

function load(locale){
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${locale}.json`),'utf8'));
}

function flatten(obj, prefix='', out={}){
  for(const [k,v] of Object.entries(obj)){
    const key = prefix? `${prefix}.${k}` : k;
    if(v && typeof v==='object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = String(v);
  }
  return out;
}

const en = flatten(load('en'));

const patterns = {
  de: [/^instellungen\b/,/^rstellen\b/,/^rfolg\b/,/^okumentation\b/,/^nddatum\b/,/^ashboard\b/,/^xportieren\b/,/^infügen\b/,/^etails\b/,/^eschreibung\b/,/^atei\b/,/\bXS\b/,/XSX/],
  fr: [/^ermer\b/,/^echercher\b/,/^iltrer\b/,/^éduire\b/,/^efuser\b/,/^estaurer\b/,/^apports\b/,/^onctionnalité\b/,/^rançais\b/,/^innois\b/],
  es: [/^uscríbete\b/,/^cribe\b/,/^rror\b/,/^l asistente\b/,/^ncuentra\b/,/^limina\b/],
  sv: [/^kriv\b/,/^tt\s/],
  nl: [/^ieuw\b/,/^iet\b/],
  fi: []
};

const langBlockKeys = ['english','spanish','german','finnish','swedish','dutch','french','select'];
const localizedSamples = {
  de: {english:'Englisch',spanish:'Spanisch',german:'Deutsch',finnish:'Finnisch',swedish:'Schwedisch',dutch:'Niederländisch',french:'Französisch',select:'Sprache auswählen'},
  es: {english:'Inglés',spanish:'Español',german:'Alemán',finnish:'Finés',swedish:'Sueco',dutch:'Neerlandés',french:'Francés',select:'Seleccionar idioma'},
  fr: {english:'Anglais',spanish:'Espagnol',german:'Allemand',finnish:'Finnois',swedish:'Suédois',dutch:'Néerlandais',french:'Français',select:'Sélectionner la langue'},
  nl: {english:'Engels',spanish:'Spaans',german:'Duits',finnish:'Fins',swedish:'Zweeds',dutch:'Nederlands',french:'Frans',select:'Taal selecteren'},
  sv: {english:'Engelska',spanish:'Spanska',german:'Tyska',finnish:'Finska',swedish:'Svenska',dutch:'Nederländska',french:'Franska',select:'Välj språk'},
  fi: {english:'Englanti',spanish:'Espanja',german:'Saksa',finnish:'Suomi',swedish:'Ruotsi',dutch:'Hollanti',french:'Ranska',select:'Valitse kieli'}
};

for(const lc of locales){
  const obj = load(lc);
  const flat = flatten(obj);
  // Key parity
  const missing = Object.keys(en).filter(k=> !(k in flat));
  // English leakage = identical values to en
  const same = Object.keys(en).filter(k => flat[k]===en[k]);
  // Corruption patterns
  const pats = patterns[lc]||[];
  const corrupted = [];
  if(lc!=='en'){
    for(const [k,v] of Object.entries(flat)){
      if(pats.some(re=> re.test(v))) corrupted.push(k);
    }
  }
  // Language block check
  let langIssues = [];
  if(flat['language.english']!==undefined){
    const expected = localizedSamples[lc];
    if(expected){
      for(const key of langBlockKeys){
        const k = `language.${key}`;
        if(!(k in flat)) langIssues.push(`missing ${k}`);
        else if(flat[k]!==expected[key]) langIssues.push(`${k}="${flat[k]}" expected "${expected[key]}"`);
      }
    }
  }
  // Supports MIME typos
  const supportsKeys = Object.keys(flat).filter(k=>/supports$/i.test(k));
  const supportsTypos = supportsKeys.filter(k=>/\bXS\b/.test(flat[k]) || /XSX/.test(flat[k]));

  console.log(`\n[${lc}]`);
  console.log(` keys: ${Object.keys(flat).length}, missing: ${missing.length}, identicalToEn: ${same.length}, corruptedHits: ${corrupted.length}`);
  if(missing.length) console.log('  missing sample:', missing.slice(0,5));
  if(same.length) console.log('  identical sample:', same.slice(0,5));
  if(corrupted.length) console.log('  corrupted sample:', corrupted.slice(0,8));
  if(langIssues.length) console.log('  language issues:', langIssues.slice(0,10));
  if(supportsTypos.length) console.log('  supports typos at keys:', supportsTypos);
}

