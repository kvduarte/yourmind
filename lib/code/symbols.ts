/**
 * Descobre funções e classes de um código (sem depender da linguagem).
 * Serve para mostrar um "resumo" do que existe dentro de cada bloco.
 */

export interface CodeSymbol {
  name: string;
  kind: "function" | "class";
}

const IGNORE = new Set([
  "if", "for", "while", "switch", "catch", "return", "else", "sizeof",
  "typeof", "new", "do", "try", "with", "elif", "except", "print",
  "printf", "scanf", "main_", "when", "match", "loop", "using", "lock",
]);

const PATTERNS: [RegExp, CodeSymbol["kind"]][] = [
  [/\b(?:class|struct|interface|enum|trait)\s+([A-Za-z_$][\w$]*)/g, "class"],
  [/\bfunction\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/g, "function"],
  [
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/g,
    "function",
  ],
  [/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/gm, "function"],
  [/\bfunc\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/g, "function"],
  [/\bfn\s+([A-Za-z_]\w*)\s*[<(]/g, "function"],
  [
    /^[ \t]*(?:(?:public|private|protected|static|final|async|virtual|override|inline|extern|unsigned|const)\s+)*[A-Za-z_][\w<>,.*&:\[\]]*[ \t]+\**([A-Za-z_]\w*)\s*\([^;)]*\)\s*(?:const\s*)?\{/gm,
    "function",
  ],
];

export function extractSymbols(code: string, limit = 12): CodeSymbol[] {
  const found: CodeSymbol[] = [];
  const seen = new Set<string>();

  for (const [pattern, kind] of PATTERNS) {
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;

    while ((match = pattern.exec(code)) !== null) {
      const name = match[1];

      if (!name || IGNORE.has(name)) continue;

      const key = `${kind}:${name}`;

      if (seen.has(key) || seen.has(`function:${name}`) || seen.has(`class:${name}`)) {
        continue;
      }

      seen.add(key);
      found.push({ name, kind });

      if (found.length >= limit) return found;
    }
  }

  return found;
}