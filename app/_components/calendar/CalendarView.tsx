"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Folder as FolderIcon,
  FolderPlus,
  StickyNote,
  GitFork,
  Workflow,
  Target,
  Users,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  X,
  Pencil,
  Trash2,
  Sun,
  CloudSun,
  Snowflake,
  Trees,
  CalendarDays,
  Flag,
  MapPin,
} from "lucide-react";

import { Folder, Task, Theme, Topic } from "@/types";
import { Pipeline } from "@/lib/pipeline";
import { folderHex } from "@/lib/nav";
import { toKey } from "@/lib/dates";
import {
  CURATED_PALETTES,
  DEFAULT_ACCENT,
  buildAccentGradient,
  isLightHex,
  withAlpha,
} from "@/lib/theme";
import { getUi } from "@/lib/ui";
import { AppSettings } from "@/lib/settings";
import CalendarEventModal from "./CalendarEventModal";

export type ConnectionModule =
  | "note"
  | "flow"
  | "process"
  | "planning"
  | "people";

export interface CalendarConnections {
  note?: { id: string; title: string };
  flow?: { id: string; title: string };
  process?: { id: string; title: string; step?: string };
  planning?: { goal: string };
  people?: Array<{ id: string; name: string; role?: string }>;
}

export interface RichCalendarTask extends Task {
  folderId?: string;
  description?: string;
  link?: string;
  imageUrl?: string;
  documents?: Array<{ name: string; url: string }>;
  connections?: CalendarConnections;
}

interface CalendarViewProps {
  tasks: RichCalendarTask[];
  folders: Folder[];
  topics?: Topic[];
  pipelines?: Pipeline[];
  theme: Theme;
  settings?: AppSettings & {
    accentColor?: string;
    colorStyle?: "solid" | "gradient" | "preset";
    colorPreset?: string;
  };
  onCreateTask: (task: RichCalendarTask) => void;
  onSaveEditedTask: (task: RichCalendarTask) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onCreateFolder?: (name: string, color: string) => void;
  onNavigate: (target: string) => void;
}

interface HolidayInfo {
  name: string;
  type: "nacional" | "regional";
}

type SeasonKey = "summer" | "autumn" | "winter" | "spring";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

const FOLDER_COLOR_OPTIONS = [
  { name: "red", hex: "#ef4444" },
  { name: "orange", hex: "#f97316" },
  { name: "yellow", hex: "#eab308" },
  { name: "green", hex: "#10b981" },
  { name: "blue", hex: "#3b82f6" },
  { name: "purple", hex: "#a855f7" },
  { name: "pink", hex: "#ec4899" },
];

const BRAZIL_STATES = [
  { code: "NONE", label: "Apenas Nacionais" },
  { code: "GO", label: "Goiás (GO)" },
  { code: "SP", label: "São Paulo (SP)" },
  { code: "RJ", label: "Rio de Janeiro (RJ)" },
  { code: "MG", label: "Minas Gerais (MG)" },
  { code: "DF", label: "Distrito Federal (DF)" },
  { code: "BA", label: "Bahia (BA)" },
  { code: "PR", label: "Paraná (PR)" },
  { code: "SC", label: "Santa Catarina (SC)" },
  { code: "RS", label: "Rio Grande do Sul (RS)" },
  { code: "PE", label: "Pernambuco (PE)" },
  { code: "CE", label: "Ceará (CE)" },
];

const REGIONAL_HOLIDAYS: Record<string, Record<string, string>> = {
  GO: {
    "07-26": "Fundação de Goiás",
    "10-24": "Pedra Fundamental de Goiânia",
  },
  SP: {
    "01-25": "Aniversário de São Paulo",
    "07-09": "Revolução Constitucionalista",
  },
  RJ: {
    "01-20": "Dia de São Sebastião",
    "04-23": "Dia de São Jorge",
  },
  MG: {
    "04-21": "Data Magna de Minas Gerais",
  },
  DF: {
    "04-21": "Fundação de Brasília",
    "11-30": "Dia do Evangélico (DF)",
  },
  BA: {
    "07-02": "Independência da Bahia",
  },
  PR: {
    "12-19": "Emancipação do Paraná",
  },
  SC: {
    "08-11": "Dia de Santa Catarina",
  },
  RS: {
    "09-20": "Revolução Farroupilha",
  },
  PE: {
    "03-06": "Revolução Pernambucana",
    "06-24": "São João",
  },
  CE: {
    "03-19": "Dia de São José",
    "03-25": "Data Magna do Ceará",
  },
};

