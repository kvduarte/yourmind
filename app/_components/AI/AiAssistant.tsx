
"use client";

import React, { useState, useRef, useEffect } from "react";
import Mindi from "./companion/characters/Mindi";

import {
  Sparkles,
  Send,
  User,
  Code2,
  BookOpen,
  Workflow,
  Trash2,
  RefreshCw,
  MessageSquare,
  Sliders,
  Check,
  Save,
  Shield,
  Flame,
  Zap,
  Shirt,
  Palette,
  Heart,
  Lock,
} from "lucide-react";

import { Theme } from "@/types";
import {
  CURATED_PALETTES,
  DEFAULT_ACCENT,
  buildAccentGradient,
  isLightHex,
  withAlpha,
} from "@/lib/theme";
import { getUi } from "@/lib/ui";
import { AppSettings } from "@/lib/settings";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AiAssistantProps {
  theme: Theme;
  settings?: AppSettings & {
    accentColor?: string;
    colorStyle?: "solid" | "gradient" | "preset";
    colorPreset?: string;
  };
}

const MINDI_NAME = "Mindi";

const PERSONALITY_TRAITS = [
  {
    id: "analytical",
    label: "Analítica & Precisa",
    desc: "Respostas diretas com foco em arquitetura",
    icon: Shield,
  },
  {
    id: "creative",
    label: "Criativa & Visual",
    desc: "Sugere analogias e fluxos estruturados",
    icon: Flame,
  },
  {
    id: "mentor",
    label: "Estilo Mentoria",
    desc: "Apoio constante para estudos e prazos",
    icon: Zap,
  },
];

