"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ClipboardPaste,
  Clock,
  Copy,
  GripVertical,
  IndentDecrease,
  IndentIncrease,
  Layers,
  LayoutDashboard,
  ListChecks,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";

import { Theme } from "@/types";
import {
  DropPosition,
  OutlineNode,
  PLAN_STATUSES,
  PlanItem,
  PlanProject,
  PlanStatus,
  PlanningStore,
  buildChildMap,
  calcProgress,
  cleanTitle,
  flattenTree,
  formatDateTime,
  getPlanPriority,
  getPlanStatus,
  leafStats,
  makeColorResolver,
  toPercent,
} from "@/lib/planning";
import { formatShort, toKey } from "@/lib/dates";
import { useAccent, withAlpha } from "@/lib/theme";
import { Ui, getUi } from "@/lib/ui";

import { useConfirm } from "../modals/ConfirmDialog";
import PlanningImportModal from "./PlanningImportModal";
import PlanningItemModal from "./PlanningItemModal";
import {
  Anchor,
  Card,
  ColorSwatches,
  Empty,
  FloatingPanel,
  MiniRow,
  ProgressBar,
  StatCard,
  toAnchor,
} from "./PlanningParts";
import PlanningTopicModal from "./PlanningTopicModal";

interface PlanningDetailProps {
  theme: Theme;
  store: PlanningStore;
  project: PlanProject;
  /** abre a janela de renomear / mudar de pasta / cores / excluir */
  onEditProject: () => void;
}

type ChildMap = Map<string | null, PlanItem[]>;
type Tab = "structure" | "dashboard";

interface Popover {
  id: string;
  kind: "menu" | "color" | "status";
  anchor: Anchor;
}

interface PlanActions {
  toggleDone: (id: string) => void;
  setStatus: (id: string, status: PlanStatus) => void;
  setColor: (id: string, color: string) => void;
  addQuick: (parentId: string, title: string) => void;
  addSubtopics: (item: PlanItem) => void;
  importInto: (item: PlanItem) => void;
  edit: (id: string) => void;
  move: (id: string, direction: "up" | "down") => void;
  indent: (id: string) => void;
  outdent: (id: string) => void;
  duplicate: (id: string) => void;
  archive: (id: string, archived: boolean) => void;
  remove: (item: PlanItem) => void;
  toggleCollapsed: (item: PlanItem) => void;
}

interface RowContext {
  dark: boolean;
  ui: Ui;
  today: string;
  tree: ChildMap;
  visibleIds: Set<string> | null;
  forceOpen: boolean;
  resolveColor: (item: PlanItem) => string;
  popover: Popover | null;
  openPopover: (id: string, kind: Popover["kind"], target: HTMLElement) => void;
  closePopover: () => void;
  /** arrastar e soltar */
  dragId: string | null;
  drop: { id: string; position: DropPosition } | null;
  startDrag: (e: React.DragEvent<HTMLElement>, id: string) => void;
  overItem: (e: React.DragEvent<HTMLElement>, item: PlanItem) => void;
  leaveItem: (e: React.DragEvent<HTMLElement>, item: PlanItem) => void;
  dropOn: (e: React.DragEvent<HTMLElement>, item: PlanItem) => void;
  endDrag: () => void;
  addingChildOf: string | null;
  setAddingChildOf: (id: string | null) => void;
  actions: PlanActions;
}

function parseImportedOutline(rawContent: string): {
  nodes: OutlineNode[];
  replaceSameTitle?: boolean;
} {
  const trimmed = rawContent.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    const list = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.nodes)
      ? parsed.nodes
      : Array.isArray(parsed?.items)
      ? parsed.items
      : null;

    if (!list) {
      throw new Error("JSON inválido: esperado uma lista de tópicos.");
    }

    const normalizeNodes = (arr: unknown[]): OutlineNode[] =>
      arr
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item) => ({
          title: String(item.title ?? item.name ?? "Sem título"),
          status: typeof item.status === "string" ? (item.status as OutlineNode["status"]) : undefined,
          notes:
            typeof item.notes === "string"
              ? item.notes
              : typeof item.description === "string"
              ? item.description
              : undefined,
          color: typeof item.color === "string" ? item.color : undefined,
          children: Array.isArray(item.children) ? normalizeNodes(item.children) : [],
        }));

    return {
      nodes: normalizeNodes(list),
      replaceSameTitle: Boolean(!Array.isArray(parsed) && parsed?.replaceSameTitle),
    };
  }

  const roots: OutlineNode[] = [];
  const stack: { indent: number; node: OutlineNode }[] = [];

  for (const line of trimmed.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const indent = line.match(/^\s*/)?.[0].replace(/\t/g, "  ").length ?? 0;
    const title = line.trim().replace(/^([-*•]|\d+[.)])\s+/, "").trim();
    if (!title) continue;

    const node: OutlineNode = { title, children: [] };

    while (stack.length && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (stack.length) {
      stack[stack.length - 1].node.children.push(node);
    } else {
      roots.push(node);
    }

    stack.push({ indent, node });
  }

  return { nodes: roots };
}

/* =========================================================
   TELA
========================================================= */

