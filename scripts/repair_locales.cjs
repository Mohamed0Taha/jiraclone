/* CommonJS wrapper for repair_locales to run under type: module repos */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'resources', 'js', 'i18n', 'locales');
const locales = ['en', 'de', 'es', 'fr', 'nl', 'sv', 'fi'];

function loadLocale(locale) {
  const p = path.join(LOCALES_DIR, `${locale}.json`);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function saveLocale(locale, obj) {
  const p = path.join(LOCALES_DIR, `${locale}.json`);
  const str = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(p, str, 'utf8');
}
function set(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}
function traverseAndFix(obj, fixer) {
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) traverseAndFix(v, fixer);
    else if (typeof v === 'string') obj[k] = fixer(v);
  }
}
function fixMissingFirstLetter(str) {
  const fixes = [
    [/^(escription)(\b|\s)/i, 'Description$2'],
    [/^(itle)(\b|\s)/i, 'Title$2'],
    [/^(ownload)(\b|\s)/i, 'Download$2'],
    [/^(vents)(\b|\s)/i, 'Events$2'],
    [/^(eams)(\b|\s)/i, 'Teams$2'],
    [/^(ritical)(\b|\s)/i, 'Critical$2'],
    [/^(echnical)(\b|\s)/i, 'Technical$2'],
    [/^(iew)(\b|\s)/i, 'View$2'],
    [/^(etails)(\b|\s)/i, 'Details$2']
  ];
  for (const [re, rep] of fixes) if (re.test(str)) return str.replace(re, rep);
  return str;
}

const overrides = require('./repair_locales.js').overrides || {};
const keys = require('./repair_locales.js').keys || {};

function applyOverrides(localeObj, locale) {
  const ovr = overrides[locale] || {};
  for (const [k, v] of Object.entries(ovr)) set(localeObj, k, v);
}

function main() {
  for (const locale of locales) {
    const data = loadLocale(locale);
    applyOverrides(data, locale);
    if (locale === 'en') traverseAndFix(data, fixMissingFirstLetter);
    saveLocale(locale, data);
    console.log(`Updated ${locale}.json`);
  }
}

if (require.main === module) main();

