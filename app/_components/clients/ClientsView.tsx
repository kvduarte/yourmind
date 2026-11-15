"use client";

import React, { useState } from "react";
import { useClients } from "@/lib/clients";
import { getUi } from "@/lib/ui";
import { Users, Plus, Search, Trash2, Calendar, FileText, Paperclip, Tag, PlusCircle } from "lucide-react";

export function ClientsView({ dark = true }: { dark?: boolean }) {
  const ui = getUi(dark);
  const { clients, addClient, deleteClient } = useClients();
  
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);

  // Formulário
  const [name, setName] = useState("");
  const [tag, setTag] = useState("Amigos");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");
  
  // Tópicos dinâmicos extras (ex: Tamanho de roupa, Dicas de presente...)
  const [customTopics, setCustomTopics] = useState<{ title: string; content: string }[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [newTopicContent, setNewTopicContent] = useState("");

  const TAG_OPTIONS = ["Família", "Amigos", "Faculdade / Estudos", "Trabalho / Profissional", "Outros"];

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesTag = selectedTag === "all" || c.company === selectedTag;
    return matchesSearch && matchesTag;
  });

  const handleAddCustomTopic = () => {
    if (!newTopicTitle.trim()) return;
    setCustomTopics([...customTopics, { title: newTopicTitle, content: newTopicContent }]);
    setNewTopicTitle("");
    setNewTopicContent("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Guarda as notas e concatena tópicos extras
    let fullNotes = notes;
    if (birthday) fullNotes += `\n🎂 Aniversário: ${birthday}`;
    if (customTopics.length > 0) {
      fullNotes += "\n\n📌 Tópicos:";
      customTopics.forEach((t) => {
        fullNotes += `\n• ${t.title}: ${t.content}`;
      });
    }

    addClient({
      name,
      email: "",
      phone: "",
      company: tag, // Usa tag no lugar do nome da empresa
      notes: fullNotes.trim(),
    });

    setName("");
    setBirthday("");
    setNotes("");
    setCustomTopics([]);
    setShowModal(false);
  };

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6 overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-extrabold flex items-center gap-2 ${ui.title}`}>
            <Users size={22} className="text-[var(--accent)]" />
            Pessoas & Contatos
          </h1>
          <p className={`text-xs ${ui.subtitle}`}>
            Organize contatos por categorias, lembre-se de aniversários e anote tópicos importantes.
          </p>
        </div>

        <button onClick={() => setShowModal(true)} className={ui.btnPrimarySm}>
          <Plus size={16} />
          Adicionar Contato
        </button>
      </div>

      {/* Filtros por Tag & Busca */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTag("all")}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              selectedTag === "all"
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-white"
                : "border-transparent text-zinc-400 hover:bg-white/5"
            }`}
          >
            Todos
          </button>
          {TAG_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTag(t)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedTag === t
                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-white"
                  : "border-transparent text-zinc-400 hover:bg-white/5"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 min-w-[220px] ${ui.inputBox}`}>
          <Search size={14} className={ui.muted} />
          <input
            type="text"
            placeholder="Buscar contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs outline-none"
          />
        </div>
      </div>

      {/* Grid de Contatos */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <div
            key={c.id}
            className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all hover:border-white/20 ${ui.panel}`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                <h3 className={`text-sm font-bold truncate ${ui.title}`}>{c.name}</h3>
                {c.company && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--accent)] bg-[var(--accent)]/10 px-2 py-0.5 rounded-md border border-[var(--accent)]/20">
                    <Tag size={10} /> {c.company}
                  </span>
                )}
              </div>

              {c.notes && (
                <div className="text-xs text-zinc-300 bg-white/[0.02] p-3 rounded-xl border border-white/5 whitespace-pre-line leading-relaxed">
                  {c.notes}
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end border-t border-white/5 pt-2">
              <button
                onClick={() => deleteClient(c.id)}
                className="flex items-center gap-1 text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={12} />
                Excluir
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-2xl">
            Nenhum contato encontrado nesta categoria.
          </div>
        )}
      </div>

      {/* MODAL ADICIONAR CONTATO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl overflow-y-auto max-h-[85vh] ${ui.modalCard}`}>
            <h2 className={`mb-3 text-base font-bold ${ui.title}`}>Novo Contato Pessoal</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${ui.subtitle}`}>Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amanda Bispo, Filipe..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs outline-none ${ui.field}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${ui.subtitle}`}>Categoria / Tag</label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs outline-none ${ui.field}`}
                  >
                    {TAG_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1 ${ui.subtitle}`}>Aniversário</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className={`w-full rounded-xl border p-2.5 text-xs outline-none ${ui.field}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${ui.subtitle}`}>Notas Gerais / Lembretes</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Gosta de café especial, assuntos pendentes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs outline-none resize-none ${ui.field}`}
                />
              </div>

              {/* Tópicos Adicionais Dinâmicos */}
              <div className="border-t border-white/10 pt-3 space-y-2">
                <span className="text-xs font-bold text-zinc-200 block">Adicionar Tópico Específico</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Título (ex: Presentes, Roupa)"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    className={`w-1/3 rounded-lg border p-2 text-xs outline-none ${ui.field}`}
                  />
                  <input
                    type="text"
                    placeholder="Conteúdo / Detalhes"
                    value={newTopicContent}
                    onChange={(e) => setNewTopicContent(e.target.value)}
                    className={`flex-1 rounded-lg border p-2 text-xs outline-none ${ui.field}`}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomTopic}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200"
                  >
                    <PlusCircle size={16} />
                  </button>
                </div>

                {customTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {customTopics.map((t, i) => (
                      <span key={i} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded-md">
                        <strong>{t.title}:</strong> {t.content}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setShowModal(false)} className={ui.btnGhost}>
                  Cancelar
                </button>
                <button type="submit" className={ui.btnPrimarySm}>
                  Salvar Contato
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}