export default function PlanningDetail({ theme, store, project, onEditProject }: PlanningDetailProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const accent = useAccent();
  const confirm = useConfirm();

  const [tab, setTab] = useState<Tab>("structure");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [addingChildOf, setAddingChildOf] = useState<string | null>(null);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [topicModal, setTopicModal] = useState<{ parent: PlanItem | null } | null>(null);
  const [importModal, setImportModal] = useState<{ parent: PlanItem | null } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragBlocked, setDragBlocked] = useState<Set<string>>(new Set());
  const [drop, setDrop] = useState<{ id: string; position: DropPosition } | null>(null);

  const today = toKey(new Date());
  const projectId = project.id;

  /* ---------- árvores, cores e métricas ---------- */

  const activeMap = useMemo(
    () => buildChildMap(store.items, projectId, false),
    [store.items, projectId]
  );

  const tree = useMemo(
    () => (showArchived ? buildChildMap(store.items, projectId, true) : activeMap),
    [store.items, projectId, showArchived, activeMap]
  );

  const resolveColor = useMemo(
    () => makeColorResolver(store.items, project, accent),
    [store.items, project, accent]
  );

  const metrics = useMemo(() => {
    const all = flattenTree(activeMap);
    const leaves = all.filter(
      (item) => !(activeMap.get(item.id)?.length) && item.status !== "cancelled"
    );

    const roots = activeMap.get(null) ?? [];
    let sum = 0;
    let count = 0;

    for (const root of roots) {
      const part = calcProgress(activeMap, root);

      sum += part.sum;
      count += part.count;
    }

    const byDue = (a: PlanItem, b: PlanItem) => a.dueDate.localeCompare(b.dueDate);
    const open = leaves.filter((item) => item.status !== "done");

    return {
      done: leaves.filter((item) => item.status === "done").length,
      doing: leaves.filter((item) => item.status === "doing").length,
      pending: leaves.filter((item) => item.status === "todo" || item.status === "pending").length,
      total: leaves.length,
      overall: toPercent({ sum, count }),
      categories: roots.map((root) => ({
        item: root,
        percent: toPercent(calcProgress(activeMap, root)),
      })),
      overdue: open.filter((item) => item.dueDate && item.dueDate < today).sort(byDue),
      upcoming: open
        .filter((item) => item.dueDate && item.dueDate >= today)
        .sort(byDue)
        .slice(0, 5),
      doingList: leaves.filter((item) => item.status === "doing").slice(0, 6),
      recentDone: leaves
        .filter((item) => item.status === "done" && item.completedAt)
        .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
        .slice(0, 5),
      changes: all
        .flatMap((item) => item.history.map((entry) => ({ item, entry })))
        .sort((a, b) => b.entry.at.localeCompare(a.entry.at))
        .slice(0, 6),
    };
  }, [activeMap, today]);

  const archivedCount = useMemo(
    () => store.items.filter((item) => item.projectId === projectId && item.archived).length,
    [store.items, projectId]
  );

  /* ---------- busca e filtro ---------- */

  const q = query.trim().toLowerCase();
  const filtering = q !== "" || statusFilter !== "all";

  const visibleIds = useMemo(() => {
    if (!filtering) return null;

    const ids = new Set<string>();

    const walk = (item: PlanItem): boolean => {
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesText =
        !q || item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);

      let keep = matchesStatus && matchesText;

      for (const child of tree.get(item.id) ?? []) {
        if (walk(child)) keep = true;
      }

      if (keep) ids.add(item.id);

      return keep;
    };

    for (const root of tree.get(null) ?? []) walk(root);

    return ids;
  }, [filtering, q, statusFilter, tree]);

  /* ---------- ações ---------- */

  const actions: PlanActions = {
    toggleDone: store.toggleDone,
    setStatus: (id, status) => store.updateItem(id, { status }),
    setColor: (id, color) => store.updateItem(id, { color }),
    addQuick: (parentId, title) => {
      store.addItem(projectId, parentId, title);
    },
    addSubtopics: (item) => setTopicModal({ parent: item }),
    importInto: (item) => setImportModal({ parent: item }),
    edit: setEditingId,
    move: store.moveItem,
    indent: store.indentItem,
    outdent: store.outdentItem,
    duplicate: store.duplicateItem,
    archive: store.archiveItem,
    remove: async (item) => {
      const inside = (activeMap.get(item.id) ?? []).length;

      const ok = await confirm({
        title: "Excluir atividade?",
        description: inside
          ? `"${cleanTitle(item.title)}" e tudo que está dentro dela serão excluídos. Essa ação não pode ser desfeita.`
          : `"${cleanTitle(item.title)}" será excluída. Essa ação não pode ser desfeita.`,
        confirmLabel: "Excluir",
      });

      if (ok) store.deleteItem(item.id);
    },
    toggleCollapsed: (item) => store.setCollapsed(item.id, !item.collapsed),
  };

  const ctx: RowContext = {
    dark,
    ui,
    today,
    tree,
    visibleIds,
    forceOpen: filtering,
    resolveColor,
    popover,
    openPopover: (id, kind, target) =>
      setPopover((current) =>
        current && current.id === id && current.kind === kind
          ? null
          : { id, kind, anchor: toAnchor(target.getBoundingClientRect()) }
      ),
    closePopover: () => setPopover(null),
    dragId,
    drop,
    startDrag: (e, id) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);

      /* o item e tudo que está dentro dele não podem receber a soltura */
      const blocked = new Set<string>([id]);
      const walk = (parentId: string) => {
        for (const child of tree.get(parentId) ?? []) {
          blocked.add(child.id);
          walk(child.id);
        }
      };

      walk(id);
      setDragBlocked(blocked);
      setDragId(id);
      setPopover(null);
    },
    overItem: (e, item) => {
      if (!dragId || dragBlocked.has(item.id)) return;

      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const position = dropZone(e);

      setDrop((current) =>
        current && current.id === item.id && current.position === position
          ? current
          : { id: item.id, position }
      );
    },
    leaveItem: (e, item) => {
      if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;

      setDrop((current) => (current && current.id === item.id ? null : current));
    },
    dropOn: (e, item) => {
      if (!dragId || dragBlocked.has(item.id)) return;

      e.preventDefault();
      store.moveTo(dragId, item.id, dropZone(e));
      setDragId(null);
      setDragBlocked(new Set());
      setDrop(null);
    },
    endDrag: () => {
      setDragId(null);
      setDragBlocked(new Set());
      setDrop(null);
    },
    addingChildOf,
    setAddingChildOf,
    actions,
  };

  const allRoots = tree.get(null) ?? [];
  const roots = allRoots.filter((item) => !visibleIds || visibleIds.has(item.id));
  const isEmpty = !store.items.some((item) => item.projectId === projectId);
  const editingItem = editingId ? store.items.find((item) => item.id === editingId) : undefined;

  const openItem = (id: string) => setEditingId(id);

  const tabButton = (id: Tab, label: string, icon: React.ReactNode) => (
    <button
      key={id}
      type="button"
      onClick={() => setTab(id)}
      aria-pressed={tab === id}
      className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
        tab === id ? "text-white shadow-sm" : `${ui.subtitle} ${ui.hover}`
      }`}
      style={tab === id ? { backgroundColor: accent } : undefined}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl space-y-6 p-6 sm:p-10">
        {/* ABAS E AÇÕES */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className={`inline-flex gap-1 rounded-xl border p-1 ${ui.divider} ${dark ? "bg-white/[0.03]" : "bg-zinc-50"}`}>
            {tabButton("structure", "Estrutura", <Layers size={14} />)}
            {tabButton("dashboard", "Painel", <LayoutDashboard size={14} />)}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setImportModal({ parent: null })} className={ui.btnGhost}>
              <span className="inline-flex items-center gap-2">
                <ClipboardPaste size={14} />
                Importar lista
              </span>
            </button>

            <button
              type="button"
              onClick={onEditProject}
              title="Nome, pasta, cores e exclusão deste planejamento"
              aria-label="Editar planejamento"
              className={`${ui.iconBtn} border ${ui.divider}`}
            >
              <Pencil size={15} />
            </button>

            <button type="button" onClick={() => setTopicModal({ parent: null })} className={ui.btnPrimaryMd}>
              <Plus size={15} />
              Novo tópico
            </button>
          </div>
        </div>

        {tab === "structure" ? (
          <>
            {/* RESUMO */}
            {!isEmpty && (
              <div className={`flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border px-5 py-4 ${ui.panel}`}>
                <div className="min-w-48 flex-1">
                  <div className="mb-2 flex items-baseline justify-between">
                    <span className={`text-[11px] font-semibold ${ui.subtitle}`}>Progresso geral</span>
                    <span className={`text-lg font-black tracking-tight ${ui.title}`}>{metrics.overall}%</span>
                  </div>

                  <ProgressBar percent={metrics.overall} color={accent} dark={dark} />
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  {[
                    { label: "Concluídas", value: metrics.done, color: "#10b981" },
                    { label: "Em andamento", value: metrics.doing, color: "#3b82f6" },
                    { label: "Pendentes", value: metrics.pending, color: "#71717a" },
                  ].map((stat) => (
                    <span key={stat.label} className={`flex items-center gap-2 text-xs font-semibold ${ui.text}`}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stat.color }} />
                      <strong className={ui.title}>{stat.value}</strong>
                      <span className={ui.subtitle}>{stat.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* BUSCA E FILTROS */}
            {!isEmpty && (
              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={`flex min-w-52 flex-1 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors ${ui.inputBox}`}
                >
                  <Search size={15} className={ui.muted} />

                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar por título ou descrição"
                    className={`w-full bg-transparent text-xs outline-none ${ui.title} ${
                      dark ? "placeholder:text-zinc-500" : "placeholder:text-zinc-400"
                    }`}
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as PlanStatus | "all")}
                  aria-label="Filtrar por status"
                  className={`rounded-xl border px-3 py-2.5 text-xs font-semibold outline-none transition-colors ${ui.field}`}
                >
                  <option value="all">Todos os status</option>
                  {PLAN_STATUSES.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>

                <button type="button" onClick={() => store.setAllCollapsed(projectId, false)} className={ui.btnGhost}>
                  Expandir tudo
                </button>

                <button type="button" onClick={() => store.setAllCollapsed(projectId, true)} className={ui.btnGhost}>
                  Recolher tudo
                </button>

                {archivedCount > 0 && (
                  <button type="button" onClick={() => setShowArchived((v) => !v)} className={ui.btnGhost}>
                    {showArchived ? "Ocultar arquivadas" : `Arquivadas (${archivedCount})`}
                  </button>
                )}
              </div>
            )}

            {/* TÓPICOS */}
            {isEmpty ? (
              <div className={`flex flex-col items-center gap-4 rounded-2xl border px-6 py-16 text-center ${ui.panel}`}>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: withAlpha(accent, 0.1), color: accent }}
                >
                  <Layers size={26} />
                </div>

                <div>
                  <p className={`text-base font-bold ${ui.title}`}>Vamos montar este planejamento</p>
                  <p className={`mx-auto mt-1.5 max-w-md text-xs leading-relaxed ${ui.subtitle}`}>
                    Crie um <strong>tópico</strong> (ex.: &quot;Fluxogramas&quot;). Dentro dele entram os{" "}
                    <strong>subtópicos</strong> e as tarefas, cada um com checklist, prazo, cor e histórico. Se você já
                    tem uma lista pronta, é só colar.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => setTopicModal({ parent: null })} className={ui.btnPrimaryMd}>
                    <Plus size={15} />
                    Criar primeiro tópico
                  </button>

                  <button type="button" onClick={() => setImportModal({ parent: null })} className={ui.btnGhost}>
                    <span className="inline-flex items-center gap-2">
                      <ClipboardPaste size={14} />
                      Importar lista
                    </span>
                  </button>
                </div>
              </div>
            ) : roots.length === 0 ? (
              <Empty ui={ui}>Nenhuma atividade encontrada com esse filtro.</Empty>
            ) : (
              <div className="space-y-4">
                {roots.map((item) => (
                  <TopicCard key={item.id} item={item} num={String(allRoots.indexOf(item) + 1)} ctx={ctx} />
                ))}

                {!filtering && (
                  <button
                    type="button"
                    onClick={() => setTopicModal({ parent: null })}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed py-4 text-xs font-bold transition-all ${
                      dark
                        ? "border-white/10 text-zinc-400 hover:border-white/30 hover:bg-white/[0.03] hover:text-zinc-200"
                        : "border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-900"
                    }`}
                  >
                    <Plus size={15} />
                    Novo tópico
                  </button>
                )}
              </div>
            )}
          </>
        ) : isEmpty ? (
          <Empty ui={ui}>O painel aparece quando houver atividades.</Empty>
        ) : (
          <Dashboard
            ui={ui}
            dark={dark}
            accent={accent}
            metrics={metrics}
            resolveColor={resolveColor}
            openItem={openItem}
          />
        )}
      </div>

      {popover && <PopoverContent ctx={ctx} items={store.items} />}

      {editingItem && (
        <PlanningItemModal
          key={editingItem.id}
          theme={theme}
          item={editingItem}
          onClose={() => setEditingId(null)}
          onSave={(patch) => store.updateItem(editingItem.id, patch)}
          onAddNote={(text) => store.addNote(editingItem.id, text)}
        />
      )}

      {topicModal && (
        <PlanningTopicModal
          theme={theme}
          parentTitle={topicModal.parent ? cleanTitle(topicModal.parent.title) : undefined}
          onClose={() => setTopicModal(null)}
          onCreate={(name, color, children) =>
            store.addTree(projectId, topicModal.parent?.id ?? null, [
              { title: name, color: color || undefined, children },
            ])
          }
        />
      )}

      {importModal && (
        <PlanningImportModal
          theme={theme}
          onClose={() => setImportModal(null)}
          onImport={(rawContent) => {
            try {
              const { nodes, replaceSameTitle } = parseImportedOutline(rawContent);
              if (!nodes.length) {
                return "Nenhum tópico válido encontrado no conteúdo enviado.";
              }
              store.addTree(projectId, importModal.parent?.id ?? null, nodes, {
                replaceSameTitle,
                historyText: "Cadastrada ao importar uma lista.",
              });
              return null;
            } catch (err) {
              return err instanceof Error
                ? err.message
                : "Não foi possível interpretar o formato informado.";
            }
          }}
        />
      )}
    </div>
  );
}

