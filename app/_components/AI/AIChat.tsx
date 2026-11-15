"use client";

import React, { useEffect, useState } from "react";

import {
  Sparkles,
  ChevronDown,
  Send,
  User,
  Bot,
} from "lucide-react";

import { Theme, Topic } from "@/types";

interface AIChatProps {
  topic?: Topic;
  theme: Theme;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const CHAT_STORAGE_KEY = "yourmind-chat-closed";

export default function AIChat({ topic, theme }: AIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou o assistente do YourMind. Posso analisar seu fluxograma, explicar conteúdos, resumir projetos ou ajudar nos seus estudos.",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const isDark = theme === "dark";

  /* Lê a cor de acento diretamente do localStorage */
  const [accentColor, setAccentColor] = useState("#881337");

  useEffect(() => {
    const syncAccent = () => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("app_settings");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.accentColor) setAccentColor(parsed.accentColor);
          } catch (e) {}
        }
      }
    };
    syncAccent();
    window.addEventListener("storage", syncAccent);
    const interval = setInterval(syncAccent, 1000);
    return () => {
      window.removeEventListener("storage", syncAccent);
      clearInterval(interval);
    };
  }, []);

  // Verifica se a pessoa já fechou o chat anteriormente.
  useEffect(() => {
    try {
      const hasClosedChat = localStorage.getItem(CHAT_STORAGE_KEY);

      if (!hasClosedChat) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error("Erro ao verificar o estado do chat:", error);
      setIsOpen(true);
    } finally {
      setHasCheckedStorage(true);
    }
  }, []);

  function closeChat() {
    setIsOpen(false);

    try {
      localStorage.setItem(CHAT_STORAGE_KEY, "true");
    } catch (error) {
      console.error("Erro ao salvar o estado do chat:", error);
    }
  }

  async function sendMessage() {
    const message = input.trim();

    if (!message || loading) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
    };

    setMessages((current) => [...current, userMessage]);

    setInput("");
    setLoading(true);

    try {
      const { createAIContext } = await import("@/lib/ai/context");
      const context = createAIContext(topic);

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "chat",
          message,
          content: context,
        }),
      });

      const data = (await response.json()) as {
        result?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Erro ao consultar o assistente.");
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.result || "O assistente não retornou uma resposta.",
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch (error) {
      console.error("Erro no AIChat:", error);

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Não consegui falar com o assistente. Verifique se o serviço está funcionando e tente novamente.",
      };

      setMessages((current) => [...current, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendMessage();
    }
  }

  // Evita mostrar o chat antes de verificar o localStorage.
  if (!hasCheckedStorage) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex w-150 max-w-[92vw] -translate-x-1/2 flex-col items-center gap-3 font-sans select-none">
      {/* Histórico / Balão de mensagens */}
      {isOpen && (
        <div
          className={`max-h-80 w-full overflow-y-auto rounded-3xl border p-4.5 shadow-2xl backdrop-blur-2xl transition-all ${
            isDark
              ? "border-white/10 bg-zinc-950/90 text-zinc-100 shadow-black/80"
              : "border-zinc-200 bg-white/90 text-zinc-900 shadow-zinc-300/40"
          }`}
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200/40 dark:border-white/10 text-xs font-bold">
            <div className="flex items-center gap-2">
              <div
                className="flex h-5 w-5 items-center justify-center rounded-lg text-white shadow-xs"
                style={{ backgroundColor: accentColor }}
              >
                <Sparkles size={11} />
              </div>
              <span className="tracking-tight">Your Mind Intelligence</span>
            </div>

            <button
              type="button"
              onClick={closeChat}
              className="rounded-lg p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Fechar chat"
              title="Fechar assistente"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Mensagens */}
          <div className="space-y-3.5 pt-3">
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-2.5 ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs shadow-xs ${
                      isUser
                        ? isDark
                          ? "bg-zinc-800 text-zinc-200"
                          : "bg-zinc-200 text-zinc-800"
                        : "text-white"
                    }`}
                    style={!isUser ? { backgroundColor: accentColor } : undefined}
                  >
                    {isUser ? <User size={13} /> : <Bot size={13} />}
                  </div>

                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed font-medium ${
                      isUser
                        ? isDark
                          ? "bg-zinc-800 text-white"
                          : "bg-zinc-900 text-white"
                        : isDark
                          ? "border border-white/10 bg-zinc-900/90 text-zinc-200"
                          : "border border-zinc-200 bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-start gap-2.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-xl text-white shadow-xs"
                  style={{ backgroundColor: accentColor }}
                >
                  <Bot size={13} />
                </div>

                <div
                  className={`animate-pulse rounded-2xl border px-4 py-2.5 text-xs sm:text-sm font-medium ${
                    isDark
                      ? "border-white/10 bg-zinc-900/90 text-zinc-400"
                      : "border-zinc-200 bg-zinc-100 text-zinc-500"
                  }`}
                >
                  Pensando...
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra principal */}
      <div
        className={`flex w-full items-center gap-3 rounded-full border px-4 py-2.5 shadow-2xl backdrop-blur-2xl transition-all ${
          isDark
            ? "border-white/10 bg-zinc-950/90 focus-within:border-white/20 shadow-black/60"
            : "border-zinc-200 bg-white/90 focus-within:border-zinc-300 shadow-zinc-300/40"
        }`}
      >
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white shadow-xs"
          style={{ backgroundColor: accentColor }}
        >
          <Sparkles size={14} />
        </div>

        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          disabled={loading}
          placeholder="Pergunte ou peça alterações no fluxograma..."
          className={`min-w-0 flex-1 bg-transparent text-xs sm:text-sm outline-none font-medium ${
            isDark
              ? "text-zinc-100 placeholder:text-zinc-500"
              : "text-zinc-900 placeholder:text-zinc-400"
          }`}
        />

        <button
          type="button"
          onClick={() => void sendMessage()}
          disabled={loading || !input.trim()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-white shadow-xs transition-transform active:scale-95 hover:opacity-90 disabled:opacity-30"
          style={{ backgroundColor: accentColor }}
          aria-label="Enviar mensagem"
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}