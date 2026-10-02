"use client";

import React, { useMemo, useState } from "react";

import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Pencil,
  Calendar,
  Clock,
  Tag,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Link as LinkIcon,
  Upload,
  AlertTriangle,
  ArrowRight,
  GitFork,
  ListTodo,
  CheckCheck,
  CalendarDays,
} from "lucide-react";

import { Folder, Task, Topic } from "@/types";

type Theme = "dark" | "light";

interface ExtendedTopic extends Topic {
  color?: string;
}

interface ShowcaseProps {
  tasks: Task[];
  topics: ExtendedTopic[];
  folders: Folder[];

  onOpenTaskModal: () => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSaveEditedTask: (updatedTask: Task) => void;

  onSelectTopic?: (topicId: string | null) => void;

  theme?: Theme;
}

const TOPIC_COLORS: Record<
  string,
  {
    bg: string;
    text: string;
    border: string;
    dot: string;
  }
> = {
  emerald: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-400",
    border: "border-emerald-800/50",
    dot: "bg-emerald-400",
  },

  blue: {
    bg: "bg-blue-950/40",
    text: "text-blue-400",
    border: "border-blue-800/50",
    dot: "bg-blue-400",
  },

  amber: {
    bg: "bg-amber-950/40",
    text: "text-amber-400",
    border: "border-amber-800/50",
    dot: "bg-amber-400",
  },

  purple: {
    bg: "bg-purple-950/40",
    text: "text-purple-400",
    border: "border-purple-800/50",
    dot: "bg-purple-400",
  },

  rose: {
    bg: "bg-rose-950/40",
    text: "text-rose-400",
    border: "border-rose-800/50",
    dot: "bg-rose-400",
  },

  default: {
    bg: "bg-zinc-900",
    text: "text-zinc-300",
    border: "border-zinc-800",
    dot: "bg-zinc-400",
  },
};

function getTodayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTaskDateStatus(dueDateStr?: string) {
  if (!dueDateStr) {
    return {
      isToday: false,
      isOverdue: false,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const delimiter = dueDateStr.includes("-") ? "-" : "/";
  const parts = dueDateStr.split(delimiter).map(Number);

  let dueDate: Date;

  if (delimiter === "-") {
    dueDate = new Date(parts[0], parts[1] - 1, parts[2]);
  } else {
    dueDate = new Date(parts[2], parts[1] - 1, parts[0]);
  }

  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();

  return {
    isToday: diffTime === 0,
    isOverdue: diffTime < 0,
  };
}

function formatDate(dateString: string) {
  if (!dateString) return "";

  const delimiter = dateString.includes("-") ? "-" : "/";
  const parts = dateString.split(delimiter);

  if (delimiter === "-") {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return dateString;
}

const MAX_DESCRIPTION_LENGTH = 90;

export default function Showcase({
  tasks,
  topics,
  onOpenTaskModal,
  onToggleTask,
  onDeleteTask,
  onSaveEditedTask,
  onSelectTopic,
  theme = "dark",
}: ShowcaseProps) {
  const isDark = theme === "dark";

  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [imageInputType, setImageInputType] = useState<"file" | "url">(
    "url"
  );

  const [expandedTaskIds, setExpandedTaskIds] = useState<
    Record<string, boolean>
  >({});

  const todayString = getTodayString();

  const toggleExpandDescription = (taskId: string) => {
    setExpandedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleOpenEdit = (task: Task) => {
    setEditingTask({ ...task });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingTask) {
      onSaveEditedTask(editingTask);
    }

    setEditingTask(null);
  };

  const handleImageFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (file && editingTask) {
      const reader = new FileReader();

      reader.onloadend = () => {
        setEditingTask({
          ...editingTask,
          imageUrl: reader.result as string,
        });
      };

      reader.readAsDataURL(file);
    }
  };

  const pendingTasks = useMemo(
    () => tasks.filter((task) => !task.completed),
    [tasks]
  );

  const overdueTasks = useMemo(
    () =>
      pendingTasks.filter(
        (task) => getTaskDateStatus(task.dueDate).isOverdue
      ),
    [pendingTasks]
  );

  const todayTasks = useMemo(
    () =>
      pendingTasks.filter(
        (task) => getTaskDateStatus(task.dueDate).isToday
      ),
    [pendingTasks]
  );

  const upcomingTasks = useMemo(
    () =>
      pendingTasks.filter((task) => {
        const status = getTaskDateStatus(task.dueDate);

        return !status.isToday && !status.isOverdue;
      }),
    [pendingTasks]
  );

  const completedToday = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.completed &&
          task.dueDate === todayString
      ),
    [tasks, todayString]
  );

  const sortedUpcomingTasks = [...upcomingTasks].sort((a, b) =>
    a.dueDate.localeCompare(b.dueDate)
  );

  const completedTasksCount = tasks.filter(
    (task) => task.completed
  ).length;

  const progressPercentage =
    tasks.length > 0
      ? Math.round((completedTasksCount / tasks.length) * 100)
      : 0;

  const getTopic = (topicId: string) =>
    topics.find((topic) => topic.id === topicId);

  const TaskCard = ({ task }: { task: Task }) => {
    const topic = getTopic(task.topicId);

    const topicStyle =
      TOPIC_COLORS[topic?.color || "default"] ||
      TOPIC_COLORS.default;

    const { isToday, isOverdue } = getTaskDateStatus(
      task.dueDate
    );

    const isExpanded = !!expandedTaskIds[task.id];

    const hasLongDescription =
      !!task.description &&
      task.description.length > MAX_DESCRIPTION_LENGTH;

    const displayDescription =
      hasLongDescription && !isExpanded
        ? `${task.description.slice(
            0,
            MAX_DESCRIPTION_LENGTH
          )}...`
        : task.description;

    return (
      <div
        className={`
          group relative rounded-2xl border p-5
          transition-all duration-200
          flex flex-col justify-between
          min-h-60
          hover:-translate-y-0.5

          ${
            isDark
              ? `
                bg-zinc-950/80
                shadow-lg shadow-black/40
                ${
                  task.completed
                    ? "border-zinc-900 opacity-50"
                    : isOverdue
                    ? "border-red-950/80 bg-red-950/10 hover:border-red-800/80"
                    : "border-zinc-800/90 hover:border-zinc-700"
                }
              `
              : `
                bg-white
                shadow-sm
                ${
                  task.completed
                    ? "border-zinc-200 opacity-50"
                    : isOverdue
                    ? "border-red-200 bg-red-50 hover:border-red-300"
                    : "border-zinc-200 hover:border-zinc-300"
                }
              `
          }
        `}
      >
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              <button
                onClick={() => onToggleTask(task.id)}
                className={`
                  mt-0.5 transition-colors
                  rounded-full active:scale-90 shrink-0

                  ${
                    isDark
                      ? "text-zinc-500 hover:text-zinc-200"
                      : "text-zinc-400 hover:text-zinc-700"
                  }
                `}
              >
                {task.completed ? (
                  <CheckCircle2
                    size={18}
                    className="text-emerald-500"
                  />
                ) : (
                  <Circle size={18} />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className={`
                      text-sm font-semibold leading-snug truncate

                      ${
                        task.completed
                          ? isDark
                            ? "line-through text-zinc-600"
                            : "line-through text-zinc-400"
                          : isDark
                          ? "text-white"
                          : "text-zinc-900"
                      }
                    `}
                  >
                    {task.title}
                  </h3>

                  {!task.completed && (
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      {isOverdue ? (
                        <>
                          <span className="animate-ping absolute h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
                        </>
                      ) : isToday ? (
                        <>
                          <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        </>
                      ) : (
                        <span className="relative h-2.5 w-2.5 rounded-full bg-zinc-500" />
                      )}
                    </span>
                  )}
                </div>

                {topic && (
                  <button
                    onClick={() =>
                      onSelectTopic?.(topic.id)
                    }
                    className={`
                      inline-flex items-center gap-1.5
                      mt-2
                      text-[10px] font-medium
                      px-2.5 py-0.5 rounded-md border
                      transition-all

                      ${topicStyle.bg}
                      ${topicStyle.text}
                      ${topicStyle.border}

                      hover:brightness-125
                    `}
                  >
                    <span
                      className={`
                        w-1.5 h-1.5 rounded-full
                        ${topicStyle.dot}
                      `}
                    />

                    <Tag size={10} />

                    <span className="truncate max-w-30">
                      {topic.name}
                    </span>
                  </button>
                )}
              </div>
            </div>

            <div
              className="
                flex items-center gap-1
                opacity-0
                group-hover:opacity-100
                transition-opacity
              "
            >
              <button
                onClick={() => handleOpenEdit(task)}
                className={`
                  p-1.5 rounded-lg

                  ${
                    isDark
                      ? "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                      : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100"
                  }
                `}
              >
                <Pencil size={14} />
              </button>

              <button
                onClick={() => onDeleteTask(task.id)}
                className="
                  text-zinc-500
                  hover:text-red-500
                  hover:bg-red-500/10
                  p-1.5 rounded-lg
                "
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {task.description && (
            <div className="mt-3">
              <p
                className={`
                  text-xs leading-relaxed wrap-break-word

                  ${
                    isDark
                      ? "text-zinc-400"
                      : "text-zinc-600"
                  }
                `}
              >
                {displayDescription}
              </p>

              {hasLongDescription && (
                <button
                  onClick={() =>
                    toggleExpandDescription(task.id)
                  }
                  className={`
                    inline-flex items-center gap-1
                    text-[11px] font-medium
                    mt-1.5
                    underline underline-offset-2

                    ${
                      isDark
                        ? "text-zinc-300 hover:text-white"
                        : "text-zinc-600 hover:text-zinc-900"
                    }
                  `}
                >
                  {isExpanded ? (
                    <>
                      <span>Ver menos</span>
                      <ChevronUp size={12} />
                    </>
                  ) : (
                    <>
                      <span>Ver mais</span>
                      <ChevronDown size={12} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {task.imageUrl && (
            <div
              className={`
                mt-4 rounded-xl overflow-hidden
                border h-32 w-full

                ${
                  isDark
                    ? "border-zinc-800 bg-black"
                    : "border-zinc-200 bg-zinc-100"
                }
              `}
            >
              <img
                src={task.imageUrl}
                alt={task.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        <div
          className={`
            mt-5 pt-3
            border-t
            flex items-center justify-between
            text-[11px]

            ${
              isDark
                ? "border-zinc-900 text-zinc-500"
                : "border-zinc-200 text-zinc-500"
            }
          `}
        >
          <span
            className={`
              flex items-center gap-1.5 font-medium

              ${
                isOverdue && !task.completed
                  ? "text-red-500"
                  : isToday && !task.completed
                  ? "text-emerald-500"
                  : ""
              }
            `}
          >
            <Calendar size={13} />
            Até: {formatDate(task.dueDate)}
          </span>

          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDate(task.createdAt)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`
        flex-1 overflow-y-auto
        transition-colors duration-300

        ${
          isDark
            ? "text-zinc-100"
            : "text-zinc-900"
        }
      `}
    >
      <div className="max-w-7xl mx-auto w-full p-6 md:p-8">

        {/* HEADER */}

        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 pb-6">
          <div>
            <p className="text-xs font-medium mb-2 text-zinc-500">
              YOUR MIND
            </p>

            <h1
              className={`
                text-3xl font-bold tracking-tight
                ${
                  isDark
                    ? "text-white"
                    : "text-zinc-900"
                }
              `}
            >
              Seu painel
            </h1>

            <p
              className={`
                text-sm mt-1
                ${
                  isDark
                    ? "text-zinc-400"
                    : "text-zinc-600"
                }
              `}
            >
              Organize o que precisa ser feito e continue
              seus estudos sem perder o foco.
            </p>
          </div>

          <button
            onClick={onOpenTaskModal}
            className="
              inline-flex items-center justify-center
              gap-2
              bg-zinc-900
              hover:bg-zinc-800
              text-white
              text-xs font-semibold
              px-4 py-2.5
              rounded-xl
              transition-all
              shadow-lg
              active:scale-95
            "
          >
            <Plus size={15} />
            Nova Anotação
          </button>
        </header>

        {/* RESUMO */}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">

          <div
            className={`
              rounded-2xl border p-4
              ${
                isDark
                  ? "bg-zinc-950/70 border-zinc-800"
                  : "bg-white border-zinc-200"
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">
                Atrasadas
              </span>

              <AlertTriangle
                size={15}
                className="text-red-500"
              />
            </div>

            <strong
              className={`
                block text-2xl mt-2

                ${
                  overdueTasks.length
                    ? "text-red-500"
                    : isDark
                    ? "text-white"
                    : "text-zinc-900"
                }
              `}
            >
              {overdueTasks.length}
            </strong>
          </div>

          <div
            className={`
              rounded-2xl border p-4
              ${
                isDark
                  ? "bg-zinc-950/70 border-zinc-800"
                  : "bg-white border-zinc-200"
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">
                Hoje
              </span>

              <CalendarDays
                size={15}
                className="text-emerald-500"
              />
            </div>

            <strong
              className={`
                block text-2xl mt-2
                ${
                  isDark
                    ? "text-white"
                    : "text-zinc-900"
                }
              `}
            >
              {todayTasks.length}
            </strong>
          </div>

          <div
            className={`
              rounded-2xl border p-4
              ${
                isDark
                  ? "bg-zinc-950/70 border-zinc-800"
                  : "bg-white border-zinc-200"
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">
                Concluídas
              </span>

              <CheckCheck
                size={15}
                className="text-blue-500"
              />
            </div>

            <strong
              className={`
                block text-2xl mt-2
                ${
                  isDark
                    ? "text-white"
                    : "text-zinc-900"
                }
              `}
            >
              {completedTasksCount}
            </strong>
          </div>

          <div
            className={`
              rounded-2xl border p-4
              ${
                isDark
                  ? "bg-zinc-950/70 border-zinc-800"
                  : "bg-white border-zinc-200"
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">
                Progresso
              </span>

              <ListTodo
                size={15}
                className="text-purple-500"
              />
            </div>

            <strong
              className={`
                block text-2xl mt-2
                ${
                  isDark
                    ? "text-white"
                    : "text-zinc-900"
                }
              `}
            >
              {progressPercentage}%
            </strong>
          </div>

        </section>

        {/* ALERTA */}

        {overdueTasks.length > 0 && (
          <section
            className={`
              mb-7 rounded-2xl border p-5
              ${
                isDark
                  ? "bg-red-950/20 border-red-900/50"
                  : "bg-red-50 border-red-200"
              }
            `}
          >
            <div className="flex items-start gap-3">

              <div className="mt-0.5 text-red-500">
                <AlertTriangle size={19} />
              </div>

              <div className="flex-1">

                <h2
                  className={`
                    text-sm font-semibold
                    ${
                      isDark
                        ? "text-red-300"
                        : "text-red-700"
                    }
                  `}
                >
                  Você tem {overdueTasks.length}{" "}
                  {overdueTasks.length === 1
                    ? "tarefa atrasada"
                    : "tarefas atrasadas"}
                </h2>

                <p
                  className={`
                    text-xs mt-1
                    ${
                      isDark
                        ? "text-red-300/60"
                        : "text-red-600/80"
                    }
                  `}
                >
                  Resolva essas pendências antes de
                  continuar para os próximos tópicos.
                </p>

                <div className="flex flex-wrap gap-2 mt-3">

                  {overdueTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() =>
                        onSelectTopic?.(task.topicId)
                      }
                      className={`
                        text-xs px-3 py-1.5
                        rounded-lg
                        border
                        transition-colors

                        ${
                          isDark
                            ? "bg-red-950/40 border-red-900/60 text-red-300 hover:bg-red-900/40"
                            : "bg-white border-red-200 text-red-700 hover:bg-red-100"
                        }
                      `}
                    >
                      {task.title}
                    </button>
                  ))}

                </div>
              </div>
            </div>
          </section>
        )}

        {/* ATRASADAS */}

        {overdueTasks.length > 0 && (
          <section className="mb-8">

            <div className="flex items-center justify-between mb-4">

              <div>
                <h2
                  className={`
                    text-base font-semibold
                    ${
                      isDark
                        ? "text-white"
                        : "text-zinc-900"
                    }
                  `}
                >
                  Atrasadas
                </h2>

                <p className="text-xs mt-1 text-zinc-500">
                  O que precisa da sua atenção primeiro.
                </p>
              </div>

              <span className="text-xs text-red-500 font-medium">
                {overdueTasks.length}
              </span>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

              {overdueTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                />
              ))}

            </div>
          </section>
        )}

        {/* HOJE */}

        <section className="mb-8">

          <div className="flex items-center justify-between mb-4">

            <div>
              <h2
                className={`
                  text-base font-semibold
                  ${
                    isDark
                      ? "text-white"
                      : "text-zinc-900"
                  }
                `}
              >
                Hoje
              </h2>

              <p className="text-xs mt-1 text-zinc-500">
                O que você precisa fazer hoje.
              </p>
            </div>

            <span className="text-xs text-emerald-500 font-medium">
              {todayTasks.length}
            </span>

          </div>

          {todayTasks.length === 0 ? (
            <div
              className={`
                rounded-2xl
                border border-dashed
                p-8 text-center

                ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950/40"
                    : "border-zinc-200 bg-white"
                }
              `}
            >
              <CheckCircle2
                size={24}
                className="mx-auto text-emerald-500 mb-2"
              />

              <p
                className={`
                  text-sm font-medium
                  ${
                    isDark
                      ? "text-zinc-300"
                      : "text-zinc-700"
                  }
                `}
              >
                Nada pendente para hoje.
              </p>

              <p className="text-xs mt-1 text-zinc-500">
                Você está em dia.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

              {todayTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                />
              ))}

            </div>
          )}

        </section>

        {/* CONCLUÍDAS HOJE */}

        {completedToday.length > 0 && (
          <section className="mb-8">

            <div className="flex items-center gap-2 mb-4">

              <CheckCheck
                size={16}
                className="text-emerald-500"
              />

              <div>
                <h2
                  className={`
                    text-base font-semibold
                    ${
                      isDark
                        ? "text-white"
                        : "text-zinc-900"
                    }
                  `}
                >
                  Feitas hoje
                </h2>

                <p className="text-xs mt-1 text-zinc-500">
                  O que você já conseguiu concluir.
                </p>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

              {completedToday.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                />
              ))}

            </div>

          </section>
        )}

        {/* PRÓXIMOS DIAS */}

        <section className="mb-8">

          <div className="flex items-center justify-between mb-4">

            <div>
              <h2
                className={`
                  text-base font-semibold
                  ${
                    isDark
                      ? "text-white"
                      : "text-zinc-900"
                  }
                `}
              >
                Próximos dias
              </h2>

              <p className="text-xs mt-1 text-zinc-500">
                O que está planejado para depois.
              </p>
            </div>

            <span className="text-xs text-zinc-500">
              {sortedUpcomingTasks.length}
            </span>

          </div>

          {sortedUpcomingTasks.length === 0 ? (
            <div
              className={`
                rounded-2xl
                border border-dashed
                p-8 text-center

                ${
                  isDark
                    ? "border-zinc-800 bg-zinc-950/40"
                    : "border-zinc-200 bg-white"
                }
              `}
            >
              <CalendarDays
                size={24}
                className="mx-auto text-zinc-400 mb-2"
              />

              <p
                className={`
                  text-sm font-medium
                  ${
                    isDark
                      ? "text-zinc-300"
                      : "text-zinc-700"
                  }
                `}
              >
                Nenhuma tarefa planejada.
              </p>

              <p className="text-xs mt-1 text-zinc-500">
                Suas próximas atividades aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

              {sortedUpcomingTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                />
              ))}

            </div>
          )}

        </section>

        {/* TÓPICOS DA SIDEBAR */}

        <section className="pb-8">

          <div className="flex items-center gap-2 mb-4">

            <GitFork
              size={16}
              className="text-purple-500"
            />

            <div>
              <h2
                className={`
                  text-base font-semibold
                  ${
                    isDark
                      ? "text-white"
                      : "text-zinc-900"
                  }
                `}
              >
                Seus tópicos
              </h2>

              <p className="text-xs mt-1 text-zinc-500">
                Continue diretamente pelo seu fluxograma.
              </p>
            </div>

          </div>

          {topics.length === 0 ? (
            <div
              className={`
                rounded-2xl
                border border-dashed
                p-8 text-center

                ${
                  isDark
                    ? "border-zinc-800"
                    : "border-zinc-200"
                }
              `}
            >
              <p className="text-sm text-zinc-500">
                Nenhum tópico criado ainda.
              </p>

              <p className="text-xs text-zinc-600 mt-1">
                Crie um tópico pela barra lateral.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

              {topics.map((topic) => {

                const topicStyle =
                  TOPIC_COLORS[
                    topic.color || "default"
                  ] || TOPIC_COLORS.default;

                const topicTasks = tasks.filter(
                  (task) =>
                    task.topicId === topic.id
                );

                const completedTopicTasks =
                  topicTasks.filter(
                    (task) => task.completed
                  ).length;

                const topicProgress =
                  topicTasks.length > 0
                    ? Math.round(
                        (completedTopicTasks /
                          topicTasks.length) *
                          100
                      )
                    : 0;

                return (
                  <button
                    key={topic.id}
                    onClick={() =>
                      onSelectTopic?.(topic.id)
                    }
                    className={`
                      group
                      text-left
                      rounded-2xl
                      border
                      p-5
                      transition-all
                      duration-200
                      hover:-translate-y-0.5

                      ${
                        isDark
                          ? "bg-zinc-950/70 border-zinc-800 hover:border-zinc-700"
                          : "bg-white border-zinc-200 hover:border-zinc-300 shadow-sm"
                      }
                    `}
                  >

                    <div className="flex items-start justify-between gap-3">

                      <div className="flex items-center gap-2 min-w-0">

                        <span
                          className={`
                            w-2.5 h-2.5
                            rounded-full
                            shrink-0
                            ${topicStyle.dot}
                          `}
                        />

                        <h3
                          className={`
                            text-sm font-semibold truncate
                            ${
                              isDark
                                ? "text-white"
                                : "text-zinc-900"
                            }
                          `}
                        >
                          {topic.name}
                        </h3>

                      </div>

                      <ArrowRight
                        size={15}
                        className={`
                          shrink-0
                          transition-transform
                          group-hover:translate-x-0.5

                          ${
                            isDark
                              ? "text-zinc-600"
                              : "text-zinc-400"
                          }
                        `}
                      />

                    </div>

                    <div className="mt-4 flex items-center justify-between">

                      <span className="text-xs text-zinc-500">
                        {topic.nodes?.length || 0} blocos
                      </span>

                      <span
                        className={`
                          text-xs

                          ${
                            completedTopicTasks ===
                              topicTasks.length &&
                            topicTasks.length > 0
                              ? "text-emerald-500"
                              : "text-zinc-500"
                          }
                        `}
                      >
                        {completedTopicTasks}/
                        {topicTasks.length} tarefas
                      </span>

                    </div>

                    <div
                      className={`
                        mt-3
                        h-1.5
                        rounded-full
                        overflow-hidden

                        ${
                          isDark
                            ? "bg-zinc-900"
                            : "bg-zinc-100"
                        }
                      `}
                    >
                      <div
                        className="
                          h-full
                          bg-emerald-500
                          rounded-full
                          transition-all
                        "
                        style={{
                          width: `${topicProgress}%`,
                        }}
                      />
                    </div>

                  </button>
                );
              })}

            </div>
          )}

        </section>

      </div>

      {/* MODAL DE EDIÇÃO */}

      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">

          <div
            className={`
              border
              rounded-2xl
              w-full
              max-w-lg
              p-6
              shadow-2xl
              relative

              ${
                isDark
                  ? "bg-zinc-950 border-zinc-800"
                  : "bg-white border-zinc-200"
              }
            `}
          >

            <div
              className={`
                flex items-center justify-between
                pb-4
                border-b

                ${
                  isDark
                    ? "border-zinc-900"
                    : "border-zinc-200"
                }
              `}
            >

              <h2
                className={`
                  text-base
                  font-bold
                  flex
                  items-center
                  gap-2

                  ${
                    isDark
                      ? "text-white"
                      : "text-zinc-900"
                  }
                `}
              >
                <Pencil size={15} />
                Editar Anotação
              </h2>

              <button
                onClick={() => setEditingTask(null)}
                className={`
                  ${
                    isDark
                      ? "text-zinc-500 hover:text-zinc-200"
                      : "text-zinc-400 hover:text-zinc-800"
                  }
                `}
              >
                <X size={18} />
              </button>

            </div>

            <form
              onSubmit={handleSaveEdit}
              className="mt-4 space-y-4"
            >

              <div>

                <label
                  className={`
                    block
                    text-xs
                    font-medium
                    mb-1.5

                    ${
                      isDark
                        ? "text-zinc-400"
                        : "text-zinc-600"
                    }
                  `}
                >
                  Título
                </label>

                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      title: e.target.value,
                    })
                  }
                  className={`
                    w-full
                    border
                    rounded-lg
                    px-3
                    py-2
                    text-sm
                    outline-none

                    ${
                      isDark
                        ? "bg-zinc-900 border-zinc-800 text-white"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900"
                    }
                  `}
                />

              </div>

              <div>

                <label
                  className={`
                    block
                    text-xs
                    font-medium
                    mb-1.5

                    ${
                      isDark
                        ? "text-zinc-400"
                        : "text-zinc-600"
                    }
                  `}
                >
                  Descrição
                </label>

                <textarea
                  rows={3}
                  value={editingTask.description || ""}
                  onChange={(e) =>
                    setEditingTask({
                      ...editingTask,
                      description: e.target.value,
                    })
                  }
                  className={`
                    w-full
                    border
                    rounded-lg
                    px-3
                    py-2
                    text-sm
                    outline-none
                    resize-none

                    ${
                      isDark
                        ? "bg-zinc-900 border-zinc-800 text-white"
                        : "bg-zinc-50 border-zinc-200 text-zinc-900"
                    }
                  `}
                />

              </div>

              <div>

                <div className="flex items-center justify-between mb-1.5">

                  <label
                    className={`
                      block
                      text-xs
                      font-medium

                      ${
                        isDark
                          ? "text-zinc-400"
                          : "text-zinc-600"
                      }
                    `}
                  >
                    Imagem Anexa
                  </label>

                  <div className="flex items-center gap-2 text-[11px]">

                    <button
                      type="button"
                      onClick={() =>
                        setImageInputType("url")
                      }
                      className={
                        imageInputType === "url"
                          ? "text-blue-500 font-semibold"
                          : "text-zinc-500"
                      }
                    >
                      <LinkIcon
                        size={12}
                        className="inline mr-1"
                      />
                      Link
                    </button>

                    <span className="text-zinc-700">
                      |
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setImageInputType("file")
                      }
                      className={
                        imageInputType === "file"
                          ? "text-blue-500 font-semibold"
                          : "text-zinc-500"
                      }
                    >
                      <Upload
                        size={12}
                        className="inline mr-1"
                      />
                      Arquivo
                    </button>

                  </div>

                </div>

                {imageInputType === "url" ? (
                  <input
                    type="url"
                    placeholder="https://exemplo.com/imagem.png"
                    value={editingTask.imageUrl || ""}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        imageUrl: e.target.value,
                      })
                    }
                    className={`
                      w-full
                      border
                      rounded-lg
                      px-3
                      py-2
                      text-sm
                      outline-none

                      ${
                        isDark
                          ? "bg-zinc-900 border-zinc-800 text-white"
                          : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      }
                    `}
                  />
                ) : (
                  <label
                    className={`
                      flex
                      items-center
                      justify-center
                      gap-2
                      border
                      border-dashed
                      rounded-lg
                      p-3
                      text-xs
                      cursor-pointer

                      ${
                        isDark
                          ? "bg-zinc-900 border-zinc-800 text-zinc-400"
                          : "bg-zinc-50 border-zinc-200 text-zinc-500"
                      }
                    `}
                  >
                    <ImageIcon size={16} />

                    <span>
                      {editingTask.imageUrl
                        ? "Substituir imagem"
                        : "Carregar arquivo local"}
                    </span>

                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                )}

                {editingTask.imageUrl && (
                  <div className="mt-2 relative rounded-lg overflow-hidden border h-24 bg-black">

                    <img
                      src={editingTask.imageUrl}
                      alt="Pré-visualização"
                      className="w-full h-full object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setEditingTask({
                          ...editingTask,
                          imageUrl: "",
                        })
                      }
                      className="
                        absolute
                        top-1
                        right-1
                        bg-black/80
                        hover:bg-red-600
                        text-white
                        p-1
                        rounded-md
                      "
                    >
                      <X size={14} />
                    </button>

                  </div>
                )}

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div>

                  <label
                    className={`
                      block
                      text-xs
                      font-medium
                      mb-1.5

                      ${
                        isDark
                          ? "text-zinc-400"
                          : "text-zinc-600"
                      }
                    `}
                  >
                    Tópico
                  </label>

                  <select
                    value={editingTask.topicId || ""}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        topicId: e.target.value,
                      })
                    }
                    className={`
                      w-full
                      border
                      rounded-lg
                      px-3
                      py-2
                      text-sm
                      outline-none

                      ${
                        isDark
                          ? "bg-zinc-900 border-zinc-800 text-white"
                          : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      }
                    `}
                  >
                    <option value="">
                      Sem Tópico
                    </option>

                    {topics.map((topic) => (
                      <option
                        key={topic.id}
                        value={topic.id}
                      >
                        {topic.name}
                      </option>
                    ))}
                  </select>

                </div>

                <div>

                  <label
                    className={`
                      block
                      text-xs
                      font-medium
                      mb-1.5

                      ${
                        isDark
                          ? "text-zinc-400"
                          : "text-zinc-600"
                      }
                    `}
                  >
                    Data Limite
                  </label>

                  <input
                    type="date"
                    value={editingTask.dueDate || ""}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        dueDate: e.target.value,
                      })
                    }
                    className={`
                      w-full
                      border
                      rounded-lg
                      px-3
                      py-2
                      text-sm
                      outline-none

                      ${
                        isDark
                          ? "bg-zinc-900 border-zinc-800 text-white"
                          : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      }
                    `}
                  />

                </div>

              </div>

              <div
                className={`
                  flex
                  items-center
                  justify-end
                  gap-3
                  pt-4
                  border-t
                  mt-6

                  ${
                    isDark
                      ? "border-zinc-900"
                      : "border-zinc-200"
                  }
                `}
              >

                <button
                  type="button"
                  onClick={() =>
                    setEditingTask(null)
                  }
                  className="
                    px-4
                    py-2
                    text-xs
                    font-medium
                    text-zinc-500
                    hover:text-zinc-900
                    dark:hover:text-white
                  "
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="
                    inline-flex
                    items-center
                    gap-1.5
                    bg-zinc-900
                    hover:bg-zinc-800
                    text-white
                    text-xs
                    font-bold
                    px-4
                    py-2
                    rounded-lg
                  "
                >
                  <Check size={14} />
                  Salvar Alterações
                </button>

              </div>

            </form>

          </div>
        </div>
      )}
    </div>
  );
}