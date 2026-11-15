import { OutlineNode, PlanStatus } from "@/lib/planning";

/* =========================================================
   LISTA COLADA -> TÓPICOS E SUBTÓPICOS

   Regras (a pessoa não precisa decorar, a janela mostra uma prévia):
   - cada linha vira um item;
   - recuo (espaços ou Tab) cria subníveis;
   - "1.", "-", "•", "☐" no começo da linha são ignorados (a numeração é automática);
   - tabelas com colunas STATUS / ITEM / ACOMPANHAMENTO (copiadas do Word ou Docs)
     viram tarefas dentro do último título: o status vem da primeira coluna.
========================================================= */

const STATUS_PATTERNS: [RegExp, PlanStatus][] = [
  [/conclu[ií]d|\bfeito\b|\bdone\b|☑|✔|✅|\[x\]/i, "done"],
  [/andamento|fazendo|\bdoing\b/i, "doing"],
  [/cancel/i, "cancelled"],
  [/pendente|aguardando/i, "pending"],
  [/a fazer|n[aã]o iniciad|\btodo\b|☐|\[ \]/i, "todo"],
];

function statusOf(text: string): PlanStatus | undefined {
  for (const [pattern, status] of STATUS_PATTERNS) {
    if (pattern.test(text)) return status;
  }

  return undefined;
}

const MAX_TITLE = 300;

const clip = (text: string) => text.trim().slice(0, MAX_TITLE);

/** Tira marcadores do começo: "- ", "• ", "1. ", "2.1) " */
function stripMarkers(text: string) {
  return text
    .trim()
    .replace(/^[-*•–—]\s+/, "")
    .replace(/^\d+(\.\d+)*[.)]\s+/, "")
    .trim();
}

const CHECKBOX_LINE =
  /^\s*(☐|☑|✔|✅|\[ \]|\[x\])\s*(a fazer|conclu[ií]do|em andamento|pendente|cancelado)?\s*[:\-–—]?\s*(.+)$/i;

export function parseOutline(text: string): OutlineNode[] {
  const roots: OutlineNode[] = [];
  const stack: { indent: number; node: OutlineNode }[] = [];
  /** último título comum: as linhas de tabela entram dentro dele */
  let lastPlain: OutlineNode | null = null;

  const attach = (node: OutlineNode, parent: OutlineNode | null) => {
    if (parent) parent.children.push(node);
    else roots.push(node);
  };

  for (const raw of text.replace(/\r/g, "").split("\n")) {
    if (!raw.trim()) continue;

    const cells = raw.split("\t").map((cell) => cell.trim());

    /* cabeçalho de tabela: STATUS | ITEM / CRITÉRIO | ACOMPANHAMENTO */
    if (cells.length >= 2 && /^status$/i.test(cells[0])) continue;

    /* linha de tabela: a primeira coluna é o status */
    if (cells.length >= 2 && cells[0].length <= 24 && statusOf(cells[0]) && cells[1]) {
      const extra = cells.slice(2).find((cell) => cell && !/^(pendente|a fazer|—|-)$/i.test(cell));

      attach(
        {
          title: clip(cells[1]),
          status: statusOf(cells[0]),
          notes: extra,
          children: [],
        },
        lastPlain
      );

      continue;
    }

    /* "☐ Fazer isso" ou "☑ CONCLUÍDO: isso" (sem Tab) */
    const checkbox = raw.match(CHECKBOX_LINE);

    if (checkbox) {
      attach(
        {
          title: clip(checkbox[3]),
          status: statusOf(`${checkbox[1]} ${checkbox[2] ?? ""}`),
          children: [],
        },
        lastPlain
      );

      continue;
    }

    /* linha comum: o recuo define o nível */
    const lead = raw.match(/^[ \t]*/)?.[0] ?? "";
    const isBullet = /^[ \t]*[-*•–—]\s+/.test(raw);
    /* "- item" logo abaixo de um título, sem recuo, entra dentro dele */
    const indent = lead.replace(/\t/g, "  ").length + (isBullet ? 1 : 0);
    const title = clip(stripMarkers(raw));

    if (!title) continue;

    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();

    const node: OutlineNode = { title, children: [] };

    attach(node, stack.length ? stack[stack.length - 1].node : null);
    stack.push({ indent, node });

    /* tabelas e ☐ entram no último título, não no último marcador */
    if (!isBullet) lastPlain = node;
  }

  return roots;
}

export function countOutline(nodes: OutlineNode[]): { topics: number; items: number } {
  let items = 0;

  const walk = (list: OutlineNode[]) => {
    for (const node of list) {
      items += 1;
      walk(node.children);
    }
  };

  walk(nodes);

  return { topics: nodes.length, items };
}0