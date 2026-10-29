/* Navegação do app */

export type Section = "home" | "flows" | "notes" | "processes";

export type FlowKind = "general" | "code";

/**
 * Todas as seções usam a mesma cor base (índigo), para o app ter uma
 * identidade única. A cor real vem de Configurações (accentColor).
 */
export const SECTION_COLORS: Record<Section, string> = {
  home: "#6366f1",
  flows: "#6366f1",
  notes: "#6366f1",
  processes: "#6366f1",
};

export const KIND_COLORS: Record<FlowKind, string> = {
  general: "#34d399",
  code: "#38bdf8",
};

export const FOLDER_COLORS = [
  { name: "red", hex: "#ef4444" },
  { name: "orange", hex: "#f97316" },
  { name: "yellow", hex: "#eab308" },
  { name: "green", hex: "#10b981" },
  { name: "blue", hex: "#3b82f6" },
  { name: "purple", hex: "#a855f7" },
  { name: "pink", hex: "#ec4899" },
];

export function folderHex(color?: string) {
  return FOLDER_COLORS.find((item) => item.name === color)?.hex ?? "#71717a";
}