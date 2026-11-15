"use client";

import { useCallback, useEffect, useState } from "react";

import { keyToDate } from "@/lib/dates";
import { PALETTE } from "@/lib/pipeline";

/* =========================================================
   PLANEJAMENTO (aba para acompanhar a evolução do YourMind)

   Cada item pode ter outros itens dentro (título > subtítulo > tarefa),
   sem limite de níveis. Todo item tem status, prioridade, datas,
   checklist, observações e um histórico de alterações automático.

   Por enquanto os dados ficam no navegador (localStorage), mas todo o
   acesso passa por usePlanning(): na hora de ligar o banco de dados,
   só este arquivo precisa mudar.
========================================================= */

export type PlanStatus = "todo" | "doing" | "pending" | "done" | "cancelled";
export type PlanPriority = "low" | "medium" | "high" | "urgent";

export const PLAN_STATUSES: { id: PlanStatus; label: string; color: string }[] = [
  { id: "todo", label: "Não iniciado", color: "#71717a" },
  { id: "doing", label: "Em andamento", color: "#3b82f6" },
  { id: "pending", label: "Pendente", color: "#f59e0b" },
  { id: "done", label: "Concluído", color: "#10b981" },
  { id: "cancelled", label: "Cancelado", color: "#a1a1aa" },
];

export const PLAN_PRIORITIES: { id: PlanPriority; label: string; color: string }[] = [
  { id: "low", label: "Baixa", color: "#10b981" },
  { id: "medium", label: "Média", color: "#3b82f6" },
  { id: "high", label: "Alta", color: "#f97316" },
  { id: "urgent", label: "Urgente", color: "#ef4444" },
];

export function getPlanStatus(id: PlanStatus) {
  return PLAN_STATUSES.find((item) => item.id === id) ?? PLAN_STATUSES[0];
}

export function getPlanPriority(id: PlanPriority) {
  return PLAN_PRIORITIES.find((item) => item.id === id) ?? PLAN_PRIORITIES[1];
}

export interface PlanChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export type PlanHistoryKind =
  | "created"
  | "edited"
  | "status"
  | "priority"
  | "dates"
  | "checklist"
  | "subitem"
  | "completed"
  | "reopened"
  | "archived"
  | "moved"
  | "note";

export interface PlanHistoryEntry {
  id: string;
  /** ISO */
  at: string;
  kind: PlanHistoryKind;
  text: string;
  /** true quando foi escrita à mão (observação) */
  manual?: boolean;
}

export interface PlanItem {
  id: string;
  projectId: string;
  parentId: string | null;
  /** posição entre os itens do mesmo nível */
  order: number;
  title: string;
  description: string;
  status: PlanStatus;
  priority: PlanPriority;
  /** cor da bolinha em hexadecimal (vazio = cor do status) */
  color: string;
  /** ISO */
  createdAt: string;
  /** YYYY-MM-DD ou vazio */
  startDate: string;
  /** YYYY-MM-DD ou vazio */
  dueDate: string;
  /** ISO ou vazio */
  completedAt: string;
  checklist: PlanChecklistItem[];
  archived: boolean;
  collapsed: boolean;
  history: PlanHistoryEntry[];
}

/** Pasta que agrupa planejamentos (mesmas cores das pastas dos Fluxogramas) */
export interface PlanFolder {
  id: string;
  name: string;
  /** nome da cor: "red", "blue"... (ver FOLDER_COLORS em nav.ts) */
  color: string;
}

/** Como os tópicos de um planejamento recebem cor */
export type PlanColorMode = "accent" | "fixed" | "random" | "manual";

export const PLAN_COLOR_MODES: { id: PlanColorMode; label: string; text: string }[] = [
  { id: "accent", label: "Cor das configurações", text: "Todos os tópicos usam a cor de destaque do app." },
  { id: "fixed", label: "Uma cor para todos", text: "Você escolhe uma cor e ela vale para todos os tópicos." },
  { id: "random", label: "Uma cor para cada tópico", text: "Cada tópico recebe uma cor diferente, automaticamente." },
  { id: "manual", label: "Eu escolho", text: "Os tópicos ficam neutros até você escolher a cor de cada um." },
];

