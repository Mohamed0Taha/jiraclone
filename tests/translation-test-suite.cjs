/**
 * Translation Test Suite
 * Comprehensive testing for i18n functionality
 */

const fs = require('fs');
const path = require('path');
const TranslationKeyExtractor = require('./translation-key-extractor.cjs');

class TranslationTestSuite {
    constructor() {
        this.localesDir = path.join(__dirname, '../resources/js/i18n/locales');
        this.sourceDir = path.join(__dirname, '../resources/js');
        this.results = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            errors: [],
            warnings: []
        };
    }

    /**
     * Load all translation files
     */
    loadTranslationFiles() {
        const translations = {};
        const files = fs.readdirSync(this.localesDir);

        for (const file of files) {
            if (file.endsWith('.json') && !file.includes('backup')) {
                const locale = file.replace('.json', '');
                const filePath = path.join(this.localesDir, file);

                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    translations[locale] = JSON.parse(content);
                } catch (error) {
                    this.addError(`Failed to load ${file}: ${error.message}`);
                }
            }
        }

        return translations;
    }

    /**
     * Validate JSON structure
     */
    validateJSONStructure(translations) {
        this.startTest('JSON Structure Validation');

        for (const [locale, data] of Object.entries(translations)) {
            if (typeof data !== 'object' || data === null) {
                this.addError(`${locale}.json is not a valid object`);
                continue;
            }

            // Check for common required sections
            const requiredSections = ['common', 'navigation', 'auth'];
            for (const section of requiredSections) {
                if (!data[section]) {
                    this.addWarning(`${locale}.json missing '${section}' section`);
                }
            }
        }

        this.endTest();
    }

    /**
     * Validate all locales have the same keys
     */
    validateKeyConsistency(translations) {
        this.startTest('Key Consistency Validation');

        const locales = Object.keys(translations);
        if (locales.length === 0) {
            this.addError('No translation files found');
            this.endTest();
            return;
        }

        // Use English as the reference
        const referenceLocale = locales.includes('en') ? 'en' : locales[0];
        const referenceKeys = this.flattenKeys(translations[referenceLocale]);

        for (const locale of locales) {
            if (locale === referenceLocale) continue;

            const localeKeys = this.flattenKeys(translations[locale]);

            // Check missing keys
            for (const key of referenceKeys) {
                if (!localeKeys.includes(key)) {
                    this.addError(`${locale}.json missing key: ${key}`);
                }
            }

            // Check extra keys
            for (const key of localeKeys) {
                if (!referenceKeys.includes(key)) {
                    this.addWarning(`${locale}.json has extra key: ${key}`);
                }
            }
        }

        this.endTest();
    }

    /**
     * Validate that all used translation keys exist
     */
    validateUsedKeysExist(translations) {
        this.startTest('Used Keys Existence Validation');

        const extractor = new TranslationKeyExtractor();
        const usedKeys = extractor.extractFromCodebase(this.sourceDir);

        const referenceLocale = Object.keys(translations).includes('en') ? 'en' : Object.keys(translations)[0];
        const availableKeys = this.flattenKeys(translations[referenceLocale]);

        for (const key of usedKeys) {
            if (!availableKeys.includes(key)) {
                this.addError(`Translation key used in code but not found in ${referenceLocale}.json: ${key}`);
            }
        }

        this.endTest();
    }

    /**
     * Validate no empty translations
     */
    validateNoEmptyTranslations(translations) {
        this.startTest('Empty Translation Validation');

        for (const [locale, data] of Object.entries(translations)) {
            this.checkForEmptyValues(data, locale, '');
        }

        this.endTest();
    }

    /**
     * Validate interpolation placeholders
     */
    validateInterpolation(translations) {
        this.startTest('Interpolation Validation');

        const interpolationPattern = /\{\{[\w\s.]+\}\}/g;

        for (const [locale, data] of Object.entries(translations)) {
            const flatKeys = this.flattenKeys(data);

            flatKeys.forEach(key => {
                const value = this.getNestedValue(data, key);
                if (typeof value === 'string') {
                    const matches = value.match(interpolationPattern);
                    if (matches) {
                        // Check for proper interpolation syntax
                        matches.forEach(match => {
                            if (!match.match(/^\{\{[\w\s.]+\}\}$/)) {
                                this.addError(`${locale}.json invalid interpolation in '${key}': ${match}`);
                            }
                        });
                    }
                }
            });
        }

        this.endTest();
    }

    /**
     * Validate placeholder consistency across locales
     */
    validatePlaceholderConsistency(translations) {
        this.startTest('Placeholder Consistency Validation');

        const locales = Object.keys(translations);
        const referenceLocale = locales.includes('en') ? 'en' : locales[0];
        const referenceData = translations[referenceLocale];
        const referenceKeys = this.flattenKeys(referenceData);

        referenceKeys.forEach(key => {
            const referenceValue = this.getNestedValue(referenceData, key);
            if (typeof referenceValue === 'string') {
                const referencePlaceholders = this.extractPlaceholders(referenceValue);

                locales.forEach(locale => {
                    if (locale === referenceLocale) return;

                    const localeValue = this.getNestedValue(translations[locale], key);
                    if (typeof localeValue === 'string') {
                        const localePlaceholders = this.extractPlaceholders(localeValue);

                        // Check for missing placeholders
                        referencePlaceholders.forEach(placeholder => {
                            if (!localePlaceholders.includes(placeholder)) {
                                this.addError(`${locale}.json missing placeholder '${placeholder}' in key '${key}'`);
                            }
                        });

                        // Check for extra placeholders
                        localePlaceholders.forEach(placeholder => {
                            if (!referencePlaceholders.includes(placeholder)) {
                                this.addWarning(`${locale}.json has extra placeholder '${placeholder}' in key '${key}'`);
                            }
                        });
                    }
                });
            }
        });

        this.endTest();
    }

    /**
     * Test i18n configuration
     */
    validateI18nConfig() {
        this.startTest('i18n Configuration Validation');

        const configPath = path.join(__dirname, '../resources/js/i18n/index.js');

        if (!fs.existsSync(configPath)) {
            this.addError('i18n configuration file not found');
            this.endTest();
            return;
        }

        try {
            const configContent = fs.readFileSync(configPath, 'utf8');

            // Check for required imports
            if (!configContent.includes('react-i18next')) {
                this.addError('i18n config missing react-i18next import');
            }

            // Consider both direct i18n.init() and chained .use(...).init({...}) as valid
            const hasInit = /i18n\s*\.init\s*\(/.test(configContent) || /\.use\([^\)]*\)\s*\.use\([^\)]*\)\s*\.init\s*\(/.test(configContent);
            if (!hasInit) {
                this.addError('i18n config missing initialization');
            }

        } catch (error) {
            this.addError(`Failed to read i18n config: ${error.message}`);
        }

        this.endTest();
    }

    /**
     * Helper methods
     */
    flattenKeys(obj, prefix = '') {
        const keys = [];

        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                keys.push(...this.flattenKeys(value, newKey));
            } else {
                keys.push(newKey);
            }
        }

        return keys;
    }

    getNestedValue(obj, key) {
        return key.split('.').reduce((current, part) => current && current[part], obj);
    }

    extractPlaceholders(text) {
        const patterns = [
            /\{\{([\w\s.]+)\}\}/g,  // {{placeholder}}
            /\{([\w\s.]+)\}/g,      // {placeholder}
            /\$\{([\w\s.]+)\}/g,    // ${placeholder}
        ];

        const placeholders = [];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                placeholders.push(match[1].trim());
            }
        });

        return [...new Set(placeholders)];
    }

    checkForEmptyValues(obj, locale, prefix) {
        for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                this.checkForEmptyValues(value, locale, fullKey);
            } else if (typeof value === 'string') {
                if (value.trim() === '') {
                    this.addError(`${locale}.json has empty translation for '${fullKey}'`);
                }
            } else if (value === null || value === undefined) {
                this.addError(`${locale}.json has null/undefined value for '${fullKey}'`);
            }
        }
    }

    startTest(testName) {
        this.currentTest = testName;
        this.currentTestPassed = true;
        console.log(`\\n🧪 Running: ${testName}`);
    }

    endTest() {
        this.results.totalTests++;
        if (this.currentTestPassed) {
            this.results.passedTests++;
            console.log(`✅ ${this.currentTest} - PASSED`);
        } else {
            this.results.failedTests++;
            console.log(`❌ ${this.currentTest} - FAILED`);
        }
    }

    addError(message) {
        this.results.errors.push(message);
        this.currentTestPassed = false;
        console.log(`   ❌ ERROR: ${message}`);
    }

    addWarning(message) {
        this.results.warnings.push(message);
        console.log(`   ⚠️  WARNING: ${message}`);
    }

    /**
     * Run all tests
     */
    runAllTests() {
        console.log('🚀 Starting Translation Test Suite');
        console.log('=====================================');

        const translations = this.loadTranslationFiles();

        if (Object.keys(translations).length === 0) {
            console.log('❌ No translation files found. Exiting.');
            return this.results;
        }

        console.log(`📁 Found translation files: ${Object.keys(translations).join(', ')}`);

        // Run all validation tests
        this.validateJSONStructure(translations);
        this.validateKeyConsistency(translations);
        this.validateUsedKeysExist(translations);
        this.validateNoEmptyTranslations(translations);
        this.validateInterpolation(translations);
        this.validatePlaceholderConsistency(translations);
        this.validateI18nConfig();

        this.printSummary();
        return this.results;
    }

    printSummary() {
        console.log('\\n📊 Test Summary');
        console.log('================');
        console.log(`Total Tests: ${this.results.totalTests}`);
        console.log(`Passed: ${this.results.passedTests}`);
        console.log(`Failed: ${this.results.failedTests}`);
        console.log(`Errors: ${this.results.errors.length}`);
        console.log(`Warnings: ${this.results.warnings.length}`);

        if (this.results.errors.length > 0) {
            console.log('\\n🔴 Errors:');
            this.results.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }

        if (this.results.warnings.length > 0) {
            console.log('\\n🟡 Warnings:');
            this.results.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning}`);
            });
        }

        const success = this.results.failedTests === 0;
        console.log(`\\n${success ? '🎉 All tests passed!' : '💥 Some tests failed!'}`);
    }
}

module.exports = TranslationTestSuite;

// If run directly
if (require.main === module) {
    const suite = new TranslationTestSuite();
    const results = suite.runAllTests();
    process.exit(results.failedTests > 0 ? 1 : 0);
}