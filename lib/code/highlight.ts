import hljs from "highlight.js/lib/core";

import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import java from "highlight.js/lib/languages/java";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import csharp from "highlight.js/lib/languages/csharp";
import xml from "highlight.js/lib/languages/xml";
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import json from "highlight.js/lib/languages/json";
import bash from "highlight.js/lib/languages/bash";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";
import php from "highlight.js/lib/languages/php";
import yaml from "highlight.js/lib/languages/yaml";

/* =========================================================
   REGISTRO DAS LINGUAGENS
========================================================= */

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("java", java);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("csharp", csharp);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("json", json);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("go", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("php", php);
hljs.registerLanguage("yaml", yaml);

export const AUTO_LANGUAGE = "Auto";

export interface LanguageInfo {
  /** Nome exibido (é o que fica salvo em node.language) */
  label: string;
  /** Id da linguagem no highlight.js */
  id: string;
  /** Cor do ponto no cabeçalho do bloco */
  color: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { label: "JavaScript", id: "javascript", color: "#f7df1e" },
  { label: "TypeScript", id: "typescript", color: "#3178c6" },
  { label: "Python", id: "python", color: "#3776ab" },
  { label: "Java", id: "java", color: "#ea2d2e" },
  { label: "C", id: "c", color: "#a8b9cc" },
  { label: "C++", id: "cpp", color: "#00599c" },
  { label: "C#", id: "csharp", color: "#68217a" },
  { label: "HTML", id: "xml", color: "#e34f26" },
  { label: "CSS", id: "css", color: "#2965f1" },
  { label: "SQL", id: "sql", color: "#e38c00" },
  { label: "JSON", id: "json", color: "#9ca3af" },
  { label: "Bash", id: "bash", color: "#4eaa25" },
  { label: "Go", id: "go", color: "#00add8" },
  { label: "Rust", id: "rust", color: "#dea584" },
  { label: "PHP", id: "php", color: "#777bb4" },
  { label: "YAML", id: "yaml", color: "#cb171e" },
];

const BY_LABEL = new Map(LANGUAGES.map((l) => [l.label, l]));

export function getLanguageInfo(label?: string): LanguageInfo | undefined {
  return label ? BY_LABEL.get(label) : undefined;
}

/* =========================================================
   DETECÇÃO AUTOMÁTICA

   1) Heurísticas por assinatura (rápidas e muito precisas
      para trechos curtos: #include, def, fn main, etc.)
   2) Se nada for conclusivo, cai no highlightAuto.
========================================================= */

type Rule = [RegExp, number];

const SIGNATURES: Record<string, Rule[]> = {
  c: [
    [/#include\s*<(stdio|stdlib|string|math|stdint|unistd|time|ctype|stdbool|errno|signal|pthread)\.h>/, 6],
    [/\b(printf|scanf|malloc|calloc|free|fgets|strlen|strcpy|memset|sizeof)\s*\(/, 2],
    [/\bint\s+main\s*\(/, 2],
    [/\b(typedef\s+struct|struct\s+\w+\s*\{)/, 2],
    [/\w+\s*\*\s*\w+\s*=\s*\(?\w*\s*\*?\)?\s*malloc/, 2],
    [/->\w+/, 1],
  ],
  cpp: [
    [/#include\s*<(iostream|vector|string|map|set|algorithm|memory|queue|stack|unordered_map|bits\/stdc\+\+\.h)>/, 7],
    [/\bstd::\w+/, 4],
    [/\b(cout|cin|endl)\b/, 3],
    [/\busing\s+namespace\s+std\b/, 5],
    [/\btemplate\s*<[^>]*>/, 3],
    [/\b(class|struct)\s+\w+\s*(:\s*public\s+\w+)?\s*\{/, 1],
    [/\b(nullptr|constexpr|auto&|override)\b/, 2],
  ],
  csharp: [
    [/\busing\s+System(\.\w+)*\s*;/, 6],
    [/\bConsole\.(WriteLine|Write|ReadLine)\s*\(/, 5],
    [/\bnamespace\s+[\w.]+\s*(\{|;)/, 3],
    [/\b(public|private|internal|protected)\s+(static\s+)?(async\s+)?(void|string|int|bool|Task)\b/, 2],
    [/\b(var|string)\s+\w+\s*=\s*new\b/, 2],
    [/\[(HttpGet|HttpPost|Route|Serializable)[^\]]*\]/, 4],
  ],
  java: [
    [/\bSystem\.out\.print(ln)?\s*\(/, 6],
    [/\bimport\s+java(x)?\.[\w.*]+\s*;/, 6],
    [/\bpublic\s+static\s+void\s+main\s*\(\s*String/, 7],
    [/\b(public|private|protected)\s+(final\s+)?class\s+\w+/, 3],
    [/@(Override|Autowired|Entity|RestController|SpringBootApplication)\b/, 4],
    [/\bnew\s+(ArrayList|HashMap|HashSet|LinkedList)\s*</, 3],
  ],
  python: [
    [/^\s*def\s+\w+\s*\([^)]*\)\s*(->\s*[\w\[\], .]+)?\s*:/m, 5],
    [/^\s*(import\s+\w+|from\s+[\w.]+\s+import\s+)/m, 3],
    [/^\s*(elif\b|except\b.*:|finally\s*:|with\s+.+\s+as\s+\w+\s*:)/m, 3],
    [/\bif\s+__name__\s*==\s*["']__main__["']/, 7],
    [/\bself\.\w+/, 2],
    [/^\s*class\s+\w+(\([^)]*\))?\s*:/m, 4],
    [/\bprint\s*\(/, 1],
    [/\b(True|False|None)\b/, 1],
    [/\bf["'][^"']*\{[^}]+\}/, 3],
    [/^\s*(for|while|if)\b[^;{}]*:\s*$/m, 2],
  ],
  typescript: [
    [/\binterface\s+\w+(\s+extends\s+[\w, ]+)?\s*\{/, 5],
    [/\btype\s+\w+(<[^>]*>)?\s*=\s*/, 5],
    [/:\s*(string|number|boolean|unknown|any|void|never)(\[\])?\s*[,;)=\n{|]/, 4],
    [/\bas\s+(const|unknown|string|number|\w+)\b/, 2],
    [/<\w+(\s*,\s*\w+)*>\s*\(/, 1],
    [/\b(enum|readonly|implements|namespace|declare)\b/, 2],
    [/\b(useState|useEffect|React\.FC)\b.*</, 2],
    [/\w+\?:\s*\w+/, 2],
  ],
  javascript: [
    [/\b(const|let|var)\s+\w+\s*=/, 2],
    [/=>\s*[{(\w]/, 2],
    [/\bconsole\.(log|error|warn)\s*\(/, 4],
    [/\bfunction\s*\*?\s*\w*\s*\(/, 2],
    [/\b(require\s*\(|module\.exports|exports\.\w+)/, 4],
    [/\bimport\s+.+\s+from\s+["'][^"']+["']/, 3],
    [/\b(document|window)\.\w+/, 3],
    [/\b(async|await)\b/, 1],
    [/\bexport\s+(default|const|function)\b/, 3],
    [/===|!==/, 2],
  ],
  xml: [
    [/<!DOCTYPE\s+html/i, 8],
    [/<\/?(html|head|body|div|span|section|main|nav|ul|li|a|p|h[1-6]|script|style|button|input|form)\b[^>]*>/i, 4],
    [/<\/\w+>/, 2],
    [/\b(class|id|href|src)=["'][^"']*["']/, 2],
  ],
  css: [
    [/[.#]?[\w-]+(\s*[>+~,]\s*[.#]?[\w-]+)*\s*\{[^{}]*:[^{}]*;[^{}]*\}/, 5],
    [/@(media|keyframes|import|font-face|tailwind|apply)\b/, 4],
    [/\b(margin|padding|display|color|background|font-size|border|flex|grid)\s*:\s*[^;]+;/, 3],
    [/:root\s*\{/, 4],
  ],
  sql: [
    [/\bSELECT\b[\s\S]+\bFROM\b/i, 7],
    [/\b(INSERT\s+INTO|CREATE\s+(TABLE|INDEX|VIEW|DATABASE)|ALTER\s+TABLE|DROP\s+TABLE|DELETE\s+FROM|UPDATE\s+\w+\s+SET)\b/i, 7],
    [/\b(WHERE|GROUP\s+BY|ORDER\s+BY|INNER\s+JOIN|LEFT\s+JOIN|HAVING|PRIMARY\s+KEY)\b/i, 2],
  ],
  bash: [
    [/^#!\s*\/(usr\/)?bin\/(env\s+)?(ba|z)?sh/m, 8],
    [/^\s*(sudo|apt(-get)?|npm|npx|yarn|pnpm|pip|git|docker|cd|ls|mkdir|chmod|curl|wget|export|echo)\s+/m, 3],
    [/\$\{?\w+\}?/, 1],
    [/\bfi\b|\bdone\b|\besac\b/, 2],
    [/^\s*\w+=\S*$/m, 1],
  ],
  go: [
    [/^\s*package\s+\w+\s*$/m, 6],
    [/\bfunc\s+(\(\w+\s+\*?\w+\)\s*)?\w+\s*\(/, 4],
    [/:=/, 2],
    [/\bfmt\.(Print|Sprintf|Println|Errorf)/, 5],
    [/\b(goroutine|chan\s+\w+|go\s+func|defer\s)/, 3],
  ],
  rust: [
    [/\bfn\s+\w+\s*(<[^>]*>)?\s*\(/, 4],
    [/\blet\s+mut\b/, 5],
    [/\b(println|vec|format|panic)!\s*\(/, 5],
    [/\buse\s+(std|crate|super)::/, 5],
    [/\b(impl|trait|pub\s+fn|pub\s+struct|match)\b/, 2],
    [/->\s*(Result|Option|Self|\w+)\s*\{/, 2],
  ],
  php: [
    [/<\?php/, 9],
    [/\$\w+\s*=/, 2],
    [/\b(echo|namespace|use)\s+[\\\w$"']+;/, 2],
    [/->\w+\(/, 1],
  ],
  yaml: [
    [/^\s*[\w-]+:\s*(\S.*)?$/m, 1],
    [/^\s*-\s+[\w-]+:\s*\S+/m, 3],
    [/^---\s*$/m, 3],
  ],
};

const AUTO_SUBSET = LANGUAGES.map((l) => l.id);

function isValidJson(text: string) {
  const t = text.trim();
  if (!t || (t[0] !== "{" && t[0] !== "[")) return false;
  try {
    JSON.parse(t);
    return true;
  } catch {
    return false;
  }
}

/**
 * Descobre a linguagem de um trecho de código.
 * Retorna o `label` (ex.: "C", "Python") ou null se não tiver certeza.
 */
export function detectLanguage(code: string): string | null {
  const sample = code.slice(0, 4000);

  if (sample.trim().length < 3) return null;

  if (isValidJson(sample)) return "JSON";

  const scores: Record<string, number> = {};

  for (const [id, rules] of Object.entries(SIGNATURES)) {
    let score = 0;

    for (const [regex, weight] of rules) {
      if (regex.test(sample)) score += weight;
    }

    scores[id] = score;
  }

  // C++ também casa com "C": se há marcas de C++, C++ vence.
  if (scores.cpp >= 4) scores.c = Math.min(scores.c, scores.cpp - 1);

  // TypeScript também casa com JavaScript: tipos explícitos desempatam.
  if (scores.typescript >= 4) scores.javascript = Math.max(0, scores.javascript - 2);

  // JS puro: sem anotações de tipo, TS perde.
  if (scores.typescript < 4) scores.typescript = 0;

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [bestId, bestScore] = ranked[0];
  const secondScore = ranked[1]?.[1] ?? 0;

  if (bestScore >= 4 && bestScore > secondScore) {
    return LANGUAGES.find((l) => l.id === bestId)?.label ?? null;
  }

  // Fallback: o highlight.js tenta adivinhar.
  try {
    const auto = hljs.highlightAuto(sample, AUTO_SUBSET);

    if (auto.language && auto.relevance >= 4) {
      return LANGUAGES.find((l) => l.id === auto.language)?.label ?? null;
    }
  } catch {
    /* ignora */
  }

  return bestScore >= 2
    ? LANGUAGES.find((l) => l.id === bestId)?.label ?? null
    : null;
}

/* =========================================================
   HIGHLIGHT
========================================================= */

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Gera o HTML colorido (classes hljs-*) para uma linguagem conhecida. */
export function highlightCode(code: string, label?: string | null): string {
  const info = getLanguageInfo(label ?? undefined);

  if (!info || !code) return escapeHtml(code);

  try {
    return hljs.highlight(code, {
      language: info.id,
      ignoreIllegals: true,
    }).value;
  } catch {
    return escapeHtml(code);
  }
}