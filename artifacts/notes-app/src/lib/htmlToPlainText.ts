/**
 * Converts note HTML into plain text for previews and search matching.
 * Uses the browser's own HTML parser (via a template element) rather than a
 * regex strip, so entities like &nbsp; get decoded into real spaces instead
 * of leaking through as literal text — a regex-only strip doesn't do this,
 * which previously broke multi-word search phrases.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return '';
  const template = document.createElement('template');
  template.innerHTML = html;
  const text = template.content.textContent ?? '';
  return text.replace(/\s+/g, ' ').trim();
}
