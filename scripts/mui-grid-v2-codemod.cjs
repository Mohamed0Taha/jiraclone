#!/usr/bin/env node
/**
 * MUI Grid v2 codemod: remove `item` and convert `xs|sm|md|lg|xl` to `size={{ ... }}`.
 * Applies to all .jsx/.tsx files under resources/js.
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

function transformGridTags(code) {
    // Process each <Grid ...> opening tag; avoid matching </Grid>
    const tagRegex = /<Grid\b([^>]*)>/g;
    let m;
    let lastIndex = 0;
    let result = '';
    while ((m = tagRegex.exec(code))) {
        result += code.slice(lastIndex, m.index);
        const attrs = m[1];
        const original = m[0];

        // Skip self-closing detection irrelevant here (we keep as is)
        let newAttrs = attrs;

        // Remove standalone `item` prop occurrences (spaces around)
        newAttrs = newAttrs
            .replace(/\sitem(?=\s|>|$)/g, '')
            .replace(/\s{2,}/g, ' ');

        // Do not edit if size= already present
        const hasSize = /\bsize\s*=\s*\{/.test(newAttrs);

        // Find size props
        const sizes = {};
        const breakpoints = ['xs', 'sm', 'md', 'lg', 'xl'];
        for (const bp of breakpoints) {
            const re = new RegExp(`\\s${bp}\\s*=\\s*\\{([^}]+)\\}`);
            const mm = newAttrs.match(re);
            if (mm) {
                sizes[bp] = mm[1].trim();
                newAttrs = newAttrs.replace(re, '');
            }
        }

        // Build size attr
        if (!hasSize && Object.keys(sizes).length > 0) {
            const parts = Object.entries(sizes).map(([k, v]) => `${k}: ${v}`);
            // Insert size after tag name; ensure a leading space is preserved
            newAttrs = ` size={{ ${parts.join(', ')} }}` + (newAttrs ? ' ' + newAttrs.trim() : '');
            // collapse internal multiple spaces
            newAttrs = newAttrs.replace(/\s{2,}/g, ' ');
            // ensure we keep exactly one leading space so rebuilt becomes `<Grid size=...>`
            if (!newAttrs.startsWith(' ')) newAttrs = ' ' + newAttrs;
        }

        // Rebuild tag
        const rebuilt = `<Grid${newAttrs}>`;
        result += rebuilt;
        lastIndex = tagRegex.lastIndex;
    }
    result += code.slice(lastIndex);
    return result;
}

function run() {
    const files = listFiles(SRC, ['.jsx', '.tsx']);
    let changed = 0;
    for (const file of files) {
        const before = fs.readFileSync(file, 'utf8');
        const after = transformGridTags(before);
        if (after !== before) {
            fs.writeFileSync(file, after);
            changed++;
            console.log(`Updated: ${path.relative(ROOT, file)}`);
        }
    }
    console.log(`\nMUI Grid v2 codemod complete. Files changed: ${changed}`);
}

if (require.main === module) {
    run();
}
