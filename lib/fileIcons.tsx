import React from "react";
import { Folder } from "lucide-react";

/* =========================================================
   ARQUIVOS: cada tipo tem uma cor e um símbolo
========================================================= */

export interface FileTypeInfo {
  id: string;
  label: string;
  color: string;
  /** texto curto dentro do ícone (vazio = ícone de React) */
  glyph: string;
}

const TYPES: Record<string, FileTypeInfo> = {
  ts: { id: "ts", label: "TypeScript", color: "#3178c6", glyph: "TS" },
  tsx: { id: "tsx", label: "React (TSX)", color: "#38bdf8", glyph: "" },
  js: { id: "js", label: "JavaScript", color: "#f7df1e", glyph: "JS" },
  jsx: { id: "jsx", label: "React (JSX)", color: "#38bdf8", glyph: "" },
  json: { id: "json", label: "JSON", color: "#f59e0b", glyph: "{}" },
  css: { id: "css", label: "CSS", color: "#7c6df2", glyph: "#" },
  scss: { id: "scss", label: "SCSS", color: "#ec4899", glyph: "S" },
  html: { id: "html", label: "HTML", color: "#e34f26", glyph: "<>" },
  md: { id: "md", label: "Markdown", color: "#60a5fa", glyph: "M" },
  py: { id: "py", label: "Python", color: "#3b82c4", glyph: "PY" },
  java: { id: "java", label: "Java", color: "#ea2d2e", glyph: "J" },
  c: { id: "c", label: "C", color: "#6b8bd6", glyph: "C" },
  cpp: { id: "cpp", label: "C++", color: "#00599c", glyph: "C+" },
  cs: { id: "cs", label: "C#", color: "#8b5cf6", glyph: "C#" },
  go: { id: "go", label: "Go", color: "#00add8", glyph: "GO" },
  rs: { id: "rs", label: "Rust", color: "#dea584", glyph: "RS" },
  php: { id: "php", label: "PHP", color: "#777bb4", glyph: "PH" },
  sql: { id: "sql", label: "SQL", color: "#e38c00", glyph: "DB" },
  sh: { id: "sh", label: "Shell", color: "#4eaa25", glyph: "$" },
  yaml: { id: "yaml", label: "YAML", color: "#cb171e", glyph: "Y" },
  env: { id: "env", label: "Variáveis (.env)", color: "#eab308", glyph: "•" },
  git: { id: "git", label: "Git", color: "#f14e32", glyph: "G" },
  image: { id: "image", label: "Imagem", color: "#a855f7", glyph: "▣" },
  text: { id: "text", label: "Texto", color: "#a1a1aa", glyph: "T" },
};

const EXT_ALIAS: Record<string, string> = {
  mjs: "js",
  cjs: "js",
  mts: "ts",
  cts: "ts",
  yml: "yaml",
  htm: "html",
  markdown: "md",
  h: "c",
  hpp: "cpp",
  cc: "cpp",
  bash: "sh",
  zsh: "sh",
  svg: "image",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  txt: "text",
  lock: "json",
};

const LANGUAGE_TO_TYPE: Record<string, string> = {
  JavaScript: "js",
  TypeScript: "ts",
  Python: "py",
  Java: "java",
  C: "c",
  "C++": "cpp",
  "C#": "cs",
  HTML: "html",
  CSS: "css",
  SQL: "sql",
  JSON: "json",
  Bash: "sh",
  Go: "go",
  Rust: "rs",
  PHP: "php",
  YAML: "yaml",
};

/** Descobre o tipo pelo nome do arquivo (page.tsx) ou, se não tiver extensão, pela linguagem. */
export function fileTypeOf(name?: string, language?: string): FileTypeInfo {
  const clean = (name ?? "").trim().toLowerCase();

  if (clean.startsWith(".env")) return TYPES.env;
  if (clean === ".gitignore" || clean === ".gitattributes") return TYPES.git;

  const dot = clean.lastIndexOf(".");

  if (dot > 0 || (dot === 0 && clean.length > 1)) {
    const ext = clean.slice(dot + 1);
    const id = EXT_ALIAS[ext] ?? ext;

    if (TYPES[id]) return TYPES[id];
  }

  const byLanguage = language ? LANGUAGE_TO_TYPE[language] : undefined;

  return byLanguage ? TYPES[byLanguage] : TYPES.text;
}

