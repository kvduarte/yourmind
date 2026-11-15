"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Sparkles,
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

  // 4. Otimização de performance com useMemo para filtragem e métricas de hoje
  const { todaysTasks, completedCount, progressPercent } = useMemo(() => {
    const filtered = tasks.filter((t) => t.date === todayKey);
    const completed = filtered.filter((t) => t.completed).length;
    const percent =
      filtered.length > 0 ? Math.round((completed / filtered.length) * 100) : 0;

    return {
      todaysTasks: filtered,
      completedCount: completed,
      progressPercent: percent,
    };
  }, [tasks, todayKey]);

  // Encontra a paleta multi-cor selecionada
  const activePalette =
    CURATED_PALETTES.find((p) => p.id === colorPreset) || CURATED_PALETTES[0];

  // Cor principal para textos/badges
  const primaryColor =
    colorStyle === "preset" ? activePalette.colors[0] : accentColor;

  // Preenchimento real (suporta gradiente CSS via `background`)
  const primaryFill =
    colorStyle === "gradient"
      ? buildAccentGradient(primaryColor)
      : colorStyle === "preset"
      ? activePalette.gradient
      : primaryColor;

  const isLightBtn = isLightHex(primaryColor);

  /* Frase/Mantra pessoal persistida */
  const [mantra, setMantra] = useState("");
  /* Captura rápida na Home ("guardar qualquer coisa") */
  const [quickInput, setQuickInput] = useState("");
  /* 2. Estado de feedback visual ao salvar ideia rápida */
  const [quickSaved, setQuickSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setMantra(
        localStorage.getItem("user_creative_mantra") ||
          "Construindo sistemas, estudando arquitetura e expandindo a mente."
      );
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

    const existing = JSON.parse(
      localStorage.getItem("your_mind_quick_vault") || "[]"
    );
    const newItem = {
      id: Date.now(),
      text: quickInput,
      date: new Date().toISOString(),
    };
    localStorage.setItem(
      "your_mind_quick_vault",
      JSON.stringify([newItem, ...existing])
    );

    setQuickInput("");
    setQuickSaved(true);
    setTimeout(() => setQuickSaved(false), 1800);
  };

  const { coverImage, fitMode, openConfig, modals: coverModals } = useHomeCover({
    theme,
    accentColor: primaryColor,
  });

  /* Cores do texto da capa: medidas na própria imagem, para sempre ficarem legíveis.
     No modo "Completa" (contain) a imagem não preenche a faixa, então decide só pelo tema. */
  const onCover = Boolean(coverImage);
  const cover = useCoverContrast({
    theme,
    imageUrl: coverImage || undefined,
    measure: fitMode === "cover",
  });

  const ui = getUi(dark);
  const userName = settings?.userName?.trim() ?? "Kamylle";
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;

  // Distribui as 3 cores misturadas da paleta pelos 4 cards do Bento Grid
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
          {/* Brilho atmosférico reposicionado para o TOPO */}
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
              {/* Véu de leitura: a cor (preto ou branco) e a força vêm do contraste medido
                  na foto. Fica cheio sobre o texto e some para a direita, deixando a
                  imagem aparecer. */}
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

          <div className="relative z-20 max-w-2xl space-y-3">
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
              <Sparkles size={13} />
              <span>
                Workspace Central de {userName} • {formatLong(todayKey)}
              </span>
            </div>

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

            {/* CAIXA DE CAPTURA RÁPIDA COM FEEDBACK VISUAL */}
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
                  title="Salvar no Repositório"
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
            </form>
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

          {/* 3. AGENDA & COMPROMISSOS DE HOJE */}
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
                    {/* 1. Contador de progresso */}
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

              {/* 1. Barra visual de progresso diário */}
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
                /* 3. Área vazia clicável para criar tarefa rapidamente */
                <button
                  type="button"
                  onClick={() => onOpenTaskModal(todayKey)}
                  className={`w-full rounded-2xl border border-dashed px-4 py-8 text-center text-xs text-zinc-400 transition-colors cursor-pointer ${
                    dark
                      ? "border-white/10 hover:border-white/25 hover:bg-white/2"
                      : "border-zinc-300/60 hover:border-zinc-400 hover:bg-zinc-50"
                  }`}
                >
                  Nenhum compromisso ou tarefa para hoje. Clique aqui ou no (+)
                  para adicionar!
                </button>
              ) : (
                <div className="space-y-2 max-h-[180px] overflow-y-auto thin-scroll pr-1">
                  {todaysTasks.map((task) => (
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
                            {task.title || task.text}
                          </span>
                          {task.time && (
                            <span className="block text-[10px] text-zinc-400 font-medium">
                              {task.time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigate("planning")}
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