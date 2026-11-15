"use client";

import { useCallback, useEffect, useState } from "react";
import { Client, ClientInteraction } from "@/types";

const STORAGE_KEY = "yourmind:clients:v1";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(16).slice(2);

interface ClientsData {
  clients: Client[];
  interactions: ClientInteraction[];
}

const INITIAL: ClientsData = {
  clients: [],
  interactions: [],
};

export function useClients() {
  const [data, setData] = useState<ClientsData>(INITIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.clients) setData(parsed);
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

  const addClient = useCallback((client: Omit<Client, "id" | "createdAt">) => {
    const newClient: Client = {
      ...client,
      id: uid(),
      createdAt: new Date().toISOString(),
    };
    setData((d) => ({ ...d, clients: [...d.clients, newClient] }));
    return newClient;
  }, []);

  const addInteraction = useCallback((interaction: Omit<ClientInteraction, "id">) => {
    const newInteraction: ClientInteraction = {
      ...interaction,
      id: uid(),
    };
    setData((d) => ({ ...d, interactions: [newInteraction, ...d.interactions] }));
    return newInteraction;
  }, []);

  const deleteClient = useCallback((id: string) => {
    setData((d) => ({
      clients: d.clients.filter((c) => c.id !== id),
      interactions: d.interactions.filter((i) => i.clientId !== id),
    }));
  }, []);

  return { ...data, loaded, addClient, addInteraction, deleteClient };
}