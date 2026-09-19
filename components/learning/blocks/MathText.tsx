"use client";

import katex from "katex";

export function MathText({ math, block = false }: { math: string; block?: boolean }) {
  const html = katex.renderToString(math, { displayMode: block, throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} className={`font-serif ${block ? "my-6 block text-center text-xl" : "inline"}`} />;
}
