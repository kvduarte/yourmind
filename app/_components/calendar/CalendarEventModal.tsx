"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Calendar as CalendarIcon,
  Check,
  Clock,
  Folder as FolderIcon,
  GitFork,
  Plus,
  StickyNote,
  Target,
  Users,
  Workflow,
  X,
  Layers,
  FileText,
  Link as LinkIcon,
  Image as ImageIcon,
  FileUp,
  ExternalLink,
  Repeat,
  ChevronDown,
} from "lucide-react";

import { Folder, Task, Theme, Topic } from "@/types";
import { Pipeline } from "@/lib/pipeline";
import { isLightHex, withAlpha } from "@/lib/theme";
import { getUi } from "@/lib/ui";
import ModalShell from "../modals/ModalShell";
import {
  CalendarConnections,
  RecurrenceFrequency,
  RichCalendarTask,
} from "./CalendarView";

interface CalendarEventModalProps {
  isOpen: boolean;
  theme: Theme;
  accentColor: string;
  accentFill?: string;
  initialDate?: string;
  defaultFolderId?: string;
  editingTask?: RichCalendarTask | null;
  folders: Folder[];
  topics?: Topic[];
  pipelines?: Pipeline[];
  allTasks?: Task[];
  onClose: () => void;
  onSave: (task: RichCalendarTask) => void;
}

type TabType =
  | "main"
  | "details"
  | "note"
  | "flow"
  | "process"
  | "planning"
  | "people";

const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  none: "Não repetir",
  daily: "Todos os dias",
  weekly: "Toda semana",
  biweekly: "A cada 2 semanas",
  monthly: "Todo mês (mesmo dia)",
  yearly: "Todo ano",
};