export const DEFAULT_FIXED_COLOR = "#6366f1";

/** Um planejamento: tem a sua própria árvore de atividades */
export interface PlanProject {
  id: string;
  name: string;
  /** pasta onde está guardado (null = sem pasta) */
  folderId: string | null;
  /** como os tópicos recebem cor */
  colorMode: PlanColorMode;
  /** cor usada quando colorMode = "fixed" */
  fixedColor: string;
  createdAt: string;
}

/** Item de uma lista colada ou digitada, antes de virar atividade */
export interface OutlineNode {
  title: string;
  status?: PlanStatus;
  notes?: string;
  color?: string;
  children: OutlineNode[];
}

/** Onde soltar um item arrastado em relação ao item de destino */
export type DropPosition = "before" | "after" | "inside";

export interface PlanProjectOptions {
  colorMode?: PlanColorMode;
  fixedColor?: string;
}

interface PlanData {
  folders: PlanFolder[];
  projects: PlanProject[];
  items: PlanItem[];
}

/** Campos que a pessoa pode editar (o resto é automático) */
export type PlanItemPatch = Partial<
  Pick<
    PlanItem,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "color"
    | "startDate"
    | "dueDate"
    | "checklist"
  >
>;

/* ---------- utilidades ---------- */

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);

const nowIso = () => new Date().toISOString();

export function makeEntry(
  kind: PlanHistoryKind,
  text: string,
  manual = false
): PlanHistoryEntry {
  return { id: uid(), at: nowIso(), kind, text, manual };
}

export function newItem(
  projectId: string,
  parentId: string | null,
  order: number,
  title: string,
  historyText = "Atividade cadastrada no planejamento."
): PlanItem {
  return {
    id: uid(),
    projectId,
    parentId,
    order,
    title,
    description: "",
    status: "todo",
    priority: "medium",
    color: "",
    createdAt: nowIso(),
    startDate: "",
    dueDate: "",
    completedAt: "",
    checklist: [],
    archived: false,
    collapsed: false,
    history: [makeEntry("created", historyText)],
  };
}

export function formatDateTime(iso: string) {
  if (!iso) return "";

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

function formatDay(key: string) {
  return key ? keyToDate(key).toLocaleDateString("pt-BR") : "sem data";
}

/* ---------- árvore e progresso ---------- */

/** Itens do projeto agrupados por pai, em ordem. Arquivados só entram se pedido. */
export function buildChildMap(
  items: PlanItem[],
  projectId: string,
  includeArchived: boolean
): Map<string | null, PlanItem[]> {
  const grouped = new Map<string | null, PlanItem[]>();

  for (const item of items) {
    if (item.projectId !== projectId) continue;

    const list = grouped.get(item.parentId) ?? [];

    list.push(item);
    grouped.set(item.parentId, list);
  }

  for (const list of grouped.values()) list.sort((a, b) => a.order - b.order);

  if (includeArchived) return grouped;

  /* sem arquivados: some o item arquivado e tudo que está dentro dele */
  const result = new Map<string | null, PlanItem[]>();

  const walk = (parentId: string | null) => {
    const kept = (grouped.get(parentId) ?? []).filter((item) => !item.archived);

    if (kept.length) result.set(parentId, kept);

    for (const item of kept) walk(item.id);
  };

  walk(null);

  return result;
}

/** Todos os itens alcançáveis a partir da raiz de um mapa de filhos. */
export function flattenTree(map: Map<string | null, PlanItem[]>): PlanItem[] {
  const out: PlanItem[] = [];

  const walk = (parentId: string | null) => {
    for (const item of map.get(parentId) ?? []) {
      out.push(item);
      walk(item.id);
    }
  };

  walk(null);

  return out;
}

export interface Progress {
  /** soma das frações concluídas */
  sum: number;
  /** quantidade de unidades contadas */
  count: number;
}

/**
 * Progresso de um item:
 *  - tarefa sem filhos: checklist (feitos/total) ou 100% se concluída
 *  - item com filhos: média das tarefas de dentro (e do checklist próprio, se houver)
 *  - cancelados não contam
 */
export function calcProgress(
  map: Map<string | null, PlanItem[]>,
  item: PlanItem
): Progress {
  if (item.status === "cancelled") return { sum: 0, count: 0 };

  const children = map.get(item.id) ?? [];
  const checklistTotal = item.checklist.length;
  const checklistDone = item.checklist.filter((entry) => entry.done).length;

  if (!children.length) {
    if (checklistTotal) return { sum: checklistDone / checklistTotal, count: 1 };

    return { sum: item.status === "done" ? 1 : 0, count: 1 };
  }

  let sum = 0;
  let count = 0;

  for (const child of children) {
    const part = calcProgress(map, child);

    sum += part.sum;
    count += part.count;
  }

  if (checklistTotal) {
    sum += checklistDone / checklistTotal;
    count += 1;
  }

  return { sum, count };
}

export function toPercent(progress: Progress) {
  return progress.count ? Math.round((progress.sum / progress.count) * 100) : 0;
}

/** "1. Estrutura" -> "Estrutura" (a numeração agora é automática; só para exibir) */
export function cleanTitle(title: string) {
  const cleaned = title.replace(/^\d+(\.\d+)*[.)]\s+/, "").trim();

  return cleaned || title;
}

