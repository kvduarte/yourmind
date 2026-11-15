"use client";

import { useCallback, useEffect, useState } from "react";
import { CustomFieldSchema, InformationRecord, RecordTemplate } from "@/types";

const STORAGE_KEY = "yourmind:info_central:v2";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);

interface InfoCentralData {
  templates: RecordTemplate[];
  records: InformationRecord[];
}

// Exemplos prontos e variados para descarregar a mente
const INITIAL_TEMPLATES: RecordTemplate[] = [
  {
    id: "tpl-books",
    name: "📚 Livros & Leituras",
    description: "Anote livros lidos, páginas, notas e seus maiores aprendizados.",
    fields: [
      { id: "f1", label: "Autor", type: "text" },
      { id: "f2", label: "Status", type: "select", options: ["Quero Ler", "Lendo", "Concluído"] },
      { id: "f3", label: "Nota (1 a 5)", type: "number" },
      { id: "f4", label: "Principais Aprendizados", type: "text" },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-movies",
    name: "🎬 Filmes & Séries",
    description: "Guarde indicações de filmes, séries e onde assistir.",
    fields: [
      { id: "f1", label: "Onde Assistir", type: "text" },
      { id: "f2", label: "Gênero", type: "text" },
      { id: "f3", label: "Status", type: "select", options: ["Para Assistir", "Assistindo", "Visto"] },
      { id: "f4", label: "Minha Opinião", type: "text" },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-ideas",
    name: "💡 Ideias de Projetos",
    description: "Capture lampejos de ideias antes que fujam da cabeça.",
    fields: [
      { id: "f1", label: "Área / Categoria", type: "text" },
      { id: "f2", label: "Nível de Empolgação", type: "select", options: ["Alta", "Média", "Baixa"] },
      { id: "f3", label: "Próximo Passo", type: "text" },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "tpl-places",
    name: "📍 Lugares & Experiências",
    description: "Restaurantes, viagens e locais que quer conhecer.",
    fields: [
      { id: "f1", label: "Cidade / Local", type: "text" },
      { id: "f2", label: "Tipo", type: "select", options: ["Restaurante", "Café", "Viagem", "Passeio"] },
      { id: "f3", label: "Recomendado por", type: "text" },
    ],
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_RECORDS: InformationRecord[] = [
  {
    id: "rec-1",
    templateId: "tpl-books",
    title: "O Alquimista",
    data: {
      f1: "Paulo Coelho",
      f2: "Concluído",
      f3: 5,
      f4: "A busca pelo sinal e o valor da jornada.",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function useInformationCentral() {
  const [data, setData] = useState<InfoCentralData>({
    templates: INITIAL_TEMPLATES,
    records: INITIAL_RECORDS,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.templates && parsed.templates.length > 0) {
          setData(parsed);
        }
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, [data, loaded]);

  // Adicionar nova coleção customizada
  const addTemplate = useCallback((name: string, description: string, fields: CustomFieldSchema[]) => {
    const tpl: RecordTemplate = {
      id: uid(),
      name: name.trim() || "Nova Coleção",
      description: description.trim(),
      fields,
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, templates: [...d.templates, tpl] }));
    return tpl;
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      templates: d.templates.filter((t) => t.id !== id),
      records: d.records.filter((r) => r.templateId !== id),
    }));
  }, []);

  const addRecord = useCallback((templateId: string, title: string, recordData: Record<string, any>) => {
    const rec: InformationRecord = {
      id: uid(),
      templateId,
      title: title.trim() || "Novo Registro",
      data: recordData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, records: [rec, ...d.records] }));
    return rec;
  }, []);

  const deleteRecord = useCallback((id: string) => {
    setData((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) }));
  }, []);

  return {
    ...data,
    loaded,
    addTemplate,
    deleteTemplate,
    addRecord,
    deleteRecord,
  };
}