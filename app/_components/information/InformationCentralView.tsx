"use client";

import React, { useState } from "react";
import { useInformationCentral } from "@/lib/informationCentral";
import { getUi } from "@/lib/ui";
import { Plus, Search, Database, Bookmark, Sparkles, Trash2, FolderPlus } from "lucide-react";
import { CustomFieldSchema, CustomFieldType } from "@/types";

export function InformationCentralView({ dark = true }: { dark?: boolean }) {
  const ui = getUi(dark);
  const { templates, records, addTemplate, deleteTemplate, addRecord, deleteRecord } = useInformationCentral();
  
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(templates[0]?.id || "");
  const [search, setSearch] = useState("");
  
  // Modais
  const [showNewRecordModal, setShowNewRecordModal] = useState(false);
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);

  // Formulário de Registro
  const [newTitle, setNewTitle] = useState("");
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Formulário de Nova Coleção / Tópico
  const [tplName, setTplName] = useState("");
  const [tplDesc, setTplDesc] = useState("");
  const [tplFields, setTplFields] = useState<{ label: string; type: CustomFieldType; optionsStr: string }[]>([
    { label: "Categoria / Tag", type: "text", optionsStr: "" },
    { label: "Observações", type: "text", optionsStr: "" },
  ]);

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  
  const filteredRecords = records.filter(
    (r) =>
      r.templateId === currentTemplate?.id &&
      (r.title.toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTemplate || !newTitle.trim()) return;
    addRecord(currentTemplate.id, newTitle, formData);
    setNewTitle("");
    setFormData({});
    setShowNewRecordModal(false);
  };

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) return;

    const formattedFields: CustomFieldSchema[] = tplFields.map((f, i) => ({
      id: `f_${i}_${Date.now()}`,
      label: f.label || `Campo ${i + 1}`,
      type: f.type,
      options: f.optionsStr ? f.optionsStr.split(",").map((o) => o.trim()) : undefined,
    }));

    const newTpl = addTemplate(tplName, tplDesc, formattedFields);
    setSelectedTemplateId(newTpl.id);
    setTplName("");
    setTplDesc("");
    setShowNewTemplateModal(false);
  };

  return (
    <div className="flex h-full w-full flex-col gap-6 p-6 overflow-y-auto">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-extrabold flex items-center gap-2 ${ui.title}`}>
            <Database size={22} className="text-[var(--accent)]" />
            Central de Guardados & Referências
          </h1>
          <p className={`text-xs ${ui.subtitle}`}>
            Guarde livros, ideias, mídias e crie suas próprias coleções personalizadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNewTemplateModal(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10"
          >
            <FolderPlus size={15} />
            Nova Coleção / Tópico
          </button>
          
          <button
            onClick={() => setShowNewRecordModal(true)}
            className={ui.btnPrimarySm}
            disabled={!currentTemplate}
          >
            <Plus size={16} />
            Guardar Item
          </button>
        </div>
      </div>

      {/* Categorias / Abas de Coleções */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-white/5">
        {templates.map((tpl) => {
          const active = currentTemplate?.id === tpl.id;
          return (
            <button
              key={tpl.id}
              onClick={() => setSelectedTemplateId(tpl.id)}
              className={`flex items-center gap-2 shrink-0 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent)]/15 text-white shadow-sm"
                  : "border-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
              }`}
            >
              <Bookmark size={13} className={active ? "text-[var(--accent)]" : "text-zinc-500"} />
              {tpl.name}
            </button>
          );
        })}
      </div>

      {/* Descrição da Coleção Ativa & Busca */}
      {currentTemplate && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] p-3 rounded-2xl border border-white/5">
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-bold text-zinc-200">{currentTemplate.name}</h2>
            <p className="text-[11px] text-zinc-400">{currentTemplate.description || "Coleção personalizada."}</p>
          </div>

          <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 min-w-[220px] ${ui.inputBox}`}>
            <Search size={14} className={ui.muted} />
            <input
              type="text"
              placeholder={`Buscar em ${currentTemplate.name}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>
        </div>
      )}

      {/* Lista de Registros */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRecords.map((rec) => (
          <div
            key={rec.id}
            className={`flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all hover:border-white/20 ${ui.panel}`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-white/5 mb-3">
                <h3 className={`text-sm font-bold truncate ${ui.title}`}>{rec.title}</h3>
                <span className={`text-[10px] ${ui.muted}`}>
                  {new Date(rec.updatedAt).toLocaleDateString("pt-BR")}
                </span>
              </div>

              <div className="space-y-1.5 py-1">
                {currentTemplate?.fields.map((f) => (
                  <div key={f.id} className="flex justify-between text-xs gap-2">
                    <span className={`shrink-0 ${ui.subtitle}`}>{f.label}:</span>
                    <span className={`font-medium truncate text-right ${ui.title}`}>
                      {String(rec.data[f.id] ?? "—")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex justify-end border-t border-white/5 pt-2">
              <button
                onClick={() => deleteRecord(rec.id)}
                className="flex items-center gap-1 text-[11px] font-medium text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={12} />
                Remover
              </button>
            </div>
          </div>
        ))}

        {filteredRecords.length === 0 && (
          <div className="col-span-full py-16 text-center text-xs text-zinc-500 border border-dashed border-white/10 rounded-2xl">
            <Sparkles size={24} className="mx-auto mb-2 text-zinc-600" />
            Nenhum item guardado nesta coleção ainda.
          </div>
        )}
      </div>

      {/* MODAL: GUARDAR ITEM */}
      {showNewRecordModal && currentTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${ui.modalCard}`}>
            <h2 className={`mb-1 text-base font-bold ${ui.title}`}>
              Guardar em: {currentTemplate.name}
            </h2>
            <p className={`mb-4 text-xs ${ui.subtitle}`}>{currentTemplate.description}</p>

            <form onSubmit={handleCreateRecord} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${ui.subtitle}`}>Título / Nome</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Nome do livro, filme, ideia..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs outline-none ${ui.field}`}
                />
              </div>

              {currentTemplate.fields.map((f) => (
                <div key={f.id}>
                  <label className={`block text-xs font-semibold mb-1 ${ui.subtitle}`}>{f.label}</label>
                  {f.type === "select" ? (
                    <select
                      onChange={(e) => setFormData({ ...formData, [f.id]: e.target.value })}
                      className={`w-full rounded-xl border p-2.5 text-xs outline-none ${ui.field}`}
                    >
                      <option value="">Selecione...</option>
                      {f.options?.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      placeholder={f.label}
                      onChange={(e) => setFormData({ ...formData, [f.id]: e.target.value })}
                      className={`w-full rounded-xl border p-2.5 text-xs outline-none ${ui.field}`}
                    />
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowNewRecordModal(false)} className={ui.btnGhost}>
                  Cancelar
                </button>
                <button type="submit" className={ui.btnPrimarySm}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR NOVA COLEÇÃO / TÓPICO */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className={`w-full max-w-lg rounded-2xl border p-6 shadow-2xl overflow-y-auto max-h-[85vh] ${ui.modalCard}`}>
            <h2 className={`mb-1 text-base font-bold ${ui.title}`}>Criar Nova Coleção / Tópico</h2>
            <p className={`mb-4 text-xs ${ui.subtitle}`}>Monte uma estrutura personalizada de dados para guardar o que quiser.</p>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${ui.subtitle}`}>Nome da Coleção</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 🏋️ Treinos & Pesos, 🎧 Podcasts, 💡 Ideias..."
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs outline-none ${ui.field}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold mb-1 ${ui.subtitle}`}>Descrição Curta</label>
                <input
                  type="text"
                  placeholder="Para que serve esta coleção?"
                  value={tplDesc}
                  onChange={(e) => setTplDesc(e.target.value)}
                  className={`w-full rounded-xl border p-2.5 text-xs outline-none ${ui.field}`}
                />
              </div>

              {/* Campos Customizados */}
              <div className="space-y-3 border-t border-white/10 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-200">Campos da Coleção</span>
                  <button
                    type="button"
                    onClick={() =>
                      setTplFields([...tplFields, { label: "", type: "text", optionsStr: "" }])
                    }
                    className="text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    + Adicionar Campo
                  </button>
                </div>

                {tplFields.map((field, idx) => (
                  <div key={idx} className="flex flex-col gap-2 bg-white/[0.03] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nome do campo (ex: Carga/Peso, Autor...)"
                        value={field.label}
                        onChange={(e) => {
                          const updated = [...tplFields];
                          updated[idx].label = e.target.value;
                          setTplFields(updated);
                        }}
                        className={`flex-1 rounded-lg border p-2 text-xs outline-none ${ui.field}`}
                      />
                      <select
                        value={field.type}
                        onChange={(e) => {
                          const updated = [...tplFields];
                          updated[idx].type = e.target.value as CustomFieldType;
                          setTplFields(updated);
                        }}
                        className={`rounded-lg border p-2 text-xs outline-none ${ui.field}`}
                      >
                        <option value="text">Texto</option>
                        <option value="number">Número</option>
                        <option value="date">Data</option>
                        <option value="select">Seleção (Opções)</option>
                      </select>
                      {tplFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setTplFields(tplFields.filter((_, i) => i !== idx))}
                          className="text-red-400 p-1 hover:text-red-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {field.type === "select" && (
                      <input
                        type="text"
                        placeholder="Opções separadas por vírgula (ex: Baixa, Média, Alta)"
                        value={field.optionsStr}
                        onChange={(e) => {
                          const updated = [...tplFields];
                          updated[idx].optionsStr = e.target.value;
                          setTplFields(updated);
                        }}
                        className={`rounded-lg border p-2 text-xs outline-none ${ui.field}`}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setShowNewTemplateModal(false)} className={ui.btnGhost}>
                  Cancelar
                </button>
                <button type="submit" className={ui.btnPrimarySm}>
                  Criar Coleção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}