const ENTITY = /&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);/y;

function assertWellFormed(svg) {
  const problems = [];
  const stack = [];
  const tag = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/y;
  let i = 0;
  while (i < svg.length) {
    const next = svg.indexOf('<', i);
    const text = svg.slice(i, next === -1 ? svg.length : next);
    for (let k = text.indexOf('&'); k !== -1; k = text.indexOf('&', k + 1)) {
      ENTITY.lastIndex = k;
      if (!ENTITY.test(text)) problems.push(`bare & near "${text.slice(Math.max(0, k - 10), k + 12)}"`);
    }
    if (next === -1) break;
    if (svg.startsWith('<!--', next)) { const end = svg.indexOf('-->', next); if (end === -1) { problems.push('unterminated comment'); break; } i = end + 3; continue; }
    if (svg.startsWith('<![CDATA[', next)) { const end = svg.indexOf(']]>', next); if (end === -1) { problems.push('unterminated CDATA'); break; } i = end + 3; continue; }
    if (svg.startsWith('<?', next)) { i = svg.indexOf('?>', next) + 2; continue; }
    tag.lastIndex = next;
    const m = tag.exec(svg);
    if (!m) { problems.push(`malformed tag at ${next}: ${svg.slice(next, next + 40)}`); break; }
    const [, closing, name, attrs, selfClosing] = m;
    const attrNames = [...attrs.matchAll(/([\w:.-]+)\s*=/g)].map((a) => a[1]);
    if (new Set(attrNames).size !== attrNames.length) problems.push(`duplicate attribute on <${name}>`);
    for (const value of attrs.matchAll(/=\s*"([^"]*)"|=\s*'([^']*)'/g)) {
      const v = value[1] ?? value[2];
      if (v.includes('<')) problems.push(`"<" inside an attribute of <${name}>`);
      for (let k = v.indexOf('&'); k !== -1; k = v.indexOf('&', k + 1)) { ENTITY.lastIndex = k; if (!ENTITY.test(v)) problems.push(`bare & in attribute of <${name}>`); }
    }
    if (closing) {
      const open = stack.pop();
      if (open !== name) problems.push(`</${name}> closes <${open}>`);
    } else if (!selfClosing) {
      stack.push(name);
    }
    i = tag.lastIndex;
  }
  if (stack.length) problems.push(`unclosed: ${stack.join(' > ')}`);
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(svg)) problems.push('lone surrogate');
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(svg)) problems.push('control character');
  assertOk(problems);
}

function assertOk(problems) {
  if (problems.length) throw new Error(`SVG is not well-formed XML:\n  ${problems.slice(0, 6).join('\n  ')}`);
}

module.exports = { assertWellFormed };
