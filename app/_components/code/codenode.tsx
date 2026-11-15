"use client";

import React, {
  useDeferredValue,
  useMemo,
  useRef,
} from "react";

import { Check, Copy, Maximize2, Sparkles, X } from "lucide-react";

import { Node } from "@/types";

import { useSettings } from "@/lib/settings";

import {
  AUTO_LANGUAGE,
  LANGUAGES,
  detectLanguage,
  getLanguageInfo,
  highlightCode,
} from "@/lib/code/highlight";
import { FileTypeIcon } from "@/lib/fileIcons";

/* =========================================================
   EDITOR COM SYNTAX HIGHLIGHT
========================================================= */

const PADDING = 12;

function getEditorFont(fontSize: number, wrap = false): React.CSSProperties {
  return {
    fontFamily:
      "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize,
    lineHeight: `${Math.round(fontSize * 1.65)}px`,
    tabSize: 2,
    whiteSpace: wrap ? "pre-wrap" : "pre",
    wordBreak: wrap ? "break-all" : "normal",
    overflowWrap: wrap ? "anywhere" : "normal",
    letterSpacing: "0px",
  };
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  languageLabel: string | null;
  isDark: boolean;
  placeholder?: string;
  /** tamanho da letra (px); sem isso usa o das Configurações */
  fontSize?: number;
  /** quebra as linhas longas em vez de rolar para o lado */
  wrap?: boolean;
  autoFocus?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  languageLabel,
  isDark,
  placeholder,
  fontSize,
  wrap = false,
  autoFocus = false,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const numbersRef = useRef<HTMLPreElement>(null);

  const settings = useSettings();
  const editorFontSize = fontSize ?? settings.editorFontSize;
  const editorLineNumbers = settings.editorLineNumbers && !wrap;
  const editorFont = getEditorFont(editorFontSize, wrap);

  /* rolagem: o texto colorido acompanha o campo sem re-renderizar o React */
  const syncScroll = (el: HTMLTextAreaElement) => {
    if (codeRef.current) {
      codeRef.current.style.transform = `translate(${-el.scrollLeft}px, ${-el.scrollTop}px)`;
    }

    if (numbersRef.current) {
      numbersRef.current.style.transform = `translateY(${-el.scrollTop}px)`;
    }
  };

  const html = useMemo(
    () => highlightCode(value, languageLabel) + "\n",
    [value, languageLabel]
  );

  const lineCount = useMemo(
    () => Math.max(1, value.split("\n").length),
    [value]
  );

  const lineNumbers = useMemo(
    () =>
      Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount]
  );

  const setValueAndCaret = (
    next: string,
    selectionStart: number,
    selectionEnd = selectionStart
  ) => {
    onChange(next);

    requestAnimationFrame(() => {
      const el = textareaRef.current;

      if (el) {
        el.selectionStart = selectionStart;
        el.selectionEnd = selectionEnd;
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const { selectionStart: start, selectionEnd: end } = el;

    if (e.key === "Tab") {
      e.preventDefault();

      if (e.shiftKey) {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const lead = value.slice(lineStart).match(/^ {1,2}/);

        if (lead) {
          const removed = lead[0].length;

          setValueAndCaret(
            value.slice(0, lineStart) + value.slice(lineStart + removed),
            Math.max(lineStart, start - removed),
            Math.max(lineStart, end - removed)
          );
        }

        return;
      }

      setValueAndCaret(
        value.slice(0, start) + "  " + value.slice(end),
        start + 2
      );

      return;
    }

    if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();

      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const currentLine = value.slice(lineStart, start);
      const indent = currentLine.match(/^\s*/)?.[0] ?? "";
      const prevChar = value[start - 1];
      const nextChar = value[end];
      const opens = prevChar && "{([:".includes(prevChar);
      const extra = opens ? "  " : "";

      const pair =
        (prevChar === "{" && nextChar === "}") ||
        (prevChar === "(" && nextChar === ")") ||
        (prevChar === "[" && nextChar === "]");

      if (pair) {
        const insert = "\n" + indent + "  " + "\n" + indent;

        setValueAndCaret(
          value.slice(0, start) + insert + value.slice(end),
          start + 1 + indent.length + 2
        );

        return;
      }

      const insert = "\n" + indent + extra;

      setValueAndCaret(
        value.slice(0, start) + insert + value.slice(end),
        start + insert.length
      );
    }
  };

  return (
    <div
      className={`code-hl flex-1 min-h-0 flex overflow-hidden select-text ${
        isDark ? "code-hl-dark bg-zinc-950" : "code-hl-light bg-white"
      }`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Números de linha */}
      {editorLineNumbers && (
        <div
          aria-hidden
          className={`shrink-0 overflow-hidden text-right select-none border-r ${
            isDark
              ? "border-zinc-800 text-zinc-600"
              : "border-zinc-200 text-zinc-400"
          }`}
          style={{ width: 40 }}
        >
          <pre
            ref={numbersRef}
            style={{
              ...editorFont,
              margin: 0,
              padding: `${PADDING}px 8px ${PADDING}px 0`,
            }}
          >
            {lineNumbers}
          </pre>
        </div>
      )}

      {/* Área de edição */}
      <div className="relative flex-1 min-w-0">
        <pre
          aria-hidden
          className="pointer-events-none absolute inset-0 m-0 overflow-hidden"
          style={{
            ...editorFont,
            padding: PADDING,
          }}
        >
          <code
            ref={codeRef}
            className="hljs"
            style={{
              display: "block",
              background: "transparent",
              padding: 0,
              fontFamily: "inherit",
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </pre>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={(e) => syncScroll(e.currentTarget)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoFocus={autoFocus}
          wrap={wrap ? "soft" : "off"}
          placeholder={placeholder}
          className={`absolute inset-0 w-full h-full resize-none outline-none border-0 bg-transparent overflow-auto cursor-text ${
            isDark
              ? "placeholder:text-zinc-600 selection:bg-zinc-800"
              : "placeholder:text-zinc-400 selection:bg-zinc-200"
          }`}
          style={{
            ...editorFont,
            padding: PADDING,
            color: "transparent",
            caretColor: isDark ? "#e4e4e7" : "#18181b",
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   NÓ DE CÓDIGO DO GRAFO
========================================================= */

interface CodeNodeProps {
  node: Node;
  isDark: boolean;
  copied: boolean;
  onChange: (changes: Partial<Node>) => void;
  onCopy: () => void;
  onDelete: (e: React.MouseEvent) => void;
  /** abre o editor em tela cheia */
  onExpand?: () => void;
}

export default function CodeNode({
  node,
  isDark,
  copied,
  onChange,
  onCopy,
  onDelete,
  onExpand,
}: CodeNodeProps) {
  const code = node.code || "";
  const { autoDetectLanguage } = useSettings();

  const deferredCode = useDeferredValue(code);

  const manual =
    node.language && node.language !== AUTO_LANGUAGE ? node.language : null;

  const detected = useMemo(
    () =>
      manual || !autoDetectLanguage ? null : detectLanguage(deferredCode),
    [manual, autoDetectLanguage, deferredCode]
  );

  const activeLabel = manual ?? detected;
  const info = getLanguageInfo(activeLabel ?? undefined);
  const lines = code ? code.split("\n").length : 0;

  const borderClass = isDark ? "border-zinc-800" : "border-zinc-200";
  const bgBar = isDark ? "bg-zinc-900/80" : "bg-zinc-50";
  const textMuted = "text-zinc-400";
  const iconBtn = isDark
    ? "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
    : "text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900";

  return (
    <div className={`w-full h-full flex flex-col rounded-xl overflow-hidden min-h-0 border ${borderClass} ${isDark ? "bg-zinc-950 text-zinc-100" : "bg-white text-zinc-900"} shadow-sm`}>
      {/* Cabeçalho */}
      <div
        className={`h-9 shrink-0 flex items-center justify-between gap-2 px-3 border-b ${borderClass} ${bgBar}`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FileTypeIcon name={node.title} language={activeLabel ?? undefined} size={16} />

          <input
            value={node.title ?? ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="arquivo.ext"
            spellCheck={false}
            className={`bg-transparent outline-none text-xs font-medium w-full min-w-0 ${
              isDark
                ? "text-zinc-200 placeholder:text-zinc-600"
                : "text-zinc-800 placeholder:text-zinc-400"
            }`}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="relative flex items-center">
            {!manual && (
              <Sparkles
                size={10}
                className="absolute left-2 text-zinc-400 pointer-events-none"
              />
            )}

            <select
              value={node.language || AUTO_LANGUAGE}
              onChange={(e) => onChange({ language: e.target.value })}
              title="Linguagem (Auto detecta sozinho)"
              className={`text-[10px] rounded py-1 pr-1.5 outline-none border cursor-pointer transition-colors ${
                manual ? "pl-2" : "pl-5"
              } ${borderClass} ${
                isDark
                  ? "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  : "bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <option value={AUTO_LANGUAGE}>
                {detected ? `Auto · ${detected}` : "Auto"}
              </option>

              {LANGUAGES.map((language) => (
                <option key={language.label} value={language.label}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>

          {onExpand && (
            <button
              onClick={onExpand}
              title="Abrir em tela cheia (ou dê dois cliques no bloco)"
              className={`p-1 rounded ${iconBtn}`}
            >
              <Maximize2 size={13} />
            </button>
          )}

          <button
            onClick={onCopy}
            title="Copiar código"
            className={`p-1 rounded ${iconBtn}`}
          >
            {copied ? (
              <Check size={13} className={isDark ? "text-zinc-100" : "text-zinc-900"} />
            ) : (
              <Copy size={13} />
            )}
          </button>

          <button
            onClick={onDelete}
            title="Excluir"
            className={`p-1 rounded ${iconBtn} hover:!text-red-500`}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      <CodeEditor
        value={code}
        onChange={(value) => onChange({ code: value })}
        languageLabel={activeLabel}
        isDark={isDark}
        placeholder="Cole o código aqui — a linguagem é detectada sozinha"
      />

      {/* Rodapé */}
      <div
        className={`px-3 py-1 text-[10px] border-t flex items-center justify-between shrink-0 ${borderClass} ${bgBar} ${textMuted}`}
      >
        <span className="flex items-center gap-1.5">
          {info && (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: info.color }}
            />
          )}

          {activeLabel ?? "Texto simples"}

          {!manual && activeLabel && (
            <span className="text-zinc-400/70">auto</span>
          )}
        </span>

        <span>
          {lines} {lines === 1 ? "linha" : "linhas"}
        </span>
      </div>
    </div>
  );
}