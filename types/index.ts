export type Theme = "dark" | "light";

export interface Task {
  id: string;
  title: string;
  description: string;
  topicId: string;
  createdAt: string;
  dueDate: string;
  imageUrl?: string;
  completed: boolean;
}

export type NodeType =
  | "main"
  | "topic"
  | "note"
  | "image"
  | "code"
  | "bug"
  | "idea"
  | "checklist"
  | "link"
  | "concept"
  | "test";

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
  errorMessage?: string;
  solution?: string;
  linkUrl?: string;
  checklist?: {
    id: string;
    text: string;
    completed: boolean;
  }[];
  testInput?: string;
  expectedOutput?: string;
  actualOutput?: string;
}

export interface Connection {
  from: string;
  to: string;
}

export interface Topic {
  id: string;
  name: string;
  nodes: Node[];
  connections: Connection[];
  folderId?: string;
  dueDate?: string;
}

export interface Folder {
  id: string;
  name: string;
  color: string;
}