export default function CalendarEventModal({
  isOpen,
  theme,
  accentColor,
  accentFill,
  initialDate = "",
  defaultFolderId = "",
  editingTask = null,
  folders = [],
  topics = [],
  pipelines = [],
  allTasks = [],
  onClose,
  onSave,
}: CalendarEventModalProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const buttonFill = accentFill || accentColor;
  const isLightBtn = isLightHex(accentColor);

  const [activeTab, setActiveTab] = useState<TabType>("main");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState("");
  const [folderId, setFolderId] = useState(defaultFolderId);
  const [folderOpen, setFolderOpen] = useState(false);
  const folderRef = useRef<HTMLDivElement>(null);

  // Recorrência
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>("none");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const recurrenceRef = useRef<HTMLDivElement>(null);

  const [link, setLink] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [documents, setDocuments] = useState<Array<{ name: string; url: string }>>(
    []
  );
  const [docName, setDocName] = useState("");
  const [docUrl, setDocUrl] = useState("");

  const [noteId, setNoteId] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const noteRef = useRef<HTMLDivElement>(null);

  const [flowId, setFlowId] = useState("");
  const [flowTitle, setFlowTitle] = useState("");
  const [flowOpen, setFlowOpen] = useState(false);
  const flowRef = useRef<HTMLDivElement>(null);

  const [processId, setProcessId] = useState("");
  const [processTitle, setProcessTitle] = useState("");
  const [processOpen, setProcessOpen] = useState(false);
  const processRef = useRef<HTMLDivElement>(null);

  const [processStep, setProcessStep] = useState("");

  const [planningGoal, setPlanningGoal] = useState("");

  const [people, setPeople] = useState<
    Array<{ id: string; name: string; role?: string }>
  >([]);
  const [personInput, setPersonInput] = useState("");

  const availableNotes = useMemo(() => {
    return allTasks.filter((t) => Boolean(t.title || t.text));
  }, [allTasks]);

  const weekdayLabel = useMemo(() => {
    if (!date) return "Toda semana";
    const parsed = new Date(`${date}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return "Toda semana";
    const wd = parsed.toLocaleDateString("pt-BR", { weekday: "long" });
    const prefix =
      wd.includes("sábado") || wd.includes("domingo") ? "Todo" : "Toda";
    return `${prefix} ${wd}`;
  }, [date]);

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (recurrenceRef.current && !recurrenceRef.current.contains(target)) {
        setRecurrenceOpen(false);
      }
      if (folderRef.current && !folderRef.current.contains(target)) {
        setFolderOpen(false);
      }
      if (noteRef.current && !noteRef.current.contains(target)) {
        setNoteOpen(false);
      }
      if (flowRef.current && !flowRef.current.contains(target)) {
        setFlowOpen(false);
      }
      if (processRef.current && !processRef.current.contains(target)) {
        setProcessOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab("main");
    setRecurrenceOpen(false);
    setFolderOpen(false);
    setNoteOpen(false);
    setFlowOpen(false);
    setProcessOpen(false);

    if (editingTask) {
      const taskExtra = editingTask as RichCalendarTask & {
        text?: string;
        time?: string;
      };
      setTitle(editingTask.title || taskExtra.text || "");
      setDescription(editingTask.description || "");
      setDate((editingTask.date || editingTask.dueDate || initialDate).slice(0, 10));
      setTime(taskExtra.time || "");
      setFolderId(editingTask.folderId || defaultFolderId);
      setRecurrence(editingTask.recurrence || "none");
      setRecurrenceEnd(editingTask.recurrenceEnd || "");
      setLink(editingTask.link || "");
      setImageUrl(editingTask.imageUrl || "");
      setDocuments(editingTask.documents || []);

      const c = editingTask.connections || {};
      setNoteId(c.note?.id || "");
      setNoteTitle(c.note?.title || "");
      setFlowId(c.flow?.id || "");
      setFlowTitle(c.flow?.title || "");
      setProcessId(c.process?.id || "");
      setProcessTitle(c.process?.title || "");
      setProcessStep(c.process?.step || "");
      setPlanningGoal(c.planning?.goal || "");
      setPeople(c.people || []);
    } else {
      setTitle("");
      setDescription("");
      setDate(initialDate);
      setTime("");
      setFolderId(defaultFolderId);
      setRecurrence("none");
      setRecurrenceEnd("");
      setLink("");
      setImageUrl("");
      setDocuments([]);
      setNoteId("");
      setNoteTitle("");
      setFlowId("");
      setFlowTitle("");
      setProcessId("");
      setProcessTitle("");
      setProcessStep("");
      setPlanningGoal("");
      setPeople([]);
    }
    setPersonInput("");
    setDocName("");
    setDocUrl("");
  }, [isOpen, editingTask, initialDate, defaultFolderId]);

  if (!isOpen) return null;

  const handleAddPerson = () => {
    const trimmed = personInput.trim();
    if (!trimmed) return;
    setPeople((prev) => [
      ...prev,
      { id: `person_${Date.now()}`, name: trimmed },
    ]);
    setPersonInput("");
  };

  const handleRemovePerson = (id: string) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAddDocument = () => {
    if (!docName.trim() && !docUrl.trim()) return;
    const finalName = docName.trim() || "Documento anexado";
    const finalUrl = docUrl.trim() || "#";
    setDocuments((prev) => [...prev, { name: finalName, url: finalUrl }]);
    setDocName("");
    setDocUrl("");
  };

  const handleDocFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setDocuments((prev) => [
          ...prev,
          { name: file.name, url: reader.result as string },
        ]);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const connections: CalendarConnections = {};

    if (noteId || noteTitle.trim()) {
      const foundNote = availableNotes.find((n) => n.id === noteId);
      const resolvedNoteTitle =
        foundNote?.title || foundNote?.text || noteTitle;

      if (resolvedNoteTitle.trim()) {
        connections.note = {
          id: noteId || `note_${Date.now()}`,
          title: resolvedNoteTitle.trim(),
        };
      }
    }

    if (flowId || flowTitle.trim()) {
      const foundFlow = topics.find((t) => t.id === flowId);
      const resolvedFlowTitle = foundFlow?.name || flowTitle;

      if (resolvedFlowTitle.trim()) {
        connections.flow = {
          id: flowId || `flow_${Date.now()}`,
          title: resolvedFlowTitle.trim(),
        };
      }
    }

    if (processId || processTitle.trim()) {
      const foundProcess = pipelines.find((p) => p.id === processId);
      const resolvedProcessTitle = foundProcess?.name || processTitle;

      if (resolvedProcessTitle.trim()) {
        connections.process = {
          id: processId || `proc_${Date.now()}`,
          title: resolvedProcessTitle.trim(),
          step: processStep.trim() || undefined,
        };
      }
    }

    if (planningGoal.trim()) {
      connections.planning = {
        goal: planningGoal.trim(),
      };
    }

    if (people.length > 0) {
      connections.people = people;
    }

    const baseId = editingTask?.seriesId || editingTask?.id;

    const payload: RichCalendarTask = {
      ...(editingTask || {
        id: `task_${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString().split("T")[0],
        completed: false,
      }),
      id: baseId || `task_${Date.now()}`,
      title: title.trim(),
      text: title.trim(),
      description: description.trim() || undefined,
      date,
      dueDate: date,
      time: time.trim() || undefined,
      folderId: folderId || undefined,
      recurrence: recurrence !== "none" ? recurrence : undefined,
      recurrenceEnd:
        recurrence !== "none" && recurrenceEnd ? recurrenceEnd : undefined,
      link: link.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      documents: documents.length > 0 ? documents : undefined,
      topicId: flowId || editingTask?.topicId || "",
      connections,
    };

    onSave(payload);
    onClose();
  };

  const hasDetails = Boolean(
    description || link || imageUrl || documents.length > 0
  );

  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ElementType;
    badge?: boolean;
  }> = [
    { id: "main", label: "Principal", icon: Layers },
    {
      id: "details",
      label: "Descrição & Anexos",
      icon: FileText,
      badge: hasDetails,
    },
    {
      id: "note",
      label: "Notas",
      icon: StickyNote,
      badge: Boolean(noteId || noteTitle.trim()),
    },
    {
      id: "flow",
      label: "Fluxo",
      icon: GitFork,
      badge: Boolean(flowId || flowTitle.trim()),
    },
    {
      id: "process",
      label: "Processo",
      icon: Workflow,
      badge: Boolean(processId || processTitle.trim()),
    },
    {
      id: "planning",
      label: "Meta",
      icon: Target,
      badge: Boolean(planningGoal.trim()),
    },
    { id: "people", label: "Pessoas", icon: Users, badge: people.length > 0 },
  ];

  const recurrenceOptions: Array<{ id: RecurrenceFrequency; label: string }> = [
    { id: "none", label: "Não repetir" },
    { id: "daily", label: "Todos os dias" },
    { id: "weekly", label: weekdayLabel },
    { id: "biweekly", label: "A cada 2 semanas" },
    { id: "monthly", label: "Todo mês (mesmo dia)" },
    { id: "yearly", label: "Todo ano" },
  ];

  const selectedFolderName =
    folders.find((f) => f.id === folderId)?.name || "Sem pasta específica";

  const selectedNoteName =
    availableNotes.find((n) => n.id === noteId)?.title ||
    availableNotes.find((n) => n.id === noteId)?.text ||
    noteTitle ||
    "-- Escolher nota --";

  const selectedFlowName =
    topics.find((t) => t.id === flowId)?.name ||
    flowTitle ||
    "-- Escolher fluxograma --";

  const selectedProcessName =
    pipelines.find((p) => p.id === processId)?.name ||
    processTitle ||
    "-- Escolher processo --";

  // Dropdown inteligente com max-height, rolagem fina e abertura flexível (cima/baixo)
  const renderSmartDropdown = (
    isOpen: boolean,
    refObj: React.RefObject<HTMLDivElement | null>,
    children: React.ReactNode
  ) => {
    if (!isOpen || !refObj.current) return null;
    const rect = refObj.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < 220; // Se faltar espaço embaixo, abre para cima

    const style: React.CSSProperties = {
      position: "fixed",
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      zIndex: 999999,
    };

    if (openAbove) {
      style.bottom = `${window.innerHeight - rect.top + 6}px`;
    } else {
      style.top = `${rect.bottom + 6}px`;
    }

    return (
      <div
        style={style}
        className={`max-h-48 overflow-y-auto thin-scroll rounded-2xl border p-1 shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150 ${
          dark
            ? "border-white/20 bg-zinc-950 text-zinc-100"
            : "border-zinc-300 bg-white text-zinc-900"
        }`}
      >
        <div className="space-y-0.5">{children}</div>
      </div>
    );
  };

  return (
    <ModalShell
      theme={theme}
      title={editingTask ? "Editar Agendamento" : "Novo Agendamento"}
      description="Gerencie compromissos, configure repetições e conecte seus projetos."
      icon={<CalendarIcon size={16} />}
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-400 hover:text-zinc-100 hover:bg-white/5 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="calendar-event-form"
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${
              isLightBtn ? "text-zinc-950" : "text-white"
            }`}
            style={{ background: buttonFill }}
          >
            <Check size={15} strokeWidth={2.8} />
            <span>
              {editingTask ? "Salvar alterações" : "Criar compromisso"}
            </span>
          </button>
        </div>
      }
    >
      <form
        id="calendar-event-form"
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        {/* ABAS SUPERIORES */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-zinc-500/15 pb-3 thin-scroll">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "shadow-sm"
                    : dark
                    ? "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: withAlpha(accentColor, 0.18),
                        color: accentColor,
                      }
                    : undefined
                }
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: accentColor }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ABA: PRINCIPAL */}
        {activeTab === "main" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-zinc-400">
                Título do compromisso *
              </label>
              <input
                autoFocus
                required
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reunião de alinhamento, Aula de terça, Sprint..."
                className={`w-full rounded-2xl border px-4 py-3 text-xs font-semibold outline-none transition-all ${ui.field}`}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  <CalendarIcon size={12} /> Data *
                </label>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-medium outline-none ${ui.field}`}
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  <Clock size={12} /> Horário
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={`w-full rounded-2xl border px-3.5 py-2.5 text-xs font-medium outline-none ${ui.field}`}
                />
              </div>

              {/* Dropdown customizado inteligente para Pasta */}
              <div className="relative" ref={folderRef}>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  <FolderIcon size={12} /> Pasta
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderOpen((prev) => !prev);
                  }}
                  className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-xs font-medium transition-all cursor-pointer ${
                    dark
                      ? "border-white/10 bg-zinc-900/90 text-zinc-100 hover:border-white/20"
                      : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                  }`}
                >
                  <span className="truncate">{selectedFolderName}</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      folderOpen ? "rotate-180" : ""
                    }`}
                    style={{ color: accentColor }}
                  />
                </button>

                {renderSmartDropdown(
                  folderOpen,
                  folderRef,
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderId("");
                        setFolderOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                        !folderId
                          ? ""
                          : dark
                          ? "hover:bg-white/5 text-zinc-300"
                          : "hover:bg-zinc-100 text-zinc-700"
                      }`}
                      style={
                        !folderId
                          ? {
                              backgroundColor: withAlpha(accentColor, 0.18),
                              color: accentColor,
                            }
                          : undefined
                      }
                    >
                      <span>Sem pasta específica</span>
                      {!folderId && <Check size={13} />}
                    </button>
                    {folders.map((f) => {
                      const isSelected = folderId === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderId(f.id);
                            setFolderOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? ""
                              : dark
                              ? "hover:bg-white/5 text-zinc-300"
                              : "hover:bg-zinc-100 text-zinc-700"
                          }`}
                          style={
                            isSelected
                              ? {
                                  backgroundColor: withAlpha(
                                    accentColor,
                                    0.18
                                  ),
                                  color: accentColor,
                                }
                              : undefined
                          }
                        >
                          <span className="truncate">{f.name}</span>
                          {isSelected && <Check size={13} />}
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>

            {/* BLOCO DE REPETIÇÃO COM DROPDOWN INTELIGENTE */}
            <div
              className={`rounded-2xl border p-4 space-y-3 ${
                dark
                  ? "border-white/10 bg-white/[0.02]"
                  : "border-zinc-200/80 bg-zinc-50/70"
              }`}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  <Repeat size={13} style={{ color: accentColor }} />
                  <span>Repetir compromisso</span>
                </label>
                {recurrence !== "none" && (
                  <span
                    className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: withAlpha(accentColor, 0.16),
                      color: accentColor,
                    }}
                  >
                    {recurrence === "weekly"
                      ? weekdayLabel
                      : RECURRENCE_LABELS[recurrence]}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="relative" ref={recurrenceRef}>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">
                    Frequência
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecurrenceOpen((prev) => !prev);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                      dark
                        ? "border-white/10 bg-zinc-900/90 text-zinc-100 hover:border-white/20"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                    }`}
                  >
                    <span className="truncate">
                      {RECURRENCE_LABELS[recurrence] || "Não repetir"}
                    </span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        recurrenceOpen ? "rotate-180" : ""
                      }`}
                      style={{ color: accentColor }}
                    />
                  </button>

                  {renderSmartDropdown(
                    recurrenceOpen,
                    recurrenceRef,
                    recurrenceOptions.map((opt) => {
                      const isSelected = recurrence === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecurrence(opt.id);
                            setRecurrenceOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? ""
                              : dark
                              ? "hover:bg-white/5 text-zinc-300"
                              : "hover:bg-zinc-100 text-zinc-700"
                          }`}
                          style={
                            isSelected
                              ? {
                                  backgroundColor: withAlpha(
                                    accentColor,
                                    0.18
                                  ),
                                  color: accentColor,
                                }
                              : undefined
                          }
                        >
                          <span>{opt.label}</span>
                          {isSelected && <Check size={13} />}
                        </button>
                      );
                    })
                  )}
                </div>

                {recurrence !== "none" && (
                  <div>
                    <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">
                      Repetir até (opcional)
                    </label>
                    <input
                      type="date"
                      min={date}
                      value={recurrenceEnd}
                      onChange={(e) => setRecurrenceEnd(e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-2 text-xs font-medium outline-none ${ui.field}`}
                    />
                  </div>
                )}
              </div>

              {recurrence !== "none" && !recurrenceEnd && (
                <p className="text-[11px] text-zinc-400">
                  Sem data final definida, o evento será projetado
                  automaticamente pelos próximos 3 meses.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ABA: DESCRIÇÃO, LINK, IMAGEM E DOCUMENTOS */}
        {activeTab === "details" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div>
              <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wider text-zinc-400">
                Descrição detalhada
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anotações, pauta ou detalhes sobre o compromisso..."
                className={`w-full rounded-2xl border px-4 py-3 text-xs font-medium outline-none resize-none thin-scroll ${ui.field}`}
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                <LinkIcon size={12} /> Link Externo / Reunião
              </label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://meet.google.com/... ou site de referência"
                className={`w-full rounded-2xl border px-4 py-2.5 text-xs outline-none ${ui.field}`}
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                <ImageIcon size={12} /> Imagem de Capa / Anexo
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Cole o link da imagem ou envie um arquivo..."
                  className={`flex-1 rounded-2xl border px-4 py-2.5 text-xs outline-none ${ui.field}`}
                />
                <label
                  className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-bold cursor-pointer transition-all ${ui.option}`}
                >
                  <FileUp size={14} />
                  <span>Enviar</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
              {imageUrl && (
                <div className="relative mt-2 h-28 w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Pré-visualização"
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 rounded-lg bg-black/70 p-1 text-white hover:bg-red-500 transition cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-zinc-500/10">
              <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                <FileText size={12} /> Documentos & Arquivos
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="Nome do documento (ex: PDF Specs)"
                  className={`rounded-xl border px-3 py-2 text-xs outline-none ${ui.field}`}
                />
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={docUrl}
                    onChange={(e) => setDocUrl(e.target.value)}
                    placeholder="Link do arquivo..."
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs outline-none ${ui.field}`}
                  />
                  <label
                    title="Anexar arquivo do computador"
                    className={`flex items-center justify-center rounded-xl border px-2.5 py-2 text-xs font-bold cursor-pointer transition-all ${ui.option}`}
                  >
                    <FileUp size={14} />
                    <input
                      type="file"
                      onChange={handleDocFileUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDocument}
                    title="Adicionar documento"
                    className={`flex items-center justify-center rounded-xl px-3 py-2 text-xs font-black transition cursor-pointer ${
                      isLightBtn ? "text-zinc-950" : "text-white"
                    }`}
                    style={{ background: buttonFill }}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {documents.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 bg-white/[0.02]"
                    >
                      <a
                        href={doc.url}
                        download={
                          doc.url.startsWith("data:") ? doc.name : undefined
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs font-bold hover:underline truncate"
                        style={{ color: accentColor }}
                      >
                        <FileText size={14} />
                        <span className="truncate">{doc.name}</span>
                        <ExternalLink size={12} className="opacity-60" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(idx)}
                        className="text-zinc-400 hover:text-red-400 cursor-pointer p-1"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: NOTAS */}
        {activeTab === "note" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-2xl border p-4 space-y-3 bg-amber-500/[0.03] border-amber-500/20">
              <div className="flex items-center gap-2 text-xs font-extrabold text-amber-500">
                <StickyNote size={15} />
                <span>Vincular Anotação</span>
              </div>

              {availableNotes.length > 0 && (
                <div className="space-y-1" ref={noteRef}>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Nota existente
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoteOpen((prev) => !prev);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                      dark
                        ? "border-white/10 bg-zinc-900/90 text-zinc-100 hover:border-white/20"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                    }`}
                  >
                    <span className="truncate">{selectedNoteName}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        noteOpen ? "rotate-180" : ""
                      }`}
                      style={{ color: accentColor }}
                    />
                  </button>

                  {renderSmartDropdown(
                    noteOpen,
                    noteRef,
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNoteId("");
                          setNoteOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                          !noteId
                            ? ""
                            : dark
                            ? "hover:bg-white/5 text-zinc-300"
                            : "hover:bg-zinc-100 text-zinc-700"
                        }`}
                        style={
                          !noteId
                            ? {
                                backgroundColor: withAlpha(accentColor, 0.18),
                                color: accentColor,
                              }
                            : undefined
                        }
                      >
                        <span>-- Escolher nota --</span>
                        {!noteId && <Check size={13} />}
                      </button>
                      {availableNotes.map((n) => {
                        const isSelected = noteId === n.id;
                        const nTitle = n.title || n.text || "Sem título";
                        return (
                          <button
                            key={n.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNoteId(n.id);
                              setNoteTitle(nTitle);
                              setNoteOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? ""
                                : dark
                                ? "hover:bg-white/5 text-zinc-300"
                                : "hover:bg-zinc-100 text-zinc-700"
                            }`}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: withAlpha(
                                      accentColor,
                                      0.18
                                    ),
                                    color: accentColor,
                                  }
                                : undefined
                            }
                          >
                            <span className="truncate">{nTitle}</span>
                            {isSelected && <Check size={13} />}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">
                  Ou digitar título personalizado
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => {
                    setNoteId("");
                    setNoteTitle(e.target.value);
                  }}
                  placeholder="Título da anotação..."
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${ui.field}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA: FLUXOGRAMA */}
        {activeTab === "flow" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-2xl border p-4 space-y-3 bg-blue-500/[0.03] border-blue-500/20">
              <div className="flex items-center gap-2 text-xs font-extrabold text-blue-500">
                <GitFork size={15} />
                <span>Vincular Fluxograma ou Código</span>
              </div>

              {topics.length > 0 && (
                <div className="space-y-1" ref={flowRef}>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Fluxograma existente
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFlowOpen((prev) => !prev);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                      dark
                        ? "border-white/10 bg-zinc-900/90 text-zinc-100 hover:border-white/20"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                    }`}
                  >
                    <span className="truncate">{selectedFlowName}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        flowOpen ? "rotate-180" : ""
                      }`}
                      style={{ color: accentColor }}
                    />
                  </button>

                  {renderSmartDropdown(
                    flowOpen,
                    flowRef,
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFlowId("");
                          setFlowOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                          !flowId
                            ? ""
                            : dark
                            ? "hover:bg-white/5 text-zinc-300"
                            : "hover:bg-zinc-100 text-zinc-700"
                        }`}
                        style={
                          !flowId
                            ? {
                                backgroundColor: withAlpha(accentColor, 0.18),
                                color: accentColor,
                              }
                            : undefined
                        }
                      >
                        <span>-- Escolher fluxograma --</span>
                        {!flowId && <Check size={13} />}
                      </button>
                      {topics.map((t) => {
                        const isSelected = flowId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFlowId(t.id);
                              setFlowTitle(t.name);
                              setFlowOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? ""
                                : dark
                                ? "hover:bg-white/5 text-zinc-300"
                                : "hover:bg-zinc-100 text-zinc-700"
                            }`}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: withAlpha(
                                      accentColor,
                                      0.18
                                    ),
                                    color: accentColor,
                                  }
                                : undefined
                            }
                          >
                            <span className="truncate">
                              {t.name} ({t.kind === "code" ? "Código" : "Fluxo"})
                            </span>
                            {isSelected && <Check size={13} />}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">
                  Ou digitar nome do fluxo
                </label>
                <input
                  type="text"
                  value={flowTitle}
                  onChange={(e) => {
                    setFlowId("");
                    setFlowTitle(e.target.value);
                  }}
                  placeholder="Nome do fluxo..."
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${ui.field}`}
                />
              </div>
            </div>
          </div>
        )}

        {/* ABA: PROCESSOS */}
        {activeTab === "process" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-2xl border p-4 space-y-3 bg-emerald-500/[0.03] border-emerald-500/20">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-500">
                <Workflow size={15} />
                <span>Vincular Processo / Quadro</span>
              </div>

              {pipelines.length > 0 && (
                <div className="space-y-1" ref={processRef}>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Processo existente
                  </label>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProcessOpen((prev) => !prev);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                      dark
                        ? "border-white/10 bg-zinc-900/90 text-zinc-100 hover:border-white/20"
                        : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300"
                    }`}
                  >
                    <span className="truncate">{selectedProcessName}</span>
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${
                        processOpen ? "rotate-180" : ""
                      }`}
                      style={{ color: accentColor }}
                    />
                  </button>

                  {renderSmartDropdown(
                    processOpen,
                    processRef,
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProcessId("");
                          setProcessOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                          !processId
                            ? ""
                            : dark
                            ? "hover:bg-white/5 text-zinc-300"
                            : "hover:bg-zinc-100 text-zinc-700"
                        }`}
                        style={
                          !processId
                            ? {
                                backgroundColor: withAlpha(accentColor, 0.18),
                                color: accentColor,
                              }
                            : undefined
                        }
                      >
                        <span>-- Escolher processo --</span>
                        {!processId && <Check size={13} />}
                      </button>
                      {pipelines.map((p) => {
                        const isSelected = processId === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setProcessId(p.id);
                              setProcessTitle(p.name);
                              setProcessOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition cursor-pointer ${
                              isSelected
                                ? ""
                                : dark
                                ? "hover:bg-white/5 text-zinc-300"
                                : "hover:bg-zinc-100 text-zinc-700"
                            }`}
                            style={
                              isSelected
                                ? {
                                    backgroundColor: withAlpha(
                                      accentColor,
                                      0.18
                                    ),
                                    color: accentColor,
                                  }
                                : undefined
                            }
                          >
                            <span className="truncate">{p.name}</span>
                            {isSelected && <Check size={13} />}
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Ou digitar processo
                  </label>
                  <input
                    type="text"
                    value={processTitle}
                    onChange={(e) => {
                      setProcessId("");
                      setProcessTitle(e.target.value);
                    }}
                    placeholder="Nome do processo..."
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${ui.field}`}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">
                    Etapa
                  </label>
                  <input
                    type="text"
                    value={processStep}
                    onChange={(e) => setProcessStep(e.target.value)}
                    placeholder="Ex: Etapa 2/4"
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${ui.field}`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: META / PLANEJAMENTO */}
        {activeTab === "planning" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div
              className="rounded-2xl border p-4 space-y-3"
              style={{
                borderColor: withAlpha(accentColor, 0.3),
                backgroundColor: withAlpha(accentColor, 0.04),
              }}
            >
              <div
                className="flex items-center gap-2 text-xs font-extrabold"
                style={{ color: accentColor }}
              >
                <Target size={15} />
                <span>Vincular Meta ou Sprint</span>
              </div>
              <input
                type="text"
                value={planningGoal}
                onChange={(e) => setPlanningGoal(e.target.value)}
                placeholder="Ex: Concluir módulo de autenticação..."
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none ${ui.field}`}
              />
            </div>
          </div>
        )}

        {/* ABA: PESSOAS */}
        {activeTab === "people" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="rounded-2xl border p-4 space-y-3 bg-pink-500/[0.03] border-pink-500/20">
              <div className="flex items-center gap-2 text-xs font-extrabold text-pink-500">
                <Users size={15} />
                <span>Vincular Pessoas & Contatos</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={personInput}
                  onChange={(e) => setPersonInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPerson();
                    }
                  }}
                  placeholder="Nome do contato..."
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-xs outline-none ${ui.field}`}
                />
                <button
                  type="button"
                  onClick={handleAddPerson}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition cursor-pointer ${
                    isLightBtn ? "text-zinc-950" : "text-white"
                  }`}
                  style={{ background: buttonFill }}
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>
              {people.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {people.map((person) => (
                    <span
                      key={person.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500/15 px-3 py-1.5 text-xs font-bold text-pink-400"
                    >
                      {person.name}
                      <button
                        type="button"
                        onClick={() => handleRemovePerson(person.id)}
                        className="hover:text-pink-200 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </ModalShell>
  );
}