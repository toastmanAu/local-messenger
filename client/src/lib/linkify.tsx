import { Fragment } from 'react';

const URL_RE = /https?:\/\/[^\s<>"']+/g;

export function Linkified({ text }: { text: string }) {
  const out: Array<string | { url: string }> = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_RE);
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIndex) out.push(text.slice(lastIndex, m.index));
    out.push({ url: m[0] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return (
    <>
      {out.map((part, i) =>
        typeof part === 'string'
          ? <Fragment key={i}>{part}</Fragment>
          : <a key={i} href={part.url} target="_blank" rel="noopener noreferrer">{part.url}</a>
      )}
    </>
  );
}