/* =========================================================
   CARTÃO DE UM TÓPICO (primeiro nível)
========================================================= */

function TopicCard({ item, num, ctx }: { item: PlanItem; num: string; ctx: RowContext }) {
  const { ui, dark, actions } = ctx;

  const siblings = ctx.tree.get(item.id) ?? [];
  const children = siblings.filter((child) => !ctx.visibleIds || ctx.visibleIds.has(child.id));

  const color = ctx.resolveColor(item);
  const stats = leafStats(ctx.tree, item);
  const percent = toPercent(calcProgress(ctx.tree, item));
  const hasChildren = children.length > 0;
  const open = ctx.forceOpen || !item.collapsed;
  const priority = getPlanPriority(item.priority);
  const closed = item.status === "done" || item.status === "cancelled";
  const overdue = !closed && !!item.dueDate && item.dueDate < ctx.today;
  const popOpen = ctx.popover?.id === item.id;

  return (
    <div
      className={`relative rounded-2xl border p-2 transition-opacity sm:p-3 ${ui.panel} ${
        item.archived || ctx.dragId === item.id ? "opacity-50" : ""
      }`}
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <DropMarks ctx={ctx} id={item.id} color={color} />

      <div
        className="group flex items-center gap-3 rounded-xl px-1 py-1.5 transition-shadow"
        style={insideStyle(ctx, item.id, color)}
        {...dragProps(ctx, item)}
      >
        <button
          type="button"
          onClick={() => actions.toggleCollapsed(item)}
          aria-label={open ? "Recolher" : "Expandir"}
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${ui.muted} ${ui.hover}`}
        >
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <button
          type="button"
          onClick={(e) => ctx.openPopover(item.id, "color", e.currentTarget)}
          title="Escolher a cor"
          aria-label="Escolher a cor do tópico"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm transition-transform hover:scale-105"
          style={{ backgroundColor: color, boxShadow: `0 6px 18px -6px ${withAlpha(color, 0.6)}` }}
        >
          {num}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <button
              type="button"
              onClick={() => actions.edit(item.id)}
              className={`max-w-full truncate text-left text-base font-extrabold tracking-tight ${
                closed ? "text-zinc-500 line-through" : ui.title
              }`}
            >
              {cleanTitle(item.title)}
            </button>

            {(item.status !== "todo" || !hasChildren) && <StatusChip item={item} ctx={ctx} />}

            {(item.priority === "high" || item.priority === "urgent") && !closed && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ backgroundColor: withAlpha(priority.color, 0.14), color: priority.color }}
              >
                {priority.label}
              </span>
            )}

            {item.dueDate && (
              <span
                className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                  overdue ? "bg-red-500/15 text-red-400" : `${ui.soft} ${ui.text}`
                }`}
              >
                {formatShort(item.dueDate)}
              </span>
            )}
          </div>

          {item.description.trim() && (
            <button
              type="button"
              onClick={() => actions.edit(item.id)}
              title={item.description}
              className={`mt-1 block w-full text-left text-xs leading-snug ${ui.subtitle}`}
            >
              <span className="line-clamp-2 whitespace-pre-line">{item.description}</span>
            </button>
          )}

          <div className="mt-2 flex items-center gap-3">
            <ProgressBar percent={percent} color={color} dark={dark} className="max-w-xs flex-1" />

            <span className={`shrink-0 text-[11px] font-semibold ${ui.subtitle}`}>
              {hasChildren || stats.total > 1
                ? `${stats.done} de ${stats.total} concluídas · ${percent}%`
                : "Sem subtópicos ainda"}
            </span>
          </div>
        </div>

        <div
          className={`flex shrink-0 items-center transition-opacity ${
            popOpen ? "opacity-100" : "opacity-60 group-hover:opacity-100 focus-within:opacity-100"
          }`}
        >
          <span
            title={GRIP_HINT}
            aria-hidden
            className={`flex h-7 w-6 cursor-grab items-center justify-center active:cursor-grabbing ${ui.muted}`}
          >
            <GripVertical size={14} />
          </span>

          <button
            type="button"
            onClick={() => actions.addSubtopics(item)}
            title="Novo subtópico (com cor e lista)"
            aria-label="Novo subtópico"
            className={ui.iconBtn}
          >
            <Plus size={16} />
          </button>

          <button
            type="button"
            onClick={() => actions.edit(item.id)}
            title="Editar"
            aria-label="Editar"
            className={ui.iconBtn}
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            onClick={(e) => ctx.openPopover(item.id, "menu", e.currentTarget)}
            title="Mais opções"
            aria-label="Mais opções"
            className={ui.iconBtn}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {open && (
        <div
          className="ml-[22px] mt-1 border-l pl-2"
          style={{ borderColor: withAlpha(color, 0.3) }}
        >
          {children.map((child) => (
            <PlanRow
              key={child.id}
              item={child}
              depth={1}
              num={`${num}.${siblings.indexOf(child) + 1}`}
              ctx={ctx}
            />
          ))}

          {ctx.addingChildOf === item.id ? (
            <InlineAdd
              ctx={ctx}
              placeholder="Novo subtópico — Enter para criar, Esc para cancelar"
              onSubmit={(title) => actions.addQuick(item.id, title)}
              onCancel={() => ctx.setAddingChildOf(null)}
            />
          ) : (
            !ctx.forceOpen && (
              <button
                type="button"
                onClick={() => ctx.setAddingChildOf(item.id)}
                className={`mt-0.5 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${ui.subtitle} ${ui.hover}`}
              >
                <Plus size={13} />
                Adicionar subtópico
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   LINHA DE SUBTÓPICO / TAREFA (recursiva)
========================================================= */

function PlanRow({
  item,
  depth,
  num,
  ctx,
}: {
  item: PlanItem;
  depth: number;
  /** numeração automática: 1.1, 1.1.2... */
  num: string;
  ctx: RowContext;
}) {
  const { ui, dark, actions } = ctx;

  const siblings = ctx.tree.get(item.id) ?? [];
  const children = siblings.filter((child) => !ctx.visibleIds || ctx.visibleIds.has(child.id));

  const hasChildren = children.length > 0;
  const open = ctx.forceOpen || !item.collapsed;
  const priority = getPlanPriority(item.priority);
  const color = ctx.resolveColor(item);
  const percent = toPercent(calcProgress(ctx.tree, item));
  const closed = item.status === "done" || item.status === "cancelled";
  const overdue = !closed && !!item.dueDate && item.dueDate < ctx.today;
  const checkDone = item.checklist.filter((entry) => entry.done).length;
  const popOpen = ctx.popover?.id === item.id;

  return (
    <div className="relative">
      <DropMarks ctx={ctx} id={item.id} color={color} />

      <div
        className={`group relative flex items-center gap-2 rounded-xl py-1.5 pl-1 pr-2 transition-colors ${ui.hover} ${
          item.archived || ctx.dragId === item.id ? "opacity-50" : ""
        }`}
        style={insideStyle(ctx, item.id, color)}
        {...dragProps(ctx, item)}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => actions.toggleCollapsed(item)}
            aria-label={open ? "Recolher" : "Expandir"}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md ${ui.muted} ${ui.hover}`}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" />
        )}

        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => ctx.openPopover(item.id, "color", e.currentTarget)}
            title="Escolher a cor"
            aria-label="Escolher a cor"
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-110"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 0 3px ${withAlpha(color, 0.22)}` }}
            />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => actions.toggleDone(item.id)}
            title={item.status === "done" ? "Reabrir" : "Marcar como concluída"}
            aria-label={item.status === "done" ? "Reabrir" : "Marcar como concluída"}
            className="shrink-0 transition-transform hover:scale-110"
            style={{ color: item.status === "done" ? color : dark ? "#71717a" : "#a1a1aa" }}
          >
            {item.status === "done" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
          </button>
        )}

        <span className={`shrink-0 text-[11px] font-bold tabular-nums ${ui.muted}`}>{num}</span>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => actions.edit(item.id)}
            className={`block w-full truncate text-left text-[13px] ${hasChildren ? "font-bold" : "font-medium"} ${
              closed ? "text-zinc-500 line-through" : ui.title
            }`}
          >
            {cleanTitle(item.title)}
          </button>

          {item.description.trim() && (
            <button
              type="button"
              onClick={() => actions.edit(item.id)}
              title={item.description}
              className={`mt-0.5 block w-full text-left text-[11px] leading-snug ${ui.subtitle}`}
            >
              <span className="line-clamp-2 whitespace-pre-line">{item.description}</span>
            </button>
          )}
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {(item.status !== "todo" || !hasChildren) && <StatusChip item={item} ctx={ctx} />}

          {(item.priority === "high" || item.priority === "urgent") && !closed && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: withAlpha(priority.color, 0.14), color: priority.color }}
            >
              {priority.label}
            </span>
          )}

          {item.checklist.length > 0 && (
            <span className={`flex items-center gap-1 text-[11px] font-semibold ${ui.subtitle}`}>
              <ListChecks size={12} />
              {checkDone}/{item.checklist.length}
            </span>
          )}

          {item.dueDate && (
            <span
              className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                overdue ? "bg-red-500/15 text-red-400" : `${ui.soft} ${ui.text}`
              }`}
            >
              {formatShort(item.dueDate)}
            </span>
          )}

          {(hasChildren || item.checklist.length > 0) && item.status !== "cancelled" && (
            <span className="hidden w-24 items-center gap-2 md:flex">
              <ProgressBar percent={percent} color={color} dark={dark} className="flex-1" />
              <span className={`w-8 text-right text-[11px] font-bold ${ui.subtitle}`}>{percent}%</span>
            </span>
          )}
        </div>

        <div
          className={`flex shrink-0 items-center transition-opacity ${
            popOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          }`}
        >
          <span
            title={GRIP_HINT}
            aria-hidden
            className={`flex h-7 w-6 cursor-grab items-center justify-center active:cursor-grabbing ${ui.muted}`}
          >
            <GripVertical size={14} />
          </span>

          <button
            type="button"
            onClick={() => ctx.setAddingChildOf(item.id)}
            title="Adicionar subtópico"
            aria-label="Adicionar subtópico"
            className={ui.iconBtn}
          >
            <Plus size={15} />
          </button>

          <button
            type="button"
            onClick={() => actions.edit(item.id)}
            title="Editar"
            aria-label="Editar"
            className={ui.iconBtn}
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            onClick={(e) => ctx.openPopover(item.id, "menu", e.currentTarget)}
            title="Mais opções"
            aria-label="Mais opções"
            className={ui.iconBtn}
          >
            <MoreHorizontal size={15} />
          </button>
        </div>
      </div>

      {(ctx.addingChildOf === item.id || (hasChildren && open)) && (
        <div className="ml-[18px] border-l pl-2" style={{ borderColor: withAlpha(color, 0.22) }}>
          {hasChildren &&
            open &&
            children.map((child) => (
              <PlanRow
                key={child.id}
                item={child}
                depth={depth + 1}
                num={`${num}.${siblings.indexOf(child) + 1}`}
                ctx={ctx}
              />
            ))}

          {ctx.addingChildOf === item.id && (
            <InlineAdd
              ctx={ctx}
              placeholder="Novo subtópico — Enter para criar, Esc para cancelar"
              onSubmit={(title) => actions.addQuick(item.id, title)}
              onCancel={() => ctx.setAddingChildOf(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MENUS FLUTUANTES (cor e "...")
========================================================= */

function PopoverContent({ ctx, items }: { ctx: RowContext; items: PlanItem[] }) {
  const popover = ctx.popover;
  const item = popover ? items.find((entry) => entry.id === popover.id) : undefined;

  if (!popover || !item) return null;

  if (popover.kind === "color") {
    return (
      <FloatingPanel
        anchor={popover.anchor}
        width={270}
        onClose={ctx.closePopover}
        className={`rounded-xl border p-3.5 shadow-2xl ${ctx.ui.modalCard}`}
      >
        <span className={`mb-2.5 block text-[10px] font-bold uppercase tracking-wider ${ctx.ui.subtitle}`}>
          Cor de &quot;{cleanTitle(item.title).slice(0, 28)}&quot;
        </span>

        <ColorSwatches
          value={item.color}
          dark={ctx.dark}
          size={22}
          onChange={(color) => {
            ctx.actions.setColor(item.id, color);
            ctx.closePopover();
          }}
        />

        <p className={`mt-2.5 text-[11px] leading-relaxed ${ctx.ui.subtitle}`}>
          &quot;Auto&quot; segue a cor do planejamento (ou do tópico de cima).
        </p>
      </FloatingPanel>
    );
  }

  if (popover.kind === "status") {
    return (
      <FloatingPanel
        anchor={popover.anchor}
        width={212}
        onClose={ctx.closePopover}
        className={`rounded-xl border p-1.5 shadow-2xl ${ctx.ui.modalCard}`}
      >
        <span className={`block px-3 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider ${ctx.ui.subtitle}`}>
          Mudar status
        </span>

        {PLAN_STATUSES.map((status) => (
          <button
            key={status.id}
            type="button"
            onClick={() => {
              ctx.closePopover();
              ctx.actions.setStatus(item.id, status.id);
            }}
            className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${ctx.ui.text} ${ctx.ui.hover}`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
            <span className="flex-1">{status.label}</span>
            {item.status === status.id && <span className={`text-[10px] ${ctx.ui.subtitle}`}>atual</span>}
          </button>
        ))}
      </FloatingPanel>
    );
  }

  return <RowMenu item={item} ctx={ctx} anchor={popover.anchor} />;
}