export default function AiAssistant({
  theme,
  settings,
}: AiAssistantProps) {
  const dark = theme === "dark";

  const defaultBaseColor = dark ? "#f4f4f5" : "#18181b";
  const accentColor =
    settings?.accentColor || defaultBaseColor || DEFAULT_ACCENT;

  const colorStyle = settings?.colorStyle || "solid";
  const colorPreset = settings?.colorPreset || "matcha-espresso";

  const activePalette =
    CURATED_PALETTES.find((p) => p.id === colorPreset) ||
    CURATED_PALETTES[0];

  const primaryColor =
    colorStyle === "preset" ? activePalette.colors[0] : accentColor;

  const primaryFill =
    colorStyle === "gradient"
      ? buildAccentGradient(primaryColor)
      : colorStyle === "preset"
        ? activePalette.gradient
        : primaryColor;

  const isLightBtn = isLightHex(primaryColor);

  const ui = getUi(dark);
  const titleColor = ui.title;
  const subtitleColor = ui.subtitle;

  // Abas internas
  const [activeTab, setActiveTab] = useState<
    "chat" | "customizer"
  >("chat");

  // Personalidade da Mindi
  const [selectedPersonality, setSelectedPersonality] =
    useState<string>(() => {
      if (typeof window !== "undefined") {
        return (
          localStorage.getItem("mindi_personality") ||
          "analytical"
        );
      }

      return "analytical";
    });

  const [savedFeedback, setSavedFeedback] = useState(false);

  // Salva as configurações
  const handleSaveConfig = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "mindi_personality",
        selectedPersonality
      );

      // Remove qualquer nome personalizado antigo.
      localStorage.removeItem("mindi_custom_name");
    }

    setSavedFeedback(true);

    setTimeout(() => {
      setSavedFeedback(false);
    }, 2000);
  };

  // Mensagens do chat
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(
        "your_mind_mindi_chat"
      );

      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // Cria uma conversa nova se o histórico for inválido.
        }
      }
    }

    return [
      {
        id: "1",
        role: "assistant",
        content: `Olá! Sou a **${MINDI_NAME}**, sua assistente de IA integrada ao Your Mind. Estou pronta para ajudar com código, estudos e organização. Como posso te auxiliar hoje?`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];
  });

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Persiste o histórico e acompanha as mensagens
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "your_mind_mindi_chat",
        JSON.stringify(messages)
      );
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  // Envia mensagem
  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;

    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);

    if (!textToSend) {
      setInput("");
    }

    setIsTyping(true);

    setTimeout(() => {
      let replyContent = `Entendido! Analisei sua solicitação sobre "${text}". Como sua assistente ${MINDI_NAME}, posso estruturar isso nos seus fluxogramas ou notas.`;

      const lower = text.toLowerCase();

      if (
        lower.includes("código") ||
        lower.includes("react") ||
        lower.includes("next")
      ) {
        replyContent =
          "Para stacks modernas com Next.js e TypeScript, recomendo modularizar bem os componentes e gerenciar estados limpos. Quer que eu elabore um trecho de código?";
      } else if (
        lower.includes("estudo") ||
        lower.includes("plano")
      ) {
        replyContent =
          "Organizar blocos de foco é excelente para manter o ritmo. Recomendo registrar suas entregas na seção de Processos.";
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 900);
  };

  // Limpa o histórico
  const handleClearChat = () => {
    const initialMsg: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content: `Conversa reiniciada. Como posso te ajudar agora?`,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages([initialMsg]);

    if (typeof window !== "undefined") {
      localStorage.removeItem("your_mind_mindi_chat");
    }
  };

  // Sugestões rápidas
  const quickPrompts = [
    {
      label: "Analisar arquitetura Front-end",
      icon: Code2,
      prompt:
        "Como posso otimizar a performance dos componentes?",
    },
    {
      label: "Organizar ciclos de estudo",
      icon: BookOpen,
      prompt: "Me ajude a estruturar um plano de estudos.",
    },
    {
      label: "Criar novo processo",
      icon: Workflow,
      prompt:
        "Quais etapas devo seguir para planejar uma aplicação?",
    },
  ];

  return (
    <div className="thin-scroll h-full overflow-y-auto select-none flex flex-col">
      <div className="mx-auto max-w-5xl w-full flex-1 flex flex-col p-6 sm:p-10 space-y-6">

        {/* CABEÇALHO */}
        <div
          className={`relative overflow-hidden rounded-[2.5rem] border p-6 sm:p-8 transition-all duration-500 shadow-xl ${
            dark
              ? "border-white/10 bg-zinc-950 text-zinc-100"
              : "border-zinc-200 bg-white text-zinc-900 shadow-zinc-200/50"
          }`}
        >
          <div
            className="absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-25 blur-[100px] pointer-events-none z-10"
            style={{ background: primaryFill }}
          />

          <div className="relative z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl overflow-hidden"
                style={{
                  background: withAlpha(primaryColor, 0.1),
                }}
              >
                <Mindi size={68} animation="idle" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1
                    className={`text-2xl sm:text-3xl font-black tracking-tight ${titleColor}`}
                  >
                    {MINDI_NAME}
                  </h1>

                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider"
                    style={{
                      backgroundColor: withAlpha(
                        primaryColor,
                        0.15
                      ),
                      color: primaryColor,
                    }}
                  >
                    <Sparkles size={10} />
                    Ativa
                  </span>
                </div>

                <p
                  className={`text-xs sm:text-sm font-medium mt-0.5 ${subtitleColor}`}
                >
                  Central da IA • Sua companheira do YourMind.
                </p>
              </div>
            </div>

            {/* NAVEGAÇÃO */}
            <div
              className={`flex items-center p-1 rounded-2xl border ${
                dark
                  ? "bg-zinc-900/90 border-white/10"
                  : "bg-zinc-100 border-zinc-200"
              }`}
            >
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "chat"
                    ? ""
                    : dark
                      ? "text-zinc-400 hover:text-zinc-200"
                      : "text-zinc-600 hover:text-zinc-900"
                }`}
                style={
                  activeTab === "chat"
                    ? {
                        background: primaryFill,
                        color: isLightBtn
                          ? "#18181b"
                          : "#ffffff",
                        boxShadow: `0 4px 12px -2px ${withAlpha(
                          primaryColor,
                          0.3
                        )}`,
                      }
                    : undefined
                }
              >
                <MessageSquare size={14} />
                <span>Chat</span>
              </button>

              <button
                onClick={() => setActiveTab("customizer")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "customizer"
                    ? ""
                    : dark
                      ? "text-zinc-400 hover:text-zinc-200"
                      : "text-zinc-600 hover:text-zinc-900"
                }`}
                style={
                  activeTab === "customizer"
                    ? {
                        background: primaryFill,
                        color: isLightBtn
                          ? "#18181b"
                          : "#ffffff",
                        boxShadow: `0 4px 12px -2px ${withAlpha(
                          primaryColor,
                          0.3
                        )}`,
                      }
                    : undefined
                }
              >
                <Sliders size={14} />
                <span>Estúdio da Mindi</span>
              </button>
            </div>
          </div>
        </div>

        {/* ABA CHAT */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col space-y-6 animate-in fade-in duration-200">

            {/* SUGESTÕES RÁPIDAS */}
            {messages.length <= 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {quickPrompts.map((item, idx) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSend(item.prompt)}
                      className={`group flex flex-col justify-between p-4 rounded-2xl border text-left transition-all hover:-translate-y-0.5 cursor-pointer ${
                        dark
                          ? "border-white/10 bg-zinc-950/60 hover:border-white/25"
                          : "border-zinc-200 bg-white hover:border-zinc-300"
                      }`}
                    >
                      <div
                        className="p-2.5 rounded-xl w-fit mb-3 transition-transform group-hover:scale-105"
                        style={{
                          background: withAlpha(
                            primaryColor,
                            0.12
                          ),
                          color: primaryColor,
                        }}
                      >
                        <Icon size={18} />
                      </div>

                      <span
                        className={`text-xs font-bold leading-snug ${titleColor}`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* MENSAGENS */}
            <div
              className={`flex-1 rounded-[2rem] border p-5 sm:p-6 overflow-y-auto space-y-5 min-h-[360px] max-h-[500px] shadow-sm ${
                dark
                  ? "border-white/10 bg-zinc-950/80"
                  : "border-zinc-200 bg-white"
              }`}
            >
              {messages.map((msg) => {
                const isUser = msg.role === "user";

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3.5 ${
                      isUser
                        ? "flex-row-reverse"
                        : "flex-row"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-xs ${
                        isUser
                          ? ""
                          : dark
                            ? "bg-zinc-900 border border-white/10 text-zinc-300"
                            : "bg-zinc-100 border border-zinc-200 text-zinc-700"
                      }`}
                      style={
                        isUser
                          ? {
                              background: primaryFill,
                              color: isLightBtn
                                ? "#18181b"
                                : "#ffffff",
                            }
                          : { color: primaryColor }
                      }
                    >
                      {isUser ? (
                        <User size={16} />
                      ) : (
                        <Mindi size={38} animation="idle" />
                      )}
                    </div>

                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isUser
                          ? "rounded-tr-xs"
                          : "rounded-tl-xs"
                      }`}
                      style={
                        isUser
                          ? {
                              background: primaryFill,
                              color: isLightBtn
                                ? "#18181b"
                                : "#ffffff",
                            }
                          : dark
                            ? {
                                background:
                                  "rgba(255, 255, 255, 0.04)",
                                border:
                                  "1px solid rgba(255, 255, 255, 0.08)",
                                color: "#f4f4f5",
                              }
                            : {
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                color: "#18181b",
                              }
                      }
                    >
                      <div className="whitespace-pre-wrap">
                        {msg.content}
                      </div>

                      <span className="block text-[9px] mt-1.5 text-right font-medium opacity-60">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* INDICADOR DE DIGITAÇÃO */}
              {isTyping && (
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border ${
                      dark
                        ? "bg-zinc-900 border-white/10"
                        : "bg-zinc-100 border-zinc-200"
                    }`}
                    style={{ color: primaryColor }}
                  >
                    <Mindi
                      size={38}
                      emotion="thinking"
                    />
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 text-xs flex items-center gap-1.5 ${
                      dark
                        ? "bg-white/4 border border-white/8 text-zinc-400"
                        : "bg-zinc-50 border border-zinc-200 text-zinc-500"
                    }`}
                  >
                    <RefreshCw
                      size={13}
                      className="animate-spin"
                      style={{ color: primaryColor }}
                    />

                    <span>
                      {MINDI_NAME} está pensando...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* CAMPO DE ENVIO */}
            <div className="flex items-center gap-3 pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex-1 flex items-center"
              >
                <div
                  className={`flex-1 flex items-center rounded-2xl border px-4 py-2.5 transition-all shadow-sm ${
                    dark
                      ? "bg-zinc-950 border-white/15 focus-within:border-white/30"
                      : "bg-white border-zinc-200 focus-within:border-zinc-400"
                  }`}
                >
                  <input
                    type="text"
                    value={input}
                    onChange={(e) =>
                      setInput(e.target.value)
                    }
                    placeholder={`Converse com a ${MINDI_NAME}...`}
                    className={`w-full bg-transparent text-xs sm:text-sm outline-none ${titleColor}`}
                  />

                  <button
                    type="submit"
                    disabled={!input.trim()}
                    title="Enviar mensagem"
                    className={`ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                      isLightBtn
                        ? "text-zinc-950"
                        : "text-white"
                    }`}
                    style={{ background: primaryFill }}
                  >
                    <Send
                      size={14}
                      strokeWidth={2.2}
                    />
                  </button>
                </div>
              </form>

              <button
                onClick={handleClearChat}
                title="Limpar conversa"
                className={`flex items-center gap-1 px-4 py-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  dark
                    ? "border-white/10 bg-zinc-900/80 text-zinc-300 hover:text-white"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <Trash2 size={14} />
                <span className="hidden sm:inline">
                  Limpar
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ABA ESTÚDIO DA MINDI */}
        {activeTab === "customizer" && (
          <div className="flex-1 flex flex-col space-y-6 animate-in fade-in duration-200">

            {/* ESTÚDIO DE PERSONALIZAÇÃO */}
            <div
              className={`rounded-[2rem] border p-6 sm:p-8 space-y-6 shadow-sm ${
                dark
                  ? "border-white/10 bg-zinc-950/80"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2
                    className={`text-sm font-bold uppercase tracking-wider ${titleColor}`}
                  >
                    Estúdio de personalização
                  </h2>

                  <p className={`text-xs mt-1 ${subtitleColor}`}>
                    Sua companheira está pronta para ganhar
                    um estilo próprio.
                  </p>
                </div>

                <span
                  className="text-[10px] font-bold uppercase tracking-wider rounded-full px-3 py-1.5 w-fit"
                  style={{
                    color: primaryColor,
                    background: withAlpha(primaryColor, 0.12),
                  }}
                >
                  Personagem 2D
                </span>
              </div>

              {/* LAYOUT: CONTROLES À ESQUERDA / MINDI À DIREITA */}
              <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6 items-stretch">

                {/* ÁREA DE PERSONALIZAÇÃO */}
                <div className="flex flex-col gap-4 order-2 lg:order-1">

                  {/* ROUPAS */}
                  <div
                    className={`rounded-2xl border p-5 space-y-2 ${
                      dark
                        ? "bg-zinc-900/60 border-white/10"
                        : "bg-zinc-50 border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: withAlpha(
                            primaryColor,
                            0.12
                          ),
                          color: primaryColor,
                        }}
                      >
                        <Shirt size={19} />
                      </div>

                      <div>
                        <h3
                          className={`text-xs font-bold ${titleColor}`}
                        >
                          Roupas
                        </h3>

                        <p
                          className={`text-[10px] ${subtitleColor}`}
                        >
                          Looks e combinações
                        </p>
                      </div>

                      <div className="ml-auto">
                        <Lock
                          size={15}
                          className={subtitleColor}
                        />
                      </div>
                    </div>

                    <p
                      className={`text-[11px] leading-relaxed ${subtitleColor}`}
                    >
                      Em breve você poderá escolher roupas,
                      cores e estilos para a Mindi.
                    </p>
                  </div>

                  {/* CABELO E APARÊNCIA */}
                  <div
                    className={`rounded-2xl border p-5 space-y-2 ${
                      dark
                        ? "bg-zinc-900/60 border-white/10"
                        : "bg-zinc-50 border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: withAlpha(
                            primaryColor,
                            0.12
                          ),
                          color: primaryColor,
                        }}
                      >
                        <Palette size={19} />
                      </div>

                      <div>
                        <h3
                          className={`text-xs font-bold ${titleColor}`}
                        >
                          Cabelo e aparência
                        </h3>

                        <p
                          className={`text-[10px] ${subtitleColor}`}
                        >
                          Estilos e personalização
                        </p>
                      </div>

                      <div className="ml-auto">
                        <Lock
                          size={15}
                          className={subtitleColor}
                        />
                      </div>
                    </div>

                    <p
                      className={`text-[11px] leading-relaxed ${subtitleColor}`}
                    >
                      Futuramente será possível trocar
                      penteados, cores e detalhes da personagem.
                    </p>
                  </div>

                  {/* ACESSÓRIOS */}
                  <div
                    className={`rounded-2xl border p-5 space-y-2 ${
                      dark
                        ? "bg-zinc-900/60 border-white/10"
                        : "bg-zinc-50 border-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: withAlpha(
                            primaryColor,
                            0.12
                          ),
                          color: primaryColor,
                        }}
                      >
                        <Heart size={19} />
                      </div>

                      <div>
                        <h3
                          className={`text-xs font-bold ${titleColor}`}
                        >
                          Acessórios
                        </h3>

                        <p
                          className={`text-[10px] ${subtitleColor}`}
                        >
                          Detalhes e acessórios
                        </p>
                      </div>

                      <div className="ml-auto">
                        <Lock
                          size={15}
                          className={subtitleColor}
                        />
                      </div>
                    </div>

                    <p
                      className={`text-[11px] leading-relaxed ${subtitleColor}`}
                    >
                      Óculos, laços, fones e outros acessórios
                      poderão ser adicionados à personagem.
                    </p>
                  </div>

                  {/* AVISO */}
                  <div
                    className="rounded-2xl p-4 flex items-start gap-3"
                    style={{
                      background: withAlpha(
                        primaryColor,
                        0.08
                      ),
                      border: `1px solid ${withAlpha(
                        primaryColor,
                        0.2
                      )}`,
                    }}
                  >
                    <Sparkles
                      size={17}
                      className="shrink-0 mt-0.5"
                      style={{ color: primaryColor }}
                    />

                    <p
                      className={`text-[11px] leading-relaxed ${titleColor}`}
                    >
                      A Mindi já está usando suas animações.
                      Estamos preparando o sistema para que
                      cada peça de roupa possa ser trocada
                      individualmente.
                    </p>
                  </div>
                </div>

                {/* PRÉVIA DA MINDI À DIREITA */}
                <div
                  className={`relative min-h-[420px] sm:min-h-[500px] rounded-[1.75rem] flex flex-col items-center justify-end overflow-hidden border order-1 lg:order-2 ${
                    dark
                      ? "bg-zinc-900/70 border-white/10"
                      : "bg-zinc-50 border-zinc-200"
                  }`}
                >
                  {/* ILUMINAÇÃO DE FUNDO */}
                  <div
                    className="absolute w-72 h-72 rounded-full blur-[90px] opacity-20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{
                      background: primaryColor,
                    }}
                  />

                  {/* DECORAÇÃO */}
                  <div
                    className="absolute top-6 left-6 text-xs font-bold uppercase tracking-[0.2em] opacity-50"
                    style={{ color: primaryColor }}
                  >
                    YourMind Companion
                  </div>

                  <div
                    className="absolute top-6 right-6 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      color: primaryColor,
                      background: withAlpha(
                        primaryColor,
                        0.12
                      ),
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                    Online
                  </div>

                  {/* MINDI PARADA, DE FRENTE */}
                  <div className="relative z-10 flex-1 w-full flex items-end justify-center pt-12">
                    <img
                      src="/companions/mindi/frente/parada.png"
                      alt="Mindi de frente"
                      className="w-[360px] max-w-full h-auto max-h-[390px] object-contain object-bottom"
                    />
                  </div>

                  {/* NOME FIXO */}
                  <div className="relative z-20 text-center pb-7 pt-2">
                    <p
                      className={`font-black text-2xl tracking-tight ${titleColor}`}
                    >
                      {MINDI_NAME}
                    </p>

                    <p
                      className={`text-xs mt-1 ${subtitleColor}`}
                    >
                      Sua companheira do YourMind
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* PERSONALIDADE */}
            <div
              className={`rounded-[2rem] border p-6 sm:p-8 space-y-5 shadow-sm ${
                dark
                  ? "border-white/10 bg-zinc-950/80"
                  : "border-zinc-200 bg-white"
              }`}
            >
              <h2
                className={`text-sm font-bold uppercase tracking-wider ${titleColor}`}
              >
                Estilo de Comportamento
              </h2>

              <p className={`text-xs ${subtitleColor}`}>
                Escolha como a Mindi deve se comportar
                durante as conversas.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {PERSONALITY_TRAITS.map((trait) => {
                  const TraitIcon = trait.icon;
                  const isSelected =
                    selectedPersonality === trait.id;

                  return (
                    <div
                      key={trait.id}
                      onClick={() =>
                        setSelectedPersonality(trait.id)
                      }
                      className={`p-5 rounded-2xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? ""
                          : dark
                            ? "border-white/10 bg-zinc-900/40"
                            : "border-zinc-200 bg-zinc-50/50"
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: withAlpha(
                                primaryColor,
                                0.1
                              ),
                              borderColor: primaryColor,
                            }
                          : undefined
                      }
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div
                          className="p-2 rounded-xl"
                          style={{
                            background: withAlpha(
                              primaryColor,
                              0.15
                            ),
                            color: primaryColor,
                          }}
                        >
                          <TraitIcon size={18} />
                        </div>

                        {isSelected && (
                          <Check
                            size={16}
                            style={{ color: primaryColor }}
                          />
                        )}
                      </div>

                      <span
                        className={`block text-xs font-bold mb-1 ${titleColor}`}
                      >
                        {trait.label}
                      </span>

                      <p
                        className={`text-[11px] font-medium ${subtitleColor}`}
                      >
                        {trait.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SALVAR CONFIGURAÇÕES */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveConfig}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs tracking-wide transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer ${
                  isLightBtn
                    ? "text-zinc-950"
                    : "text-white"
                }`}
                style={{ background: primaryFill }}
              >
                <Save size={16} />

                <span>
                  {savedFeedback
                    ? "Alterações Salvas com Sucesso!"
                    : "Salvar Configurações"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
