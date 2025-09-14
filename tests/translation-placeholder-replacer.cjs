#!/usr/bin/env node
/**
 * Replace locale placeholders like "[FI] ..." with real translations when available,
 * otherwise fall back to English source text. Preserves interpolation tokens like {{name}}.
 *
 * Usage: node tests/translation-placeholder-replacer.cjs [--locales fi,de,es,fr,nl,se]
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../resources/js/i18n/locales');

// Minimal dictionaries for common UI terms. Extend safely over time.
const DICTS = {
    fi: {
        'Title': 'Otsikko',
        'Description': 'Kuvaus',
        'Start': 'Aloita',
        'Start New': 'Aloita uusi',
        'Starting...': 'Aloitetaan...',
        'Submit Answer': 'Lähetä vastaus',
        'Submitting...': 'Lähetetään...',
        'Complete': 'Valmis',
        'Done': 'Valmis',
        'Review': 'Tarkista',
        'To Do': 'Tehtävät',
        'In Progress': 'Kesken',
        'Zoom In': 'Lähennä',
        'Zoom Out': 'Loitonna',
        'Close': 'Sulje',
        'Send': 'Lähetä',
        'Send Message': 'Lähetä viesti',
        'Copy message': 'Kopioi viesti',
        'Thinking...': 'Ajattelee...',
        'Back to Board': 'Takaisin tauluun',
        'Scroll to Today': 'Siirry tähän päivään',
        'Message': 'Viesti',
        'Name': 'Nimi',
        'Email': 'Sähköposti',
        'Characters': 'Merkkiä',
        'Minimum Characters': 'Vähintään merkkejä',
        'More Characters Needed': 'Lisää merkkejä tarvitaan',
        'Account': 'Tili',
        'Billing': 'Laskutus',
        'Bug': 'Bugi',
        'Feature': 'Ominaisuus',
        'Feedback': 'Palaute',
        'General': 'Yleinen',
        'Other': 'Muu',
        'Technical': 'Tekninen',
        'Try Again': 'Yritä uudelleen',
        'Your Details': 'Tietosi',
        'Project Management Certification': 'Projektinhallinnan sertifiointi',
        'Certification': 'Sertifiointi',
        'Download Certificate': 'Lataa sertifikaatti',
        'AI Project Assistant': 'AI-projektiassistentti',
        'Team Collaboration': 'Tiimiyhteistyö',
        'Smart Automations': 'Älykkäät automaatiot',
        'Get Started': 'Aloita',
        'Go to Dashboard': 'Siirry hallintapaneeliin',
        'Increase': 'Lisää',
        'Decrease': 'Vähennä',
    },
    de: {},
    es: {},
    fr: {},
    nl: {},
    se: {},
};

const PLACEHOLDER_PREFIX = {
    fi: '[FI]',
    de: '[DE]',
    es: '[ES]',
    fr: '[FR]',
    nl: '[NL]',
    se: '[SE]',
};

function readJSON(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
}

function isString(v) {
    return typeof v === 'string' || v instanceof String;
}

function hasPlaceholderPrefix(locale, value) {
    const pref = PLACEHOLDER_PREFIX[locale];
    if (!pref) return false;
    return isString(value) && value.trim().startsWith(pref);
}

function preserveTokens(from, to) {
    // Ensure interpolation tokens like {{name}} exist in the target if they existed in the source.
    if (!isString(from) || !isString(to)) return to;
    const tokenRegex = /\{\{\s*([\w.]+)\s*\}\}/g;
    const tokens = new Set();
    let match;
    while ((match = tokenRegex.exec(from))) {
        tokens.add(match[0]);
    }
    // If target lacks a token, append it to end separated by space.
    for (const t of tokens) {
        if (!to.includes(t)) {
            to = `${to} ${t}`.trim();
        }
    }
    return to;
}

function transformValue({ locale, enValue, currentValue }) {
    const dict = DICTS[locale] || {};
    // Remove placeholder marker and trim base
    let stripped = String(currentValue).replace(/^\s*\[[A-Z]{2}\]\s*/, '').trim();

    // If a direct dictionary mapping exists for the English source, use it
    if (isString(enValue) && dict[enValue]) {
        return preserveTokens(enValue, dict[enValue]);
    }

    // If dictionary has mapping for the stripped value itself, use it
    if (dict[stripped]) {
        return preserveTokens(enValue || stripped, dict[stripped]);
    }

    // Fall back to English source if available, otherwise stripped value without tag
    const fallback = isString(enValue) ? enValue : stripped;
    return preserveTokens(enValue || stripped, fallback);
}

function walkAndReplace(locale, targetNode, sourceNode, stats, trail = []) {
    if (isString(targetNode)) {
        if (hasPlaceholderPrefix(locale, targetNode)) {
            const enValue = isString(sourceNode) ? sourceNode : undefined;
            const newVal = transformValue({ locale, enValue, currentValue: targetNode });
            stats.replaced++;
            if (!isString(enValue)) stats.noEnglishFallback++;
            return newVal;
        }
        return targetNode;
    }
    if (Array.isArray(targetNode)) {
        return targetNode.map((child, idx) => walkAndReplace(locale, child, Array.isArray(sourceNode) ? sourceNode[idx] : undefined, stats, trail.concat(String(idx))));
    }
    if (targetNode && typeof targetNode === 'object') {
        const out = Array.isArray(targetNode) ? [] : {};
        for (const key of Object.keys(targetNode)) {
            out[key] = walkAndReplace(locale, targetNode[key], sourceNode ? sourceNode[key] : undefined, stats, trail.concat(key));
        }
        return out;
    }
    return targetNode;
}

function processLocale(locale) {
    const localeFile = path.join(LOCALES_DIR, `${locale}.json`);
    const enFile = path.join(LOCALES_DIR, 'en.json');
    if (!fs.existsSync(localeFile)) throw new Error(`Locale file not found: ${localeFile}`);
    if (!fs.existsSync(enFile)) throw new Error(`English file not found: ${enFile}`);

    const target = readJSON(localeFile);
    const source = readJSON(enFile);
    const stats = { replaced: 0, noEnglishFallback: 0 };
    const updated = walkAndReplace(locale, target, source, stats);

    // Also remove any stray placeholders that weren't at start (defensive)
    const cleaned = JSON.parse(JSON.stringify(updated), (k, v) => {
        if (isString(v)) {
            const pref = PLACEHOLDER_PREFIX[locale];
            return v.replace(new RegExp(`\\s*${pref}\\s*`, 'g'), '').trim();
        }
        return v;
    });

    writeJSON(localeFile, cleaned);
    return stats;
}

function main() {
    const argLocales = process.argv.find(a => a && a.startsWith('--locales='));
    const locales = argLocales ? argLocales.split('=')[1].split(',').map(s => s.trim()).filter(Boolean) : ['fi'];

    const results = {};
    for (const loc of locales) {
        const stats = processLocale(loc);
        results[loc] = stats;
    }

    // Summary
    console.log('Placeholder replacement summary:');
    for (const [loc, s] of Object.entries(results)) {
        console.log(` - ${loc}: replaced ${s.replaced} strings${s.noEnglishFallback ? ` (no en fallback for ${s.noEnglishFallback})` : ''}`);
    }
}

if (require.main === module) {
    try {
        main();
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}