/* =========================================================
   PEÇAS DAS LINHAS: chip de status, arrastar e soltar
========================================================= */

/** Status que abre a lista para trocar com um clique. */
function StatusChip({ item, ctx }: { item: PlanItem; ctx: RowContext }) {
  const status = getPlanStatus(item.status);

  return (
    <button
      type="button"
      onClick={(e) => ctx.openPopover(item.id, "status", e.currentTarget)}
      title="Clique para mudar o status"
      aria-label={`Status: ${status.label}. Clique para mudar`}
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold transition-all hover:brightness-125"
      style={{ backgroundColor: withAlpha(status.color, 0.14), color: status.color }}
    >
      {status.label}
      <ChevronDown size={10} />
    </button>
  );
}

/** Em que parte da linha o mouse está: em cima = antes, embaixo = depois, no meio = dentro. */
function dropZone(e: React.DragEvent<HTMLElement>): DropPosition {
  const rect = e.currentTarget.getBoundingClientRect();
  const ratio = rect.height ? (e.clientY - rect.top) / rect.height : 0.5;

  return ratio < 0.3 ? "before" : ratio > 0.7 ? "after" : "inside";
}

function dragProps(ctx: RowContext, item: PlanItem) {
  return {
    draggable: !ctx.forceOpen,
    onDragStart: (e: React.DragEvent<HTMLElement>) => ctx.startDrag(e, item.id),
    onDragEnd: ctx.endDrag,
    onDragOver: (e: React.DragEvent<HTMLElement>) => ctx.overItem(e, item),
    onDragLeave: (e: React.DragEvent<HTMLElement>) => ctx.leaveItem(e, item),
    onDrop: (e: React.DragEvent<HTMLElement>) => ctx.dropOn(e, item),
  };
}

