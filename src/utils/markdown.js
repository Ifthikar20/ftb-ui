// Minimal, safe Markdown -> HTML for assistant replies.
//
// Security: ALL source text is HTML-escaped first, then a fixed
// whitelist of block/inline constructs is re-introduced as known tags.
// The model's output is therefore never trusted as HTML -- there is no
// path for it to inject a <script>, an event handler, or a javascript:
// URL (link hrefs are scheme-checked). This mirrors the app's existing
// escape-before-render pattern and stays safe under the app CSP.
//
// Placeholders use private-use-area sentinels (U+E000..U+E003) declared as
// escape sequences so no literal control byte ever lands in the source.
const C0 = ''
const C1 = ''
const B0 = ''
const B1 = ''

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Inline formatting on already-escaped text. Inline code is pulled out
// to placeholders first so ** / _ inside code isn't reinterpreted.
function inline(text) {
  const codes = []
  let t = text.replace(/`([^`]+)`/g, (_m, c) => {
    codes.push(c)
    return `${C0}${codes.length - 1}${C1}`
  })

  // Links [text](url) -- only http(s)/mailto survive; others render literal.
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    return /^(https?:|mailto:)/i.test(url)
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : m
  })

  t = t
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, '$1<em>$2</em>')

  const codeRe = new RegExp(`${C0}(\\d+)${C1}`, 'g')
  t = t.replace(codeRe, (_m, i) => `<code>${codes[Number(i)]}</code>`)
  return t
}

function isTableSep(line) {
  return /^\s*\|?[\s:|-]+\|?\s*$/.test(line) && line.includes('-')
}
function splitRow(line) {
  return line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())
}

export function renderMarkdown(src) {
  if (!src) return ''
  // Pull fenced code blocks out first (content shown verbatim).
  const blocks = []
  const withoutFences = String(src).replace(/```[^\n]*\n([\s\S]*?)```/g, (_m, code) => {
    blocks.push(`<pre><code>${escapeHtml(code.replace(/\n$/, ''))}</code></pre>`)
    return `${B0}${blocks.length - 1}${B1}`
  })

  const blockRe = new RegExp(`^${B0}(\\d+)${B1}$`)
  const lines = escapeHtml(withoutFences).split('\n')
  const out = []
  let i = 0

  const flushListItems = (items, tag) => {
    out.push(`<${tag}>${items.map(it => `<li>${inline(it)}</li>`).join('')}</${tag}>`)
  }

  while (i < lines.length) {
    const line = lines[i]

    if (blockRe.test(line.trim())) { out.push(line.trim()); i++; continue }
    if (!line.trim()) { i++; continue }

    // Heading
    const h = line.match(/^(#{1,6})\s+(.*)$/)
    if (h) {
      const level = Math.min(h[1].length + 2, 6) // # -> h3
      out.push(`<h${level}>${inline(h[2])}</h${level}>`)
      i++; continue
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) { out.push('<hr />'); i++; continue }

    // Table: header row + separator + body rows
    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const header = splitRow(line)
      let j = i + 2
      const rows = []
      while (j < lines.length && lines[j].includes('|') && lines[j].trim()) {
        rows.push(splitRow(lines[j])); j++
      }
      const thead = `<thead><tr>${header.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>`
      const tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody>`
      out.push(`<div class="md-table-wrap"><table>${thead}${tbody}</table></div>`)
      i = j; continue
    }

    // Blockquote
    if (/^>\s?/.test(line)) {
      const items = []
      while (i < lines.length && /^>\s?/.test(lines[i])) { items.push(lines[i].replace(/^>\s?/, '')); i++ }
      out.push(`<blockquote>${inline(items.join(' '))}</blockquote>`)
      continue
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i++ }
      flushListItems(items, 'ul'); continue
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { items.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++ }
      flushListItems(items, 'ol'); continue
    }

    // Paragraph: gather consecutive plain lines
    const para = []
    while (
      i < lines.length && lines[i].trim() &&
      !/^(#{1,6})\s/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) && !/^>\s?/.test(lines[i]) &&
      !blockRe.test(lines[i].trim())
    ) { para.push(lines[i]); i++ }
    out.push(`<p>${inline(para.join('<br />'))}</p>`)
  }

  let html = out.join('\n')
  const restoreRe = new RegExp(`${B0}(\\d+)${B1}`, 'g')
  html = html.replace(restoreRe, (_m, idx) => blocks[Number(idx)])
  return html
}
