/* =========================================================
   PROCESSOS (pipelines)
   Um processo tem ETAPAS (colunas) e CARDS que andam por elas.
   Ex.: processo "Vendas" -> etapas Novo pedido, Negociação,
   Pagamento, Concluído -> cada compradora é um card.
========================================================= */

export interface PipelineStage {
  id: string;
  name: string;
  /** cor em hexadecimal */
  color: string;
}

export interface PipelineHistoryItem {
  stageId: string;
  stageName: string;
  /** ISO */
  at: string;
}

export type Priority = "urgent" | "immediate" | "normal" | "later";

/** Etiquetas de prioridade dos cards */
export const PRIORITIES: {
  id: Priority;
  label: string;
  color: string;
}[] = [
  { id: "urgent", label: "Urgente", color: "#ef4444" },
  { id: "immediate", label: "Imediato", color: "#f97316" },
  { id: "normal", label: "Normal", color: "#3b82f6" },
  { id: "later", label: "Pode esperar", color: "#10b981" },
];

export function getPriority(id?: Priority) {
  return PRIORITIES.find((item) => item.id === id);
}

/** Paleta para etapas e cards */
export const PALETTE = [
  "#71717a",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
];

export const STAGE_COLORS = PALETTE;

export interface PipelineCard {
  id: string;
  stageId: string;
  title: string;
  /** etiqueta: urgente, imediato, normal, pode esperar */
  priority?: Priority;
  /** cor própria do card (se vazio usa a cor da etapa) */
  color?: string;
  /** cliente, empresa ou responsável */
  who?: string;
  /** valor livre: "R$ 12.000", "3 un." etc. */
  value?: string;
  description?: string;
  /** YYYY-MM-DD */
  dueDate?: string;
  link?: string;
  createdAt: string;
  history: PipelineHistoryItem[];
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStage[];
  cards: PipelineCard[];
  createdAt: string;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  stages: { name: string; color: string }[];
}

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  {
    id: "sales",
    name: "Compras e vendas",
    description: "Do pedido até a conta encerrada.",
    stages: [
      { name: "Novo pedido", color: "#71717a" },
      { name: "Negociação", color: "#f59e0b" },
      { name: "Pagamento", color: "#3b82f6" },
      { name: "Concluído", color: "#10b981" },
    ],
  },
  {
    id: "hiring",
    name: "Contratação",
    description: "Candidatos andando até a proposta.",
    stages: [
      { name: "Candidatos", color: "#71717a" },
      { name: "Entrevista", color: "#a855f7" },
      { name: "Proposta", color: "#f59e0b" },
      { name: "Contratado", color: "#10b981" },
    ],
  },
  {
    id: "delivery",
    name: "Entregas",
    description: "Tarefas de uma ideia até a entrega.",
    stages: [
      { name: "A fazer", color: "#71717a" },
      { name: "Em andamento", color: "#3b82f6" },
      { name: "Revisão", color: "#f59e0b" },
      { name: "Entregue", color: "#10b981" },
    ],
  },
  {
    id: "blank",
    name: "Em branco",
    description: "Monte as etapas do seu jeito.",
    stages: [
      { name: "Etapa 1", color: "#71717a" },
      { name: "Etapa 2", color: "#3b82f6" },
      { name: "Etapa 3", color: "#10b981" },
    ],
  },
];

export function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createPipeline(name: string, templateId: string): Pipeline {
  const template =
    PIPELINE_TEMPLATES.find((item) => item.id === templateId) ??
    PIPELINE_TEMPLATES[PIPELINE_TEMPLATES.length - 1];

  return {
    id: newId("pipeline"),
    name: name.trim() || template.name,
    createdAt: new Date().toISOString(),
    stages: template.stages.map((stage) => ({
      id: newId("stage"),
      name: stage.name,
      color: stage.color,
    })),
    cards: [],
  };
}

export function createCard(
  stage: PipelineStage,
  title: string,
  who?: string
): PipelineCard {
  const now = new Date().toISOString();

  return {
    id: newId("card"),
    stageId: stage.id,
    title,
    who: who || undefined,
    createdAt: now,
    history: [{ stageId: stage.id, stageName: stage.name, at: now }],
  };
}