/** Quantas atividades (tarefas finais) um item tem e quantas estão concluídas. */
export function leafStats(
  map: Map<string | null, PlanItem[]>,
  item: PlanItem
): { total: number; done: number } {
  if (item.status === "cancelled") return { total: 0, done: 0 };

  const children = map.get(item.id) ?? [];

  if (!children.length) return { total: 1, done: item.status === "done" ? 1 : 0 };

  let total = 0;
  let done = 0;

  for (const child of children) {
    const part = leafStats(map, child);

    total += part.total;
    done += part.done;
  }

  return { total, done };
}

/** Cores sem o cinza (primeira da paleta), usadas no modo "uma cor para cada tópico". */
const TOPIC_COLORS = PALETTE.slice(1);

/**
 * Cor de cada item: a que a pessoa escolheu; senão a do tópico pai;
 * senão a do modo do planejamento (configurações, fixa, uma por tópico ou neutra).
 */
export function makeColorResolver(items: PlanItem[], project: PlanProject, accent: string) {
  const own = items.filter((item) => item.projectId === project.id);
  const byId = new Map(own.map((item) => [item.id, item]));

  const rootIndex = new Map(
    own
      .filter((item) => item.parentId === null)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((item, index) => [item.id, index])
  );

  const cache = new Map<string, string>();

  const modeColor = (root: PlanItem) => {
    switch (project.colorMode) {
      case "fixed":
        return project.fixedColor || accent;
      case "random":
        return TOPIC_COLORS[(rootIndex.get(root.id) ?? 0) % TOPIC_COLORS.length];
      case "manual":
        return "#71717a";
      default:
        return accent;
    }
  };

  const resolve = (item: PlanItem): string => {
    const hit = cache.get(item.id);

    if (hit) return hit;

    const parent = item.parentId ? byId.get(item.parentId) : undefined;
    const color = item.color || (parent ? resolve(parent) : modeColor(item));

    cache.set(item.id, color);

    return color;
  };

  return resolve;
}

/**
 * Cor do cartão de um planejamento na lista: segue o modo de cor dele
 * (configurações, fixa ou uma por planejamento). No modo "eu escolho" usa a de destaque.
 */
export function projectColor(project: PlanProject, accent: string, allProjects: PlanProject[]) {
  switch (project.colorMode) {
    case "fixed":
      return project.fixedColor || accent;
    case "random": {
      const order = [...allProjects].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const index = Math.max(0, order.findIndex((p) => p.id === project.id));

      return TOPIC_COLORS[index % TOPIC_COLORS.length];
    }
    default:
      return accent;
  }
}

