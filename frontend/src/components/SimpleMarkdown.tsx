import React from "react";
import { cn } from "../lib/utils";

type Props = {
  text: string;
  className?: string;
};

type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "h"; level: number; text: string };

function renderInline(text: string) {
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const start = text.indexOf("**", i);
    if (start === -1) {
      out.push(text.slice(i));
      break;
    }
    const end = text.indexOf("**", start + 2);
    if (end === -1) {
      out.push(text.slice(i));
      break;
    }
    if (start > i) out.push(text.slice(i, start));
    const bold = text.slice(start + 2, end);
    out.push(
      <strong key={`b-${key++}`} className="font-semibold text-gray-900">
        {bold}
      </strong>
    );
    i = end + 2;
  }
  return out;
}

function parseBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let para: string[] = [];
  let ul: string[] | null = null;
  let ol: string[] | null = null;

  const flush = () => {
    if (para.length) {
      blocks.push({ kind: "p", lines: para });
      para = [];
    }
    if (ul && ul.length) blocks.push({ kind: "ul", items: ul });
    ul = null;
    if (ol && ol.length) blocks.push({ kind: "ol", items: ol });
    ol = null;
  };

  for (const line of lines) {
    const t = line.trimEnd();
    if (!t.trim()) {
      flush();
      continue;
    }

    const headingMatch = t.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flush();
      blocks.push({ kind: "h", level: headingMatch[1].length, text: headingMatch[2].trim() });
      continue;
    }

    const ulMatch = t.match(/^[-*+]\s+(.+)$/) || t.match(/^[•–—]\s+(.+)$/);
    if (ulMatch) {
      if (ol) flush();
      ul = ul || [];
      ul.push(ulMatch[1].trim());
      continue;
    }

    const olMatch = t.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (ul) flush();
      ol = ol || [];
      ol.push(olMatch[1].trim());
      continue;
    }

    if (ul || ol) flush();
    para.push(t.trim());
  }

  flush();
  return blocks;
}

export function SimpleMarkdown({ text, className }: Props) {
  const blocks = parseBlocks(text);
  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((b, idx) => {
        if (b.kind === "h") {
          const level = Math.min(6, Math.max(1, b.level));
          const size =
            level <= 2 ? "text-base" : level === 3 ? "text-sm" : "text-sm";
          return (
            <div key={`h-${idx}`} className={cn(size, "font-semibold text-gray-900")}>
              {renderInline(b.text)}
            </div>
          );
        }
        if (b.kind === "ul") {
          return (
            <ul key={`ul-${idx}`} className="list-disc pl-5 space-y-1 text-sm text-gray-700">
              {b.items.map((item, i) => (
                <li key={`uli-${idx}-${i}`} className="leading-relaxed">
                  {renderInline(item)}
                </li>
              ))}
            </ul>
          );
        }
        if (b.kind === "ol") {
          return (
            <ol key={`ol-${idx}`} className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
              {b.items.map((item, i) => (
                <li key={`oli-${idx}-${i}`} className="leading-relaxed">
                  {renderInline(item)}
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={`p-${idx}`} className="text-sm text-gray-700 leading-relaxed">
            {renderInline(b.lines.join(" "))}
          </p>
        );
      })}
    </div>
  );
}

