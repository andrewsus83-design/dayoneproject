import React, { type CSSProperties, type ReactNode } from 'react';

/*
 * Rich text on invitation forms. Organizers write a few marks instead of HTML, so nothing they type can run on a
 * guest's phone:
 *   # Heading          ## Small heading
 *   - bullet item      1. numbered item
 *   **bold**   *italic*   [link text](https://…)   (links: https, http, mailto and tel only)
 * A blank line starts a new paragraph; a single line break stays a line break.
 */

type Block =
  | { kind: 'text'; style: 'h1' | 'h2' | 'p'; lines: string[] }
  | { kind: 'list'; style: 'ul' | 'ol'; items: string[] };

const SAFE_LINK = /^(https?:\/\/|mailto:|tel:)/i;
const INLINE = /\*\*(.+?)\*\*|\*([^*\s][^*]*?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  // The list being written, if any (already in blocks).
  const open: { list: Extract<Block, { kind: 'list' }> | null } = { list: null };
  const flushPara = () => {
    if (para.length) blocks.push({ kind: 'text', style: 'p', lines: para });
    para = [];
  };
  const flushList = () => {
    open.list = null;
  };
  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const line = raw.trimEnd();
    let m: RegExpMatchArray | null;
    if (!line.trim()) {
      flushPara();
      flushList();
    } else if ((m = line.match(/^\s*(#{1,2})\s+(.*)$/))) {
      flushPara();
      flushList();
      blocks.push({ kind: 'text', style: m[1].length === 1 ? 'h1' : 'h2', lines: [m[2]] });
    } else if ((m = line.match(/^\s*(?:[-•]|\*(?=\s))\s+(.*)$/)) || (m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      const style = /^\s*\d/.test(line) ? 'ol' : 'ul';
      flushPara();
      if (open.list?.style !== style) {
        open.list = { kind: 'list', style, items: [] };
        blocks.push(open.list);
      }
      open.list.items.push(m[m.length - 1]);
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

function inline(text: string, key: string, linkColor?: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const m of text.matchAll(INLINE)) {
    const at = m.index ?? 0;
    if (at > last) out.push(text.slice(last, at));
    const k = `${key}-${n++}`;
    if (m[1] !== undefined) out.push(<strong key={k}>{inline(m[1], k, linkColor)}</strong>);
    else if (m[2] !== undefined) out.push(<em key={k}>{inline(m[2], k, linkColor)}</em>);
    else if (SAFE_LINK.test(m[4])) {
      out.push(
        <a key={k} href={m[4]} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: linkColor }}>
          {m[3]}
        </a>,
      );
    } else out.push(m[3]);
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({
  text, align = 'left', headingStyle, linkColor, mutedColor,
}: {
  text: string;
  align?: 'left' | 'center';
  headingStyle?: CSSProperties;
  linkColor?: string;
  /** Paragraph and list colour (headings keep the text colour). */
  mutedColor?: string;
}) {
  const blocks = parse(text);
  if (!blocks.length) return null;
  return (
    <div className="space-y-3 text-sm leading-relaxed break-words" style={{ textAlign: align }}>
      {blocks.map((b, i) => {
        const key = `b${i}`;
        if (b.kind === 'text' && b.style === 'h1') return <h3 key={key} className="text-xl font-bold leading-snug" style={headingStyle}>{inline(b.lines[0], key, linkColor)}</h3>;
        if (b.kind === 'text' && b.style === 'h2') return <h4 key={key} className="text-base font-bold leading-snug" style={headingStyle}>{inline(b.lines[0], key, linkColor)}</h4>;
        if (b.kind === 'text') {
          return (
            <p key={key} style={{ color: mutedColor }}>
              {b.lines.map((line, j) => (
                <React.Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(line, `${key}-${j}`, linkColor)}
                </React.Fragment>
              ))}
            </p>
          );
        }
        const List = b.style;
        return (
          <List
            key={key}
            className={`space-y-1 ${b.style === 'ul' ? 'list-disc' : 'list-decimal'} ${align === 'center' ? 'list-inside' : 'pl-5'}`}
            style={{ color: mutedColor }}
          >
            {b.items.map((item, j) => <li key={j}>{inline(item, `${key}-${j}`, linkColor)}</li>)}
          </List>
        );
      })}
    </div>
  );
}

/** The first line of a text block without its marks, for lists in the builder. */
export function richTextSummary(text: string): string {
  const first = text.split('\n').find((l) => l.trim()) ?? '';
  return first.replace(/^\s*(#{1,2}|[-•*]|\d+[.)])\s+/, '').replace(/\*\*|\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
}
