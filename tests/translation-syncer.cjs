/**
 * Translation Sync Script
 * Automatically syncs missing keys from en.json to all other locale files
 * Uses placeholder translations where needed
 */

const fs = require('fs');
const path = require('path');

class TranslationSyncer {
    constructor() {
        this.localesDir = path.join(__dirname, '../resources/js/i18n/locales');
        this.placeholderText = {
            'de': '[DE]',
            'es': '[ES]',
            'fr': '[FR]',
            'nl': '[NL]',
            'se': '[SE]',
            'fi': '[FI]'
        };
    }

    /**
     * Load JSON file
     */
    loadJson(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            console.error(`Error loading ${filePath}:`, error.message);
            return {};
        }
    }

    /**
     * Save JSON file with proper formatting
     */
    saveJson(filePath, data) {
        try {
            const content = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Saved ${path.basename(filePath)}`);
        } catch (error) {
            console.error(`Error saving ${filePath}:`, error.message);
        }
    }

    /**
     * Get all keys from an object in dot notation
     */
    getAllKeys(obj, prefix = '') {
        const keys = [];

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;

                if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                    keys.push(...this.getAllKeys(obj[key], fullKey));
                } else {
                    keys.push(fullKey);
                }
            }
        }

        return keys;
    }

    /**
     * Set nested property using dot notation
     */
    setNestedProperty(obj, path, value) {
        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = value;
    }

    /**
     * Get nested property using dot notation
     */
    getNestedProperty(obj, path) {
        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current && typeof current === 'object' && current.hasOwnProperty(key)) {
                current = current[key];
            } else {
                return undefined;
            }
        }

        return current;
    }

    /**
     * Sync missing keys from source to target locale
     */
    syncLocale(sourceData, targetData, targetLang) {
        const sourceKeys = this.getAllKeys(sourceData);
        const placeholder = this.placeholderText[targetLang];
        let addedCount = 0;

        for (const key of sourceKeys) {
            const targetValue = this.getNestedProperty(targetData, key);

            if (targetValue === undefined) {
                const sourceValue = this.getNestedProperty(sourceData, key);
                let newValue;

                if (typeof sourceValue === 'string') {
                    // Create placeholder translation
                    newValue = `${placeholder} ${sourceValue}`;
                } else {
                    // Copy non-string values as is
                    newValue = sourceValue;
                }

                this.setNestedProperty(targetData, key, newValue);
                addedCount++;
            }
        }

        return addedCount;
    }

    /**
     * Main sync function
     */
    syncAllLocales() {
        console.log('🔄 Starting translation sync...\n');

        // Load the source (English) translations
        const enPath = path.join(this.localesDir, 'en.json');
        const enData = this.loadJson(enPath);

        if (Object.keys(enData).length === 0) {
            console.error('❌ Could not load en.json or it is empty');
            return;
        }

        console.log(`📖 Loaded ${this.getAllKeys(enData).length} keys from en.json\n`);

        // Sync each locale file
        const locales = ['de', 'es', 'fr', 'nl', 'se', 'fi'];
        const results = {};

        for (const locale of locales) {
            const localePath = path.join(this.localesDir, `${locale}.json`);
            const localeData = this.loadJson(localePath);

            const addedCount = this.syncLocale(enData, localeData, locale);
            results[locale] = addedCount;

            this.saveJson(localePath, localeData);
            console.log(`📝 Added ${addedCount} missing keys to ${locale}.json`);
        }

        console.log('\n✅ Translation sync completed!');
        console.log('\nSummary:');
        for (const [locale, count] of Object.entries(results)) {
            console.log(`  ${locale}.json: +${count} keys`);
        }
    }
}

module.exports = TranslationSyncer;

// If run directly
if (require.main === module) {
    const syncer = new TranslationSyncer();
    syncer.syncAllLocales();
}