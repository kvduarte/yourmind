"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Plus,
  Settings,
  Trash2,
  Pencil,
  Folder,
  Sun,
  Moon,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  GitFork,
} from "lucide-react";

import { Folder as FolderType, Topic } from "@/types";

type Theme = "dark" | "light";

interface SidebarProps {
  activeTab: string;
  setActiveTab: React.Dispatch<React.SetStateAction<string>>;

  folders: FolderType[];
  topics: Topic[];

  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;

  onCreateFolder: (name: string, color: string) => void;
  onUpdateFolder: (id: string, name: string, color: string) => void;
  onDeleteFolder: (id: string, e?: React.MouseEvent) => void;

  onCreateTopic: (folderId?: string) => void;
  onDeleteTopic: (id: string, e?: React.MouseEvent) => void;
}

const FOLDER_COLORS = [
  {
    name: "red",
    bg: "bg-red-500",
    light: "bg-red-500/10",
    border: "border-red-500/30",
  },
  {
    name: "orange",
    bg: "bg-orange-500",
    light: "bg-orange-500/10",
    border: "border-orange-500/30",
  },
  {
    name: "yellow",
    bg: "bg-yellow-400",
    light: "bg-yellow-400/10",
    border: "border-yellow-400/30",
  },
  {
    name: "green",
    bg: "bg-emerald-500",
    light: "bg-emerald-500/10",
    border: "border-emerald-500/30",
  },
  {
    name: "blue",
    bg: "bg-blue-500",
    light: "bg-blue-500/10",
    border: "border-blue-500/30",
  },
  {
    name: "purple",
    bg: "bg-purple-500",
    light: "bg-purple-500/10",
    border: "border-purple-500/30",
  },
  {
    name: "pink",
    bg: "bg-pink-500",
    light: "bg-pink-500/10",
    border: "border-pink-500/30",
  },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  folders,
  topics,
  theme,
  setTheme,
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  onCreateTopic,
  onDeleteTopic,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("blue");

  const getColor = (color: string) =>
    FOLDER_COLORS.find((item) => item.name === color) || FOLDER_COLORS[4];

  const toggleFolder = (id: string) => {
    setOpenFolders((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const openCreateFolder = () => {
    setEditingFolder(null);
    setFolderName("");
    setFolderColor("blue");
    setShowFolderModal(true);
  };

  const openEditFolder = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderColor(folder.color || "blue");
    setShowFolderModal(true);
  };

  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    if (editingFolder) {
      onUpdateFolder(editingFolder.id, folderName.trim(), folderColor);
    } else {
      onCreateFolder(folderName.trim(), folderColor);
    }

    setShowFolderModal(false);
    setEditingFolder(null);
    setFolderName("");
  };

  const handleDeleteFolder = (folder: FolderType, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Excluir a pasta "${folder.name}" e todos os fluxogramas dentro dela?`
    );

    if (!confirmed) return;
    onDeleteFolder(folder.id, e);
  };

  const dark = theme === "dark";

  return (
    <>
      <aside
        className={`
          relative flex flex-col h-screen shrink-0
          border-r transition-all duration-300
          ${collapsed ? "w-[76px]" : "w-[290px]"}
          ${
            dark
              ? "bg-[#09090b]/95 border-zinc-800/80 text-zinc-100"
              : "bg-white border-zinc-200 text-zinc-900"
          }
        `}
      >
        {/* LOGO E HEADER */}
        <div
          className={`
            h-20 flex items-center border-b px-5
            ${dark ? "border-zinc-800/80" : "border-zinc-200"}
          `}
        >
          <button
            onClick={() => setActiveTab("dashboard")}
            className="flex items-center gap-3 min-w-0"
          >
            <img
              src="/logo1.png"
              alt="Your Mind"
              className="w-10 h-10 object-contain shrink-0"
            />

            {!collapsed && (
              <div className="text-left">
                <h1
                  className={`
                    text-base font-semibold tracking-tight
                    ${dark ? "text-white" : "text-zinc-900"}
                  `}
                >
                  Your Mind
                </h1>
                <p
                  className={`
                    text-[10px] mt-0.5
                    ${dark ? "text-zinc-500" : "text-zinc-400"}
                  `}
                >
                  Organize suas ideias
                </p>
              </div>
            )}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`
              ml-auto p-2 rounded-lg transition-colors
              ${
                dark
                  ? "text-zinc-500 hover:text-white hover:bg-zinc-900"
                  : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
              }
            `}
            title={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* DASHBOARD */}
          <button
            onClick={() => setActiveTab("dashboard")}
            title={collapsed ? "Visão geral" : undefined}
            className={`
              w-full flex items-center gap-3
              px-3 py-2.5 rounded-xl text-sm
              transition-all mb-5
              ${
                activeTab === "dashboard"
                  ? dark
                    ? "bg-zinc-800/80 text-white"
                    : "bg-zinc-100 text-zinc-900"
                  : dark
                  ? "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/70"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              }
            `}
          >
            <LayoutDashboard size={17} />
            {!collapsed && <span className="font-medium">Visão geral</span>}
          </button>

          {!collapsed && (
            <>
              <div className="flex items-center justify-between mb-3 px-2">
                <span
                  className={`
                    text-[10px] font-semibold uppercase tracking-[0.14em]
                    ${dark ? "text-zinc-600" : "text-zinc-400"}
                  `}
                >
                  Projetos
                </span>

                <button
                  onClick={openCreateFolder}
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${
                      dark
                        ? "text-zinc-500 hover:text-white hover:bg-zinc-800"
                        : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"
                    }
                  `}
                  title="Nova pasta"
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* PASTAS */}
              <div className="space-y-1.5">
                {folders.length === 0 ? (
                  <div
                    className={`
                      px-3 py-5 rounded-xl border border-dashed text-center
                      ${
                        dark
                          ? "border-zinc-800 text-zinc-600"
                          : "border-zinc-200 text-zinc-400"
                      }
                    `}
                  >
                    <Folder size={18} className="mx-auto mb-2 opacity-60" />
                    <p className="text-[11px]">Nenhum projeto</p>
                    <button
                      onClick={openCreateFolder}
                      className={`
                        text-[10px] mt-2 underline underline-offset-2
                        ${dark ? "text-zinc-400" : "text-zinc-500"}
                      `}
                    >
                      Criar primeiro
                    </button>
                  </div>
                ) : (
                  folders.map((folder) => {
                    const colorItem = getColor(folder.color);
                    const folderTopics = topics.filter(
                      (topic) => topic.folderId === folder.id
                    );
                    const isOpen = !!openFolders[folder.id];

                    return (
                      <div key={folder.id}>
                        <div
                          className={`
                            group flex items-center gap-1 rounded-xl transition-colors
                            ${
                              activeTab === folder.id
                                ? dark
                                  ? "bg-zinc-900"
                                  : "bg-zinc-100"
                                : ""
                            }
                          `}
                        >
                          <button
                            onClick={() => toggleFolder(folder.id)}
                            className={`
                              flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2.5 text-left rounded-xl
                              ${
                                dark
                                  ? "hover:bg-zinc-900"
                                  : "hover:bg-zinc-100"
                              }
                            `}
                          >
                            {isOpen ? (
                              <ChevronDown
                                size={14}
                                className={dark ? "text-zinc-500" : "text-zinc-400"}
                              />
                            ) : (
                              <ChevronRight
                                size={14}
                                className={dark ? "text-zinc-500" : "text-zinc-400"}
                              />
                            )}

                            <span
                              className={`w-2.5 h-2.5 rounded-[4px] shrink-0 ${colorItem.bg}`}
                            />

                            <span
                              className={`
                                truncate text-xs font-medium
                                ${dark ? "text-zinc-300" : "text-zinc-700"}
                              `}
                            >
                              {folder.name}
                            </span>

                            <span
                              className={`
                                ml-auto text-[9px]
                                ${dark ? "text-zinc-600" : "text-zinc-400"}
                              `}
                            >
                              {folderTopics.length}
                            </span>
                          </button>

                          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                            <button
                              onClick={(e) => openEditFolder(folder, e)}
                              className={`
                                p-1.5 rounded-md
                                ${
                                  dark
                                    ? "text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800"
                                    : "text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200"
                                }
                              `}
                              title="Editar pasta"
                            >
                              <Pencil size={12} />
                            </button>

                            <button
                              onClick={(e) => handleDeleteFolder(folder, e)}
                              className={`
                                p-1.5 rounded-md
                                ${
                                  dark
                                    ? "text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                                    : "text-zinc-400 hover:text-red-500 hover:bg-red-50"
                                }
                              `}
                              title="Excluir pasta"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {/* FLUXOGRAMAS DA PASTA */}
                        {isOpen && (
                          <div
                            className={`
                              ml-6 pl-3 border-l
                              ${dark ? "border-zinc-800" : "border-zinc-200"}
                            `}
                          >
                            {folderTopics.map((topic) => (
                              <div
                                key={topic.id}
                                className="group flex items-center"
                              >
                                <button
                                  onClick={() => setActiveTab(topic.id)}
                                  className={`
                                    flex-1 flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors
                                    ${
                                      activeTab === topic.id
                                        ? dark
                                          ? "bg-zinc-800 text-white"
                                          : "bg-zinc-200 text-zinc-900"
                                        : dark
                                        ? "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
                                        : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100"
                                    }
                                  `}
                                >
                                  <GitFork size={13} />
                                  <span className="text-[11px] truncate">
                                    {topic.name}
                                  </span>
                                </button>

                                <button
                                  onClick={(e) => onDeleteTopic(topic.id, e)}
                                  className={`
                                    opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded-md
                                    ${
                                      dark
                                        ? "text-zinc-600 hover:text-red-400"
                                        : "text-zinc-400 hover:text-red-500"
                                    }
                                  `}
                                  title="Excluir fluxograma"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            ))}

                            <button
                              onClick={() => onCreateTopic(folder.id)}
                              className={`
                                w-full flex items-center gap-2 px-2.5 py-2 mt-1 rounded-lg text-[10px]
                                ${
                                  dark
                                    ? "text-zinc-600 hover:text-zinc-300 hover:bg-zinc-900"
                                    : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                                }
                              `}
                            >
                              <Plus size={12} />
                              Novo fluxograma
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* RODAPÉ */}
        <div
          className={`
            border-t p-4 space-y-2
            ${dark ? "border-zinc-800/80" : "border-zinc-200"}
          `}
        >
          {!collapsed ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setTheme("dark")}
                className={`
                  flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs
                  ${
                    dark
                      ? "bg-zinc-900 text-white border-zinc-700"
                      : "text-zinc-500 border-zinc-200 hover:bg-zinc-100"
                  }
                `}
              >
                <Moon size={14} />
                Escuro
              </button>

              <button
                onClick={() => setTheme("light")}
                className={`
                  flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs
                  ${
                    !dark
                      ? "bg-zinc-100 text-zinc-900 border-zinc-300"
                      : "text-zinc-500 border-zinc-800 hover:bg-zinc-900"
                  }
                `}
              >
                <Sun size={14} />
                Claro
              </button>
            </div>
          ) : (
            <button
              onClick={() => setTheme(dark ? "light" : "dark")}
              className={`
                w-full flex items-center justify-center p-2.5 rounded-lg border text-xs
                ${
                  dark
                    ? "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
                    : "border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }
              `}
              title={dark ? "Alternar para modo Claro" : "Alternar para modo Escuro"}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          )}

          <button
            className={`
              w-full flex items-center ${collapsed ? "justify-center" : "gap-3"} px-3 py-2.5 rounded-lg text-xs transition-colors
              ${
                dark
                  ? "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
              }
            `}
            title={collapsed ? "Configurações" : undefined}
          >
            <Settings size={16} />
            {!collapsed && <span>Configurações</span>}
          </button>
        </div>
      </aside>

      {/* MODAL DA PASTA */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className={`
              w-full max-w-sm rounded-2xl border p-6 shadow-2xl
              ${
                dark
                  ? "bg-zinc-950 border-zinc-800 text-white"
                  : "bg-white border-zinc-200 text-zinc-900"
              }
            `}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold">
                  {editingFolder ? "Editar Projeto" : "Novo Projeto"}
                </h2>
                <p
                  className={`text-xs mt-0.5 ${
                    dark ? "text-zinc-400" : "text-zinc-500"
                  }`}
                >
                  {editingFolder
                    ? "Altere os dados da pasta"
                    : "Crie uma pasta para organizar fluxogramas"}
                </p>
              </div>

              <button
                onClick={() => setShowFolderModal(false)}
                className={`p-1 rounded-lg transition-colors ${
                  dark
                    ? "text-zinc-400 hover:text-white hover:bg-zinc-800"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                }`}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="space-y-4">
              <div>
                <label
                  className={`block text-xs font-medium mb-1.5 ${
                    dark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  Nome da Pasta
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder="Ex: Marketing, Vendas..."
                  autoFocus
                  className={`
                    w-full px-3 py-2 rounded-xl text-xs border outline-none transition-all
                    ${
                      dark
                        ? "bg-zinc-900 border-zinc-800 focus:border-zinc-700 text-white"
                        : "bg-zinc-50 border-zinc-200 focus:border-zinc-300 text-zinc-900"
                    }
                  `}
                />
              </div>

              <div>
                <label
                  className={`block text-xs font-medium mb-2 ${
                    dark ? "text-zinc-300" : "text-zinc-700"
                  }`}
                >
                  Cor de Identificação
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {FOLDER_COLORS.map((color) => (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => setFolderColor(color.name)}
                      className={`
                        w-6 h-6 rounded-full transition-transform ${color.bg}
                        ${
                          folderColor === color.name
                            ? "ring-2 ring-offset-2 ring-blue-500 scale-110"
                            : "hover:scale-105 opacity-80"
                        }
                      `}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className={`
                    flex-1 px-4 py-2 rounded-xl text-xs font-medium border transition-colors
                    ${
                      dark
                        ? "border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                    }
                  `}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!folderName.trim()}
                  className="flex-1 px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition-colors"
                >
                  {editingFolder ? "Salvar" : "Criar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}