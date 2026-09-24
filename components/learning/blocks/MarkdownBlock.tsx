"use client";

import type { ReactNode } from "react";
import { MathText } from "./MathText";

function safeHref(value: string) {
  const href = value.trim();
  if (href.startsWith("/") || href.startsWith("#")) return href;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function inlineContent(value: string, keyPrefix: string): ReactNode[] {
  const tokens = value.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$|\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]]+\]\([^\)]+\))/g).filter(Boolean);

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.startsWith("$$") && token.endsWith("$$")) return <MathText key={key} math={token.slice(2, -2)} block />;
    if (token.startsWith("$") && token.endsWith("$")) return <MathText key={key} math={token.slice(1, -1)} />;
    if (token.startsWith("**") && token.endsWith("**")) return <strong key={key}>{inlineContent(token.slice(2, -2), key)}</strong>;
    if (token.startsWith("*") && token.endsWith("*")) return <em key={key}>{inlineContent(token.slice(1, -1), key)}</em>;
    if (token.startsWith("`") && token.endsWith("`")) return <code key={key} className="rounded bg-[#F1F1F1] px-1.5 py-0.5 font-mono text-[0.9em] text-[#111111]">{token.slice(1, -1)}</code>;

    const link = token.match(/^\[([^\]]+)\]\(([^\)]+)\)$/);
    if (link) {
      const href = safeHref(link[2]);
      if (href) return <a key={key} href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="font-semibold text-[#111111] underline decoration-[#E5E5E5] underline-offset-2 hover:text-[#666666]">{link[1]}</a>;
      return <span key={key}>{link[1]}</span>;
    }

    return <span key={key}>{token}</span>;
  });
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isTableDivider(line: string) {
  return splitTableRow(line).length > 0 && splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderTable(lines: string[], key: string) {
  const headers = splitTableRow(lines[0]);
  const rows = lines.slice(2).map(splitTableRow);
  return <div key={key} className="my-5 overflow-x-auto"><table className="min-w-full border-collapse text-left text-sm"><thead><tr>{headers.map((header, index) => <th key={`${key}-h-${index}`} className="border border-[#D9D9D9] bg-[#F7F7F8] px-3 py-2 font-semibold text-[#111111]">{inlineContent(header, `${key}-header-${index}`)}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${key}-r-${rowIndex}`}>{headers.map((_, columnIndex) => <td key={`${key}-c-${rowIndex}-${columnIndex}`} className="border border-[#E5E5E5] px-3 py-2 text-[#444444]">{inlineContent(row[columnIndex] ?? "", `${key}-cell-${rowIndex}-${columnIndex}`)}</td>)}</tr>)}</tbody></table></div>;
}

export function MarkdownBlock({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const output: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }

    if (line.trim().startsWith("```") || line.trim().startsWith("~~~")) {
      const fence = line.trim().slice(0, 3);
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith(fence)) { codeLines.push(lines[index]); index += 1; }
      if (index < lines.length) index += 1;
      output.push(<pre key={`code-${index}`} className="my-5 overflow-x-auto rounded-2xl bg-[#111111] p-4 font-mono text-sm leading-6 text-white"><code>{codeLines.join("\n")}</code></pre>);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length, 4);
      const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
      const classes = level === 1 ? "mt-8 font-serif text-4xl text-[#111111]" : level === 2 ? "mt-7 font-serif text-3xl text-[#111111]" : "mt-6 font-serif text-2xl text-[#111111]";
      output.push(<Tag key={`heading-${index}`} className={classes}>{inlineContent(heading[2], `heading-${index}`)}</Tag>);
      index += 1;
      continue;
    }

    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line.trim())) { output.push(<hr key={`hr-${index}`} className="my-7 border-[#E5E5E5]" />); index += 1; continue; }

    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) { quoteLines.push(lines[index].trim().replace(/^>\s?/, "")); index += 1; }
      output.push(<blockquote key={`quote-${index}`} className="my-5 border-l-4 border-[#FFBE00] bg-[#F7F7F8] px-5 py-3 font-serif text-lg italic leading-8 text-[#444444]">{quoteLines.map((quote, quoteIndex) => <p key={quoteIndex}>{inlineContent(quote, `quote-${index}-${quoteIndex}`)}</p>)}</blockquote>);
      continue;
    }

    if ((line.includes("|") && index + 1 < lines.length && isTableDivider(lines[index + 1]))) {
      const tableLines = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) { tableLines.push(lines[index]); index += 1; }
      output.push(renderTable(tableLines, `table-${index}`));
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*[-*+]\s+/, "")); index += 1; }
      output.push(<ul key={`ul-${index}`} className="my-5 list-disc space-y-2 pl-6 text-[#333333]">{items.map((item, itemIndex) => <li key={itemIndex}>{inlineContent(item, `ul-${index}-${itemIndex}`)}</li>)}</ul>);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) { items.push(lines[index].replace(/^\s*\d+[.)]\s+/, "")); index += 1; }
      output.push(<ol key={`ol-${index}`} className="my-5 list-decimal space-y-2 pl-6 text-[#333333]">{items.map((item, itemIndex) => <li key={itemIndex}>{inlineContent(item, `ol-${index}-${itemIndex}`)}</li>)}</ol>);
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+/.test(lines[index]) && !/^\s*[-*+]\s+/.test(lines[index]) && !/^\s*\d+[.)]\s+/.test(lines[index]) && !lines[index].trim().startsWith(">") && !lines[index].trim().startsWith("```") && !/^(\*{3,}|-{3,}|_{3,})\s*$/.test(lines[index].trim())) { paragraph.push(lines[index]); index += 1; }
    output.push(<p key={`paragraph-${index}`} className="my-4 text-base leading-8 text-[#333333]">{inlineContent(paragraph.join(" "), `paragraph-${index}`)}</p>);
  }

  return <div className="markdown-content">{output.length ? output : <p className="text-sm text-[#999999]">No Markdown content yet.</p>}</div>;
}
