/** Minimal, safe **bold**-only markdown renderer for LLM chat replies — escapes all HTML first,
 * then re-introduces <strong> tags via a controlled regex, so nothing else can inject markup. */
export function renderBoldMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return escaped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}
