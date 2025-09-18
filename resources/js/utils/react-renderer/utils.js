// Utility helpers for ReactComponentRenderer

// Extracts a fenced code block if present
export function extractFirstFence(text) {
  const fence = /```(?:tsx|jsx|typescript|javascript|ts|js)?\s*([\s\S]*?)```/i.exec(text || '');
  if (fence && fence[1]) return fence[1];
  let cleaned = String(text || '').trim();
  cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
  return cleaned;
}

// Quick heuristics to check if text looks like a React component source
export function looksLikeReactComponent(src) {
  if (!src) return false;
  const hasExportDefault = /export\s+default\s+/.test(src);
  const looksLikeJSX = /<\w[\s\S]*>/.test(src) || /React\.createElement\(/.test(src);
  const explicitComponent = /(function\s+\w+\s*\(|const\s+\w+\s*=\s*(?:\([^)]*\)\s*=>|function\s*\()|class\s+\w+\s+extends\s+React\.Component)/.test(src);
  return hasExportDefault || explicitComponent || looksLikeJSX;
}

// Remove React import/require statements and common rebindings from arbitrary source
export function cleanupReactDeclarations(code) {
  if (!code) return '';
  let cleaned = code;

  // Remove import statements for React (all variations)
  cleaned = cleaned.replace(/(^|\n)\s*import\s+React\s+from\s*['"]react['"];?\s*/gi, '\n');
  cleaned = cleaned.replace(/(^|\n)\s*import\s*\*\s*as\s+React\s+from\s*['"]react['"];?\s*/gi, '\n');
  cleaned = cleaned.replace(/(^|\n)\s*import\s*{[^}]*}\s*from\s*['"]react['"];?\s*/gi, '\n');

  // Remove CommonJS require of React
  cleaned = cleaned.replace(/(^|\n)\s*(?:const|let|var)\s+React\s*=\s*require\s*\(\s*['"]react['"]\s*\)\s*;?\s*/gi, '\n');

  // Remove other toolchain React rebindings produced by transforms
  cleaned = cleaned.replace(/(^|\n)\s*(?:const|let|var)\s+React\s*=\s*[^;\n]+;?/g, '\n');
  cleaned = cleaned.replace(/(^|\n)\s*(?:var|let)\s+React\s*;?/g, '\n');

  // Remove stray standalone React; lines
  cleaned = cleaned.replace(/(^|\n)\s*React;?\s*$/gm, '\n');

  // Strip 'use strict' which can appear from transforms
  cleaned = cleaned.replace(/["']use strict["'];?\s*/gi, '');

  return cleaned;
}

