import React, { useState, useCallback } from 'react';
import { Box, Typography, Stack, Paper, Button, Grid } from '@mui/material';
import MicroAppWrapper from '../components/MicroAppWrapper';

export default function Calculator({ projectId, viewName }) {
  return (
    <MicroAppWrapper
      projectId={projectId}
      viewName={viewName}
      appKey="Calculator"
      defaultValue={{ expr: '', result: '', angle: 'DEG', base: 'DEC', precision: 6, memory: 0, ans: '' }}
      title="Calculator"
      enableSharing={true}
      defaultShared={true}
    >
      {({ state, setState }) => {
        const { expr = '', result = '', angle = 'DEG', base = 'DEC', precision = 6, memory = 0, ans = '' } = state || {};

        const update = useCallback((patch) => setState(prev => ({ ...(prev || {}), ...patch })), [setState]);
        const setExpr = useCallback((next) => update({ expr: next }), [update]);
        const setResult = useCallback((val) => update({ result: val, ans: val }), [update]);

        const append = (v) => setExpr(String(expr || '') + String(v));
        const clearAll = () => setState({ expr: '', result: '' });
        const backspace = () => setExpr(String(expr || '').slice(0, -1));

        const normalizeExpr = (s) => {
          return String(s || '')
            .replace(/[×x]/g, '*')
            .replace(/[÷]/g, '/')
            .replace(/[−–—]/g, '-')
            .replace(/π/g, 'pi')
            .replace(/mod/gi, '%')
            .replace(/\^/g, '**')
            .replace(/arcsin/gi, 'asin')
            .replace(/arccos/gi, 'acos')
            .replace(/arctan/gi, 'atan')
            .replace(/ANS/gi, '__ans')
            // keep letters for function tokens
            .replace(/[^0-9a-zA-Z+\-/*().,%\s]/g, '');
        };

        const evaluate = () => {
          try {
            let safe = normalizeExpr(expr);
            // factorial: replace n! with fact(n) for simple cases
            safe = safe.replace(/(\d+(?:\.\d+)?|\([^()]*\))!/g, 'fact($1)');
            const prelude = `
              const __ang='${angle}';
              const __ans=${Number(ans || result) || 0};
              const __mem=${Number(memory) || 0};
              const __toRad = (x) => __ang==='DEG'? (x*Math.PI/180) : (__ang==='GRAD'? (x*Math.PI/200) : x);
              const __fromRad = (x) => __ang==='DEG'? (x*180/Math.PI) : (__ang==='GRAD'? (x*200/Math.PI) : x);
              const sin=(x)=> Math.sin(__toRad(x));
              const cos=(x)=> Math.cos(__toRad(x));
              const tan=(x)=> Math.tan(__toRad(x));
              const asin=(x)=> __fromRad(Math.asin(x));
              const acos=(x)=> __fromRad(Math.acos(x));
              const atan=(x)=> __fromRad(Math.atan(x));
              const log=(x)=> Math.log10(x);
              const ln=(x)=> Math.log(x);
              const sqrt=(x)=> Math.sqrt(x);
              const abs=(x)=> Math.abs(x);
              const fact=(n)=>{n=Math.floor(n); if(n<0) return NaN; let r=1; for(let i=2;i<=n;i++) r*=i; return r;};
              const pow=(a,b)=> Math.pow(a,b);
              const pi=Math.PI; const e=Math.E;
            `;
            // eslint-disable-next-line no-new-func
            const val = Function(`${prelude}; return (${safe});`)();
            // Guard empty/invalid
            const out = (Number.isFinite(val) && val !== undefined && val !== null) ? String(val) : 'Error';
            setResult(out);
          } catch (e) {
            setResult('Error');
          }
        };

        const handleKeyDown = (e) => {
          const k = e.key;
          if (/^[0-9]$/.test(k)) { append(k); return; }
          if (['+', '-', '*', '/', '(', ')', '.'].includes(k)) { append(k); return; }
          if (k === 'Enter' || k === '=') { e.preventDefault(); evaluate(); return; }
          if (k === 'Backspace') { e.preventDefault(); backspace(); return; }
          if (k.toLowerCase() === 'c') { clearAll(); return; }
        };

        const Key = ({ label, onClick, color = 'inherit', variant = 'outlined', gridSpan = 1, tone = 'neutral', sx = {} }) => (
          <Button
            onClick={onClick}
            variant={variant}
            color={color}
            sx={(theme) => ({
              borderRadius: 1,
              fontWeight: 600,
              p: 0,
              minWidth: 0,
              width: '100%',
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              gridColumn: gridSpan > 1 ? `span ${gridSpan}` : 'auto',
              transition: 'transform .1s ease, box-shadow .1s ease, background .2s ease',
              boxShadow: theme.palette.mode === 'dark' ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid',
              borderColor: 'divider',
              // tone styles
              ...(tone === 'op' ? {
                background: theme.palette.mode === 'dark' ? '#374151' : '#3b82f6',
                color: '#fff',
                '&:hover': { background: theme.palette.mode === 'dark' ? '#4b5563' : '#2563eb' }
              } : tone === 'eq' ? {
                background: theme.palette.mode === 'dark' ? '#166534' : '#16a34a',
                color: '#fff',
                '&:hover': { background: theme.palette.mode === 'dark' ? '#14532d' : '#15803d' }
              } : tone === 'danger' ? {
                background: theme.palette.mode === 'dark' ? '#991b1b' : '#ef4444',
                color: '#fff',
                '&:hover': { background: theme.palette.mode === 'dark' ? '#7f1d1d' : '#dc2626' }
              } : tone === 'fn' ? {
                background: theme.palette.mode === 'dark' ? '#1f2937' : '#e5e7eb',
                color: theme.palette.mode === 'dark' ? '#d1d5db' : '#374151',
                fontSize: 14,
                '&:hover': { background: theme.palette.mode === 'dark' ? '#374151' : '#d1d5db' }
              } : tone === 'mode' ? {
                fontSize: 12,
                height: 30,
                minWidth: 50,
                background: theme.palette.mode === 'dark' ? '#374151' : '#2563eb',
                color: '#fff',
                fontWeight: 700,
                '&:hover': { background: theme.palette.mode === 'dark' ? '#4b5563' : '#1d4ed8' }
              } : {
                background: theme.palette.mode === 'dark' ? '#1f2937' : '#ffffff',
                '&:hover': { background: theme.palette.mode === 'dark' ? '#374151' : '#f9fafb' }
              }),
              '&:hover': { transform: 'translateY(-1px)', boxShadow: 3 },
              '&:active': { transform: 'translateY(0)' },
              ...sx,
            })}
          >
            {label}
          </Button>
        );

        return (
          <Box sx={{ p: 1, height: 'calc(100vh - 120px)', overflow: 'auto' }} onKeyDown={handleKeyDown} tabIndex={0}>
            <Paper
              variant="outlined"
              sx={{
                p: { xs: 1, sm: 1.5 },
                width: '100%',
                maxWidth: 400,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                mx: 'auto',
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
                  : 'linear-gradient(180deg, #ffffff, #f7f9fc)',
                boxShadow: (theme) => theme.palette.mode === 'dark' ? '0 8px 26px rgba(0,0,0,0.35)' : '0 10px 24px rgba(0,0,0,0.08)'
              }}
            >

              {/* Display */}
              <Box sx={{
                mb: 2,
                borderRadius: 2,
                p: 1.25,
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, #0b1220, #101826)'
                  : 'linear-gradient(180deg, #eef2f7, #e9eef7)',
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: (theme) => theme.palette.mode === 'dark' ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'inset 0 1px 0 rgba(255,255,255,0.8)'
              }}>
                <Typography variant="body2" sx={{ textAlign: 'right', color: 'text.secondary', minHeight: 20, whiteSpace: 'nowrap', overflowX: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace', fontVariantNumeric: 'tabular-nums' }}>
                  {expr || '0'}
                </Typography>
                <Typography variant="h4" sx={{ textAlign: 'right', fontWeight: 800, lineHeight: 1.25, whiteSpace: 'nowrap', overflowX: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace', fontVariantNumeric: 'tabular-nums' }}>
                  {(() => {
                    const num = Number(result);
                    if (!result) return '';
                    if (!Number.isFinite(num)) return String(result);
                    if (base === 'HEX') return num.toString(16).toUpperCase();
                    if (base === 'OCT') return num.toString(8);
                    if (base === 'BIN') return num.toString(2);
                    // decimal with precision trimming
                    let s = num.toFixed(precision);
                    s = s.replace(/\.0+$/, '');
                    s = s.replace(/(\.\d*[1-9])0+$/, '$1');
                    return s;
                  })()}
                </Typography>
              </Box>

              {/* Scientific and Memory keys */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 0.5,
                mb: 2
              }}>
                {/* Row 1 - Trig functions */}
                <Key tone="fn" label="sin" onClick={() => append('sin(')} />
                <Key tone="fn" label="cos" onClick={() => append('cos(')} />
                <Key tone="fn" label="tan" onClick={() => append('tan(')} />
                <Key tone="fn" label="(" onClick={() => append('(')} />
                <Key tone="fn" label=")" onClick={() => append(')')} />
                
                {/* Row 2 - Log and power */}
                <Key tone="fn" label="ln" onClick={() => append('ln(')} />
                <Key tone="fn" label="log" onClick={() => append('log(')} />
                <Key tone="fn" label="x²" onClick={() => append('**2')} />
                <Key tone="fn" label="xʸ" onClick={() => append('**')} />
                <Key tone="fn" label="√" onClick={() => append('sqrt(')} />
                
                {/* Row 3 - Memory functions */}
                <Key tone="fn" label="MC" onClick={() => update({ memory: 0 })} />
                <Key tone="fn" label="MR" onClick={() => append(String(memory || 0))} />
                <Key tone="fn" label="M+" onClick={() => update({ memory: (Number(memory)||0) + (Number(result)||0) })} />
                <Key tone="fn" label="M-" onClick={() => update({ memory: (Number(memory)||0) - (Number(result)||0) })} />
                <Key tone="fn" label="MS" onClick={() => update({ memory: Number(result) || 0 })} />
              </Box>

              {/* Main Keypad */}
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 0.5,
              }}>
                {/* Row 1 */}
                <Key tone="fn" label="CE" onClick={() => setExpr('')} />
                <Key tone="danger" label="C" onClick={clearAll} />
                <Key tone="fn" label="⌫" onClick={backspace} />
                <Key tone="op" label="÷" onClick={() => append('/')} />

                {/* Row 2 */}
                <Key label="7" onClick={() => append('7')} />
                <Key label="8" onClick={() => append('8')} />
                <Key label="9" onClick={() => append('9')} />
                <Key tone="op" label="×" onClick={() => append('*')} />

                {/* Row 3 */}
                <Key label="4" onClick={() => append('4')} />
                <Key label="5" onClick={() => append('5')} />
                <Key label="6" onClick={() => append('6')} />
                <Key tone="op" label="−" onClick={() => append('-')} />

                {/* Row 4 */}
                <Key label="1" onClick={() => append('1')} />
                <Key label="2" onClick={() => append('2')} />
                <Key label="3" onClick={() => append('3')} />
                <Key tone="op" label="+" onClick={() => append('+')} />

                {/* Row 5 */}
                <Key label="±" onClick={() => setExpr(expr.startsWith('-') ? expr.slice(1) : '-' + expr)} />
                <Key label="0" onClick={() => append('0')} />
                <Key label="." onClick={() => append('.')} />
                <Key tone="eq" label="=" onClick={evaluate} />
              </Box>
            </Paper>
          </Box>
        );
      }}
    </MicroAppWrapper>
  );
}
