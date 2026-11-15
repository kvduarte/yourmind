
export type CompanionType = "person" | "animal";

export type CompanionAnimation =
  | "idle"
  | "walking"
  | "running"
  | "sleeping"
  | "happy"
  | "thinking";

export type CompanionSpecies =
  | "human"
  | "cat"
  | "dog"
  | "bunny"
  | "fox";

export interface CompanionAppearance {
  bodyColor: string;
  hairColor: string;
  outfitColor: string;
  accessory: string;
  hairStyle: string;
}

export interface CompanionConfig {
  id: string;
  name: string;
  type: CompanionType;
  species: CompanionSpecies;
  animation: CompanionAnimation;
  appearance: CompanionAppearance;
  unlocked: boolean;
}

export interface CompanionContextType {
  companion: CompanionConfig | null;
  setCompanion: (companion: CompanionConfig) => void;
  updateCompanion: (updates: Partial<CompanionConfig>) => void;
}
