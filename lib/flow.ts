import type {
  ArrowMode,
  Connection,
  ConnectionShape,
  FlowVersion,
  LineStyle,
  Node,
  NodeChecklistItem,
  NodeHistoryEntry,
  NodePriority,
  NodeStatus,
  Topic,
} from "@/types";
import { keyToDate, toKey } from "@/lib/dates";

/* =========================================================
   CONSTANTES
========================================================= */

export const NODE_STATUSES: { id: NodeStatus; label: string; color: string; hint: string }[] = [
  { id: "todo", label: "Não iniciado", color: "#71717a", hint: "Ainda não começou." },
  { id: "doing", label: "Em andamento", color: "#3b82f6", hint: "Alguém está trabalhando nisso agora." },
  { id: "pending", label: "Pendente", color: "#f59e0b", hint: "Está esperando algo ou alguém." },
  { id: "done", label: "Concluído", color: "#10b981", hint: "Terminou." },
  { id: "problem", label: "Com problema", color: "#ef4444", hint: "Algo deu errado e precisa de atenção." },
  { id: "cancelled", label: "Cancelado", color: "#a1a1aa", hint: "Foi descartado e não será feito." },
];

export const NODE_PRIORITIES: { id: NodePriority; label: string; color: string }[] = [
  { id: "low", label: "Baixa", color: "#10b981" },
  { id: "medium", label: "Média", color: "#3b82f6" },
  { id: "high", label: "Alta", color: "#f97316" },
  { id: "urgent", label: "Urgente", color: "#ef4444" },
];

export const NODE_CATEGORIES: { id: string; label: string; color: string }[] = [
  { id: "idea", label: "Ideia", color: "#eab308" },
  { id: "task", label: "Tarefa", color: "#3b82f6" },
  { id: "research", label: "Pesquisa", color: "#8b5cf6" },
  { id: "study", label: "Estudo", color: "#06b6d4" },
  { id: "doc", label: "Documento", color: "#14b8a6" },
  { id: "meeting", label: "Reunião", color: "#ec4899" },
  { id: "decision", label: "Decisão", color: "#f59e0b" },
  { id: "risk", label: "Risco", color: "#ef4444" },
];

export const NODE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#71717a",
];

export const CONNECTION_COLORS = [
  "#71717a",
  "#6366f1",
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
];

export const LINE_STYLES: { id: LineStyle; label: string }[] = [
  { id: "solid", label: "Contínua" },
  { id: "dashed", label: "Tracejada" },
  { id: "dotted", label: "Pontilhada" },
];

export const ARROW_MODES: { id: ArrowMode; label: string; hint: string }[] = [
  { id: "end", label: "A → B", hint: "Seta em quem recebe" },
  { id: "start", label: "A ← B", hint: "Seta em quem sai" },
  { id: "both", label: "A ↔ B", hint: "Setas nas duas pontas" },
  { id: "none", label: "A — B", hint: "Sem setas" },
];

export const CONNECTION_SHAPES: { id: ConnectionShape; label: string }[] = [
  { id: "curved", label: "Curva" },
  { id: "straight", label: "Reta" },
  { id: "step", label: "Em degraus" },
];

export const BRANCHES = {
  yes: { label: "SIM", color: "#10b981" },
  no: { label: "NÃO", color: "#ef4444" },
} as const;

export const DEFAULT_EDGE_COLOR = "#71717a";

export const MAX_ATTACHMENT_BYTES = 1_500_000;

/* =========================================================
   UTILIDADES
========================================================= */

export const uid = (prefix = "id") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const nowIso = () => new Date().toISOString();

export function getStatus(id?: NodeStatus) {
  return NODE_STATUSES.find((s) => s.id === id) ?? NODE_STATUSES[0];
}

export function getPriority(id?: NodePriority) {
  return NODE_PRIORITIES.find((p) => p.id === id);
}

export function getCategory(id?: string) {
  return NODE_CATEGORIES.find((c) => c.id === id);
}

