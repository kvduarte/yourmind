"use client";

import { useCallback, useEffect, useState } from "react";

export interface Folder {
  id: string;
  name: string;
}

export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string;
  fontSize: "sm" | "md" | "lg" | "xl";
  createdAt: number;
  updatedAt: number;
}

interface NotesData {
  folders: Folder[];
  notes: Note[];
}

export const DEFAULT_FOLDER_ID = "geral";
const STORAGE_KEY = "yourmind:notebook:v1";

const INITIAL: NotesData = {
  folders: [{ id: DEFAULT_FOLDER_ID, name: "Geral" }],
  notes: [],
};

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);

export function useNotebook() {
  const [data, setData] = useState<NotesData>(INITIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as NotesData;
        if (parsed.folders?.length) setData(parsed);
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

  const addFolder = useCallback((name: string) => {
    const folder: Folder = { id: uid(), name: name.trim() || "Nova pasta" };
    setData((d) => ({ ...d, folders: [...d.folders, folder] }));
    return folder;
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    setData((d) => ({
      ...d,
      folders: d.folders.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)),
    }));
  }, []);

  // Apagar pasta: as notas dela vão para "Geral" (nada é perdido)
  const deleteFolder = useCallback((id: string) => {
    if (id === DEFAULT_FOLDER_ID) return;
    setData((d) => ({
      folders: d.folders.filter((f) => f.id !== id),
      notes: d.notes.map((n) => (n.folderId === id ? { ...n, folderId: DEFAULT_FOLDER_ID } : n)),
    }));
  }, []);

  const saveNote = useCallback((note: Partial<Note> & { folderId: string }) => {
    const now = Date.now();
    let saved: Note | null = null;
    setData((d) => {
      const existing = note.id ? d.notes.find((n) => n.id === note.id) : undefined;
      if (existing) {
        saved = { ...existing, ...note, updatedAt: now } as Note;
        return { ...d, notes: d.notes.map((n) => (n.id === existing.id ? saved! : n)) };
      }
      saved = {
        id: uid(),
        folderId: note.folderId,
        title: note.title ?? "",
        content: note.content ?? "",
        fontSize: note.fontSize ?? "md",
        createdAt: now,
        updatedAt: now,
      };
      return { ...d, notes: [saved, ...d.notes] };
    });
    return saved;
  }, []);

  const deleteNote = useCallback((id: string) => {
    setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
  }, []);

  return { ...data, loaded, addFolder, renameFolder, deleteFolder, saveNote, deleteNote };
}