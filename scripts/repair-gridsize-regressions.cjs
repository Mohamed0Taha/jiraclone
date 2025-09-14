#!/usr/bin/env node
/**
 * Grid + i18n quick repairs
 * - Fix accidental '<Gridsize' into '<Grid size'
 * - Remove deprecated Grid prop: item
 * - Migrate legacy Grid breakpoint props xs/sm/md/lg/xl to v2 size={{ xs: n, md: m, ... }}
 *   (only when no size prop exists yet)
 * - Optional: ensure t() usage has useTranslation wiring (import + const { t } = useTranslation())
 *   Heuristic, conservative, idempotent.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'resources/js');

function listFiles(dir, exts, out = []) {
    for (const name of fs.readdirSync(dir)) {
        const p = path.join(dir, name);
        const stat = fs.statSync(p);
        if (stat.isDirectory()) listFiles(p, exts, out);
        else if (exts.some((e) => p.endsWith(e))) out.push(p);
    }
    return out;
}

function run() {
    const files = listFiles(SRC, ['.js', '.jsx', '.ts', '.tsx']);
    let changed = 0;
    let gridFixes = 0;
    let i18nFixes = 0;
    for (const file of files) {
        let code = fs.readFileSync(file, 'utf8');
        let before = code;

        // 1) Fix '<Gridsize' typo
        code = code.replace(/<Gridsize/g, '<Grid size');

        // 2) Remove deprecated 'item' prop from Grid tags
        // Matches <Grid ... item ...> and removes the 'item' token with optional value
        code = code.replace(/(<Grid\b[^>]*?)\s+item(=("[^"]*"|'[^']*'|\{[^}]*\}))?(?=[^>]*>)/g, '$1');

        // 3) Convert legacy breakpoint props to size object when size= missing
        // Collect xs/sm/md/lg/xl numeric values or objects and fold into size={{ ... }}
        code = code.replace(/<Grid\b([^>]*)>/g, (match, attrs) => {
            if (/\bsize\s*=/.test(attrs)) return match; // already has size
            const bp = {};
            let newAttrs = attrs;
            const re = /\s( xs| sm| md| lg| xl)\s*=\s*(\{[^}]+\}|"[^"]+"|'[^']+')/g;
            let m;
            while ((m = re.exec(attrs))) {
                const key = m[1].trim();
                const raw = m[2].trim();
                // Try to extract a numeric literal or identifier within {}
                let val = raw;
                if (raw.startsWith('{') && raw.endsWith('}')) {
                    val = raw.slice(1, -1).trim();
                } else if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith('\'') && raw.endsWith('\''))) {
                    val = raw.slice(1, -1);
                }
                bp[key] = val;
                // Remove this breakpoint prop from attributes
                newAttrs = newAttrs.replace(m[0], '');
            }
            if (Object.keys(bp).length === 0) return match; // nothing to do
            // Build size prop string, preserving expression vs literal
            const parts = Object.entries(bp)
                .map(([k, v]) => {
                    const isNum = /^\d+$/.test(v);
                    return `${k}: ${isNum ? v : v.startsWith('{') ? v.slice(1, -1) : v}`;
                })
                .join(', ');
            const sizeProp = ` size={{ ${parts} }}`;
            // Insert size prop near start of attributes
            const rebuilt = `<Grid${newAttrs}${sizeProp}>`;
            return rebuilt.replace(/\s{2,}/g, ' ');
        });

        // 4) i18n: if t( is used but useTranslation wiring is missing, inject
        if (/[^\w\.]t\(/.test(code)) {
            const hasImport = /from\s+['"]react-i18next['"]/.test(code);
            const hasHook = /\buseTranslation\s*\(/.test(code);
            const hasTDecl = /const\s*\{\s*t\s*\}\s*=\s*useTranslation\s*\(/.test(code);

            let modified = false;

            // Ensure import
            if (!hasImport) {
                const importBlockMatch = code.match(/(^|\n)(import\s[^;]+;\s*)+/);
                if (importBlockMatch) {
                    const insertPos = importBlockMatch.index + importBlockMatch[0].length;
                    code = code.slice(0, insertPos) + `\nimport { useTranslation } from 'react-i18next';` + code.slice(insertPos);
                    modified = true;
                } else {
                    code = `import { useTranslation } from 'react-i18next';\n` + code;
                    modified = true;
                }
            } else if (!/useTranslation/.test(code)) {
                // react-i18next is imported but not the hook; add to existing import
                code = code.replace(/import\s*\{([^}]+)\}\s*from\s*['"]react-i18next['"]\s*;/, (m, inside) => {
                    if (/useTranslation/.test(inside)) return m;
                    return `import { ${inside.trim()}, useTranslation } from 'react-i18next';`;
                });
                modified = true;
            }

            // Ensure const { t } declaration in the first component
            if (!hasTDecl) {
                // Try common patterns: export default function Name(...){, function Name(...){, const Name = (...) => {
                const patterns = [
                    /(export\s+default\s+function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/,
                    /(function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{)/,
                    /(const\s+[A-Za-z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*\{)/,
                ];
                for (const re of patterns) {
                    const matchFn = code.match(re);
                    if (matchFn) {
                        const insertAt = matchFn.index + matchFn[0].length;
                        code = code.slice(0, insertAt) + `\n  const { t } = useTranslation();` + code.slice(insertAt);
                        modified = true;
                        break;
                    }
                }
            }

            if (modified) i18nFixes++;
        }

        if (code !== before) {
            fs.writeFileSync(file, code);
            changed++;
            if (before !== code) gridFixes++;
            console.log(`Repaired: ${path.relative(ROOT, file)}`);
        }
    }
    console.log(`\nRepair complete. Files changed: ${changed} (grid: ${gridFixes}, i18n: ${i18nFixes})`);
}

if (require.main === module) run();
