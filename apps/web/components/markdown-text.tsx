import { Fragment, type ReactNode } from "react";

export function MarkdownText({ text }: { text: string }) {
  const blocks = splitBlocks(text);
  return (
    <div className="flex flex-col gap-3 text-sm leading-6 text-zinc-200">
      {blocks.map((block, index) =>
        block.type === "table" ? (
          <MarkdownTable key={index} lines={block.lines} />
        ) : (
          <p key={index}>
            <InlineText text={block.text} />
          </p>
        ),
      )}
    </div>
  );
}

function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const rows = lines
    .filter((line) => !/^\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?$/.test(line))
    .map((line) =>
      line
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim()),
    );
  const [header, ...body] = rows;
  if (!header) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-zinc-900 text-muted">
          <tr>
            {header.map((cell, index) => (
              <th key={index} className="px-2 py-1.5 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-border">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-2 py-1.5">
                  <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Block = { type: "paragraph"; text: string } | { type: "table"; lines: string[] };

function splitBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let table: string[] = [];

  const flushParagraph = () => {
    const value = paragraph.join(" ").trim();
    if (value) blocks.push({ type: "paragraph", text: value });
    paragraph = [];
  };
  const flushTable = () => {
    if (table.length > 0) blocks.push({ type: "table", lines: table });
    table = [];
  };

  for (const line of lines) {
    if (line.trim().startsWith("|")) {
      flushParagraph();
      table.push(line);
      continue;
    }
    flushTable();
    if (line.trim() === "") {
      flushParagraph();
    } else {
      paragraph.push(line.trim());
    }
  }
  flushTable();
  flushParagraph();
  return blocks;
}

export function JsonPreview({ value }: { value: unknown }): ReactNode {
  return (
    <pre className="overflow-x-auto rounded-md bg-zinc-950 p-2 font-mono text-[11px] text-zinc-400">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
