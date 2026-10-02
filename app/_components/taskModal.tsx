"use client";

import React, { useState } from "react";

import { Task, Theme, Topic } from "@/types";

interface TaskModalProps {
  topics: Topic[];
  onClose: () => void;
  onCreateTask: (task: Task) => void;
  theme: Theme;
}

export default function TaskModal({
  topics,
  onClose,
  onCreateTask,
  theme,
}: TaskModalProps) {
  const dark = theme === "dark";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [topicId, setTopicId] = useState(
    topics[0]?.id || ""
  );

  const [dueDate, setDueDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!title.trim()) return;

    onCreateTask({
      id: `task-${Date.now()}`,
      title,
      description,
      topicId,
      createdAt: new Date()
        .toISOString()
        .split("T")[0],
      dueDate,
      imageUrl,
      completed: false,
    });

    onClose();
  };

  const inputClass = `w-full rounded-lg px-3 py-2 text-xs outline-none border ${
    dark
      ? "bg-zinc-900 border-zinc-800 text-zinc-100"
      : "bg-zinc-50 border-zinc-200 text-zinc-900"
  }`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
          dark
            ? "bg-zinc-950 border-zinc-800"
            : "bg-white border-zinc-200"
        }`}
      >
        <h2
          className={`text-sm font-semibold mb-4 ${
            dark
              ? "text-zinc-100"
              : "text-zinc-900"
          }`}
        >
          Nova Anotação
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">
              Título
            </label>

            <input
              type="text"
              required
              placeholder="Ex: Prova de Algoritmos"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              className={inputClass}
            />
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">
              Descrição
            </label>

            <textarea
              rows={3}
              placeholder="Detalhes..."
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-500 block mb-1">
                Tópico
              </label>

              <select
                value={topicId}
                onChange={(e) =>
                  setTopicId(e.target.value)
                }
                className={inputClass}
              >
                <option value="">Nenhum</option>

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
              <label className="text-[11px] text-zinc-500 block mb-1">
                Data Limite
              </label>

              <input
                type="date"
                value={dueDate}
                onChange={(e) =>
                  setDueDate(e.target.value)
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-500 block mb-1">
              URL da Imagem (Opcional)
            </label>

            <input
              type="url"
              placeholder="https://..."
              value={imageUrl}
              onChange={(e) =>
                setImageUrl(e.target.value)
              }
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={`font-medium px-4 py-2 rounded-lg text-xs ${
                dark
                  ? "bg-white text-black hover:bg-zinc-200"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}