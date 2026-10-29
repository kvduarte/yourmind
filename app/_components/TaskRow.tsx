"use client";

import React from "react";
import {
  CheckCircle2,
  Circle,
  ExternalLink,
  Pencil,
  Trash2,
} from "lucide-react";

import { Task, Topic } from "@/types";
import { linkLabel, normalizeUrl } from "@/lib/link";
import { formatShort } from "@/lib/dates";
import { getUi } from "@/lib/ui";

interface TaskRowProps {
  task: Task;
  dateKey: string;
  todayKey: string;
  topics: Topic[];
  dark: boolean;
  compact?: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onOpenTopic: (id: string) => void;
}

/** Linha de uma anotação: grande, com botão de concluir e de editar. */
export default function TaskRow({
  task,
  dateKey,
  todayKey,
  topics,
  dark,
  compact = false,
  onToggle,
  onEdit,
  onDelete,
  onOpenTopic,
}: TaskRowProps) {
  const topic = topics.find((t) => t.id === task.topicId);
  const overdue = !task.completed && !!dateKey && dateKey < todayKey;
  const today = !task.completed && dateKey === todayKey;
  const image =
    (task as { image?: string }).image ||
    (task as { imageUrl?: string }).imageUrl ||
    "";
  const link = task.link || topic?.link;

  const chip = getUi(dark).chip;

  return (
    <div
      className={`group flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
        dark ? "hover:bg-white/[0.05]" : "hover:bg-zinc-50"
      }`}
    >
      <button
        onClick={() => onToggle(task.id)}
        title={task.completed ? "Marcar como não feita" : "Marcar como feita"}
        className={`shrink-0 transition-colors ${
          task.completed
            ? "text-emerald-400"
            : dark
              ? "text-zinc-500 hover:text-emerald-300"
              : "text-zinc-400 hover:text-emerald-500"
        }`}
      >
        {task.completed ? <CheckCircle2 size={22} /> : <Circle size={22} />}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-base font-semibold ${
            task.completed
              ? "text-zinc-500 line-through"
              : dark
                ? "text-zinc-100"
                : "text-zinc-900"
          }`}
        >
          {task.title}
        </p>

        {!compact && task.description && (
          <p className="mt-0.5 truncate text-sm text-zinc-400">{task.description}</p>
        )}
      </div>

      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          referrerPolicy="no-referrer"
          className="hidden h-11 w-11 shrink-0 rounded-lg object-cover sm:block"
        />
      )}

      {link && (
        <a
          href={normalizeUrl(link)}
          target="_blank"
          rel="noopener noreferrer"
          title={link}
          className={`hidden max-w-[10rem] shrink-0 items-center gap-1.5 truncate rounded-lg px-3 py-1.5 text-sm lg:flex ${chip}`}
        >
          <ExternalLink size={14} className="shrink-0" />
          <span className="truncate">{linkLabel(link)}</span>
        </a>
      )}

      {topic && !compact && (
        <button
          onClick={() => onOpenTopic(topic.id)}
          title="Abrir o fluxograma"
          className={`hidden max-w-[10rem] shrink-0 truncate rounded-lg px-3 py-1.5 text-sm xl:block ${chip}`}
        >
          {topic.name}
        </button>
      )}

      {dateKey && !compact && (
        <span
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${
            overdue
              ? "bg-red-500/15 text-red-400"
              : today
                ? "bg-amber-400/15 text-amber-400"
                : dark
                  ? "bg-white/[0.07] text-zinc-300"
                  : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {overdue ? "Atrasada · " : today ? "Hoje" : ""}
          {today ? "" : formatShort(dateKey)}
        </span>
      )}

      <div className="flex shrink-0 items-center opacity-60 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onEdit(task)}
          title="Editar"
          className={`rounded-lg p-2.5 text-zinc-400 ${dark ? "hover:bg-white/[0.08] hover:text-white" : "hover:bg-zinc-100"}`}
        >
          <Pencil size={16} />
        </button>

        <button
          onClick={() => onDelete(task.id)}
          title="Excluir"
          className="rounded-lg p-2.5 text-zinc-400 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}