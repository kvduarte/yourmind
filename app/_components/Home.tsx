"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Plus,
  StickyNote,
  GitFork,
  Workflow,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  AlertTriangle,
  Flame,
  ArrowRight,
  Layers,
  Sparkles,
  Upload,
  Link as LinkIcon,
  X,
  Check,
  Move,
  Pencil,
  Trash2,
  Maximize2,
  Crop,
  Search,
  CheckCircle2,
  Target,
  Zap,
} from "lucide-react";

import { Folder, Task, Theme, Topic } from "@/types";
import { Pipeline, getPriority } from "@/lib/pipeline";
import {
  WEEKDAYS,
  buildMonthGrid,
  formatLong,
  normalizeDate,
  toKey,
} from "@/lib/dates";
import { DEFAULT_ACCENT, STATUS, withAlpha } from "@/lib/theme";
import { getUi } from "@/lib/ui";
import { normalizeImageUrl } from "@/lib/link";
import { AppSettings } from "@/lib/settings";

import TaskRow from "./TaskRow";
import TaskModal from "./taskModal";
import ModalShell from "./ModalShell";

interface HomeProps {
  tasks: Task[];
  topics: Topic[];
  folders: Folder[];
  pipelines: Pipeline[];
  theme: Theme;
  settings?: AppSettings & { accentColor?: string; bgImageUrl?: string };
  onOpenTaskModal: (date?: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSaveEditedTask: (task: Task) => void;
  /** cria uma anotação nova (anotação rápida) */
  onCreateTask: (task: Task) => void;
  onNavigate: (target: string) => void;
  onNewFlow: () => void;
  onNewProcess: () => void;
}

type CalendarEvent =
  | { type: "task"; key: string; task: Task }
  | {
      type: "card";
      key: string;
      pipeline: Pipeline;
      title: string;
      stageName: string;
      stageColor: string;
      done: boolean;
    };

const DEFAULT_COLOR = DEFAULT_ACCENT;

/** Tamanho final da capa (faixa 16:5) */
const COVER_W = 1920;
const COVER_H = 600;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export default function Home({
  tasks,
  topics,
  pipelines,
  theme,
  settings,
  onOpenTaskModal,
  onToggleTask,
  onDeleteTask,
  onSaveEditedTask,
  onCreateTask,
  onNavigate,
  onNewFlow,
  onNewProcess,
}: HomeProps) {
  const dark = theme === "dark";
  const accentColor = settings?.accentColor || DEFAULT_COLOR;
  const todayKey = toKey(new Date());

  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [quickNoteTitle, setQuickNoteTitle] = useState("");

  /* ---------- Saudação Dinâmica Detalhada ---------- */
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) return "Boa madrugada";
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  /* ---------- Meta do Dia (Persistida) ---------- */
  const [dailyGoal, setDailyGoal] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedGoal = localStorage.getItem(`daily_goal_${todayKey}`);
      if (savedGoal) setDailyGoal(savedGoal);
    }
  }, [todayKey]);

  const handleSaveGoal = (val: string) => {
    setDailyGoal(val);
    if (typeof window !== "undefined") {
      localStorage.setItem(`daily_goal_${todayKey}`, val);
    }
  };

  /* ---------- Capa personalizada ---------- */
  const [coverImage, setCoverImage] = useState<string>("");
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState("");
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [coverError, setCoverError] = useState("");
  const [showLinkField, setShowLinkField] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  /* enquadramento: zoom (1 = preenche a faixa) e deslocamento em pixels da moldura */
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 });

  const frameRef = useRef<HTMLDivElement | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedSrc = localStorage.getItem("home_cover_src");
      const savedFit = localStorage.getItem("home_cover_fit");
      if (savedSrc) setCoverImage(savedSrc);
      if (savedFit === "cover" || savedFit === "contain") setFitMode(savedFit);
    } catch {
      /* ignora */
    }
  }, []);

  /** Salva a capa. Devolve false se o navegador recusar (armazenamento cheio). */
  const saveCover = (newSrc: string, fit?: "cover" | "contain"): boolean => {
    const newFit = fit || fitMode;

    try {
      if (newSrc) {
        localStorage.setItem("home_cover_src", newSrc);
      } else {
        localStorage.removeItem("home_cover_src");
      }

      localStorage.setItem("home_cover_fit", newFit);
    } catch {
      setCoverError("Não foi possível salvar: a imagem é pesada demais para o armazenamento do navegador. Tente uma menor.");

      return false;
    }

    setCoverImage(newSrc);
    setFitMode(newFit);
    setCoverError("");

    return true;
  };

  const toggleFitMode = (mode: "cover" | "contain") => {
    setFitMode(mode);

    try {
      localStorage.setItem("home_cover_fit", mode);
    } catch {
      /* ignora */
    }
  };

  const closeConfig = () => {
    setShowConfigModal(false);
    setShowLinkField(false);
    setLinkValue("");
    setCoverError("");
  };

  const closeCrop = () => {
    setShowCropModal(false);
    setRawImageSrc("");
    setIsDragging(false);
    dragRef.current = null;
  };

  const prepareEditor = (src: string) => {
    const imgObj = new Image();
    imgObj.crossOrigin = "anonymous";

    imgObj.onload = () => {
      setNaturalDimensions({
        width: imgObj.naturalWidth || 1920,
        height: imgObj.naturalHeight || 1080,
      });
      setRawImageSrc(src);
      setScale(1);
      setPosition({ x: 0, y: 0 });
      closeConfig();
      setShowCropModal(true);
    };

    /* Sites que bloqueiam o editor: usa a imagem como está, sem enquadrar */
    imgObj.onerror = () => {
      if (saveCover(src, "cover")) closeConfig();
    };

    imgObj.src = src;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    e.target.value = ""; // permite escolher o mesmo arquivo de novo

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCoverError("Escolha um arquivo de imagem.");

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") prepareEditor(reader.result);
    };

    reader.onerror = () => setCoverError("Não consegui ler esse arquivo.");
    reader.readAsDataURL(file);
  };

  const handleLinkSubmit = () => {
    const url = normalizeImageUrl(linkValue);

    if (!url) {
      setCoverError("Cole um link de imagem válido.");

      return;
    }

    prepareEditor(url);
  };

  /* ---------- geometria do enquadramento ---------- */
  const baseScale =
    naturalDimensions.width && frameSize.w
      ? Math.max(frameSize.w / naturalDimensions.width, frameSize.h / naturalDimensions.height)
      : 1;

  const drawW = naturalDimensions.width * baseScale * scale;
  const drawH = naturalDimensions.height * baseScale * scale;

  const clampPos = (p: { x: number; y: number }) => ({
    x: clamp(p.x, -Math.max(0, (drawW - frameSize.w) / 2), Math.max(0, (drawW - frameSize.w) / 2)),
    y: clamp(p.y, -Math.max(0, (drawH - frameSize.h) / 2), Math.max(0, (drawH - frameSize.h) / 2)),
  });

  const pos = clampPos(position);

  useEffect(() => {
    if (!showCropModal) return;

    const el = frameRef.current;

    if (!el) return;

    const measure = () => setFrameSize({ w: el.clientWidth, h: el.clientHeight });

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);

    /* o React registra o scroll como passivo; aqui precisamos bloquear a rolagem da página */
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((current) => clamp(current - e.deltaY * 0.0015, 1, 4));
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", onWheel);
    };
  }, [showCropModal]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;

    if (!d) return;

    setPosition(clampPos({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

  const handleConfirmCrop = () => {
    const img = previewImageRef.current;

    if (!img || !frameSize.w || !naturalDimensions.width) return;

    let saved = false;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = COVER_W;
      canvas.height = COVER_H;

      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("canvas");

      /* o que aparece na moldura é exatamente o que vai para a capa */
      const r = COVER_W / frameSize.w;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        COVER_W / 2 + pos.x * r - (drawW * r) / 2,
        COVER_H / 2 + pos.y * r - (drawH * r) / 2,
        drawW * r,
        drawH * r
      );

      saved = saveCover(canvas.toDataURL("image/jpeg", 0.9), "cover");
    } catch {
      /* imagem de outro site bloqueou o recorte: guarda o endereço original */
      saved = saveCover(rawImageSrc, "cover");
    }

    if (saved) closeCrop();
  };

  const ui = getUi(dark);
  const userName = settings?.userName?.trim() ?? "";
  const panel = ui.panel;
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;
  const hover = ui.hover;

  /* ---------- Dados & Métricas ---------- */

  const withKey = useMemo(
    () => tasks.map((task) => ({ task, key: normalizeDate(task.dueDate) })),
    [tasks]
  );

  const pending = withKey.filter(({ task }) => !task.completed);
  const overdue = pending.filter(({ key }) => key && key < todayKey);
  const dueToday = pending.filter(({ key }) => key === todayKey);

  const urgentCards = useMemo(
    () =>
      pipelines.flatMap((pipeline) => {
        const last = pipeline.stages[pipeline.stages.length - 1]?.id;

        return pipeline.cards
          .filter(
            (card) =>
              (card.priority === "urgent" || card.priority === "immediate") &&
              card.stageId !== last
          )
          .map((card) => ({ pipeline, card }));
      }),
    [pipelines]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    const push = (event: CalendarEvent) => {
      (map[event.key] ||= []).push(event);
    };

    withKey.forEach(({ task, key }) => {
      if (key) push({ type: "task", key, task });
    });

    pipelines.forEach((pipeline) => {
      const last = pipeline.stages[pipeline.stages.length - 1];

      pipeline.cards.forEach((card) => {
        const key = normalizeDate(card.dueDate);

        if (!key) return;

        const stage = pipeline.stages.find((s) => s.id === card.stageId);

        push({
          type: "card",
          key,
          pipeline,
          title: card.title,
          stageName: stage?.name ?? "",
          stageColor: stage?.color ?? accentColor,
          done: card.stageId === last?.id,
        });
      });
    });

    return map;
  }, [withKey, pipelines, accentColor]);

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);

  /* Cálculo de progresso do dia selecionado */
  const selectedEvents = eventsByDate[selectedKey] ?? [];
  const selectedTasks = selectedEvents.filter((e): e is CalendarEvent & { type: "task" } => e.type === "task");
  const completedTasksCount = selectedTasks.filter((e) => e.task.completed).length;
  const progressPercent = selectedTasks.length > 0 ? Math.round((completedTasksCount / selectedTasks.length) * 100) : 0;

  /* Filtro de busca do painel lateral */
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return selectedEvents;
    const q = searchQuery.toLowerCase();
    return selectedEvents.filter((e) =>
      e.type === "task"
        ? e.task.title.toLowerCase().includes(q)
        : e.title.toLowerCase().includes(q)
    );
  }, [selectedEvents, searchQuery]);

  /* Anotação rápida: Enter cria uma anotação nova na data selecionada */
  const handleQuickNoteSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || e.nativeEvent.isComposing) return;

    const title = quickNoteTitle.trim();

    if (!title) return;

    onCreateTask({
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title,
      description: "",
      topicId: "",
      createdAt: todayKey,
      dueDate: selectedKey,
      completed: false,
    } as Task);

    setQuickNoteTitle("");
  };

  const monthLabel = viewMonth.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const shiftMonth = (delta: number) =>
    setViewMonth((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const goToday = () => {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedKey(todayKey);
  };

  const rowProps = {
    todayKey,
    topics,
    dark,
    onToggle: onToggleTask,
    onEdit: setEditingTask,
    onDelete: onDeleteTask,
    onOpenTopic: onNavigate,
  };

  return (
    <div className="thin-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10">
        
        {/* BANNER HERO */}
        <section
          className={`relative overflow-hidden rounded-2xl border p-8 sm:p-12 transition-all duration-300 shadow-xl ${
            dark
              ? "border-white/10 bg-zinc-950 text-zinc-100"
              : "border-zinc-300/60 bg-zinc-100/90 text-zinc-900 shadow-zinc-200/40"
          }`}
        >
          {/* Efeitos de Luz Discretos */}
          <div
            className="absolute -left-24 -top-24 h-96 w-96 rounded-full opacity-25 blur-[90px] pointer-events-none z-10"
            style={{ backgroundColor: accentColor }}
          />

          {/* Imagem de Capa */}
          {coverImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage}
                alt="Foto de capa"
                className={`absolute inset-0 h-full w-full z-0 ${
                  fitMode === "cover" ? "object-cover object-center" : "object-contain object-center"
                }`}
              />
              <div
                className="absolute inset-0 z-0"
                style={{
                  background: dark
                    ? `linear-gradient(90deg, rgba(9, 9, 11, 0.94) 0%, rgba(9, 9, 11, 0.45) 35% 65%, rgba(9, 9, 11, 0.94) 100%)`
                    : `linear-gradient(90deg, rgba(244, 244, 245, 0.92) 0%, rgba(244, 244, 245, 0.35) 35% 65%, rgba(244, 244, 245, 0.92) 100%)`,
                }}
              />
            </>
          ) : (
            <div
              className="absolute inset-0 opacity-10 z-0"
              style={{ backgroundColor: accentColor }}
            />
          )}

          {/* Botão Pincel */}
          <div className="absolute right-6 top-6 z-30">
            <button
              onClick={() => setShowConfigModal(true)}
              title="Personalizar capa"
              aria-label="Personalizar capa"
              className={`flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200 border shadow-sm backdrop-blur-md active:scale-95 ${
                dark
                  ? "bg-zinc-900/80 border-white/15 text-zinc-200 hover:bg-zinc-800 hover:text-white"
                  : "bg-white/90 border-zinc-200 text-zinc-700 hover:bg-white hover:text-zinc-900"
              }`}
            >
              <Pencil size={17} style={{ color: accentColor }} />
            </button>
          </div>

          <div className="relative z-20 max-w-2xl space-y-4 pt-2">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold tracking-wide shadow-sm backdrop-blur-md border border-white/10"
              style={{ backgroundColor: withAlpha(accentColor, 0.13), color: accentColor }}
            >
              <Sparkles size={14} />
              <span>
                {greeting}
                {userName ? `, ${userName}` : ""} • {formatLong(todayKey)}
              </span>
            </div>

            <h1 className={`text-4xl font-extrabold tracking-tight sm:text-5xl drop-shadow-sm ${dark ? "text-zinc-100" : "text-zinc-900"}`}>
              Visão Geral
            </h1>

            {/* META DO DIA MINIMALISTA */}
            <div className={`flex items-center gap-2.5 rounded-2xl border px-4 py-2 text-xs backdrop-blur-md max-w-lg transition-all ${
              dark ? "border-white/10 bg-black/40 text-zinc-200" : "border-zinc-300/60 bg-white/70 text-zinc-800"
            }`}>
              <Target size={15} style={{ color: accentColor }} className="shrink-0" />
              <span className="font-bold text-[10px] uppercase tracking-wider opacity-60 shrink-0">Meta de hoje:</span>
              <input
                type="text"
                placeholder="Qual é o seu objetivo principal hoje?"
                value={dailyGoal}
                onChange={(e) => handleSaveGoal(e.target.value)}
                className="w-full bg-transparent outline-none font-semibold placeholder:font-normal placeholder:opacity-50"
              />
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => onOpenTaskModal(todayKey)}
                className={ui.btnPrimary}
              >
                <StickyNote size={16} />
                Nova Anotação
              </button>

              <button
                onClick={onNewFlow}
                className={ui.btnSecondary}
              >
                <GitFork size={16} style={{ color: accentColor }} />
                Novo Fluxograma
              </button>

              <button
                onClick={onNewProcess}
                className={ui.btnSecondary}
              >
                <Workflow size={16} style={{ color: accentColor }} />
                Novo Processo
              </button>
            </div>
          </div>
        </section>

        {/* STATS RÁPIDOS CLEAN */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            onClick={() => setSelectedKey(todayKey)}
            className={`group flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${panel}`}
          >
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105"
              style={{ backgroundColor: withAlpha(accentColor, 0.08), color: accentColor }}
            >
              <Clock size={20} />
            </div>
            <div className="min-w-0">
              <span className={`block text-2xl font-black tracking-tight ${titleColor}`}>
                {dueToday.length}
              </span>
              <span className={`block text-[11px] font-semibold ${subtitleColor}`}>
                Anotações para hoje
              </span>
            </div>
          </button>

          <button
            onClick={() => onNavigate("notes")}
            className={`group flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${panel}`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105 bg-red-500/15 text-red-500">
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <span className={`block text-2xl font-black tracking-tight ${titleColor}`}>
                {overdue.length}
              </span>
              <span className={`block text-[11px] font-semibold ${subtitleColor}`}>
                Anotações atrasadas
              </span>
            </div>
          </button>

          <button
            onClick={() => onNavigate("processes")}
            className={`group flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 ${panel}`}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 shadow-xs transition-transform group-hover:scale-105">
              <Flame size={20} />
            </div>
            <div className="min-w-0">
              <span className={`block text-2xl font-black tracking-tight ${titleColor}`}>
                {urgentCards.length}
              </span>
              <span className={`block text-[11px] font-semibold ${subtitleColor}`}>
                Cards urgentes
              </span>
            </div>
          </button>
        </section>

        {/* CORPO PRINCIPAL */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          
          {/* CALENDÁRIO COMPACTO & CLEAN */}
          <section className={`rounded-2xl border p-5 sm:p-6 ${panel}`}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className={`flex items-center gap-2.5 text-base font-extrabold capitalize ${titleColor}`}>
                <span className="p-1.5 rounded-lg shadow-xs" style={{ backgroundColor: withAlpha(accentColor, 0.08), color: accentColor }}>
                  <CalendarDays size={18} />
                </span>
                {monthLabel}
              </h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={goToday}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${dark ? "bg-white/[0.08] text-zinc-200" : "bg-zinc-100 text-zinc-800"} ${hover}`}
                >
                  Hoje
                </button>

                <div className={`flex items-center rounded-lg border p-0.5 ${dark ? "border-white/10 bg-white/[0.03]" : "border-zinc-200 bg-zinc-50"}`}>
                  <button
                    onClick={() => shiftMonth(-1)}
                    title="Mês anterior"
                    className={`rounded-md p-1 transition-colors ${titleColor} ${hover}`}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => shiftMonth(1)}
                    title="Próximo mês"
                    className={`rounded-md p-1 transition-colors ${titleColor} ${hover}`}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((day) => (
                <div key={day} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {day}
                </div>
              ))}

              {grid.map(({ date, key, inMonth }) => {
                const events = eventsByDate[key] ?? [];
                const selected = key === selectedKey;
                const isToday = key === todayKey;

                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedKey(key);
                      if (!inMonth) {
                        setViewMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                      }
                    }}
                    className={`flex min-h-[4rem] flex-col items-stretch rounded-xl border p-1.5 text-left transition-all lg:min-h-[5rem] ${
                      selected
                        ? "shadow-xs"
                        : `border-transparent ${dark ? "bg-white/[0.015] hover:bg-white/[0.05]" : "bg-zinc-100/40 hover:bg-zinc-100"}`
                    } ${inMonth ? "" : "opacity-30"}`}
                    style={
                      selected
                        ? {
                            borderColor: accentColor,
                            boxShadow: `0 0 0 1px ${accentColor}`,
                            backgroundColor: withAlpha(accentColor, 0.08),
                          }
                        : undefined
                    }
                  >
                    <span
                      className={`mb-1 flex h-6 w-6 items-center justify-center rounded-lg text-[11px] font-extrabold shadow-xs ${
                        isToday ? "text-white" : titleColor
                      }`}
                      style={isToday ? { backgroundColor: accentColor } : undefined}
                    >
                      {date.getDate()}
                    </span>

                    <div className="hidden space-y-0.5 lg:block">
                      {events.slice(0, 2).map((event, index) => {
                        const isOverdue =
                          event.type === "task" && !event.task.completed && event.key < todayKey;

                        const color =
                          event.type === "card"
                            ? accentColor
                            : event.task.completed
                              ? STATUS.success
                              : isOverdue
                                ? STATUS.danger
                                : accentColor;

                        return (
                          <div
                            key={index}
                            className="truncate rounded px-1 py-0.5 text-[9px] font-semibold"
                            style={{ backgroundColor: withAlpha(color, 0.13), color }}
                          >
                            {event.type === "card" ? event.title : event.task.title}
                          </div>
                        );
                      })}

                      {events.length > 2 && (
                        <p className="px-0.5 text-[9px] font-bold text-zinc-400">+{events.length - 2}</p>
                      )}
                    </div>

                    {events.length > 0 && (
                      <div className="mt-auto flex gap-0.5 pt-0.5 lg:hidden">
                        {events.slice(0, 3).map((_, index) => (
                          <span key={index} className="h-1 w-1 rounded-full" style={{ backgroundColor: accentColor }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* PAINEL LATERAL DIREITO COMPACTO */}
          <div className="space-y-4">
            
            {/* Dia Selecionado */}
            <section className={`rounded-2xl border p-5 ${panel}`}>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: accentColor }}>
                    {selectedKey === todayKey ? "Hoje" : "Selecionado"}
                  </span>
                  <h3 className={`mt-0.5 text-sm font-bold capitalize ${titleColor}`}>
                    {formatLong(selectedKey)}
                  </h3>
                </div>

                <button
                  onClick={() => onOpenTaskModal(selectedKey)}
                  className={ui.btnPrimarySm}
                >
                  <Plus size={13} />
                  Adicionar
                </button>
              </div>

              {/* BARRA DE PROGRESSO DO DIA */}
              {selectedTasks.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 size={12} style={{ color: accentColor }} />
                      Progresso de tarefas
                    </span>
                    <span>{completedTasksCount} de {selectedTasks.length} ({progressPercent}%)</span>
                  </div>
                  <div className={`h-1.5 w-full overflow-hidden rounded-full ${dark ? "bg-white/10" : "bg-zinc-200"}`}>
                    <div
                      className="h-full transition-all duration-300"
                      style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
                    />
                  </div>
                </div>
              )}

              {/* INPUT DE ANOTAÇÃO RÁPIDA (ENTER PARA SALVAR) */}
              <div className={`mb-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-all ${ui.inputBox}`}>
                <Zap size={13} style={{ color: accentColor }} className="shrink-0" />
                <input
                  type="text"
                  placeholder="Anotação rápida... (Enter)"
                  value={quickNoteTitle}
                  onChange={(e) => setQuickNoteTitle(e.target.value)}
                  onKeyDown={handleQuickNoteSubmit}
                  className="w-full bg-transparent text-xs outline-none font-medium placeholder:font-normal"
                />
              </div>

              {/* BUSCA RÁPIDA NO DIA */}
              {selectedEvents.length > 3 && (
                <div className={`mb-3 flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs ${
                  dark ? "border-white/10 bg-white/[0.02]" : "border-zinc-200 bg-zinc-50"
                }`}>
                  <Search size={13} className="text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Filtrar anotações do dia..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs outline-none"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-zinc-400 hover:text-zinc-200">
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}

              {filteredEvents.length === 0 ? (
                <div className={`rounded-2xl border border-dashed px-4 py-6 text-center text-xs text-zinc-400 ${dark ? "border-white/10" : "border-zinc-300/60"}`}>
                  {searchQuery ? "Nenhum resultado encontrado." : "Nenhum registro agendado."}
                </div>
              ) : (
                <div className="-mx-1.5 space-y-1">
                  {filteredEvents.map((event, index) =>
                    event.type === "task" ? (
                      <TaskRow
                        key={event.task.id}
                        task={event.task}
                        dateKey={event.key}
                        compact
                        {...rowProps}
                      />
                    ) : (
                      <button
                        key={`${event.pipeline.id}-${index}`}
                        onClick={() => onNavigate(event.pipeline.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${hover}`}
                      >
                        <span style={{ color: accentColor }}>
                          <Workflow size={16} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-xs font-bold ${titleColor}`}>
                            {event.title}
                          </span>
                          <span className="block truncate text-[10px] text-zinc-400">
                            {event.pipeline.name}
                          </span>
                        </span>
                      </button>
                    )
                  )}
                </div>
              )}
            </section>

            {/* Processos Ativos */}
            {pipelines.length > 0 && (
              <section className={`rounded-2xl border p-5 ${panel}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={`text-xs font-extrabold ${titleColor}`}>
                    Processos Ativos
                  </h3>
                  <button
                    onClick={() => onNavigate("processes")}
                    className="flex items-center gap-1 text-[11px] font-bold hover:underline"
                    style={{ color: accentColor }}
                  >
                    Ver todos
                    <ArrowRight size={12} />
                  </button>
                </div>

                <div className="-mx-1.5 space-y-1">
                  {pipelines.slice(0, 2).map((pipeline) => (
                    <button
                      key={pipeline.id}
                      onClick={() => onNavigate(pipeline.id)}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${hover}`}
                    >
                      <span style={{ color: accentColor }}>
                        <Layers size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-xs font-bold ${titleColor}`}>
                          {pipeline.name}
                        </span>
                        <span className="block truncate text-[10px] text-zinc-400">
                          {pipeline.cards.length} {pipeline.cards.length === 1 ? "card" : "cards"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Fluxogramas Recentes */}
            {topics.length > 0 && (
              <section className={`rounded-2xl border p-5 ${panel}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={`text-xs font-extrabold ${titleColor}`}>
                    Fluxogramas Recentes
                  </h3>
                  <button
                    onClick={() => onNavigate("flows")}
                    className="flex items-center gap-1 text-[11px] font-bold hover:underline"
                    style={{ color: accentColor }}
                  >
                    Ver todos
                    <ArrowRight size={12} />
                  </button>
                </div>

                <div className="-mx-1.5 space-y-1">
                  {[...topics]
                    .slice(-2)
                    .reverse()
                    .map((topic) => (
                      <button
                        key={topic.id}
                        onClick={() => onNavigate(topic.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${hover}`}
                      >
                        <span style={{ color: accentColor }}>
                          <GitFork size={16} />
                        </span>
                        <span className={`min-w-0 flex-1 truncate text-xs font-bold ${titleColor}`}>
                          {topic.name}
                        </span>
                      </button>
                    ))}
                </div>
              </section>
            )}

          </div>
        </div>

      </div>

      {/* MODAL: FOTO DE CAPA */}
      {showConfigModal && (
        <ModalShell
          theme={theme}
          title="Foto de capa"
          description="Personalize o banner da tela inicial."
          icon={<Pencil size={16} />}
          size="sm"
          onClose={closeConfig}
          footer={
            <button type="button" onClick={closeConfig} className={ui.btnGhost}>
              Fechar
            </button>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 text-xs font-semibold transition-all ${ui.option}`}
              >
                <Upload size={17} style={{ color: accentColor }} />
                <span>Enviar nova imagem</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>

              {showLinkField ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={linkValue}
                    onChange={(e) => setLinkValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleLinkSubmit();
                    }}
                    placeholder="Cole o link da imagem"
                    className={`min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-xs outline-none transition-colors ${ui.field}`}
                  />
                  <button type="button" onClick={handleLinkSubmit} className={ui.btnPrimarySm}>
                    Usar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLinkField(true)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-xs font-semibold transition-all ${ui.option}`}
                >
                  <LinkIcon size={17} style={{ color: accentColor }} />
                  <span>Adicionar por link</span>
                </button>
              )}
            </div>

            {coverError && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {coverError}
              </p>
            )}

            {coverImage && (
              <div className="space-y-2">
                <span className={`block text-[10px] font-bold uppercase tracking-wider ${subtitleColor}`}>
                  Modo de exibição
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["cover", "Preencher", <Crop key="c" size={14} />],
                      ["contain", "Completa", <Maximize2 key="m" size={14} />],
                    ] as const
                  ).map(([mode, label, icon]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => toggleFitMode(mode)}
                      className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                        fitMode === mode ? "" : ui.option
                      }`}
                      style={
                        fitMode === mode
                          ? {
                              borderColor: accentColor,
                              backgroundColor: withAlpha(accentColor, 0.15),
                              color: accentColor,
                            }
                          : undefined
                      }
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => prepareEditor(coverImage)}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${ui.option}`}
                >
                  <Move size={15} style={{ color: accentColor }} />
                  Ajustar enquadramento
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (saveCover("")) closeConfig();
                  }}
                  className={`${ui.btnDanger} w-full justify-start rounded-2xl p-3`}
                >
                  <Trash2 size={17} />
                  <span>Remover foto atual</span>
                </button>
              </div>
            )}
          </div>
        </ModalShell>
      )}

      {/* MODAL: ENQUADRAMENTO DA CAPA */}
      {showCropModal && (
        <ModalShell
          theme={theme}
          title="Ajustar enquadramento"
          description="Arraste para mover e use o scroll ou o controle para dar zoom. O que você vê é o que vai para a capa."
          icon={<Crop size={16} />}
          size="lg"
          onClose={closeCrop}
          footer={
            <>
              <button type="button" onClick={closeCrop} className={ui.btnGhost}>
                Cancelar
              </button>
              <button type="button" onClick={handleConfirmCrop} className={ui.btnPrimary}>
                <Check size={15} />
                Salvar capa
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div
              ref={frameRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`relative aspect-[16/5] w-full touch-none select-none overflow-hidden rounded-2xl border-2 border-dashed bg-zinc-950 ${
                isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
              style={{ borderColor: withAlpha(accentColor, 0.6) }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={previewImageRef}
                src={rawImageSrc}
                alt="Pré-visualização da capa"
                crossOrigin="anonymous"
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: drawW || undefined,
                  height: drawH || undefined,
                  transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))`,
                }}
              />

              <span className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-black/70 px-2 py-1 font-mono text-[10px] text-white">
                Zoom {Math.round(scale * 100)}% · {naturalDimensions.width}×{naturalDimensions.height}px
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setScale((c) => clamp(c - 0.2, 1, 4))}
                aria-label="Diminuir zoom"
                className={ui.btnGhost}
              >
                −
              </button>

              <input
                type="range"
                min={1}
                max={4}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                aria-label="Zoom"
                className="h-1.5 flex-1 cursor-pointer"
                style={{ accentColor }}
              />

              <button
                type="button"
                onClick={() => setScale((c) => clamp(c + 0.2, 1, 4))}
                aria-label="Aumentar zoom"
                className={ui.btnGhost}
              >
                +
              </button>

              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setPosition({ x: 0, y: 0 });
                }}
                className={ui.btnGhost}
              >
                Centralizar
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {editingTask && (
        <TaskModal
          key={editingTask.id}
          task={editingTask}
          topics={topics}
          theme={theme}
          onClose={() => setEditingTask(null)}
          onSave={onSaveEditedTask}
          onDelete={() => onDeleteTask(editingTask.id)}
        />
      )}
    </div>
  );
}