/** Números de um planejamento para os cartões da lista. */
export function summarizeProject(items: PlanItem[], projectId: string) {
  const map = buildChildMap(items, projectId, false);
  const leaves = flattenTree(map).filter(
    (item) => !(map.get(item.id)?.length) && item.status !== "cancelled"
  );

  let sum = 0;
  let count = 0;

  for (const root of map.get(null) ?? []) {
    const part = calcProgress(map, root);

    sum += part.sum;
    count += part.count;
  }

  return {
    total: leaves.length,
    done: leaves.filter((item) => item.status === "done").length,
    percent: toPercent({ sum, count }),
  };
}

/* ---------- histórico automático ---------- */

function describeChanges(before: PlanItem, after: PlanItem): PlanHistoryEntry[] {
  const entries: PlanHistoryEntry[] = [];

  if (before.title !== after.title) {
    entries.push(
      makeEntry("edited", `Título alterado: "${before.title}" → "${after.title}".`)
    );
  }

  if (before.description !== after.description) {
    entries.push(makeEntry("edited", "Descrição alterada."));
  }

  if (before.status !== after.status) {
    entries.push(
      makeEntry(
        "status",
        `Status alterado: ${getPlanStatus(before.status).label} → ${getPlanStatus(after.status).label}.`
      )
    );

    if (after.status === "done") {
      entries.push(makeEntry("completed", "Atividade concluída."));
    } else if (before.status === "done") {
      entries.push(makeEntry("reopened", "Atividade reaberta."));
    }
  }

  if (before.priority !== after.priority) {
    entries.push(
      makeEntry(
        "priority",
        `Prioridade alterada: ${getPlanPriority(before.priority).label} → ${getPlanPriority(after.priority).label}.`
      )
    );
  }

  if (before.color !== after.color) {
    entries.push(makeEntry("edited", "Cor alterada."));
  }

  if (before.startDate !== after.startDate) {
    entries.push(
      makeEntry(
        "dates",
        `Data de início alterada: ${formatDay(before.startDate)} → ${formatDay(after.startDate)}.`
      )
    );
  }

  if (before.dueDate !== after.dueDate) {
    entries.push(
      makeEntry(
        "dates",
        `Prazo alterado: ${formatDay(before.dueDate)} → ${formatDay(after.dueDate)}.`
      )
    );
  }

  const beforeById = new Map(before.checklist.map((entry) => [entry.id, entry]));
  const afterById = new Map(after.checklist.map((entry) => [entry.id, entry]));

  for (const entry of after.checklist) {
    const old = beforeById.get(entry.id);

    if (!old) {
      entries.push(makeEntry("checklist", `Checklist: item adicionado — "${entry.text}".`));
    } else if (old.done !== entry.done) {
      entries.push(
        makeEntry(
          "checklist",
          `Checklist: "${entry.text}" ${entry.done ? "concluído" : "reaberto"}.`
        )
      );
    }
  }

  for (const entry of before.checklist) {
    if (!afterById.has(entry.id)) {
      entries.push(makeEntry("checklist", `Checklist: item removido — "${entry.text}".`));
    }
  }

  return entries;
}

