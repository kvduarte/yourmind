"use client";

import { useCallback, useEffect, useState } from "react";
import { Habit, InboxItem, PersonalGoal } from "@/types";

const STORAGE_KEY = "yourmind:personal:v1";

interface PersonalData {
  inbox: InboxItem[];
  goals: PersonalGoal[];
  habits: Habit[];
}

const INITIAL: PersonalData = {
  inbox: [
    { id: "1", title: "Descarregar ideias da cabeça para o Your Mind", completed: false, createdAt: new Date().toISOString() },
  ],
  goals: [
    { id: "g1", title: "Concluir o semestre na faculdade com excelência", progress: 75, status: "in_progress", targetDate: "2026-12-20" },
  ],
  habits: [
    { id: "h1", name: "Estudar programação / lógica", frequency: "daily", completedDates: [] },
  ],
};

export function usePersonalData() {
  const [data, setData] = useState<PersonalData>(INITIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.inbox) setData(parsed);
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

  const addInbox = (title: string) => {
    const item: InboxItem = {
      id: String(Date.now()),
      title: title.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, inbox: [item, ...d.inbox] }));
  };

  const toggleInbox = (id: string) => {
    setData((d) => ({
      ...d,
      inbox: d.inbox.map((i) => (i.id === id ? { ...i, completed: !i.completed } : i)),
    }));
  };

  const deleteInbox = (id: string) => {
    setData((d) => ({ ...d, inbox: d.inbox.filter((i) => i.id !== id) }));
  };

  const addGoal = (title: string, targetDate?: string) => {
    const goal: PersonalGoal = {
      id: String(Date.now()),
      title: title.trim(),
      progress: 0,
      status: "not_started",
      targetDate,
    };
    setData((d) => ({ ...d, goals: [...d.goals, goal] }));
  };

  const deleteGoal = (id: string) => {
    setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== id) }));
  };

  const addHabit = (name: string, frequency: "daily" | "weekly" = "daily") => {
    const habit: Habit = {
      id: String(Date.now()),
      name: name.trim(),
      frequency,
      completedDates: [],
    };
    setData((d) => ({ ...d, habits: [...d.habits, habit] }));
  };

  const toggleHabitDate = (habitId: string, dateStr: string) => {
    setData((d) => ({
      ...d,
      habits: d.habits.map((h) => {
        if (h.id !== habitId) return h;
        const exists = h.completedDates.includes(dateStr);
        const newDates = exists
          ? h.completedDates.filter((d) => d !== dateStr)
          : [...h.completedDates, dateStr];
        return { ...h, completedDates: newDates };
      }),
    }));
  };

  const deleteHabit = (id: string) => {
    setData((d) => ({ ...d, habits: d.habits.filter((h) => h.id !== id) }));
  };

  return {
    ...data,
    loaded,
    addInbox,
    toggleInbox,
    deleteInbox,
    addGoal,
    deleteGoal,
    addHabit,
    toggleHabitDate,
    deleteHabit,
  };
}