function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function getHolidaysForYear(
  year: number,
  stateCode: string
): Record<string, HolidayInfo> {
  const map: Record<string, HolidayInfo> = {};

  const fixedNational: Record<string, string> = {
    "01-01": "Confraternização Universal",
    "04-21": "Tiradentes",
    "05-01": "Dia do Trabalho",
    "09-07": "Independência do Brasil",
    "10-12": "Nossa Sra. Aparecida",
    "11-02": "Finados",
    "11-15": "Proclamação da República",
    "11-20": "Consciência Negra",
    "12-25": "Natal",
  };

  for (const [mmdd, name] of Object.entries(fixedNational)) {
    map[`${year}-${mmdd}`] = { name, type: "nacional" };
  }

  const easter = getEasterDate(year);
  const addDays = (base: Date, days: number) => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return toKey(d);
  };

  map[addDays(easter, -48)] = { name: "Segunda de Carnaval", type: "nacional" };
  map[addDays(easter, -47)] = { name: "Carnaval", type: "nacional" };
  map[addDays(easter, -2)] = { name: "Sexta-Feira Santa", type: "nacional" };
  map[toKey(easter)] = { name: "Páscoa", type: "nacional" };
  map[addDays(easter, 60)] = { name: "Corpus Christi", type: "nacional" };

  const regional = REGIONAL_HOLIDAYS[stateCode];
  if (regional) {
    for (const [mmdd, name] of Object.entries(regional)) {
      const fullKey = `${year}-${mmdd}`;
      if (map[fullKey]) {
        map[fullKey] = {
          name: `${map[fullKey].name} • ${name}`,
          type: "regional",
        };
      } else {
        map[fullKey] = { name, type: "regional" };
      }
    }
  }

  return map;
}

const SEASON_PARTICLES = [
  { left: "10%", delay: "0s", duration: "9s", size: 9 },
  { left: "24%", delay: "2.2s", duration: "11s", size: 7 },
  { left: "39%", delay: "1.1s", duration: "10s", size: 10 },
  { left: "55%", delay: "3.4s", duration: "12s", size: 8 },
  { left: "71%", delay: "0.7s", duration: "9.5s", size: 9 },
  { left: "84%", delay: "2.8s", duration: "11.5s", size: 7 },
  { left: "93%", delay: "1.6s", duration: "10.5s", size: 8 },
];

