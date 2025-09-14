/**
 * Translation Key Extractor
 * Extracts all translation keys used in the codebase to validate completeness
 */

const fs = require('fs');
const path = require('path');

class TranslationKeyExtractor {
    constructor() {
        this.extractedKeys = new Set();
        this.fileCount = 0;
    }

    /**
     * Extract translation keys from a file content
     */
    extractKeysFromContent(content, filePath) {
        // Pattern to match t('key') or t("key") calls
        const patterns = [
            /t\(['"`]([^'"`]+)['"`]\)/g,
            /t\(['"`]([^'"`]+)['"`],\s*['"`][^'"`]*['"`]\)/g, // with fallback
            /\$t\(['"`]([^'"`]+)['"`]\)/g,
            /i18n\.t\(['"`]([^'"`]+)['"`]\)/g
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(content)) !== null) {
                const key = match[1];
                if (this.isValidTranslationKey(key)) {
                    this.extractedKeys.add(key);
                }
            }
        });
    }

    /**
     * Check if a key is a valid translation key
     */
    isValidTranslationKey(key) {
        if (!key || typeof key !== 'string') return false;

        // Skip keys with template literals or dynamic content
        if (key.includes('${') || key.includes('`')) return false;

        // Must start with letter
        if (!/^[a-zA-Z]/.test(key)) return false;

        // Can only contain letters, numbers, dots, and underscores
        if (!/^[a-zA-Z0-9._]+$/.test(key)) return false;

        // Require namespaced keys (reduce false positives like 'div', 'button', 'a', etc.)
        // We expect keys like section.key or group.sub.key
        if (!key.includes('.')) return false;

        // Must have at least one letter after dots (not just numbers/symbols)
        const parts = key.split('.');
        return parts.every(part => /[a-zA-Z]/.test(part));
    }

    /**
     * Walk directory recursively to find all JS/JSX files
     */
    walkDirectory(dir, extensions = ['.js', '.jsx', '.ts', '.tsx']) {
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                this.walkDirectory(filePath, extensions);
            } else if (stat.isFile() && extensions.some(ext => file.endsWith(ext))) {
                const content = fs.readFileSync(filePath, 'utf8');
                this.extractKeysFromContent(content, filePath);
                this.fileCount++;
            }
        }
    }

    /**
     * Generate sorted array of unique keys
     */
    getExtractedKeys() {
        return Array.from(this.extractedKeys).sort();
    }

    /**
     * Create nested object structure from dot notation keys
     */
    createNestedStructure(keys) {
        const result = {};

        keys.forEach(key => {
            const parts = key.split('.');
            let current = result;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part] || typeof current[part] !== 'object') {
                    current[part] = {};
                }
                current = current[part];
            }

            const lastPart = parts[parts.length - 1];
            if (typeof current === 'object' && current !== null && !current[lastPart]) {
                current[lastPart] = key; // Use key as placeholder value
            }
        });

        return result;
    }

    /**
     * Extract all keys from the codebase
     */
    extractFromCodebase(sourceDir) {
        console.log(`Extracting translation keys from: ${sourceDir}`);
        this.walkDirectory(sourceDir);
        console.log(`Processed ${this.fileCount} files`);
        console.log(`Found ${this.extractedKeys.size} unique translation keys`);
        return this.getExtractedKeys();
    }
}

module.exports = TranslationKeyExtractor;

// If run directly
if (require.main === module) {
    const extractor = new TranslationKeyExtractor();
    const sourceDir = path.join(__dirname, '../resources/js');
    const keys = extractor.extractFromCodebase(sourceDir);

    console.log('\nExtracted Keys:');
    keys.forEach(key => console.log(`  ${key}`));

    console.log('\nNested Structure:');
    console.log(JSON.stringify(extractor.createNestedStructure(keys), null, 2));
}