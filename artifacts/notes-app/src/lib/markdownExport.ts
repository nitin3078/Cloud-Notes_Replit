/**
 * Converts a note's Quill-generated HTML into Markdown for export.
 * Written by hand rather than pulling in a library (e.g. turndown) since
 * Quill's output here is fairly constrained — headings, bold/italic, plain
 * and checklist lists, and code blocks — so a small dedicated walker covers
 * it well without adding a new dependency.
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines: string[] = [];
  let orderedListCounter = 0;

  function inlineText(node: Node): string {
    let out = '';
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.textContent ?? '';
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const inner = inlineText(el);
      if (tag === 'strong' || tag === 'b') out += `**${inner}**`;
      else if (tag === 'em' || tag === 'i') out += `*${inner}*`;
      else if (tag === 'code') out += `\`${inner}\``;
      else if (tag === 's' || tag === 'del') out += `~~${inner}~~`;
      else if (tag === 'br') out += '\n';
      else out += inner;
    });
    return out;
  }

  function walk(node: Node) {
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) lines.push(text);
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === 'h1') { lines.push(`# ${inlineText(el)}`, ''); }
      else if (tag === 'h2') { lines.push(`## ${inlineText(el)}`, ''); }
      else if (tag === 'h3') { lines.push(`### ${inlineText(el)}`, ''); }
      else if (tag === 'p') {
        const text = inlineText(el);
        lines.push(text, '');
      }
      else if (tag === 'pre') {
        const code = el.textContent ?? '';
        lines.push('```', code, '```', '');
      }
      else if (tag === 'ul' || tag === 'ol') {
        orderedListCounter = 0;
        el.querySelectorAll(':scope > li').forEach((li) => {
          const liEl = li as HTMLElement;
          const dataList = liEl.getAttribute('data-list');
          const text = inlineText(liEl);
          if (dataList === 'checked') lines.push(`- [x] ${text}`);
          else if (dataList === 'unchecked') lines.push(`- [ ] ${text}`);
          else if (tag === 'ol') { orderedListCounter += 1; lines.push(`${orderedListCounter}. ${text}`); }
          else lines.push(`- ${text}`);
        });
        lines.push('');
      }
      else if (tag === 'blockquote') {
        lines.push(`> ${inlineText(el)}`, '');
      }
      else {
        // Unknown wrapper (e.g. a Quill div) — recurse into it.
        walk(el);
      }
    });
  }

  walk(doc.body);

  // Collapse 3+ blank lines into at most one, and trim.
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

export function downloadMarkdown(title: string, html: string) {
  const markdown = `# ${title || 'Untitled Note'}\n\n${htmlToMarkdown(html)}`;
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (title || 'untitled-note').replace(/[^a-z0-9\-_ ]/gi, '').trim().replace(/\s+/g, '-') || 'untitled-note';
  a.download = `${safeName}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