export function FileTypeIcon({
  name,
  language,
  size = 16,
}: {
  name?: string;
  language?: string;
  size?: number;
}) {
  const info = fileTypeOf(name, language);

  if (info.id === "tsx" || info.id === "jsx") {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} className="shrink-0" aria-label={info.label}>
        <g fill="none" stroke={info.color} strokeWidth="1.5">
          <ellipse cx="12" cy="12" rx="10" ry="4" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
        </g>
        <circle cx="12" cy="12" r="1.9" fill={info.color} />
      </svg>
    );
  }

  return (
    <span
      aria-label={info.label}
      className="inline-flex shrink-0 items-center justify-center rounded-[4px] font-extrabold leading-none"
      style={{
        width: size,
        height: size,
        backgroundColor: `${info.color}26`,
        color: info.color,
        fontSize: Math.max(7, size * (info.glyph.length > 1 ? 0.42 : 0.55)),
      }}
    >
      {info.glyph}
    </span>
  );
}

/* =========================================================
   PASTAS: cada tipo de pasta tem uma cor
========================================================= */

export interface FolderKindInfo {
  id: string;
  label: string;
  color: string;
  hint: string;
  /** nomes que ativam o tipo automaticamente */
  names: string[];
}

export const FOLDER_KINDS: FolderKindInfo[] = [
  { id: "app", label: "Aplicação (app)", color: "#f87171", hint: "Páginas e rotas", names: ["app", "pages", "src", "routes"] },
  { id: "lib", label: "Biblioteca (lib)", color: "#a3e635", hint: "Funções e regras de negócio", names: ["lib", "libs", "core", "services", "service"] },
  { id: "components", label: "Componentes", color: "#38bdf8", hint: "Peças de interface", names: ["components", "_components", "ui", "views", "widgets"] },
  { id: "public", label: "Públicos (public)", color: "#3b82f6", hint: "Arquivos servidos direto", names: ["public", "static", "www", "dist", "build"] },
  { id: "types", label: "Tipos", color: "#60a5fa", hint: "Tipagens e modelos", names: ["types", "typings", "models", "interfaces", "schemas"] },
  { id: "api", label: "API", color: "#14b8a6", hint: "Rotas e endpoints", names: ["api", "controllers", "endpoints", "server"] },
  { id: "styles", label: "Estilos", color: "#c084fc", hint: "CSS e temas", names: ["styles", "css", "themes", "theme"] },
  { id: "hooks", label: "Hooks", color: "#ec4899", hint: "Lógica reutilizável", names: ["hooks", "composables"] },
  { id: "utils", label: "Utilitários", color: "#f59e0b", hint: "Funções de apoio", names: ["utils", "helpers", "util", "common", "shared"] },
  { id: "tests", label: "Testes", color: "#22c55e", hint: "Testes automatizados", names: ["tests", "test", "__tests__", "spec", "e2e"] },
  { id: "assets", label: "Imagens e mídia", color: "#a855f7", hint: "Imagens, fontes, ícones", names: ["assets", "images", "img", "icons", "media", "fonts"] },
  { id: "config", label: "Configuração", color: "#94a3b8", hint: "Ajustes do projeto", names: ["config", "configs", ".vscode", ".github", "scripts"] },
  { id: "database", label: "Banco de dados", color: "#f97316", hint: "Tabelas, migrações", names: ["db", "database", "prisma", "migrations", "supabase", "sql"] },
  { id: "docs", label: "Documentação", color: "#7dd3fc", hint: "Textos e guias", names: ["docs", "doc", "documentation"] },
  { id: "modules", label: "Dependências", color: "#6b7280", hint: "Pacotes instalados", names: ["node_modules", "vendor", "venv", ".venv", "packages"] },
  { id: "generic", label: "Pasta comum", color: "#a1a1aa", hint: "Qualquer outra pasta", names: [] },
];

export function folderKindOf(name?: string, explicit?: string): FolderKindInfo {
  if (explicit) {
    const found = FOLDER_KINDS.find((k) => k.id === explicit);

    if (found) return found;
  }

  const clean = (name ?? "").trim().toLowerCase();

  return FOLDER_KINDS.find((k) => k.names.includes(clean)) ?? FOLDER_KINDS[FOLDER_KINDS.length - 1];
}

export function FolderTypeIcon({
  name,
  kind,
  size = 16,
}: {
  name?: string;
  kind?: string;
  size?: number;
}) {
  const info = folderKindOf(name, kind);

  return <Folder size={size} className="shrink-0" style={{ color: info.color, fill: `${info.color}33` }} aria-label={info.label} />;
}