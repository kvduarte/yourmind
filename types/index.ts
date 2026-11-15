import type { FlowKind } from "@/lib/nav";

export type Theme = "dark" | "light";

export interface Task {
  id: string;
  title: string;
  description: string;
  topicId: string;
  createdAt: string;
  dueDate: string;
  imageUrl?: string;
  image?: string;
  link?: string;
  completed: boolean;
}

/* =========================================================
   FLUXOGRAMA: BLOCOS
========================================================= */

export type NodeType = "main" | "topic" | "note" | "image" | "code" | "folder";

export type NodeStatus =
  | "todo"
  | "doing"
  | "pending"
  | "done"
  | "problem"
  | "cancelled";

export type NodePriority = "low" | "medium" | "high" | "urgent";

export interface NodeChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface NodeComment {
  id: string;
  text: string;
  /** ISO */
  at: string;
}

export interface NodeAttachment {
  id: string;
  name: string;
  /** "file" = arquivo guardado no navegador; "link" = endereço externo */
  kind: "file" | "link";
  /** data URL (arquivo) ou endereço (link) */
  url: string;
  size?: number;
  mime?: string;
  /** ISO */
  at: string;
}

export interface NodeHistoryEntry {
  id: string;
  /** ISO */
  at: string;
  text: string;
  /** true quando foi escrita à mão (observação) */
  manual?: boolean;
}

export interface Node {
  id: string;
  title: string;
  description: string;
  type: NodeType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  imageUrl?: string;
  imageDescription?: string;
  code?: string;
  language?: string;

  /** fluxo de programação: id da pasta onde este bloco está (vazio = raiz) */
  parentId?: string;
  /** fluxo de programação: tipo da pasta (app, lib, public...) */
  folderKind?: string;

  status?: NodeStatus;
  priority?: NodePriority;
  /** id da categoria (ver NODE_CATEGORIES em lib/flow.ts) */
  category?: string;
  /** YYYY-MM-DD */
  startDate?: string;
  /** YYYY-MM-DD */
  dueDate?: string;
  checklist?: NodeChecklistItem[];
  comments?: NodeComment[];
  attachments?: NodeAttachment[];
  history?: NodeHistoryEntry[];
}

/* =========================================================
   FLUXOGRAMA: CONEXÕES
========================================================= */

export type LineStyle = "solid" | "dashed" | "dotted";

/** onde ficam as setas: "end" = em quem recebe, "start" = em quem sai */
export type ArrowMode = "end" | "start" | "both" | "none";

export type ConnectionShape = "curved" | "straight" | "step";

export interface Connection {
  id?: string;
  from: string;
  to: string;
  color?: string;
  /** espessura em px (1 a 6) */
  width?: number;
  style?: LineStyle;
  arrow?: ArrowMode;
  shape?: ConnectionShape;
  /** texto sobre a linha */
  label?: string;
  /** resposta de uma pergunta de sim ou não */
  branch?: "yes" | "no";
}

/* =========================================================
   FLUXOGRAMA: VERSÕES E TÓPICO
========================================================= */

export interface FlowVersion {
  id: string;
  name: string;
  /** ISO */
  at: string;
  /** true = criada sozinha pelo sistema */
  auto?: boolean;
  nodes: Node[];
  connections: Connection[];
}

export interface Topic {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
  folderId?: string;
  dueDate?: string;
  link?: string;
  kind?: FlowKind;
  versions?: FlowVersion[];
}

export interface Folder {
  id: string;
  name: string;
  color: string;
}

/* =========================================================
   3. NOTAS E ORGANIZAÇÃO (EXPANDIDO)
========================================================= */

export interface NoteAttachmentItem {
  id: string;
  name: string;
  url: string;
  size?: number;
  type: string;
}

export interface EnhancedNote {
  id: string;
  folderId: string;
  title: string;
  content: string;
  fontSize: "sm" | "md" | "lg" | "xl";
  tags: string[];
  attachments: NoteAttachmentItem[];
  relatedItemIds?: string[];
  createdAt: number;
  updatedAt: number;
}

/* =========================================================
   4. GESTÃO DE CLIENTES
========================================================= */

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  notes?: string;
  createdAt: string;
}

export interface ClientInteraction {
  id: string;
  clientId: string;
  type: "call" | "email" | "meeting" | "note";
  summary: string;
  date: string;
}

/* =========================================================
   5. CENTRAL DE INFORMAÇÕES (CAMPOS E REGISTROS CUSTOMIZADOS)
========================================================= */

export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "file"
  | "checkbox";

export interface CustomFieldSchema {
  id: string;
  label: string;
  type: CustomFieldType;
  options?: string[];
  required?: boolean;
}

export interface RecordTemplate {
  id: string;
  name: string;
  description: string;
  fields: CustomFieldSchema[];
  createdAt: string;
}

export interface InformationRecord {
  id: string;
  templateId: string;
  title: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/* =========================================================
   6. ORGANIZAÇÃO PESSOAL
========================================================= */

export interface InboxItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface PersonalGoal {
  id: string;
  title: string;
  targetDate?: string;
  progress: number;
  status: "not_started" | "in_progress" | "completed";
}

export interface Habit {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  completedDates: string[];
}