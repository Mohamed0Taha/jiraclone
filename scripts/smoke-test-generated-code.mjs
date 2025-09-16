// Simple smoke test for the generation preprocessor behavior used in the runtime
// Run with: node scripts/smoke-test-generated-code.mjs

function preprocess(src) {
  // Strip imports/exports other than default export
  src = src.replace(/(^|\n)\s*import[^;]+;?/g, '\n');
  src = src.replace(/(^|\n)\s*export\s+(?!default)[^;]+;?/g, '\n');

  // Fix missing Icon suffix used as JSX tags
  const names = '(Add|Edit|Delete|Save|Close|Search|Refresh|Warning|Error|Info|CheckCircle|MoreVert|Settings|Send|FilterList)';
  src = src.replace(new RegExp(`<${names}\\s*/>`, 'g'), '<$1Icon />');
  src = src.replace(new RegExp(`<${names}\\s*>`, 'g'), '<$1Icon>');
  src = src.replace(new RegExp(`</${names}>`, 'g'), '</$1Icon>');

  // Remove "...Icon" when it leaked to visible text
  const iconWordRegex = new RegExp('\\b' + names + 'Icon\\b', 'g');
  src = src.replace(/>([^<]+)</g, (m, inner) => '>' + inner.replace(iconWordRegex, (w) => w.replace('Icon','')) + '<');

  // Ensure StyledComponents destructure exists if components referenced
  const styledNames = ['ContentContainer','BeautifulCard','SectionHeader','FormContainer','PrimaryButton','SuccessButton','DangerButton'];
  const usesStyled = styledNames.some(n => new RegExp('(^|[^.\\w])' + n + '\\b').test(src));
  const hasDestructure = /const\s*\{\s*ContentContainer\s*,/m.test(src) || /StyledComponents\./.test(src);
  if (usesStyled && !hasDestructure) {
    const destructureLine = 'const { ContentContainer, BeautifulCard, SectionHeader, FormContainer, PrimaryButton, SuccessButton, DangerButton } = StyledComponents;\n';
    src = destructureLine + src;
  }

  return src;
}

const samples = [
  `import { ContentContainer, BeautifulCard } from 'styled-components';
export default function Sample(){
  return (<ContentContainer><BeautifulCard>Hi</BeautifulCard></ContentContainer>);
}`,
  `export default function Btn(){ return <button> AddIcon Task </button>; }`,
  `export default function Icons(){ return (<div><Add /><Delete></Delete></div>); }`,
];

samples.forEach((s, i) => {
  const out = preprocess(s);
  if (!/const\s*\{\s*ContentContainer/.test(out) && s.includes('ContentContainer')) {
    console.error('FAIL destructure missing in sample', i);
    process.exitCode = 1;
  }
  if (/AddIcon Task/.test(out)) {
    console.error('FAIL text Icon leak in sample', i);
    process.exitCode = 1;
  }
  if (/<Add\s*\/>/.test(out) || /<Delete>/.test(out)) {
    console.error('FAIL icon JSX not normalized in sample', i);
    process.exitCode = 1;
  }
});

if (!process.exitCode) {
  console.log('Smoke tests passed');
}

