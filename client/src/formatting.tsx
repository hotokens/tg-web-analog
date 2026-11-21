import { Fragment, useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';

type InlineKind = 'bold' | 'italic' | 'strike' | 'spoiler' | 'code';

const INLINE_MARKERS: Array<{ marker: string; kind: InlineKind }> = [
  { marker: '**', kind: 'bold' },
  { marker: '__', kind: 'italic' },
  { marker: '~~', kind: 'strike' },
  { marker: '||', kind: 'spoiler' },
  { marker: '`', kind: 'code' },
];

function findClosing(text: string, marker: string, from: number): number {
  for (let index = from; index < text.length; index += 1) {
    if (text[index] === '\\') {
      index += 1;
      continue;
    }
    if (text.startsWith(marker, index)) return index;
  }
  return -1;
}

function Spoiler({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);

  function reveal(event: MouseEvent) {
    if (revealed) return;
    event.preventDefault();
    event.stopPropagation();
    setRevealed(true);
  }

  function onKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (revealed) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      setRevealed(true);
    }
  }

  return (
    <span
      className={`msg-spoiler ${revealed ? 'is-revealed' : ''}`}
      role="button"
      tabIndex={revealed ? -1 : 0}
      aria-label={revealed ? undefined : 'Показать спойлер'}
      onClick={reveal}
      onKeyDown={onKeyDown}
    >
      {children}
    </span>
  );
}

function parseInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (!buffer) return;
    nodes.push(<Fragment key={`${keyBase}-t${index}`}>{buffer}</Fragment>);
    buffer = '';
  };

  while (index < text.length) {
    const character = text[index];

    if (character === '\\' && index + 1 < text.length) {
      buffer += text[index + 1];
      index += 2;
      continue;
    }

    let matched = false;
    for (const { marker, kind } of INLINE_MARKERS) {
      if (!text.startsWith(marker, index)) continue;
      const end = findClosing(text, marker, index + marker.length);
      if (end <= index + marker.length) continue;

      flush();
      const inner = text.slice(index + marker.length, end);
      const key = `${keyBase}-m${index}`;
      const children = kind === 'code' ? inner : parseInline(inner, key);

      if (kind === 'bold') nodes.push(<strong key={key}>{children}</strong>);
      else if (kind === 'italic') nodes.push(<em key={key}>{children}</em>);
      else if (kind === 'strike') nodes.push(<s key={key}>{children}</s>);
      else if (kind === 'spoiler') nodes.push(<Spoiler key={key}>{children}</Spoiler>);
      else
        nodes.push(
          <code key={key} className="msg-inline-code">
            {children}
          </code>,
        );

      index = end + marker.length;
      matched = true;
      break;
    }
    if (matched) continue;

    const rest = text.slice(index);
    const urlMatch = rest.match(/^https?:\/\/[^\s]+/);
    if (urlMatch) {
      let href = urlMatch[0];
      let trailing = '';
      while (/[.,!?;:]$/.test(href)) {
        trailing = href.slice(-1) + trailing;
        href = href.slice(0, -1);
      }
      flush();
      nodes.push(
        <a key={`${keyBase}-a${index}`} href={href} target="_blank" rel="noreferrer">
          {href}
        </a>,
      );
      if (trailing) nodes.push(<Fragment key={`${keyBase}-p${index}`}>{trailing}</Fragment>);
      index += urlMatch[0].length;
      continue;
    }

    const mentionMatch = rest.match(/^@[a-zA-Z0-9_]{2,32}/);
    const previous = index > 0 ? text[index - 1] : '';
    if (mentionMatch && !/[a-zA-Z0-9._-]/.test(previous)) {
      flush();
      nodes.push(
        <span key={`${keyBase}-n${index}`} className="msg-mention">
          {mentionMatch[0]}
        </span>,
      );
      index += mentionMatch[0].length;
      continue;
    }

    buffer += character;
    index += 1;
  }

  flush();
  return nodes;
}

export function FormattedText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const fence = /```([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let block = 0;

  while ((match = fence.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Fragment key={`inline-${block}`}>{parseInline(text.slice(lastIndex, match.index), `i${block}`)}</Fragment>,
      );
    }
    let code = match[1];
    if (code.startsWith('\n')) code = code.slice(1);
    if (code.endsWith('\n')) code = code.slice(0, -1);
    parts.push(
      <pre className="msg-code-block" key={`code-${block}`}>
        <code>{code}</code>
      </pre>,
    );
    lastIndex = fence.lastIndex;
    block += 1;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Fragment key="inline-end">{parseInline(text.slice(lastIndex), 'i-end')}</Fragment>,
    );
  }

  return <>{parts}</>;
}

export function plainTextPreview(text: string): string {
  return text
    .replace(/```/g, ' ')
    .replace(/\*\*|__|~~|\|\||`/g, '')
    .replace(/\\([\\*_~|`])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wrapSelection(
  text: string,
  start: number,
  end: number,
  marker: string,
): { text: string; selectionStart: number; selectionEnd: number } {
  const selected = text.slice(start, end);
  const wrapped = selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2;

  if (wrapped) {
    const inner = selected.slice(marker.length, selected.length - marker.length);
    const next = text.slice(0, start) + inner + text.slice(end);
    return { text: next, selectionStart: start, selectionEnd: start + inner.length };
  }

  const next = text.slice(0, start) + marker + selected + marker + text.slice(end);
  return {
    text: next,
    selectionStart: start + marker.length,
    selectionEnd: end + marker.length,
  };
}
