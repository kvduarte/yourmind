"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  GitFork,
  Workflow,
  Command,
  ArrowUpRight,
  Code2,
  Layers,
  Pencil,
  BookOpen,
  Database,
  Send,
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  Plus,
  Check,
  Compass,
  Trash2,
  X,
  Clock,
} from "lucide-react";

import { Folder, Task, Theme, Topic } from "@/types";
import { Pipeline } from "@/lib/pipeline";
import { formatLong, toKey } from "@/lib/dates";
import {
  CURATED_PALETTES,
  DEFAULT_ACCENT,
  buildAccentGradient,
  isLightHex,
  withAlpha,
} from "@/lib/theme";
import { getUi } from "@/lib/ui";
import { AppSettings } from "@/lib/settings";
import { useCoverContrast } from "@/lib/useCoverContrast";
import { useHomeCover } from "./HomeCover";

interface HomeProps {
  tasks: Task[];
  topics: Topic[];
  folders: Folder[];
  pipelines: Pipeline[];
  theme: Theme;
  settings?: AppSettings & {
    accentColor?: string;
    colorStyle?: "solid" | "gradient" | "preset";
    colorPreset?: string;
    bgImageUrl?: string;
  };
  onOpenTaskModal: (date?: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSaveEditedTask: (task: Task) => void;
  onCreateTask: (task: Task) => void;
  onNavigate: (target: string) => void;
  onNewFlow: () => void;
  onNewProcess: () => void;
}

interface QuickVaultItem {
  id: number;
  text: string;
  date: string;
}

export default function Home({
  tasks = [],
  topics = [],
  pipelines = [],
  theme,
  settings,
  onNavigate,
  onNewFlow,
  onNewProcess,
  onOpenTaskModal,
  onToggleTask,
}: HomeProps) {
  const dark = theme === "dark";
  const defaultBaseColor = dark ? "#f4f4f5" : "#18181b";
  const accentColor = settings?.accentColor || defaultBaseColor || DEFAULT_ACCENT;
  const colorStyle = settings?.colorStyle || "solid";
  const colorPreset = settings?.colorPreset || "matcha-espresso";
  const todayKey = toKey(new Date());

  // Filtragem corrigida lendo `dueDate` (e fallback para `date`) + busca do próximo evento futuro
  const { todaysTasks, completedCount, progressPercent, nextUpcomingTask } =
    useMemo(() => {
      const getTaskDate = (t: Task & { date?: string }) =>
        (t.dueDate || t.date || "").slice(0, 10);

      const filtered = tasks.filter((t) => getTaskDate(t) === todayKey);
      const completed = filtered.filter((t) => t.completed).length;
      const percent =
        filtered.length > 0 ? Math.round((completed / filtered.length) * 100) : 0;

      // Próximo evento futuro (após hoje, não concluído, ordenado pela data mais próxima)
      const upcoming = tasks
        .filter((t) => {
          const d = getTaskDate(t);
          return d > todayKey && !t.completed;
        })
        .sort((a, b) => getTaskDate(a).localeCompare(getTaskDate(b)))[0] || null;

      return {
        todaysTasks: filtered,
        completedCount: completed,
        progressPercent: percent,
        nextUpcomingTask: upcoming,
      };
    }, [tasks, todayKey]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const activePalette =
    CURATED_PALETTES.find((p) => p.id === colorPreset) || CURATED_PALETTES[0];

  const primaryColor =
    colorStyle === "preset" ? activePalette.colors[0] : accentColor;

  const primaryFill =
    colorStyle === "gradient"
      ? buildAccentGradient(primaryColor)
      : colorStyle === "preset"
      ? activePalette.gradient
      : primaryColor;

  const isLightBtn = isLightHex(primaryColor);

  /* Frase/Mantra pessoal persistida */
  const [mantra, setMantra] = useState("");
  /* Captura rápida na Home */
  const [quickInput, setQuickInput] = useState("");
  const [quickSaved, setQuickSaved] = useState(false);
  const [vaultItems, setVaultItems] = useState<QuickVaultItem[]>([]);
  const [showVault, setShowVault] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMantra(
        localStorage.getItem("user_creative_mantra") ||
          "Construindo sistemas, estudando arquitetura e expandindo a mente."
      );
      try {
        const savedVault = JSON.parse(
          localStorage.getItem("your_mind_quick_vault") || "[]"
        );
        if (Array.isArray(savedVault)) setVaultItems(savedVault);
      } catch {
        setVaultItems([]);
      }
    }
  }, []);

  const handleSaveMantra = (val: string) => {
    setMantra(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("user_creative_mantra", val);
    }
  };

  const handleQuickCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;

    const newItem: QuickVaultItem = {
      id: Date.now(),
      text: quickInput.trim(),
      date: new Date().toISOString(),
    };
    const updated = [newItem, ...vaultItems];
    setVaultItems(updated);
    localStorage.setItem("your_mind_quick_vault", JSON.stringify(updated));

    setQuickInput("");
    setQuickSaved(true);
    setTimeout(() => setQuickSaved(false), 1800);
  };

  const handleDeleteVaultItem = (id: number) => {
    const updated = vaultItems.filter((item) => item.id !== id);
    setVaultItems(updated);
    localStorage.setItem("your_mind_quick_vault", JSON.stringify(updated));
  };

  const { coverImage, fitMode, openConfig, modals: coverModals } = useHomeCover({
    theme,
    accentColor: primaryColor,
  });

  const onCover = Boolean(coverImage);
  const cover = useCoverContrast({
    theme,
    imageUrl: coverImage || undefined,
    measure: fitMode === "cover",
  });

  const ui = getUi(dark);
  const userName = settings?.userName?.trim() || "Kamylle";
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;

  const getCardVisual = (index: number) => {
    if (colorStyle === "preset") {
      const [c1, c2, c3] = activePalette.colors;
      const paletteMap = [
        { color: c1, bg: withAlpha(c1, 0.16), glow: c1 },
        { color: c2, bg: withAlpha(c2, 0.18), glow: c2 },
        { color: c3, bg: withAlpha(c3, 0.16), glow: c3 },
        {
          color: isLightHex(c3) ? "#18181b" : "#ffffff",
          bg: activePalette.gradient,
          glow: c1,
        },
      ];
      return paletteMap[index % paletteMap.length];
    }

    if (colorStyle === "gradient") {
      return {
        color: isLightBtn ? "#18181b" : "#ffffff",
        bg: buildAccentGradient(primaryColor),
        glow: primaryColor,
      };
    }

    return {
      color: primaryColor,
      bg: withAlpha(primaryColor, 0.16),
      glow: primaryColor,
    };
  };

  const portals = [
    {
      title: "Trabalho & Código",
      description: "Mapas mentais, arquitetura e lógica técnica",
      actionLabel: "Criar",
      icon: GitFork,
      onClick: onNewFlow,
      visual: getCardVisual(0),
    },
    {
      title: "Estudos & Processos",
      description: "Quadros interativos para ciclos de estudo e tarefas",
      actionLabel: "Gerenciar",
      icon: Workflow,
      onClick: onNewProcess,
      visual: getCardVisual(1),
    },
    {
      title: "Repositório Geral",
      description: "Guarde notas, resumos, referências e metas",
      actionLabel: "Acessar",
      icon: BookOpen,
      onClick: () => onNavigate("planning"),
      visual: getCardVisual(2),
    },
    {
      title: "Assistente IA",
      description: "Seu co-piloto para código, dúvidas e resoluções",
      actionLabel: "Conversar",
      icon: Command,
      onClick: () => onNavigate("ai"),
      visual: getCardVisual(3),
    },
  ];

  // Formata data curta (ex: 2026-11-18 -> 18/11)
  const formatShortDate = (iso?: string) => {
    if (!iso) return "";
    const parts = iso.slice(0, 10).split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : iso;
  };

  return (
    <div className="thin-scroll h-full overflow-y-auto select-none">
      <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10">
        {/* BANNER EDITORIAL DE BOAS-VINDAS */}
        <section
          className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 transition-all duration-500 shadow-xl ${
            dark
              ? "border-white/10 bg-zinc-950 text-zinc-100"
              : "border-zinc-200 bg-white text-zinc-900 shadow-zinc-200/50"
          }`}
          style={
            onCover
              ? ({ "--cover-muted": cover.muted } as React.CSSProperties)
              : undefined
          }
        >
          {/* Brilho atmosférico */}
          <div
            className="absolute -left-20 -top-20 h-80 w-80 rounded-full opacity-30 blur-[110px] pointer-events-none z-10"
            style={{ background: primaryFill }}
          />
          {colorStyle !== "solid" && (
            <div
              className="absolute right-0 -top-20 h-64 w-64 rounded-full opacity-20 blur-[100px] pointer-events-none z-10"
              style={{ background: primaryFill }}
            />
          )}

          {coverImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage}
                alt="Capa"
                className={`absolute inset-0 h-full w-full z-0 ${
                  fitMode === "cover"
                    ? "object-cover object-center"
                    : "object-contain object-center"
                }`}
              />
              <div
                className="absolute inset-0 z-0"
                style={{
                  background: `linear-gradient(90deg, rgba(${cover.scrimRgb}, ${cover.scrimAlpha}) 0%, rgba(${cover.scrimRgb}, ${cover.scrimAlpha}) 55%, rgba(${cover.scrimRgb}, ${
                    cover.scrimAlpha * 0.15
                  }) 100%)`,
                }}
              />
            </>
          ) : (
            <div
              className="absolute inset-0 opacity-[0.06] z-0"
              style={{ background: primaryFill }}
            />
          )}

          {/* Botão de personalização de capa */}
          <div className="absolute right-6 top-6 z-30">
            <button
              onClick={openConfig}
              title="Personalizar ambiente"
              className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all border shadow-sm backdrop-blur-md active:scale-95 cursor-pointer ${
                dark
                  ? "bg-zinc-900/80 border-white/15 text-zinc-300 hover:text-white"
                  : "bg-white/90 border-zinc-200 text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <Pencil size={15} style={{ color: primaryColor }} />
            </button>
          </div>

          <div className="relative z-20 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div className="max-w-2xl flex-1 space-y-3">
              {/* Badge Superior com Ícone Compass + Saudação */}
              <div
                className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-xs font-semibold tracking-wide shadow-xs backdrop-blur-md border border-white/10"
                style={
                  onCover
                    ? {
                        backgroundColor: cover.chipBg,
                        borderColor: cover.chipBorder,
                        color: cover.text,
                      }
                    : {
                        backgroundColor: withAlpha(primaryColor, 0.15),
                        color: primaryColor,
                      }
                }
              >
                <Compass size={13} strokeWidth={2.3} />
                <span>
                  {greeting}, {userName} • {formatLong(todayKey)}
                </span>
              </div>

              {/* Título Principal Limpo */}
              <h1
                className={`text-3xl sm:text-4xl font-black tracking-tight ${
                  onCover ? "" : titleColor
                }`}
                style={
                  onCover
                    ? { color: cover.text, textShadow: cover.textShadow }
                    : undefined
                }
              >
                Your Mind
              </h1>

              {/* Mantra / Reflexão Editável */}
              <div>
                <input
                  type="text"
                  value={mantra}
                  onChange={(e) => handleSaveMantra(e.target.value)}
                  placeholder="Insira o seu foco, estudo ou pensamento para hoje..."
                  className={`w-full bg-transparent text-xs sm:text-sm italic font-medium outline-none transition-opacity ${
                    onCover
                      ? "placeholder:text-[color:var(--cover-muted)]"
                      : `opacity-85 focus:opacity-100 ${subtitleColor}`
                  }`}
                  style={
                    onCover
                      ? { color: cover.muted, textShadow: cover.textShadow }
                      : undefined
                  }
                />
              </div>

              {/* CAIXA DE CAPTURA RÁPIDA + ACESSO AO COFRE */}
              <form
                onSubmit={handleQuickCapture}
                className="pt-1 flex items-center gap-2"
              >
                <div
                  className={`relative flex-1 flex items-center rounded-2xl border backdrop-blur-md px-4 py-2 transition-all ${
                    dark
                      ? "bg-zinc-900/60 border-white/15 focus-within:border-white/30"
                      : "bg-white/80 border-zinc-200 focus-within:border-zinc-400"
                  }`}
                >
                  <Database size={15} className="text-zinc-400 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={quickInput}
                    onChange={(e) => setQuickInput(e.target.value)}
                    placeholder="Guarde qualquer ideia, link ou lembrete instantaneamente..."
                    className={`w-full bg-transparent text-xs sm:text-sm outline-none ${titleColor}`}
                  />
                  {quickSaved && (
                    <span className="mr-2 text-[11px] font-bold text-emerald-500 animate-fade-in shrink-0">
                      Salvo!
                    </span>
                  )}
                  <button
                    type="submit"
                    title="Salvar no Cofre Rápido"
                    className={`ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${
                      quickSaved
                        ? "bg-emerald-500 text-white"
                        : isLightBtn
                        ? "text-zinc-950"
                        : "text-white"
                    }`}
                    style={quickSaved ? undefined : { background: primaryFill }}
                  >
                    {quickSaved ? (
                      <Check size={14} strokeWidth={2.5} />
                    ) : (
                      <Send size={13} strokeWidth={2.2} />
                    )}
                  </button>
                </div>

                {vaultItems.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowVault((prev) => !prev)}
                    title="Ver ideias salvas rapidamente"
                    className={`flex h-11 items-center gap-1.5 rounded-2xl border px-3.5 text-xs font-bold backdrop-blur-md transition-all cursor-pointer shrink-0 ${
                      dark
                        ? "bg-zinc-900/70 border-white/15 text-zinc-200 hover:bg-zinc-800/80"
                        : "bg-white/90 border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <span>Cofre</span>
                    <span
                      className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black text-white"
                      style={{ backgroundColor: primaryColor }}
                    >
                      {vaultItems.length}
                    </span>
                  </button>
                )}
              </form>

              {/* Drawer Expansível do Cofre Rápido */}
              {showVault && vaultItems.length > 0 && (
                <div
                  className={`mt-2 rounded-2xl border p-3.5 backdrop-blur-xl space-y-2 animate-in fade-in duration-200 ${
                    dark
                      ? "bg-zinc-900/85 border-white/15"
                      : "bg-white/95 border-zinc-200 shadow-lg"
                  }`}
                >
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-500/10">
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
                      Notas Rápidas Salvas ({vaultItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowVault(false)}
                      className="text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto thin-scroll space-y-1.5 pr-1">
                    {vaultItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs ${
                          dark ? "bg-white/5" : "bg-zinc-100/80"
                        }`}
                      >
                        <span className={`truncate font-medium ${titleColor}`}>
                          {item.text}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteVaultItem(item.id)}
                          className="text-zinc-400 hover:text-red-400 shrink-0 cursor-pointer"
                          title="Remover"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Indicadores Rápidos Discretos no Canto Inferior Direito do Banner */}
            <div className="flex items-center gap-2.5 self-start lg:self-end">
              {[
                { label: "Fluxos", value: topics.length },
                { label: "Processos", value: pipelines.length },
                { label: "Hoje", value: `${completedCount}/${todaysTasks.length}` },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl border px-3.5 py-2 backdrop-blur-md text-center min-w-[72px] ${
                    onCover
                      ? "border-white/15 bg-black/45 text-white"
                      : dark
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-zinc-200/80 bg-zinc-50/80"
                  }`}
                >
                  <span className="block text-sm font-black leading-tight">
                    {stat.value}
                  </span>
                  <span className="block text-[10px] font-semibold text-zinc-400">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BENTO GRID DE PORTAIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.title}
                onClick={portal.onClick}
                className={`group relative overflow-hidden rounded-[1.8rem] border p-5 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-44 shadow-md ${
                  dark
                    ? "border-white/10 bg-zinc-950/80 hover:border-white/20"
                    : "border-zinc-200 bg-white hover:border-zinc-300"
                }`}
              >
                <div
                  className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full opacity-15 blur-2xl group-hover:opacity-30 transition-opacity"
                  style={{ background: portal.visual.glow }}
                />

                <div className="flex items-center justify-between z-10">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-105"
                    style={{
                      background: portal.visual.bg,
                      color: portal.visual.color,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <span
                    className={`flex items-center gap-1 text-xs font-bold transition-colors ${
                      dark
                        ? "text-zinc-400 group-hover:text-zinc-100"
                        : "text-zinc-500 group-hover:text-zinc-900"
                    }`}
                  >
                    {portal.actionLabel} <ArrowUpRight size={14} />
                  </span>
                </div>

                <div className="z-10 space-y-1">
                  <h3 className={`text-base font-extrabold ${titleColor}`}>
                    {portal.title}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {portal.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* GRADE INFERIOR: ATIVIDADES RECENTES E AGENDA DE HOJE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 1. Trabalhos & Códigos Recentes */}
          <div
            className={`rounded-[2rem] border p-6 sm:p-7 ${ui.panel} space-y-4`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2.5 rounded-xl"
                  style={{
                    background: portals[0].visual.bg,
                    color: portals[0].visual.color,
                  }}
                >
                  <GitFork size={17} />
                </div>
                <div>
                  <h3 className={`text-sm font-extrabold ${titleColor}`}>
                    Trabalhos & Estudos
                  </h3>
                  <p className="text-xs text-zinc-400">Retome seus fluxos</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate("flows")}
                className="flex items-center gap-1 text-xs font-bold hover:underline cursor-pointer"
                style={{ color: primaryColor }}
              >
                Ver todos
                <ArrowUpRight size={14} />
              </button>
            </div>

            {topics.length === 0 ? (
              <div
                className={`rounded-2xl border border-dashed px-4 py-10 text-center text-xs text-zinc-400 ${
                  dark ? "border-white/10" : "border-zinc-300/60"
                }`}
              >
                Nenhum projeto iniciado.
              </div>
            ) : (
              <div className="space-y-2">
                {[...topics]
                  .slice(-3)
                  .reverse()
                  .map((topic) => {
                    const isCode = topic.kind === "code";
                    return (
                      <button
                        key={topic.id}
                        onClick={() => onNavigate(topic.id)}
                        className={`group flex items-center justify-between w-full rounded-2xl border p-3.5 text-left transition-all hover:-translate-y-0.5 cursor-pointer ${
                          dark
                            ? "border-white/10 bg-white/2 hover:bg-white/5"
                            : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className="p-2 rounded-xl shrink-0"
                            style={{
                              background: portals[0].visual.bg,
                              color: portals[0].visual.color,
                            }}
                          >
                            {isCode ? (
                              <Code2 size={15} />
                            ) : (
                              <GitFork size={15} />
                            )}
                          </span>
                          <div className="min-w-0">
                            <span
                              className={`block truncate text-xs font-bold ${titleColor}`}
                            >
                              {topic.name}
                            </span>
                            <span className="block text-[10px] text-zinc-400">
                              {isCode ? "Código" : "Fluxograma"}
                            </span>
                          </div>
                        </div>
                        <ArrowUpRight
                          size={15}
                          className="text-zinc-400 group-hover:text-zinc-100 shrink-0 ml-2"
                        />
                      </button>
                    );
                  })}
              </div>
            )}
          </div>

          {/* 2. Processos & Quadros Ativos */}
          <div
            className={`rounded-[2rem] border p-6 sm:p-7 ${ui.panel} space-y-4`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="p-2.5 rounded-xl"
                  style={{
                    background: portals[1].visual.bg,
                    color: portals[1].visual.color,
                  }}
                >
                  <Workflow size={17} />
                </div>
                <div>
                  <h3 className={`text-sm font-extrabold ${titleColor}`}>
                    Processos Ativos
                  </h3>
                  <p className="text-xs text-zinc-400">Quadros e metas</p>
                </div>
              </div>

              <button
                onClick={() => onNavigate("processes")}
                className="flex items-center gap-1 text-xs font-bold hover:underline cursor-pointer"
                style={{ color: primaryColor }}
              >
                Ver todos
                <ArrowUpRight size={14} />
              </button>
            </div>

            {pipelines.length === 0 ? (
              <div
                className={`rounded-2xl border border-dashed px-4 py-10 text-center text-xs text-zinc-400 ${
                  dark ? "border-white/10" : "border-zinc-300/60"
                }`}
              >
                Nenhum processo criado.
              </div>
            ) : (
              <div className="space-y-2">
                {[...pipelines]
                  .slice(-3)
                  .reverse()
                  .map((pipeline) => (
                    <button
                      key={pipeline.id}
                      onClick={() => onNavigate(pipeline.id)}
                      className={`group flex items-center justify-between w-full rounded-2xl border p-3.5 text-left transition-all hover:-translate-y-0.5 cursor-pointer ${
                        dark
                          ? "border-white/10 bg-white/2 hover:bg-white/5"
                          : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="p-2 rounded-xl shrink-0"
                          style={{
                            background: portals[1].visual.bg,
                            color: portals[1].visual.color,
                          }}
                        >
                          <Layers size={15} />
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-xs font-bold ${titleColor}`}
                        >
                          {pipeline.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-400 shrink-0 ml-2">
                        {pipeline.cards.length} cards
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* 3. AGENDA & COMPROMISSOS DE HOJE + PRÓXIMO EVENTO */}
          <div
            className={`rounded-[2rem] border p-6 sm:p-7 ${ui.panel} space-y-4 flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="p-2.5 rounded-xl"
                    style={{
                      background: portals[2].visual.bg,
                      color: portals[2].visual.color,
                    }}
                  >
                    <CalendarIcon size={17} />
                  </div>
                  <div>
                    <h3 className={`text-sm font-extrabold ${titleColor}`}>
                      Agenda de Hoje
                    </h3>
                    <p className="text-xs text-zinc-400">
                      {todaysTasks.length === 0
                        ? "Nenhum item agendado"
                        : `${completedCount}/${todaysTasks.length} concluídas`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onOpenTaskModal(todayKey)}
                  title="Adicionar compromisso para hoje"
                  className={`flex h-8 w-8 items-center justify-center rounded-xl transition-all border shadow-xs active:scale-95 cursor-pointer ${
                    dark
                      ? "bg-zinc-900/80 border-white/15 text-zinc-300 hover:text-white"
                      : "bg-white/90 border-zinc-200 text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <Plus size={15} style={{ color: primaryColor }} />
                </button>
              </div>

              {/* Barra visual de progresso diário */}
              {todaysTasks.length > 0 && (
                <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-500/15">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progressPercent}%`,
                      background: primaryFill,
                    }}
                  />
                </div>
              )}

              {todaysTasks.length === 0 ? (
                <button
                  type="button"
                  onClick={() => onOpenTaskModal(todayKey)}
                  className={`w-full rounded-2xl border border-dashed px-4 py-6 text-center text-xs text-zinc-400 transition-colors cursor-pointer ${
                    dark
                      ? "border-white/10 hover:border-white/25 hover:bg-white/2"
                      : "border-zinc-300/60 hover:border-zinc-400 hover:bg-zinc-50"
                  }`}
                >
                  Nenhum compromisso para hoje. Clique aqui ou no (+) para
                  adicionar!
                </button>
              ) : (
                <div className="space-y-2 max-h-[155px] overflow-y-auto thin-scroll pr-1">
                  {todaysTasks.map((task) => {
                    const taskWithExtra = task as Task & {
                      text?: string;
                      time?: string;
                    };
                    return (
                      <div
                        key={task.id}
                        className={`group flex items-center justify-between w-full rounded-2xl border p-3 transition-all ${
                          dark
                            ? "border-white/10 bg-white/2 hover:bg-white/5"
                            : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <button
                            onClick={() => onToggleTask(task.id)}
                            className="shrink-0 transition-transform hover:scale-110 cursor-pointer"
                          >
                            {task.completed ? (
                              <CheckCircle2
                                size={17}
                                style={{ color: primaryColor }}
                              />
                            ) : (
                              <Circle size={17} className="text-zinc-400" />
                            )}
                          </button>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`block truncate text-xs font-bold ${
                                task.completed ? "line-through opacity-50" : ""
                              } ${titleColor}`}
                            >
                              {task.title || taskWithExtra.text}
                            </span>
                            {taskWithExtra.time && (
                              <span className="block text-[10px] text-zinc-400 font-medium">
                                {taskWithExtra.time}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Destaque do Próximo Evento Futuro */}
              {nextUpcomingTask && (
                <div
                  onClick={() => onNavigate("calendar")}
                  className={`mt-3 flex items-center justify-between gap-2 rounded-2xl border px-3.5 py-2.5 cursor-pointer transition-colors ${
                    dark
                      ? "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                      : "border-zinc-200/80 bg-zinc-50 hover:bg-zinc-100"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Clock
                      size={13}
                      className="shrink-0"
                      style={{ color: primaryColor }}
                    />
                    <div className="min-w-0">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        Próximo evento • {formatShortDate(nextUpcomingTask.dueDate)}
                      </span>
                      <span className={`block truncate text-xs font-bold ${titleColor}`}>
                        {nextUpcomingTask.title}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight size={13} className="text-zinc-400 shrink-0" />
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigate("calendar")}
                className="flex items-center justify-between w-full text-xs font-bold hover:underline cursor-pointer pt-2 border-t border-zinc-500/10"
                style={{ color: primaryColor }}
              >
                <span>Ver calendário completo</span>
                <ArrowUpRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {coverModals}
    </div>
  );
}