export function formatDateTime(iso: string) {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(key?: string) {
  if (!key) return "sem data";

  return keyToDate(key).toLocaleDateString("pt-BR");
}

export function formatShortDay(key: string) {
  return keyToDate(key).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatBytes(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function nodeLabel(node: Node): string {
  const title = node.title?.trim();

  if (title) return title;

  switch (node.type) {
    case "main":
      return "Tema principal";
    case "note":
      return "Anotação";
    case "code":
      return "Código";
    case "image":
      return "Imagem";
    case "folder":
      return "Pasta";
    default:
      return "Tópico";
  }
}

export function checklistStats(node: Node) {
  const list = node.checklist ?? [];

  return { done: list.filter((i) => i.completed).length, total: list.length };
}

export function isOverdue(node: Node) {
  const status = node.status ?? "todo";

  return (
    !!node.dueDate &&
    node.dueDate < toKey(new Date()) &&
    status !== "done" &&
    status !== "cancelled"
  );
}

/** texto em minúsculas usado pela busca */
export function nodeSearchText(node: Node): string {
  return [
    node.title,
    node.description,
    node.imageDescription,
    node.code,
    getCategory(node.category)?.label,
    ...(node.comments ?? []).map((c) => c.text),
    ...(node.checklist ?? []).map((c) => c.text),
    ...(node.attachments ?? []).map((a) => a.name),
  ]
    .filter(Boolean)
    .join("\n")
    .toLowerCase();
}

export const connKey = (c: Connection) => c.id ?? `${c.from}>${c.to}`;

/* =========================================================
   GEOMETRIA
========================================================= */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Altura mínima de um bloco de texto para caber título, checklist, chips e botões. */
export function minNodeHeight(n: Node): number {
  const total = n.checklist?.length ?? 0;
  const checklist = total ? 36 + Math.min(total, 4) * 22 + (total > 4 ? 18 : 0) : 0;
  const shortcuts = total > 0 || !!n.comments?.length || !!n.attachments?.length ? 50 : 0;

  /* título + descrição + checklist + chips + atalhos (só quando há conteúdo) */
  return 60 + 56 + checklist + 32 + shortcuts;
}

export function nodeRect(n: Node): Rect {
  const defaultH = n.type === "image" ? 220 : n.type === "code" ? 280 : n.type === "folder" ? 220 : 130;
  const isText = n.type === "main" || n.type === "topic" || n.type === "note";
  const w = n.width || 240;
  const h = n.height || defaultH;

  return {
    x: n.x ?? 0,
    y: n.y ?? 0,
    w: isText ? Math.max(w, 290) : w,
    h: isText ? Math.max(h, minNodeHeight(n)) : h,
  };
}

function anchors(a: Rect, b: Rect) {
  const acx = a.x + a.w / 2;
  const acy = a.y + a.h / 2;
  const bcx = b.x + b.w / 2;
  const bcy = b.y + b.h / 2;
  const dx = bcx - acx;
  const dy = bcy - acy;

  if (Math.abs(dx) * 0.6 >= Math.abs(dy)) {
    const right = dx >= 0;

    return {
      horizontal: true,
      dir: right ? 1 : -1,
      x1: right ? a.x + a.w : a.x,
      y1: acy,
      x2: right ? b.x : b.x + b.w,
      y2: bcy,
    };
  }

  const down = dy >= 0;

  return {
    horizontal: false,
    dir: down ? 1 : -1,
    x1: acx,
    y1: down ? a.y + a.h : a.y,
    x2: bcx,
    y2: down ? b.y : b.y + b.h,
  };
}

export interface Geometry {
  d: string;
  mx: number;
  my: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** direção do percurso (radianos) */
  angle: number;
}

export function connectionGeometry(a: Rect, b: Rect, shape: ConnectionShape = "curved"): Geometry {
  const p = anchors(a, b);
  const mx = (p.x1 + p.x2) / 2;
  const my = (p.y1 + p.y2) / 2;
  const axisAngle = p.horizontal ? (p.dir > 0 ? 0 : Math.PI) : p.dir > 0 ? Math.PI / 2 : -Math.PI / 2;

  if (shape === "straight") {
    return {
      d: `M ${p.x1} ${p.y1} L ${p.x2} ${p.y2}`,
      mx,
      my,
      x1: p.x1,
      y1: p.y1,
      x2: p.x2,
      y2: p.y2,
      angle: Math.atan2(p.y2 - p.y1, p.x2 - p.x1),
    };
  }

  if (shape === "step") {
    const d = p.horizontal
      ? `M ${p.x1} ${p.y1} L ${mx} ${p.y1} L ${mx} ${p.y2} L ${p.x2} ${p.y2}`
      : `M ${p.x1} ${p.y1} L ${p.x1} ${my} L ${p.x2} ${my} L ${p.x2} ${p.y2}`;

    return { d, mx, my, x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, angle: axisAngle };
  }

  const c = Math.max(60, (p.horizontal ? Math.abs(p.x2 - p.x1) : Math.abs(p.y2 - p.y1)) / 2);

  const d = p.horizontal
    ? `M ${p.x1} ${p.y1} C ${p.x1 + p.dir * c} ${p.y1}, ${p.x2 - p.dir * c} ${p.y2}, ${p.x2} ${p.y2}`
    : `M ${p.x1} ${p.y1} C ${p.x1} ${p.y1 + p.dir * c}, ${p.x2} ${p.y2 - p.dir * c}, ${p.x2} ${p.y2}`;

  return { d, mx, my, x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, angle: axisAngle };
}

/** cor, espessura e texto efetivos de uma conexão (considera SIM/NÃO) */
export function connectionLook(c: Connection) {
  const branch = c.branch ? BRANCHES[c.branch] : undefined;

  return {
    color: c.color ?? branch?.color ?? DEFAULT_EDGE_COLOR,
    width: c.width ?? 2,
    style: c.style ?? "solid",
    arrow: c.arrow ?? "end",
    shape: c.shape ?? "curved",
    label: c.label ?? branch?.label ?? "",
  };
}

export function dashFor(style: LineStyle, width: number): string | undefined {
  if (style === "dashed") return `${width * 4} ${width * 3}`;
  if (style === "dotted") return `${width} ${width * 2.5}`;

  return undefined;
}

/* =========================================================
   HISTÓRICO DO BLOCO
========================================================= */

export function describeNodeChanges(before: Node, after: Node): NodeHistoryEntry[] {
  const out: NodeHistoryEntry[] = [];
  const add = (text: string) => out.push({ id: uid("h"), at: nowIso(), text });

  if ((before.title ?? "") !== (after.title ?? "")) {
    add(`Título alterado: "${before.title || "sem título"}" → "${after.title || "sem título"}".`);
  }

  if (
    (before.description ?? "") !== (after.description ?? "") ||
    (before.imageDescription ?? "") !== (after.imageDescription ?? "")
  ) {
    add("Descrição alterada.");
  }

  const bs = before.status ?? "todo";
  const as = after.status ?? "todo";

  if (bs !== as) add(`Status: ${getStatus(bs).label} → ${getStatus(as).label}.`);

  if ((before.priority ?? "") !== (after.priority ?? "")) {
    add(
      `Prioridade: ${getPriority(before.priority)?.label ?? "nenhuma"} → ${
        getPriority(after.priority)?.label ?? "nenhuma"
      }.`
    );
  }

  if ((before.category ?? "") !== (after.category ?? "")) {
    add(
      `Categoria: ${getCategory(before.category)?.label ?? "nenhuma"} → ${
        getCategory(after.category)?.label ?? "nenhuma"
      }.`
    );
  }

  if ((before.color ?? "") !== (after.color ?? "")) add("Cor alterada.");

  if ((before.startDate ?? "") !== (after.startDate ?? "")) {
    add(`Início: ${formatDay(before.startDate)} → ${formatDay(after.startDate)}.`);
  }

  if ((before.dueDate ?? "") !== (after.dueDate ?? "")) {
    add(`Prazo: ${formatDay(before.dueDate)} → ${formatDay(after.dueDate)}.`);
  }

  const oldList = new Map((before.checklist ?? []).map((i) => [i.id, i]));
  const newList = new Map((after.checklist ?? []).map((i) => [i.id, i]));

  for (const item of newList.values()) {
    const old = oldList.get(item.id);

    if (!old) add(`Checklist: item adicionado — "${item.text}".`);
    else if (old.completed !== item.completed) {
      add(`Checklist: "${item.text}" ${item.completed ? "concluído" : "reaberto"}.`);
    }
  }

  for (const item of oldList.values()) {
    if (!newList.has(item.id)) add(`Checklist: item removido — "${item.text}".`);
  }

  const oldFiles = new Map((before.attachments ?? []).map((a) => [a.id, a]));
  const newFiles = new Map((after.attachments ?? []).map((a) => [a.id, a]));

  for (const file of newFiles.values()) {
    if (!oldFiles.has(file.id)) add(`Anexo adicionado: ${file.name}.`);
  }

  for (const file of oldFiles.values()) {
    if (!newFiles.has(file.id)) add(`Anexo removido: ${file.name}.`);
  }

  const oldComments = new Set((before.comments ?? []).map((c) => c.id));

  for (const comment of after.comments ?? []) {
    if (!oldComments.has(comment.id)) add("Comentário adicionado.");
  }

  return out;
}

/* =========================================================
   DUPLICAR
========================================================= */

export function cloneNodes(
  source: Node[],
  connections: Connection[],
  offset: { x: number; y: number },
  options: { keepHistory?: boolean; demoteMain?: boolean } = {}
) {
  const idMap = new Map<string, string>();

  const nodes: Node[] = source.map((n) => {
    const id = uid(n.type === "code" ? "code" : n.type === "image" ? "image" : "node");

    idMap.set(n.id, id);

    return {
      ...n,
      id,
      x: n.x + offset.x,
      y: n.y + offset.y,
      type: options.demoteMain && n.type === "main" ? "topic" : n.type,
      checklist: n.checklist?.map((c) => ({ ...c, id: uid("ck") })),
      comments: n.comments?.map((c) => ({ ...c, id: uid("cm") })),
      attachments: n.attachments?.map((a) => ({ ...a, id: uid("at") })),
      history: options.keepHistory
        ? n.history
        : [{ id: uid("h"), at: nowIso(), text: "Bloco duplicado." }],
    };
  });

  const copies: Connection[] = connections
    .filter((c) => idMap.has(c.from) && idMap.has(c.to))
    .map((c) => ({
      ...c,
      id: uid("conn"),
      from: idMap.get(c.from) as string,
      to: idMap.get(c.to) as string,
    }));

  return { nodes, connections: copies, idMap };
}

/* =========================================================
   VERSÕES
========================================================= */

export const MAX_VERSIONS = 12;

export function makeVersion(topic: Topic, name: string, auto = false): FlowVersion {
  return {
    id: uid("ver"),
    name,
    at: nowIso(),
    auto,
    nodes: topic.nodes,
    connections: topic.connections,
  };
}

/** Coloca a versão no topo e, passando do limite, descarta as automáticas mais antigas primeiro. */
export function pushVersion(versions: FlowVersion[] | undefined, version: FlowVersion): FlowVersion[] {
  const list = [version, ...(versions ?? [])];

  while (list.length > MAX_VERSIONS) {
    let index = -1;

    for (let i = list.length - 1; i >= 1; i--) {
      if (list[i].auto) {
        index = i;
        break;
      }
    }

    if (index < 0) index = list.length - 1;

    list.splice(index, 1);
  }

  return list;
}

/** Completa fluxogramas salvos por versões antigas do app. */
export function normalizeTopic(topic: Topic): Topic {
  return {
    ...topic,
    nodes: Array.isArray(topic.nodes)
      ? topic.nodes.map((n) => ((n.type as string) === "decision" ? { ...n, type: "topic" as const } : n))
      : [],
    connections: Array.isArray(topic.connections)
      ? topic.connections.filter((c) => c && c.from && c.to)
      : [],
    versions: Array.isArray(topic.versions) ? topic.versions : undefined,
  };
}

export function duplicateTopic(topic: Topic, newId: string): Topic {
  const { nodes, connections } = cloneNodes(topic.nodes, topic.connections, { x: 0, y: 0 }, { keepHistory: true });

  return {
    ...topic,
    id: newId,
    name: `${topic.name} (cópia)`,
    nodes,
    connections,
    versions: undefined,
  };
}

/* =========================================================
   MODELOS PRONTOS
========================================================= */

type TplNode = Partial<Node> & { key: string; title: string; x: number; y: number; fromName?: boolean };
type TplConn = [string, string, Partial<Connection>?];

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  /** o que a pessoa aprende ou resolve com o modelo */
  tip: string;
  nodes: number;
}

const YES = { branch: "yes" as const, label: "SIM", color: BRANCHES.yes.color };
const NO = { branch: "no" as const, label: "NÃO", color: BRANCHES.no.color };

const ck = (...texts: string[]): NodeChecklistItem[] =>
  texts.map((text) => ({ id: uid("ck"), text, completed: false }));

const MAIN = { type: "main" as const, width: 280, height: 150, color: "#6366f1" };

function spec(id: string): { nodes: TplNode[]; conns: TplConn[] } {
  switch (id) {
    case "payment":
      return {
        nodes: [
          { key: "start", ...MAIN, title: "Cliente finaliza a compra", description: "Ponto de partida do fluxo.", x: 0, y: 200, status: "done" },
          { key: "dec", title: "Pagamento aprovado?", description: "Confira a resposta do banco ou da operadora.", x: 400, y: 190, width: 280, height: 190, color: "#f59e0b" },
          { key: "yes", title: "Separar e enviar o pedido", description: "Gerar nota fiscal e código de rastreio.", x: 820, y: 20, color: "#10b981", status: "doing", priority: "high" },
          { key: "no", title: "Avisar o cliente", description: "Explicar o motivo e oferecer outra forma de pagamento.", x: 820, y: 380, color: "#ef4444", status: "pending" },
          { key: "end", title: "Pedido concluído", description: "Entregue e finalizado.", x: 1240, y: 20, color: "#10b981" },
        ],
        conns: [
          ["start", "dec"],
          ["dec", "yes", YES],
          ["dec", "no", NO],
          ["yes", "end"],
          ["no", "start", { style: "dashed", label: "Tenta outro método", color: "#a1a1aa" }],
        ],
      };

    case "approval":
      return {
        nodes: [
          { key: "req", ...MAIN, title: "Solicitação enviada", description: "Quem pede descreve o que precisa.", x: 0, y: 200 },
          { key: "dec", title: "Gestor aprova?", description: "Analisa custo, prazo e necessidade.", x: 400, y: 190, width: 280, height: 190, color: "#f59e0b" },
          { key: "run", title: "Executar", description: "Realizar o que foi aprovado.", x: 820, y: 20, color: "#10b981" },
          { key: "fix", title: "Ajustar o pedido", description: "Corrigir conforme o retorno do gestor.", x: 820, y: 380, color: "#ef4444" },
          { key: "end", title: "Concluído", description: "Registrar e avisar o solicitante.", x: 1240, y: 20, color: "#10b981" },
        ],
        conns: [
          ["req", "dec"],
          ["dec", "run", YES],
          ["dec", "fix", NO],
          ["run", "end"],
          ["fix", "req", { style: "dashed", label: "Reenviar", color: "#a1a1aa" }],
        ],
      };

    case "bug":
      return {
        nodes: [
          { key: "bug", ...MAIN, title: "Problema encontrado", description: "Descreva o que acontece e o que deveria acontecer.", x: 0, y: 200, status: "problem", color: "#ef4444" },
          { key: "dec", title: "Consegue reproduzir?", description: "Tente de novo, passo a passo.", x: 400, y: 190, width: 280, height: 190, color: "#f59e0b" },
          { key: "info", title: "Pedir mais informações", description: "Prints, versão, passos para repetir.", x: 820, y: 400, status: "pending" },
          { key: "inv", title: "Investigar a causa", description: "Ler logs, depurar, achar o ponto exato.", x: 820, y: 20, status: "doing" },
          { key: "fix", title: "Corrigir", description: "Aplicar a correção.", x: 1240, y: 20 },
          { key: "test", title: "Testar a correção", description: "Confirmar que o problema sumiu.", x: 1660, y: 20, checklist: ck("Teste manual", "Teste em outro navegador") },
        ],
        conns: [
          ["bug", "dec"],
          ["dec", "inv", YES],
          ["dec", "info", NO],
          ["inv", "fix"],
          ["fix", "test"],
          ["info", "dec", { style: "dashed", label: "Tentar de novo", color: "#a1a1aa" }],
        ],
      };

    case "study":
      return {
        nodes: [
          { key: "main", ...MAIN, title: "Tema de estudo", description: "Escreva o assunto principal.", x: 0, y: 200, fromName: true },
          { key: "c", title: "Conceitos", description: "O que preciso entender.", x: 400, y: 20, category: "study", checklist: ck("Ler o material", "Fazer resumo", "Anotar dúvidas") },
          { key: "e", title: "Exercícios", description: "Praticar o que aprendi.", x: 400, y: 400, category: "task", checklist: ck("Lista 1", "Lista 2") },
          { key: "r", title: "Revisão", description: "Rever antes da prova.", x: 820, y: 200, category: "study", priority: "high", checklist: ck("Rever resumo", "Refazer erros") },
        ],
        conns: [
          ["main", "c"],
          ["main", "e"],
          ["c", "r"],
          ["e", "r"],
        ],
      };

    case "project":
      return {
        nodes: [
          { key: "main", ...MAIN, title: "Meu projeto", description: "Objetivo em uma frase.", x: 0, y: 200, fromName: true },
          { key: "plan", title: "Planejar", description: "Definir escopo e prazos.", x: 400, y: 200, status: "done", category: "task" },
          { key: "dev", title: "Desenvolver", description: "Construir as partes principais.", x: 820, y: 200, status: "doing", priority: "high", category: "task" },
          { key: "test", title: "Testar", description: "Procurar erros antes de entregar.", x: 1240, y: 200, category: "task" },
          { key: "ship", title: "Entregar", description: "Publicar e avisar todos.", x: 1660, y: 200, category: "task" },
        ],
        conns: [
          ["main", "plan"],
          ["plan", "dev"],
          ["dev", "test"],
          ["test", "ship"],
        ],
      };

    default:
      return {
        nodes: [{ key: "main", ...MAIN, title: "Tema principal", description: "Comece por aqui.", x: 0, y: 0, fromName: true }],
        conns: [],
      };
  }
}

export const FLOW_TEMPLATES: FlowTemplate[] = [
  { id: "blank", name: "Em branco", description: "Só o bloco principal. Monte tudo do seu jeito.", tip: "Ideal para quem já sabe o que quer desenhar.", nodes: 1 },
  { id: "payment", name: "Pagamento aprovado?", description: "Uma pergunta de sim ou não com dois caminhos.", tip: "Mostra como usar SIM e NÃO nas conexões.", nodes: 5 },
  { id: "approval", name: "Fluxo de aprovação", description: "Pedido, análise do gestor, execução ou ajuste.", tip: "Bom para processos com aprovação.", nodes: 5 },
  { id: "bug", name: "Resolver um problema", description: "Reproduzir, investigar, corrigir e testar.", tip: "Ótimo para bugs e incidentes.", nodes: 6 },
  { id: "study", name: "Plano de estudos", description: "Conceitos, exercícios e revisão com checklists.", tip: "Use para provas e cursos.", nodes: 4 },
  { id: "project", name: "Planejamento de projeto", description: "Planejar, desenvolver, testar e entregar.", tip: "Mostra os status de cada etapa.", nodes: 5 },
];

export function buildTemplate(
  id: string,
  origin: { x: number; y: number },
  name?: string
): { nodes: Node[]; connections: Connection[] } {
  const { nodes: raw, conns } = spec(id);
  const ids = new Map<string, string>();

  const nodes = raw.map(({ key, fromName, ...rest }) => {
    const nodeId = uid("node");

    ids.set(key, nodeId);

    return {
      description: "",
      type: "topic",
      width: 280,
      height: 190,
      status: "todo",
      ...rest,
      title: fromName && name ? name : rest.title,
      id: nodeId,
      x: rest.x + origin.x,
      y: rest.y + origin.y,
      history: [{ id: uid("h"), at: nowIso(), text: "Criado a partir de um modelo." }],
    } as Node;
  });

  const connections: Connection[] = conns.map(([a, b, extra]) => ({
    id: uid("conn"),
    from: ids.get(a) as string,
    to: ids.get(b) as string,
    ...extra,
  }));

  return { nodes, connections };
}