export default function CalendarView({
  tasks = [],
  folders = [],
  topics = [],
  pipelines = [],
  theme,
  settings,
  onCreateTask,
  onSaveEditedTask,
  onToggleTask,
  onDeleteTask,
  onCreateFolder,
}: CalendarViewProps) {
  const dark = theme === "dark";
  const ui = getUi(dark);
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;

  const defaultBaseColor = dark ? "#f4f4f5" : "#18181b";
  const accentColor = settings?.accentColor || defaultBaseColor || DEFAULT_ACCENT;
  const colorStyle = settings?.colorStyle || "solid";
  const colorPreset = settings?.colorPreset || "matcha-espresso";

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

  const today = useMemo(() => new Date(), []);
  const todayKey = toKey(today);

  const [currentMonth, setCurrentMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [selectedState, setSelectedState] = useState<string>("GO");

  const [viewMode, setViewMode] = useState<"month" | "week" | "year">("month");
  const [selectedModules, setSelectedModules] = useState<ConnectionModule[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RichCalendarTask | null>(null);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState("blue");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUf = localStorage.getItem("your_mind_holiday_state");
      if (savedUf) setSelectedState(savedUf);
    }
  }, []);

  const handleStateChange = (uf: string) => {
    setSelectedState(uf);
    if (typeof window !== "undefined") {
      localStorage.setItem("your_mind_holiday_state", uf);
    }
  };

  /* Mapa de feriados */
  const holidaysMap = useMemo(() => {
    const y = currentMonth.getFullYear();
    return {
      ...getHolidaysForYear(y - 1, selectedState),
      ...getHolidaysForYear(y, selectedState),
      ...getHolidaysForYear(y + 1, selectedState),
    };
  }, [currentMonth, selectedState]);

  const todayHoliday = holidaysMap[todayKey];
  const selectedHoliday = holidaysMap[selectedDateKey];

  /* Estação do ano dinâmica */
  const seasonInfo = useMemo((): {
    key: SeasonKey;
    name: string;
    icon: React.ElementType;
    desc: string;
  } => {
    const month = today.getMonth() + 1;
    const day = today.getDate();
    if (
      (month === 12 && day >= 21) ||
      month === 1 ||
      month === 2 ||
      (month === 3 && day <= 20)
    ) {
      return {
        key: "summer",
        name: "Verão",
        icon: Sun,
        desc: "Alta energia e foco",
      };
    } else if (
      (month === 3 && day >= 21) ||
      month === 4 ||
      month === 5 ||
      (month === 6 && day <= 20)
    ) {
      return {
        key: "autumn",
        name: "Outono",
        icon: CloudSun,
        desc: "Clima ameno e ciclos",
      };
    } else if (
      (month === 6 && day >= 21) ||
      month === 7 ||
      month === 8 ||
      (month === 9 && day <= 20)
    ) {
      return {
        key: "winter",
        name: "Inverno",
        icon: Snowflake,
        desc: "Aconchego e estudos",
      };
    } else {
      return {
        key: "spring",
        name: "Primavera",
        icon: Trees,
        desc: "Renovação e criação",
      };
    }
  }, [today]);

  const SeasonIcon = seasonInfo.icon;

  // Cor dinâmica de cada folha/pétala seguindo a cor ou paleta das configurações
  const getSeasonParticleColor = (index: number) => {
    if (colorStyle === "preset") {
      const paletteColors = activePalette.colors;
      const chosen = paletteColors[index % paletteColors.length];
      return withAlpha(chosen, 0.55);
    }
    const opacities = [0.55, 0.4, 0.65, 0.45, 0.5];
    return withAlpha(primaryColor, opacities[index % opacities.length]);
  };

  /* Tarefas de hoje para a seção "O que tem para hoje" */
  const todaysTasks = useMemo(() => {
    return tasks.filter(
      (t) => (t.date || t.dueDate || "").slice(0, 10) === todayKey
    );
  }, [tasks, todayKey]);

  const todaysCompletedCount = todaysTasks.filter((t) => t.completed).length;
  const todaysProgress =
    todaysTasks.length > 0
      ? Math.round((todaysCompletedCount / todaysTasks.length) * 100)
      : 0;

  const moduleMeta: Record<
    ConnectionModule,
    {
      label: string;
      icon: React.ElementType;
      color: string;
      bg: string;
      border: string;
    }
  > = useMemo(() => {
    const isPreset = colorStyle === "preset";
    const [c1, c2, c3, c4, c5] = activePalette.colors;

    return {
      note: {
        label: "Notas",
        icon: StickyNote,
        color: isPreset ? c1 : primaryColor,
        bg: withAlpha(isPreset ? c1 : primaryColor, 0.12),
        border: withAlpha(isPreset ? c1 : primaryColor, 0.3),
      },
      flow: {
        label: "Fluxograma",
        icon: GitFork,
        color: isPreset ? c2 || c1 : primaryColor,
        bg: withAlpha(isPreset ? c2 || c1 : primaryColor, 0.12),
        border: withAlpha(isPreset ? c2 || c1 : primaryColor, 0.3),
      },
      process: {
        label: "Processos",
        icon: Workflow,
        color: isPreset ? c3 || c1 : primaryColor,
        bg: withAlpha(isPreset ? c3 || c1 : primaryColor, 0.12),
        border: withAlpha(isPreset ? c3 || c1 : primaryColor, 0.3),
      },
      planning: {
        label: "Planejamento",
        icon: Target,
        color: isPreset ? c4 || c2 || c1 : primaryColor,
        bg: withAlpha(isPreset ? c4 || c2 || c1 : primaryColor, 0.12),
        border: withAlpha(isPreset ? c4 || c2 || c1 : primaryColor, 0.3),
      },
      people: {
        label: "Pessoas",
        icon: Users,
        color: isPreset ? c5 || c3 || c1 : primaryColor,
        bg: withAlpha(isPreset ? c5 || c3 || c1 : primaryColor, 0.12),
        border: withAlpha(isPreset ? c5 || c3 || c1 : primaryColor, 0.3),
      },
    };
  }, [activePalette, colorStyle, primaryColor]);

  const toggleModuleFilter = (key: ConnectionModule) => {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]
    );
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchFolder =
        selectedFolderId === "all" || task.folderId === selectedFolderId;

      const matchModule =
        selectedModules.length === 0 ||
        selectedModules.some((mod) =>
          mod === "people"
            ? Boolean(task.connections?.people && task.connections.people.length > 0)
            : Boolean(task.connections?.[mod])
        );

      return matchFolder && matchModule;
    });
  }, [tasks, selectedFolderId, selectedModules]);

  const tasksByDate = useMemo(() => {
    const map: Record<string, RichCalendarTask[]> = {};
    for (const t of filteredTasks) {
      const key = (t.date || t.dueDate || "").slice(0, 10);
      if (!key) continue;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [filteredTasks]);

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: Array<{ date: Date; key: string; inMonth: boolean }> = [];

    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i);
      cells.push({ date: d, key: toKey(d), inMonth: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);
      cells.push({ date: d, key: toKey(d), inMonth: true });
    }
    const remaining = 42 - cells.length;
    for (let next = 1; next <= remaining; next++) {
      const d = new Date(year, month + 1, next);
      cells.push({ date: d, key: toKey(d), inMonth: false });
    }

    return cells;
  }, [currentMonth]);

  const weekDays = useMemo(() => {
    const d = new Date(selectedDateKey + "T00:00:00");
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const curr = new Date(start);
      curr.setDate(start.getDate() + i);
      days.push({
        date: curr,
        key: toKey(curr),
        inMonth: curr.getMonth() === currentMonth.getMonth(),
      });
    }
    return days;
  }, [selectedDateKey, currentMonth]);

  const yearMonths = useMemo(() => {
    const year = currentMonth.getFullYear();
    const months = [];
    for (let m = 0; m < 12; m++) {
      const monthDate = new Date(year, m, 1);
      const firstWeekday = new Date(year, m, 1).getDay();
      const daysInMonth = new Date(year, m + 1, 0).getDate();

      const daysList = [];
      for (let i = 0; i < firstWeekday; i++) {
        daysList.push(null);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, m, d);
        daysList.push({ dayNum: d, key: toKey(dateObj) });
      }

      const count = tasks.filter((t) =>
        (t.date || t.dueDate)?.startsWith(
          `${year}-${String(m + 1).padStart(2, "0")}`
        )
      ).length;

      months.push({
        date: monthDate,
        name: monthDate.toLocaleDateString("pt-BR", { month: "long" }),
        monthIndex: m,
        daysList,
        count,
      });
    }
    return months;
  }, [currentMonth, tasks]);

  const monthLabel = currentMonth.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  const yearLabel = currentMonth.toLocaleDateString("pt-BR", {
    year: "numeric",
  });

  const handleOpenNew = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (task: RichCalendarTask) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSaveTask = (task: RichCalendarTask) => {
    if (editingTask) {
      onSaveEditedTask(task);
    } else {
      onCreateTask(task);
    }
  };

  const handleAddFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !onCreateFolder) return;
    onCreateFolder(newFolderName.trim(), newFolderColor);
    setNewFolderName("");
    setCreatingFolder(false);
  };

  const getResolvedFolderColor = (color?: string) => {
    if (!color) return primaryColor;
    if (color.startsWith("#")) return color;
    return folderHex(color);
  };

  return (
    <div className="thin-scroll h-full overflow-y-auto select-none">
      <style>{`
        @keyframes seasonDrift {
          0% {
            transform: translate3d(0, -14px, 0) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 0.9;
          }
          85% {
            opacity: 0.8;
          }
          100% {
            transform: translate3d(-28px, 190px, 0) rotate(220deg);
            opacity: 0;
          }
        }
        @keyframes sunPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.32;
          }
        }
      `}</style>

      <div className="mx-auto max-w-6xl space-y-6 p-6 sm:p-10">
        {/* BANNER EDITORIAL COM BOTÕES ORGANIZADOS E EFEITO SAZONAL */}
        <section
          className={`relative overflow-hidden rounded-[2rem] border p-6 sm:p-8 shadow-xl transition-all ${
            dark
              ? "border-white/10 bg-zinc-950/90 text-zinc-100 backdrop-blur-2xl"
              : "border-zinc-200/80 bg-white/90 text-zinc-900 shadow-zinc-200/50 backdrop-blur-2xl"
          }`}
        >
          {/* Brilho principal da paleta/cor do usuário */}
          <div
            className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full opacity-25 blur-[110px]"
            style={{ background: primaryFill }}
          />

          {/* Efeito Atmosférico de Fundo seguindo a cor única ou paleta escolhida */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
            <div
              className="absolute -right-12 -top-12 h-64 w-64 rounded-full blur-[90px]"
              style={{
                background: primaryFill,
                animation:
                  seasonInfo.key === "summer"
                    ? "sunPulse 6s ease-in-out infinite"
                    : undefined,
                opacity: 0.22,
              }}
            />

            {seasonInfo.key !== "summer" &&
              SEASON_PARTICLES.map((p, idx) => {
                const pColor = getSeasonParticleColor(idx);
                return (
                  <span
                    key={idx}
                    className="absolute top-0 block"
                    style={{
                      left: p.left,
                      width:
                        seasonInfo.key === "winter"
                          ? `${p.size * 0.7}px`
                          : `${p.size}px`,
                      height:
                        seasonInfo.key === "winter"
                          ? `${p.size * 0.7}px`
                          : `${p.size * 0.62}px`,
                      backgroundColor: pColor,
                      borderRadius:
                        seasonInfo.key === "spring"
                          ? "70% 10% 70% 10%"
                          : seasonInfo.key === "autumn"
                          ? "80% 0 80% 0"
                          : "9999px",
                      boxShadow:
                        seasonInfo.key === "winter"
                          ? `0 0 8px ${pColor}`
                          : undefined,
                      animation: `seasonDrift ${p.duration} linear ${p.delay} infinite`,
                    }}
                  />
                );
              })}
          </div>

          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            {/* BLOCO ESQUERDO: Badges + Título + Subtítulo */}
            <div className="space-y-2.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md shrink-0"
                  style={{
                    backgroundColor: withAlpha(primaryColor, 0.15),
                    color: primaryColor,
                  }}
                >
                  <CalendarIcon size={13} />
                  <span>Agenda Executiva</span>
                </div>

                <div
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs font-bold backdrop-blur-md bg-black/20 dark:bg-white/5 shrink-0"
                  style={{ color: primaryColor }}
                >
                  <SeasonIcon size={13} />
                  <span>
                    {seasonInfo.name} • {seasonInfo.desc}
                  </span>
                </div>

                {/* Seletor de Região / UF para Feriados */}
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold backdrop-blur-md shrink-0 ${
                    dark
                      ? "border-white/10 bg-zinc-900/80 text-zinc-300"
                      : "border-zinc-200 bg-zinc-100/90 text-zinc-700"
                  }`}
                >
                  <MapPin size={12} style={{ color: primaryColor }} />
                  <select
                    value={selectedState}
                    onChange={(e) => handleStateChange(e.target.value)}
                    title="Selecionar Estado para feriados regionais"
                    className="bg-transparent outline-none cursor-pointer text-xs font-bold pr-1"
                  >
                    {BRAZIL_STATES.map((st) => (
                      <option
                        key={st.code}
                        value={st.code}
                        className={
                          dark
                            ? "bg-zinc-900 text-zinc-100"
                            : "bg-white text-zinc-900"
                        }
                      >
                        {st.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <h1
                  className={`text-3xl sm:text-4xl font-black tracking-tight capitalize ${titleColor}`}
                >
                  {viewMode === "year" ? yearLabel : monthLabel}
                </h1>

                {todayHoliday && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs font-bold text-amber-400">
                    <Flag size={12} /> Hoje: {todayHoliday.name}
                  </span>
                )}
              </div>

              <p className={`text-xs sm:text-sm font-medium ${subtitleColor} max-w-lg`}>
                Organize compromissos, feriados e conexões com seus projetos em um
                só lugar.
              </p>
            </div>

            {/* BLOCO DIREITO: Controles organizados em 2 linhas alinhadas à direita */}
            <div className="flex flex-col items-start lg:items-end gap-2.5 shrink-0">
              {/* Linha 1: Botão de Ação Principal */}
              <button
                onClick={handleOpenNew}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap ${
                  isLightBtn ? "text-zinc-950" : "text-white"
                }`}
                style={{ background: primaryFill }}
              >
                <Plus size={15} strokeWidth={2.8} />
                <span>Novo Evento</span>
              </button>

              {/* Linha 2: Seletor de Visão + Navegação de Datas */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Seletor Ano / Mês / Semana */}
                <div
                  className={`flex items-center rounded-xl border p-1 shadow-inner ${
                    dark
                      ? "border-white/10 bg-zinc-900/80"
                      : "border-zinc-200 bg-zinc-100/80"
                  }`}
                >
                  {(["year", "month", "week"] as const).map((mode) => {
                    const labels = { year: "Ano", month: "Mês", week: "Semana" };
                    return (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer whitespace-nowrap ${
                          viewMode === mode
                            ? isLightBtn
                              ? "shadow-xs text-zinc-950"
                              : "shadow-xs text-white"
                            : "text-zinc-400 hover:text-zinc-100"
                        }`}
                        style={
                          viewMode === mode ? { background: primaryFill } : undefined
                        }
                      >
                        {labels[mode]}
                      </button>
                    );
                  })}
                </div>

                {/* Navegação < Hoje > */}
                <div
                  className={`flex items-center rounded-xl border p-1 shadow-inner ${
                    dark
                      ? "border-white/10 bg-zinc-900/80"
                      : "border-zinc-200 bg-zinc-100/80"
                  }`}
                >
                  <button
                    onClick={() => {
                      if (viewMode === "year") {
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear() - 1,
                            currentMonth.getMonth(),
                            1
                          )
                        );
                      } else if (viewMode === "week") {
                        const d = new Date(selectedDateKey + "T00:00:00");
                        d.setDate(d.getDate() - 7);
                        setSelectedDateKey(toKey(d));
                      } else {
                        const next = new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() - 1,
                          1
                        );
                        setCurrentMonth(next);
                        setSelectedDateKey(toKey(next));
                      }
                    }}
                    title="Anterior"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100 cursor-pointer"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => {
                      const now = new Date();
                      setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                      setSelectedDateKey(toKey(now));
                    }}
                    className={`px-3 py-1 text-xs font-extrabold transition cursor-pointer rounded-lg hover:bg-white/10 whitespace-nowrap ${titleColor}`}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => {
                      if (viewMode === "year") {
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear() + 1,
                            currentMonth.getMonth(),
                            1
                          )
                        );
                      } else if (viewMode === "week") {
                        const d = new Date(selectedDateKey + "T00:00:00");
                        d.setDate(d.getDate() + 7);
                        setSelectedDateKey(toKey(d));
                      } else {
                        const next = new Date(
                          currentMonth.getFullYear(),
                          currentMonth.getMonth() + 1,
                          1
                        );
                        setCurrentMonth(next);
                        setSelectedDateKey(toKey(next));
                      }
                    }}
                    title="Próximo"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-zinc-100 cursor-pointer"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LAYOUT PRINCIPAL */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* COLUNA 1: "O QUE TEM PARA HOJE" + PASTAS + FILTROS */}
          <aside className="space-y-4 xl:col-span-4">
            {/* 1. "O QUE TEM PARA HOJE" */}
            <div
              className={`rounded-[2rem] border p-5 ${ui.panel} space-y-3 shadow-lg relative overflow-hidden`}
            >
              <div className="flex items-center justify-between border-b border-zinc-500/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: withAlpha(primaryColor, 0.18),
                      color: primaryColor,
                    }}
                  >
                    <CalendarDays size={17} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Prioridade
                    </span>
                    <h2 className={`text-sm font-black ${titleColor}`}>
                      O que tem para hoje
                    </h2>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSelectedDateKey(todayKey);
                    handleOpenNew();
                  }}
                  title="Adicionar para hoje"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <Plus size={14} style={{ color: primaryColor }} />
                </button>
              </div>

              {todaysTasks.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-400">
                    <span>
                      {todaysCompletedCount} de {todaysTasks.length} concluídas
                    </span>
                    <span>{todaysProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-500/15">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${todaysProgress}%`,
                        background: primaryFill,
                      }}
                    />
                  </div>
                </div>
              )}

              {todaysTasks.length === 0 ? (
                <div className="text-center py-5 text-xs text-zinc-400 font-medium">
                  Nenhum compromisso agendado para hoje.
                </div>
              ) : (
                <div className="space-y-2 max-h-[215px] overflow-y-auto thin-scroll pr-1">
                  {todaysTasks.map((task) => {
                    const taskExtra = task as RichCalendarTask & {
                      text?: string;
                      time?: string;
                    };
                    return (
                      <div
                        key={task.id}
                        className={`group relative rounded-xl border p-3 transition-all ${
                          dark
                            ? "border-white/10 bg-white/[0.02]"
                            : "border-zinc-200 bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <button
                              onClick={() => onToggleTask(task.id)}
                              className="mt-0.5 shrink-0 cursor-pointer transition-transform hover:scale-110"
                            >
                              {task.completed ? (
                                <CheckCircle2
                                  size={16}
                                  style={{ color: primaryColor }}
                                />
                              ) : (
                                <Circle
                                  size={16}
                                  className="text-zinc-400 hover:text-zinc-200"
                                />
                              )}
                            </button>
                            <div className="min-w-0">
                              <p
                                className={`text-xs font-extrabold truncate ${
                                  task.completed ? "line-through opacity-50" : ""
                                } ${titleColor}`}
                              >
                                {task.title || taskExtra.text}
                              </p>
                              {task.description && (
                                <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                                  {task.description}
                                </p>
                              )}
                              {taskExtra.time && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-zinc-400 mt-1 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">
                                  <Clock size={11} /> {taskExtra.time}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="absolute right-2 top-2 flex items-center gap-1 bg-zinc-950/90 border border-white/10 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                            <button
                              onClick={() => handleOpenEdit(task)}
                              className="p-1 text-zinc-300 hover:text-white transition cursor-pointer"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => onDeleteTask(task.id)}
                              className="p-1 text-red-400 hover:text-red-300 transition cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. PASTAS */}
            <div
              className={`rounded-[2rem] border p-5 ${ui.panel} space-y-3 shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
                  Pastas
                </span>
                {onCreateFolder && (
                  <button
                    onClick={() => setCreatingFolder((v) => !v)}
                    title="Nova pasta"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-zinc-100 transition hover:bg-white/5 cursor-pointer"
                  >
                    <FolderPlus size={14} />
                  </button>
                )}
              </div>

              {creatingFolder && (
                <form
                  onSubmit={handleAddFolderSubmit}
                  className="space-y-2.5 rounded-xl border border-white/15 p-3 bg-zinc-900/40"
                >
                  <input
                    autoFocus
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nome da pasta..."
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-medium outline-none ${ui.field}`}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {FOLDER_COLOR_OPTIONS.map((c) => (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => setNewFolderColor(c.name)}
                          className={`h-4 w-4 rounded-full transition-transform cursor-pointer ${
                            newFolderColor === c.name
                              ? "ring-2 ring-white scale-110"
                              : "opacity-70 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                    <button type="submit" className={ui.btnPrimarySm}>
                      Criar
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-1.5 max-h-[160px] overflow-y-auto thin-scroll pr-1">
                <button
                  onClick={() => setSelectedFolderId("all")}
                  className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                    selectedFolderId === "all"
                      ? "shadow-xs"
                      : dark
                      ? "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                  style={
                    selectedFolderId === "all"
                      ? {
                          backgroundColor: withAlpha(primaryColor, 0.16),
                          color: primaryColor,
                        }
                      : undefined
                  }
                >
                  <span className="flex items-center gap-2.5">
                    <FolderIcon size={15} />
                    Todas as Pastas
                  </span>
                  <span className="text-[11px] font-extrabold opacity-80 px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                    {tasks.length}
                  </span>
                </button>

                {folders.map((folder) => {
                  const isActive = selectedFolderId === folder.id;
                  const count = tasks.filter(
                    (t) => t.folderId === folder.id
                  ).length;
                  const folderColor = getResolvedFolderColor(folder.color);

                  return (
                    <button
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "shadow-xs"
                          : dark
                          ? "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                          : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                      }`}
                      style={
                        isActive
                          ? {
                              backgroundColor: withAlpha(folderColor, 0.18),
                              color: folderColor,
                            }
                          : undefined
                      }
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: folderColor }}
                        />
                        <span className="truncate">{folder.name}</span>
                      </span>
                      <span className="text-[11px] font-extrabold opacity-75 px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. FILTROS DE CONEXÃO MÚLTIPLA */}
            <div
              className={`rounded-[2rem] border p-5 ${ui.panel} space-y-3 shadow-md`}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                  <Filter size={12} />
                  Conexões{" "}
                  {selectedModules.length > 0 && `(${selectedModules.length})`}
                </span>
                {selectedModules.length > 0 && (
                  <button
                    onClick={() => setSelectedModules([])}
                    className="flex items-center gap-1 text-[11px] font-bold text-zinc-400 hover:text-zinc-200 transition bg-white/5 px-2 py-0.5 rounded cursor-pointer"
                  >
                    Limpar <X size={11} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-2 gap-2">
                {(Object.keys(moduleMeta) as ConnectionModule[]).map((key) => {
                  const meta = moduleMeta[key];
                  const Icon = meta.icon;
                  const isSelected = selectedModules.includes(key);

                  return (
                    <button
                      key={key}
                      onClick={() => toggleModuleFilter(key)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "shadow-xs"
                          : dark
                          ? "border-white/5 bg-white/[0.02] text-zinc-300 hover:border-white/15 hover:bg-white/[0.05]"
                          : "border-zinc-200/70 bg-zinc-50/70 text-zinc-700 hover:border-zinc-300 hover:bg-zinc-100"
                      }`}
                      style={
                        isSelected
                          ? {
                              borderColor: meta.color,
                              backgroundColor: meta.bg,
                              color: meta.color,
                            }
                          : undefined
                      }
                    >
                      <span className="flex items-center gap-2 truncate">
                        <Icon
                          size={13}
                          style={{ color: meta.color }}
                          className="shrink-0"
                        />
                        <span className="truncate">{meta.label}</span>
                      </span>
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* COLUNA 2: CALENDÁRIO CENTRAL */}
          <section
            className={`rounded-[2rem] border p-5 sm:p-6 ${ui.panel} xl:col-span-8 flex flex-col justify-between shadow-xl`}
          >
            <div>
              {/* Banner discreto caso o dia selecionado tenha feriado */}
              {selectedHoliday && viewMode !== "year" && (
                <div className="mb-3.5 flex items-center justify-between rounded-xl border border-amber-500/25 bg-amber-500/10 px-3.5 py-2.5 text-xs">
                  <span className="flex items-center gap-2 font-bold text-amber-400">
                    <Flag size={14} />
                    <span>
                      {selectedHoliday.name} (
                      {selectedHoliday.type === "nacional"
                        ? "Feriado Nacional"
                        : `Feriado Regional • ${selectedState}`}
                      )
                    </span>
                  </span>
                  <span className="text-[11px] text-amber-300/80 font-semibold">
                    {selectedDateKey.split("-").reverse().join("/")}
                  </span>
                </div>
              )}

              {/* ----------------- VISÃO DE ANO ----------------- */}
              {viewMode === "year" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-500/10 pb-3">
                    <div>
                      <h3 className={`text-base font-black ${titleColor}`}>
                        Visão Anual Consolidada
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Dias em âmbar indicam feriados • Clique em um mês para abrir
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-lg bg-black/10 dark:bg-white/10 text-zinc-300">
                      {yearLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                    {yearMonths.map((m) => {
                      const isCurrentMonth =
                        m.date.getMonth() === currentMonth.getMonth();
                      return (
                        <div
                          key={m.monthIndex}
                          onClick={() => {
                            setCurrentMonth(m.date);
                            setViewMode("month");
                          }}
                          className={`group relative rounded-2xl border p-3 text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isCurrentMonth
                              ? "shadow-sm"
                              : dark
                              ? "border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20"
                              : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300"
                          }`}
                          style={
                            isCurrentMonth
                              ? {
                                  borderColor: primaryColor,
                                  backgroundColor: withAlpha(primaryColor, 0.12),
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-500/10">
                            <span
                              className={`text-xs font-black capitalize ${titleColor}`}
                            >
                              {m.name}
                            </span>
                            {m.count > 0 && (
                              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/10 text-zinc-300">
                                {m.count}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-7 gap-0.5 text-center">
                            {WEEKDAYS_SHORT.map((wd, i) => (
                              <span
                                key={i}
                                className="text-[9px] font-bold text-zinc-400/70 pb-0.5"
                              >
                                {wd}
                              </span>
                            ))}
                            {m.daysList.map((item, idx) => {
                              if (!item) {
                                return <span key={idx} />;
                              }
                              const hasTask = Boolean(tasksByDate[item.key]);
                              const holiday = holidaysMap[item.key];
                              const isTodayMini = item.key === todayKey;

                              return (
                                <span
                                  key={idx}
                                  title={holiday ? holiday.name : undefined}
                                  className={`flex h-4.5 w-4.5 mx-auto items-center justify-center text-[10px] font-bold rounded ${
                                    isTodayMini
                                      ? isLightBtn
                                        ? "bg-zinc-950 text-white font-black"
                                        : "bg-white text-zinc-950 font-black"
                                      : holiday
                                      ? "bg-amber-500/20 text-amber-400 font-extrabold"
                                      : hasTask
                                      ? "bg-black/15 dark:bg-white/20 font-extrabold"
                                      : "text-zinc-500"
                                  }`}
                                  style={
                                    hasTask && !isTodayMini && !holiday
                                      ? { color: primaryColor }
                                      : undefined
                                  }
                                >
                                  {item.dayNum}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ----------------- VISÃO DE MÊS ----------------- */}
              {viewMode === "month" && (
                <div>
                  <div className="mb-3 grid grid-cols-7 text-center">
                    {WEEKDAYS.map((day) => (
                      <span
                        key={day}
                        className="text-[11px] font-black uppercase tracking-widest text-zinc-400/80"
                      >
                        {day}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map(({ date, key, inMonth }) => {
                      const dayTasks = tasksByDate[key] || [];
                      const holiday = holidaysMap[key];
                      const isToday = key === todayKey;
                      const isSelected = key === selectedDateKey;

                      return (
                        <button
                          key={key}
                          onClick={() => setSelectedDateKey(key)}
                          title={holiday ? holiday.name : undefined}
                          className={`group relative flex min-h-[96px] sm:min-h-[106px] flex-col justify-between rounded-xl border p-2 text-left transition-all cursor-pointer ${
                            !inMonth ? "opacity-30 hover:opacity-60" : ""
                          } ${
                            isSelected
                              ? "shadow-sm"
                              : holiday
                              ? dark
                                ? "border-amber-500/25 bg-amber-500/[0.04] hover:border-amber-500/40"
                                : "border-amber-400/50 bg-amber-50/70 hover:border-amber-500"
                              : dark
                              ? "border-white/5 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"
                              : "border-zinc-200/80 bg-zinc-50/60 hover:border-zinc-300 hover:bg-zinc-100"
                          }`}
                          style={
                            isSelected
                              ? {
                                  borderColor: primaryColor,
                                  backgroundColor: withAlpha(primaryColor, 0.12),
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center justify-between w-full gap-1">
                            <span
                              className={`flex h-6.5 w-6.5 items-center justify-center rounded-lg text-xs font-black transition-transform group-hover:scale-105 ${
                                isToday
                                  ? isLightBtn
                                    ? "text-zinc-950 font-black shadow-xs"
                                    : "text-white font-black shadow-xs"
                                  : holiday
                                  ? "text-amber-400"
                                  : titleColor
                              }`}
                              style={
                                isToday ? { background: primaryFill } : undefined
                              }
                            >
                              {date.getDate()}
                            </span>

                            <div className="flex items-center gap-1">
                              {holiday && (
                                <Flag
                                  size={11}
                                  className="text-amber-400 shrink-0"
                                />
                              )}
                              {dayTasks.length > 0 && (
                                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 text-zinc-300">
                                  {dayTasks.length}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1 pt-1 overflow-hidden w-full">
                            {holiday && (
                              <div className="truncate text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400">
                                {holiday.name}
                              </div>
                            )}

                            {dayTasks.slice(0, holiday ? 1 : 2).map((t, idx) => {
                              const tExtra = t as RichCalendarTask & {
                                text?: string;
                                time?: string;
                              };
                              return (
                                <div
                                  key={idx}
                                  className="truncate text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-zinc-200 flex items-center gap-1"
                                >
                                  {tExtra.time && (
                                    <span className="opacity-70 text-[9px]">
                                      {tExtra.time}
                                    </span>
                                  )}
                                  <span className="truncate">
                                    {t.title || tExtra.text}
                                  </span>
                                </div>
                              );
                            })}

                            {dayTasks.length > (holiday ? 1 : 2) && (
                              <span className="block text-[10px] text-zinc-400 font-bold pl-0.5">
                                +{dayTasks.length - (holiday ? 1 : 2)} mais
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ----------------- VISÃO DE SEMANA ----------------- */}
              {viewMode === "week" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-500/10 pb-3">
                    <div>
                      <h3 className={`text-base font-black ${titleColor}`}>
                        Planejamento Semanal
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Visão linear com feriados e compromissos da semana
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {weekDays.map(({ date, key }) => {
                      const dayTasks = tasksByDate[key] || [];
                      const holiday = holidaysMap[key];
                      const isToday = key === todayKey;
                      const isSelected = key === selectedDateKey;

                      return (
                        <div
                          key={key}
                          onClick={() => setSelectedDateKey(key)}
                          className={`group rounded-2xl border p-3.5 sm:p-4 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center gap-3 ${
                            isSelected
                              ? "shadow-sm"
                              : dark
                              ? "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
                              : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                          }`}
                          style={
                            isSelected
                              ? {
                                  borderColor: primaryColor,
                                  backgroundColor: withAlpha(primaryColor, 0.08),
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-center gap-3 sm:w-48 shrink-0">
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-black ${
                                isToday
                                  ? isLightBtn
                                    ? "text-zinc-950 font-black"
                                    : "text-white font-black"
                                  : titleColor
                              }`}
                              style={
                                isToday ? { background: primaryFill } : undefined
                              }
                            >
                              {date.getDate()}
                            </span>
                            <div>
                              <span
                                className={`block text-xs font-black capitalize ${titleColor}`}
                              >
                                {date.toLocaleDateString("pt-BR", {
                                  weekday: "long",
                                })}
                              </span>
                              <span className="block text-[11px] text-zinc-400 font-medium">
                                {date.toLocaleDateString("pt-BR", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                            {holiday && (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-400">
                                <Flag size={12} />
                                {holiday.name}
                              </span>
                            )}

                            {dayTasks.length === 0 && !holiday ? (
                              <span className="text-xs text-zinc-500 italic">
                                Livre
                              </span>
                            ) : (
                              dayTasks.map((t, idx) => {
                                const tExtra = t as RichCalendarTask & {
                                  text?: string;
                                  time?: string;
                                };
                                return (
                                  <div
                                    key={idx}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 border text-xs font-bold ${
                                      t.completed ? "line-through opacity-50" : ""
                                    } ${
                                      dark
                                        ? "bg-zinc-900/90 border-white/10 text-zinc-200"
                                        : "bg-white border-zinc-200 text-zinc-800"
                                    }`}
                                  >
                                    {tExtra.time && (
                                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                                        <Clock size={10} /> {tExtra.time}
                                      </span>
                                    )}
                                    <span className="truncate max-w-[200px]">
                                      {t.title || tExtra.text}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="sm:text-right shrink-0">
                            <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-black/10 dark:bg-white/10 text-zinc-300">
                              {dayTasks.length}{" "}
                              {dayTasks.length === 1 ? "item" : "itens"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO E EDIÇÃO */}
      <CalendarEventModal
        isOpen={modalOpen}
        theme={theme}
        accentColor={primaryColor}
        initialDate={selectedDateKey}
        defaultFolderId={
          selectedFolderId !== "all" ? selectedFolderId : undefined
        }
        editingTask={editingTask}
        folders={folders}
        topics={topics}
        pipelines={pipelines}
        allTasks={tasks}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveTask}
      />
    </div>
  );
}