/** Linha colorida que mostra onde o item vai cair (antes ou depois). */
function DropMarks({ ctx, id, color }: { ctx: RowContext; id: string; color: string }) {
  const drop = ctx.drop;

  if (!drop || drop.id !== id || drop.position === "inside") return null;

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1 right-1 z-10 h-[3px] rounded-full"
      style={{ backgroundColor: color, ...(drop.position === "before" ? { top: -2 } : { bottom: -2 }) }}
    />
  );
}

/** Destaque da linha quando o item vai cair DENTRO dela. */
function insideStyle(ctx: RowContext, id: string, color: string): React.CSSProperties | undefined {
  return ctx.drop && ctx.drop.id === id && ctx.drop.position === "inside"
    ? { boxShadow: `inset 0 0 0 2px ${color}`, backgroundColor: withAlpha(color, 0.08) }
    : undefined;
}

const GRIP_HINT = "Segure e arraste para mover";

function RowMenu({ item, ctx, anchor }: { item: PlanItem; ctx: RowContext; anchor: Anchor }) {
  const { ui, actions } = ctx;

  const entry = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${ui.text} ${ui.hover}`;

  const run = (fn: () => void) => () => {
    ctx.closePopover();
    fn();
  };

  return (
    <FloatingPanel
      anchor={anchor}
      width={248}
      onClose={ctx.closePopover}
      className={`rounded-xl border p-1.5 shadow-2xl ${ui.modalCard}`}
    >
      <button type="button" onClick={run(() => actions.addSubtopics(item))} className={entry}>
        <Plus size={14} /> Adicionar subtópicos…
      </button>

      <button type="button" onClick={run(() => actions.importInto(item))} className={entry}>
        <ClipboardPaste size={14} /> Importar lista aqui…
      </button>

      <div className={`my-1.5 border-t ${ui.divider}`} />

      <span className={`block px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider ${ui.subtitle}`}>
        Status
      </span>

      {PLAN_STATUSES.map((status) => (
        <button
          key={status.id}
          type="button"
          onClick={run(() => actions.setStatus(item.id, status.id))}
          className={entry}
        >
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: status.color }} />
          <span className="flex-1">{status.label}</span>
          {item.status === status.id && <span className={`text-[10px] ${ui.subtitle}`}>atual</span>}
        </button>
      ))}

      <div className={`my-1.5 border-t ${ui.divider}`} />

      <button type="button" onClick={run(() => actions.move(item.id, "up"))} className={entry}>
        <ArrowUp size={14} /> Subir
      </button>

      <button type="button" onClick={run(() => actions.move(item.id, "down"))} className={entry}>
        <ArrowDown size={14} /> Descer
      </button>

      <button type="button" onClick={run(() => actions.indent(item.id))} className={entry}>
        <IndentIncrease size={14} /> Entrar no item de cima
      </button>

      {item.parentId && (
        <button type="button" onClick={run(() => actions.outdent(item.id))} className={entry}>
          <IndentDecrease size={14} /> Sair do item atual
        </button>
      )}

      <div className={`my-1.5 border-t ${ui.divider}`} />

      <button type="button" onClick={run(() => actions.duplicate(item.id))} className={entry}>
        <Copy size={14} /> Duplicar
      </button>

      <button type="button" onClick={run(() => actions.archive(item.id, !item.archived))} className={entry}>
        {item.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
        {item.archived ? "Restaurar" : "Arquivar"}
      </button>

      <button
        type="button"
        onClick={run(() => actions.remove(item))}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10"
      >
        <Trash2 size={14} /> Excluir
      </button>
    </FloatingPanel>
  );
}

/* =========================================================
   CAMPO "ADICIONAR" RÁPIDO
========================================================= */

function InlineAdd({
  ctx,
  placeholder,
  onSubmit,
  onCancel,
}: {
  ctx: RowContext;
  placeholder: string;
  onSubmit: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="py-1.5 pl-6 pr-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && value.trim()) {
            onSubmit(value);
            setValue("");
          }

          if (e.key === "Escape") onCancel();
        }}
        onBlur={() => {
          if (!value.trim()) onCancel();
        }}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-3.5 py-2 text-xs outline-none transition-colors ${ctx.ui.field}`}
      />
    </div>
  );
}