/** Compara nomes de tópicos ignorando numeração, acento e o que vem depois ("— segundo cérebro"). */
export function sameTopic(a: string, b: string) {
  const norm = (text: string) =>
    cleanTitle(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();

  const x = norm(a);
  const y = norm(b);

  if (!x || !y) return false;
  if (x === y) return true;

  const short = x.length <= y.length ? x : y;
  const long = x.length <= y.length ? y : x;

  return short.length >= 6 && long.startsWith(short) && !/[a-z0-9]/.test(long[short.length] ?? "a");
}

/* ---------- ordem dos itens ---------- */

function siblingsOf(items: PlanItem[], projectId: string, parentId: string | null) {
  return items
    .filter((item) => item.projectId === projectId && item.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

/** Deixa a ordem dos irmãos como 0, 1, 2... (sem buracos nem repetidos). */
function reindex(items: PlanItem[], projectId: string, parentId: string | null) {
  const position = new Map(
    siblingsOf(items, projectId, parentId).map((item, index) => [item.id, index])
  );

  return items.map((item) =>
    position.has(item.id) ? { ...item, order: position.get(item.id) ?? item.order } : item
  );
}

function descendantIds(items: PlanItem[], id: string): string[] {
  const out: string[] = [];
  const stack = [id];

  while (stack.length) {
    const current = stack.pop();

    for (const item of items) {
      if (item.parentId === current) {
        out.push(item.id);
        stack.push(item.id);
      }
    }
  }

  return out;
}

function appendHistory(items: PlanItem[], id: string, entry: PlanHistoryEntry) {
  return items.map((item) =>
    item.id === id ? { ...item, history: [...item.history, entry] } : item
  );
}

/* ---------- dados e gravação ---------- */

const STORAGE_KEY = "yourmind:planning:v1";

/** Começa totalmente em branco: nenhuma pasta e nenhum planejamento. */
function createInitial(): PlanData {
  return { folders: [], projects: [], items: [] };
}

/** Lê o que está salvo e completa campos que versões antigas não tinham. */
function normalize(value: unknown): PlanData | null {
  if (!value || typeof value !== "object") return null;

  const data = value as Partial<PlanData>;

  if (!Array.isArray(data.projects) || !Array.isArray(data.items)) return null;

  return {
    folders: Array.isArray(data.folders) ? data.folders : [],
    projects: data.projects.map((project) => ({
      ...project,
      folderId: project.folderId ?? null,
      colorMode: PLAN_COLOR_MODES.some((mode) => mode.id === project.colorMode)
        ? project.colorMode
        : "accent",
      fixedColor: project.fixedColor || DEFAULT_FIXED_COLOR,
    })),
    items: data.items.map((item) => {
      /* versões antigas tinham "Observações" separado: junta na descrição, sem perder nada */
      const { notes, ...rest } = item as PlanItem & { notes?: string };
      const description = [rest.description, (notes ?? "").trim()].filter(Boolean).join("\n\n");

      return { ...rest, description, color: rest.color ?? "" };
    }),
  };
}

export function usePlanning() {
  const [data, setData] = useState<PlanData>(createInitial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const parsed = normalize(JSON.parse(raw));

        if (parsed) setData(parsed);
      }
    } catch {
      /* começa vazio */
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* ignora */
    }
  }, [data, loaded]);

  /* ---------- pastas ---------- */

  const addFolder = useCallback((name: string, color: string) => {
    const folder: PlanFolder = { id: uid(), name: name.trim() || "Nova pasta", color };

    setData((d) => ({ ...d, folders: [...d.folders, folder] }));

    return folder.id;
  }, []);

  const updateFolder = useCallback((id: string, name: string, color: string) => {
    setData((d) => ({
      ...d,
      folders: d.folders.map((f) =>
        f.id === id ? { ...f, name: name.trim() || f.name, color } : f
      ),
    }));
  }, []);

  /** Excluir pasta: os planejamentos dela ficam "sem pasta" (nada é apagado). */
  const deleteFolder = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      folders: d.folders.filter((f) => f.id !== id),
      projects: d.projects.map((p) => (p.folderId === id ? { ...p, folderId: null } : p)),
    }));
  }, []);

  /* ---------- planejamentos ---------- */

  const addProject = useCallback(
    (name: string, folderId: string | null, options?: PlanProjectOptions) => {
    const project: PlanProject = {
      id: uid(),
      name: name.trim() || "Novo planejamento",
      folderId,
      colorMode: options?.colorMode ?? "accent",
      fixedColor: options?.fixedColor || DEFAULT_FIXED_COLOR,
      createdAt: nowIso(),
    };

    setData((d) => ({ ...d, projects: [...d.projects, project] }));

    return project.id;
    },
    []
  );

  const updateProject = useCallback(
    (id: string, name: string, folderId: string | null, options?: PlanProjectOptions) => {
      setData((d) => ({
        ...d,
        projects: d.projects.map((p) =>
          p.id === id
            ? {
                ...p,
                name: name.trim() || p.name,
                folderId,
                colorMode: options?.colorMode ?? p.colorMode,
                fixedColor: options?.fixedColor || p.fixedColor,
              }
            : p
        ),
      }));
    },
    []
  );

  const deleteProject = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      projects: d.projects.filter((p) => p.id !== id),
      items: d.items.filter((item) => item.projectId !== id),
    }));
  }, []);

  /* ---------- itens ---------- */

  const addItem = useCallback((projectId: string, parentId: string | null, title: string) => {
    const clean = title.trim();

    if (!clean) return null;

    const id = uid();

    setData((d) => {
      const siblings = siblingsOf(d.items, projectId, parentId);
      const order = siblings.length ? siblings[siblings.length - 1].order + 1 : 0;
      const created = { ...newItem(projectId, parentId, order, clean), id };

      let items = [...d.items, created];

      if (parentId) {
        items = appendHistory(items, parentId, makeEntry("subitem", `Subitem adicionado: "${clean}".`));
        items = items.map((item) => (item.id === parentId ? { ...item, collapsed: false } : item));
      }

      return { ...d, items };
    });

    return id;
  }, []);

  /**
   * Cria vários itens de uma vez (um tópico com subtópicos, ou uma lista colada).
   * Com replaceSameTitle, tópicos de primeiro nível que já existem com o mesmo
   * nome são substituídos, mantendo a posição deles.
   */
  const addTree = useCallback(
    (
      projectId: string,
      parentId: string | null,
      nodes: OutlineNode[],
      options?: { replaceSameTitle?: boolean; historyText?: string }
    ) => {
      if (!nodes.length) return;

      setData((d) => {
        let items = d.items;
        const keepOrder = new Map<number, number>();

        if (options?.replaceSameTitle && parentId === null) {
          const remove = new Set<string>();

          for (const root of items.filter((i) => i.projectId === projectId && i.parentId === null)) {
            const index = nodes.findIndex((node) => sameTopic(node.title, root.title));

            if (index < 0) continue;

            remove.add(root.id);
            descendantIds(items, root.id).forEach((id) => remove.add(id));

            if (!keepOrder.has(index)) keepOrder.set(index, root.order);
          }

          items = items.filter((i) => !remove.has(i.id));
        }

        const siblings = siblingsOf(items, projectId, parentId);
        const start = siblings.length ? siblings[siblings.length - 1].order + 1 : 0;
        const created: PlanItem[] = [];

        const build = (list: OutlineNode[], parent: string | null, firstOrder: number, top: boolean) => {
          list.forEach((node, index) => {
            const item = newItem(
              projectId,
              parent,
              top ? (keepOrder.get(index) ?? firstOrder + index) : index,
              node.title.trim() || "Sem título",
              options?.historyText
            );

            item.status = node.status ?? "todo";
            item.description = node.notes ?? "";
            item.color = node.color ?? "";

            if (item.status === "done") item.completedAt = item.createdAt;

            created.push(item);

            if (node.children.length) build(node.children, item.id, 0, false);
          });
        };

        build(nodes, parentId, start, true);

        let next = [...items, ...created];

        if (parentId) {
          next = appendHistory(
            next,
            parentId,
            makeEntry("subitem", `${nodes.length} subtópico(s) adicionado(s).`)
          );
          next = next.map((item) => (item.id === parentId ? { ...item, collapsed: false } : item));
        }

        return { ...d, items: reindex(next, projectId, parentId) };
      });
    },
    []
  );

  const updateItem = useCallback((id: string, patch: PlanItemPatch) => {
    setData((d) => {
      const before = d.items.find((item) => item.id === id);

      if (!before) return d;

      let after: PlanItem = { ...before, ...patch };

      if (before.status !== after.status) {
        if (after.status === "done") after = { ...after, completedAt: nowIso() };
        else if (before.status === "done") after = { ...after, completedAt: "" };
      }

      const entries = describeChanges(before, after);

      if (!entries.length) return d;

      after = { ...after, history: [...before.history, ...entries] };

      return { ...d, items: d.items.map((item) => (item.id === id ? after : item)) };
    });
  }, []);

  const toggleDone = useCallback(
    (id: string) => {
      const current = data.items.find((item) => item.id === id);

      if (!current) return;

      updateItem(id, { status: current.status === "done" ? "todo" : "done" });
    },
    [data.items, updateItem]
  );

  const addNote = useCallback((id: string, text: string) => {
    const clean = text.trim();

    if (!clean) return;

    setData((d) => ({
      ...d,
      items: appendHistory(d.items, id, makeEntry("note", clean, true)),
    }));
  }, []);

  const setCollapsed = useCallback((id: string, collapsed: boolean) => {
    setData((d) => ({
      ...d,
      items: d.items.map((item) => (item.id === id ? { ...item, collapsed } : item)),
    }));
  }, []);

  const setAllCollapsed = useCallback((projectId: string, collapsed: boolean) => {
    setData((d) => ({
      ...d,
      items: d.items.map((item) => (item.projectId === projectId ? { ...item, collapsed } : item)),
    }));
  }, []);

  const deleteItem = useCallback((id: string) => {
    setData((d) => {
      const target = d.items.find((item) => item.id === id);

      if (!target) return d;

      const remove = new Set([id, ...descendantIds(d.items, id)]);
      let items = d.items.filter((item) => !remove.has(item.id));

      if (target.parentId) {
        items = appendHistory(
          items,
          target.parentId,
          makeEntry("subitem", `Subitem excluído: "${target.title}".`)
        );
      }

      return { ...d, items: reindex(items, target.projectId, target.parentId) };
    });
  }, []);

  const archiveItem = useCallback((id: string, archived: boolean) => {
    setData((d) => {
      const target = d.items.find((item) => item.id === id);

      if (!target || target.archived === archived) return d;

      const entry = makeEntry("archived", archived ? "Atividade arquivada." : "Atividade restaurada.");

      return {
        ...d,
        items: appendHistory(
          d.items.map((item) => (item.id === id ? { ...item, archived } : item)),
          id,
          entry
        ),
      };
    });
  }, []);

  const duplicateItem = useCallback((id: string) => {
    setData((d) => {
      const root = d.items.find((item) => item.id === id);

      if (!root) return d;

      const subtree = [root, ...descendantIds(d.items, id).map((childId) => d.items.find((i) => i.id === childId))]
        .filter((item): item is PlanItem => Boolean(item));

      const newIds = new Map(subtree.map((item) => [item.id, uid()]));

      const copies = subtree.map((item) => ({
        ...item,
        id: newIds.get(item.id) ?? uid(),
        parentId: item.id === id ? item.parentId : (newIds.get(item.parentId ?? "") ?? item.parentId),
        order: item.id === id ? item.order + 0.5 : item.order,
        title: item.id === id ? `${item.title} (cópia)` : item.title,
        checklist: item.checklist.map((entry) => ({ ...entry, id: uid() })),
        history: [makeEntry("created", `Duplicada de "${item.title}".`)],
      }));

      return {
        ...d,
        items: reindex([...d.items, ...copies], root.projectId, root.parentId),
      };
    });
  }, []);

  const moveItem = useCallback((id: string, direction: "up" | "down") => {
    setData((d) => {
      const item = d.items.find((entry) => entry.id === id);

      if (!item) return d;

      const siblings = siblingsOf(d.items, item.projectId, item.parentId);
      const index = siblings.findIndex((entry) => entry.id === id);
      const other = siblings[direction === "up" ? index - 1 : index + 1];

      if (!other) return d;

      return {
        ...d,
        items: d.items.map((entry) => {
          if (entry.id === item.id) return { ...entry, order: other.order };
          if (entry.id === other.id) return { ...entry, order: item.order };

          return entry;
        }),
      };
    });
  }, []);

  /**
   * Arrastar e soltar: move o item para antes, depois ou dentro de outro.
   * Não deixa colocar um item dentro de si mesmo ou de algo que está dentro dele.
   */
  const moveTo = useCallback((id: string, targetId: string, position: DropPosition) => {
    setData((d) => {
      const item = d.items.find((entry) => entry.id === id);
      const target = d.items.find((entry) => entry.id === targetId);

      if (!item || !target || id === targetId || item.projectId !== target.projectId) return d;
      if (descendantIds(d.items, id).includes(targetId)) return d;

      const newParentId = position === "inside" ? target.id : target.parentId;
      const oldParentId = item.parentId;

      const siblings = siblingsOf(d.items, item.projectId, newParentId).filter((entry) => entry.id !== id);

      let index = siblings.length;

      if (position !== "inside") {
        const at = siblings.findIndex((entry) => entry.id === targetId);

        index = position === "before" ? at : at + 1;
      }

      const ordered = [...siblings.slice(0, index), item, ...siblings.slice(index)];
      const orderOf = new Map(ordered.map((entry, position2) => [entry.id, position2]));

      let items = d.items.map((entry) => {
        const order = orderOf.get(entry.id);

        if (order !== undefined) {
          return entry.id === id ? { ...entry, parentId: newParentId, order } : { ...entry, order };
        }

        if (entry.id === target.id && position === "inside") return { ...entry, collapsed: false };

        return entry;
      });

      if (oldParentId !== newParentId) {
        const text = newParentId
          ? `Movida para dentro de "${cleanTitle(target.title)}".`
          : "Movida para o primeiro nível.";

        items = appendHistory(items, id, makeEntry("moved", text));
        items = reindex(items, item.projectId, oldParentId);
      }

      return { ...d, items };
    });
  }, []);

  /** Aumentar nível: o item entra dentro do irmão que está acima dele. */
  const indentItem = useCallback((id: string) => {
    setData((d) => {
      const item = d.items.find((entry) => entry.id === id);

      if (!item) return d;

      const siblings = siblingsOf(d.items, item.projectId, item.parentId);
      const index = siblings.findIndex((entry) => entry.id === id);
      const newParent = siblings[index - 1];

      if (!newParent) return d;

      const inside = siblingsOf(d.items, item.projectId, newParent.id);
      const order = inside.length ? inside[inside.length - 1].order + 1 : 0;

      let items = d.items.map((entry) => {
        if (entry.id === id) return { ...entry, parentId: newParent.id, order };
        if (entry.id === newParent.id) return { ...entry, collapsed: false };

        return entry;
      });

      items = appendHistory(items, id, makeEntry("moved", `Movida para dentro de "${newParent.title}".`));

      return { ...d, items: reindex(items, item.projectId, item.parentId) };
    });
  }, []);

  /** Diminuir nível: o item sai de dentro do pai e fica logo depois dele. */
  const outdentItem = useCallback((id: string) => {
    setData((d) => {
      const item = d.items.find((entry) => entry.id === id);

      if (!item || !item.parentId) return d;

      const parent = d.items.find((entry) => entry.id === item.parentId);

      if (!parent) return d;

      let items = d.items.map((entry) =>
        entry.id === id ? { ...entry, parentId: parent.parentId, order: parent.order + 0.5 } : entry
      );

      items = appendHistory(items, id, makeEntry("moved", `Movida para fora de "${parent.title}".`));
      items = reindex(items, item.projectId, parent.parentId);

      return { ...d, items: reindex(items, item.projectId, parent.id) };
    });
  }, []);

  return {
    loaded,
    folders: data.folders,
    projects: data.projects,
    items: data.items,
    addFolder,
    updateFolder,
    deleteFolder,
    addProject,
    updateProject,
    deleteProject,
    addItem,
    addTree,
    updateItem,
    toggleDone,
    addNote,
    setCollapsed,
    setAllCollapsed,
    deleteItem,
    archiveItem,
    duplicateItem,
    moveItem,
    moveTo,
    indentItem,
    outdentItem,
  };
}

export type PlanningStore = ReturnType<typeof usePlanning>;