/* =========================================================
   ABA PAINEL
========================================================= */

interface DashboardMetrics {
  done: number;
  doing: number;
  pending: number;
  total: number;
  overall: number;
  categories: { item: PlanItem; percent: number }[];
  overdue: PlanItem[];
  upcoming: PlanItem[];
  doingList: PlanItem[];
  recentDone: PlanItem[];
  changes: { item: PlanItem; entry: PlanItem["history"][number] }[];
}

function Dashboard({
  ui,
  dark,
  accent,
  metrics,
  resolveColor,
  openItem,
}: {
  ui: Ui;
  dark: boolean;
  accent: string;
  metrics: DashboardMetrics;
  resolveColor: (item: PlanItem) => string;
  openItem: (id: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard ui={ui} accent={accent} icon={<CheckCircle2 size={16} />} value={metrics.done} label="Concluídas" />
        <StatCard ui={ui} accent={accent} icon={<Clock size={16} />} value={metrics.doing} label="Em andamento" />
        <StatCard ui={ui} accent={accent} icon={<Circle size={16} />} value={metrics.pending} label="Pendentes" />
        <StatCard ui={ui} accent={accent} icon={<ListChecks size={16} />} value={metrics.total} label="Total de atividades" />

        <div className={`col-span-2 flex flex-col justify-center rounded-2xl border p-4 lg:col-span-1 ${ui.panel}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold ${ui.subtitle}`}>Progresso geral</span>
            <TrendingUp size={14} style={{ color: accent }} />
          </div>

          <span className={`mt-1 block text-2xl font-black tracking-tight ${ui.title}`}>{metrics.overall}%</span>

          <ProgressBar percent={metrics.overall} color={accent} dark={dark} className="mt-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card ui={ui} title="Progresso por tópico">
          <div className="space-y-3">
            {metrics.categories.map(({ item, percent }) => {
              const color = resolveColor(item);

              return (
                <button key={item.id} type="button" onClick={() => openItem(item.id)} className="block w-full text-left">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className={`flex min-w-0 items-center gap-2 text-xs font-semibold ${ui.title}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                      <span className="truncate">{cleanTitle(item.title)}</span>
                    </span>
                    <span className={`shrink-0 text-[11px] font-bold ${ui.subtitle}`}>{percent}%</span>
                  </div>

                  <ProgressBar percent={percent} color={color} dark={dark} />
                </button>
              );
            })}
          </div>
        </Card>

        <Card ui={ui} title="Prazos">
          {metrics.overdue.length === 0 && metrics.upcoming.length === 0 ? (
            <Empty ui={ui}>Nenhuma atividade com prazo definido.</Empty>
          ) : (
            <div className="space-y-4">
              {metrics.overdue.length > 0 && (
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                    <AlertTriangle size={12} />
                    Atrasadas ({metrics.overdue.length})
                  </span>

                  {metrics.overdue.slice(0, 5).map((item) => (
                    <MiniRow key={item.id} ui={ui} onClick={() => openItem(item.id)} title={cleanTitle(item.title)} meta={formatShort(item.dueDate)} metaClass="text-red-400" />
                  ))}
                </div>
              )}

              {metrics.upcoming.length > 0 && (
                <div className="space-y-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${ui.subtitle}`}>Próximos prazos</span>

                  {metrics.upcoming.map((item) => (
                    <MiniRow key={item.id} ui={ui} onClick={() => openItem(item.id)} title={cleanTitle(item.title)} meta={formatShort(item.dueDate)} />
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card ui={ui} title="Em andamento">
          {metrics.doingList.length === 0 ? (
            <Empty ui={ui}>Nada em andamento.</Empty>
          ) : (
            metrics.doingList.map((item) => (
              <MiniRow key={item.id} ui={ui} onClick={() => openItem(item.id)} title={cleanTitle(item.title)} />
            ))
          )}
        </Card>

        <Card ui={ui} title="Concluídas recentemente">
          {metrics.recentDone.length === 0 ? (
            <Empty ui={ui}>Nenhuma atividade concluída ainda.</Empty>
          ) : (
            metrics.recentDone.map((item) => (
              <MiniRow key={item.id} ui={ui} onClick={() => openItem(item.id)} title={cleanTitle(item.title)} meta={formatShort(item.completedAt.slice(0, 10))} />
            ))
          )}
        </Card>

        <Card ui={ui} title="Últimas alterações">
          {metrics.changes.length === 0 ? (
            <Empty ui={ui}>Sem alterações registradas.</Empty>
          ) : (
            metrics.changes.map(({ item, entry }) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => openItem(item.id)}
                className={`block w-full rounded-lg px-2 py-1.5 text-left transition-colors ${ui.hover}`}
              >
                <span className={`block truncate text-xs font-semibold ${ui.title}`}>{cleanTitle(item.title)}</span>
                <span className={`block truncate text-[11px] ${ui.subtitle}`}>{entry.text}</span>
                <span className={`block text-[10px] ${ui.muted}`}>{formatDateTime(entry.at)}</span>
              </button>
            ))
          )}
        </Card>
      </div>
    </section>
  );
}