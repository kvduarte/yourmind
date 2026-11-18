"use client";

import { useEffect, useRef, useState } from "react";

import Sidebar from "./_components/shared/Sidebar";
import RightSidebar from "./_components/shared/RightSidebar";
import Home from "./_components/home/Home";
import Notes from "./_components/notes/Notes";
import Flows from "./_components/flows/Flows";
import BackBar from "./_components/shared/BackBar";
import Flowchart from "./_components/flows/flowchart";
import CodeFlow from "./_components/code/CodeFlow";
import PipelineBoard from "./_components/pipeline/PipelineBoard";
import ProcessList from "./_components/process/ProcessList";
import Planning from "./_components/planning/Planning";
import CalendarView from "./_components/calendar/CalendarView";
import PipelineModal from "./_components/pipeline/PipelineModal";
import FolderModal from "./_components/modals/FolderModal";
import TaskModal from "./_components/modals/taskModal";
import OnboardingWizardModal from "./_components/modals/OnboardingWizardModal";
import { useConfirm } from "./_components/modals/ConfirmDialog";
import TopicModal from "./_components/modals/topicModal";
import AnimatedBackground from "./_components/background/AnimatedBackground";
import AiAssistant from "./_components/AI/AiAssistant";
import SettingsModal from "./_components/modals/SettingsModal";
import CommandPalette from "./_components/shared/CommandPalette";

import { Folder, Task, Theme, Topic } from "@/types";

import {
  AppSettings,
  DEFAULT_SETTINGS,
  RADIUS_FACTOR,
  SettingsProvider,
  UI_SCALE_PX,
  loadSettings,
  saveSettings,
} from "@/lib/settings";

import { Pipeline, createPipeline } from "@/lib/pipeline";
import { useBgImage } from "@/lib/bgImage";
import { writeCurrentCover } from "@/lib/savedAppearance";
import {
  FlowKind,
  KIND_COLORS,
  SECTION_COLORS,
  Section,
} from "@/lib/nav";
import { GitFork, Code2, Workflow } from "lucide-react";
import { DEFAULT_ACCENT } from "@/lib/theme";
import { buildTemplate, duplicateTopic, normalizeTopic } from "@/lib/flow";
import { textScaleStyle } from "@/lib/ui";

type AppSettingsFull = AppSettings & {
  accentColor?: string;
  bgImageUrl?: string;
  bgImageOpacity?: number;
  bgImageSaturation?: number;
  bgImageVeil?: number;
};

type FolderModalState =
  | { mode: "create" }
  | { mode: "edit"; folder: Folder }
  | null;

export default function Page() {
  const confirm = useConfirm();

  const [onboardingDone, setOnboardingDone] = useState(true);

  useEffect(() => {
    try {
      setOnboardingDone(localStorage.getItem("yourmind_onboarding_done") === "true");
    } catch {
      setOnboardingDone(true);
    }
  }, []);

  const [section, setSection] = useState<Section>("home");
  const [flowKind, setFlowKind] = useState<FlowKind>("general");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const [mounted, setMounted] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalDate, setTaskModalDate] = useState<string | undefined>(undefined);
  const [taskModalMode, setTaskModalMode] = useState<"note" | "reminder">("reminder");
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [folderModal, setFolderModal] = useState<FolderModalState>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(false);

  const [theme, setTheme] = useState<Theme>("light");
  const [settings, setSettings] = useState<AppSettingsFull>(DEFAULT_SETTINGS);

  const bgSrc = useBgImage(settings.bgImageUrl);

  useEffect(() => {
    const handleGlobalShortcut = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  useEffect(() => {
    setMounted(true);

    setSettings(loadSettings());

    const read = <T,>(key: string, fallback: T): T => {
      try {
        const raw = localStorage.getItem(key);

        return raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        return fallback;
      }
    };

    const savedTheme = localStorage.getItem("app_theme_v2") as Theme | null;

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    setFolders(read<Folder[]>("app_folders", []));
    setTasks(read<Task[]>("app_tasks", []));
    setPipelines(read<Pipeline[]>("app_pipelines", []));

    setTopics(
      read<Topic[]>("app_topics", []).map(normalizeTopic).map((topic) => ({
        ...topic,
        folderId: topic.folderId || undefined,
        dueDate: topic.dueDate || undefined,
        kind:
          topic.kind ??
          (topic.nodes?.some((node) => node.type === "code") ? "code" : "general"),
      }))
    );
  }, []);

  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem("app_folders", JSON.stringify(folders));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [folders, mounted]);

  const topicsRef = useRef<Topic[]>([]);

  const flushTopics = () => {
    try {
      localStorage.setItem("app_topics", JSON.stringify(topicsRef.current));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };

  useEffect(() => {
    const onLeave = () => {
      if (mounted) flushTopics();
    };

    window.addEventListener("beforeunload", onLeave);

    return () => window.removeEventListener("beforeunload", onLeave);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    topicsRef.current = topics;

    const timer = setTimeout(() => flushTopics(), 400);

    return () => clearTimeout(timer);
  }, [topics, mounted]);

  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem("app_tasks", JSON.stringify(tasks));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [tasks, mounted]);

  useEffect(() => {
    if (!mounted) return;

    try {
      localStorage.setItem("app_pipelines", JSON.stringify(pipelines));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [pipelines, mounted]);

  useEffect(() => {
    if (mounted) saveSettings(settings);
  }, [settings, mounted]);

  useEffect(() => {
    if (!mounted) return;

    document.documentElement.style.fontSize = `${UI_SCALE_PX[settings.uiScale]}px`;
    document.documentElement.style.setProperty(
      "--round",
      String(RADIUS_FACTOR[settings.radius])
    );
  }, [settings.uiScale, settings.radius, mounted]);

  useEffect(() => {
    if (!mounted) return;

    document.documentElement.style.setProperty(
      "--accent",
      settings.accentColor || DEFAULT_ACCENT
    );
  }, [settings.accentColor, mounted]);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("app_theme_v2", theme);

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme, mounted]);

  const navigate = (target: string) => {
    if (target === "notes") {
      setSection("notes");
      return;
    }

    if (target === "calendar") {
      setSection("calendar");
      return;
    }

    if (target === "planning") {
      setSection("planning");
      return;
    }

    if (target === "clients") {
      setSection("clients");
      return;
    }

    if (target === "home") {
      setSection("home");
      return;
    }

    if (target === "flows") {
      setSection("flows");
      return;
    }

    if (target === "processes") {
      setSection("processes");
      return;
    }

    const topic = topics.find((item) => item.id === target);

    if (topic) {
      setSection("flows");
      setFlowKind(topic.kind ?? "general");
      setActiveFolderId(topic.folderId ?? null);
      setActiveTopicId(topic.id);

      return;
    }

    if (pipelines.some((item) => item.id === target)) {
      setSection("processes");
      setActivePipelineId(target);

      return;
    }

    setSection("home");
  };

  const handleSaveFolder = (name: string, color: string) => {
    if (folderModal?.mode === "edit") {
      const id = folderModal.folder.id;

      setFolders((prev) =>
        prev.map((folder) => (folder.id === id ? { ...folder, name, color } : folder))
      );

      return;
    }

    setFolders((prev) => [...prev, { id: `folder-${Date.now()}`, name, color }]);
  };

  const handleCreateFolderQuick = (name: string, color: string) => {
    setFolders((prev) => [...prev, { id: `folder-${Date.now()}`, name, color }]);
  };

  const handleDeleteFolder = async (folder: Folder) => {
    const count = topics.filter((topic) => topic.folderId === folder.id).length;

    const ok = await confirm({
      title: `Excluir a pasta "${folder.name}"?`,
      description:
        count > 0
          ? `Os ${count} fluxograma(s) dentro dela também serão excluídos. Essa ação não pode ser desfeita.`
          : "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir pasta",
    });

    if (!ok) return;

    const topicIds = new Set(
      topics.filter((topic) => topic.folderId === folder.id).map((topic) => topic.id)
    );

    setFolders((prev) => prev.filter((item) => item.id !== folder.id));
    setTopics((prev) => prev.filter((topic) => topic.folderId !== folder.id));
    setTasks((prev) => prev.filter((task) => !topicIds.has(task.topicId)));

    if (activeFolderId === folder.id) setActiveFolderId(null);
    if (activeTopicId && topicIds.has(activeTopicId)) setActiveTopicId(null);
  };

  const handleCreateTopic = (
    name: string,
    folderId?: string,
    dueDate?: string,
    link?: string,
    kind: FlowKind = "general",
    templateId?: string
  ) => {
    const newId = `topic-${Date.now()}`;
    const templated =
      kind === "general" ? buildTemplate(templateId ?? "blank", { x: 520, y: 240 }, name) : null;

    const newTopic: Topic = {
      id: newId,
      name,
      folderId,
      dueDate,
      link,
      kind,
      nodes: templated ? templated.nodes : [],
      connections: templated ? templated.connections : [],
    };

    setTopics((prev) => [...prev, newTopic]);

    if (dueDate) {
      setTasks((prev) => [
        {
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          title: name,
          description: "Fluxograma com data definida.",
          topicId: newId,
          createdAt: new Date().toISOString().split("T")[0],
          dueDate,
          link,
          completed: false,
        },
        ...prev,
      ]);
    }

    setSection("flows");
    setFlowKind(kind);
    setActiveFolderId(folderId ?? null);
    setActiveTopicId(newId);
  };

  const handleUpdateTopic = (
    id: string,
    name: string,
    folderId?: string,
    dueDate?: string,
    link?: string
  ) => {
    setTopics((prev) =>
      prev.map((topic) => (topic.id === id ? { ...topic, name, folderId, dueDate, link } : topic))
    );

    const marker = "Fluxograma com data definida.";

    setTasks((prev) => {
      const index = prev.findIndex((task) => task.topicId === id && task.description === marker);

      if (!dueDate) return index >= 0 ? prev.filter((_, i) => i !== index) : prev;

      if (index >= 0) {
        return prev.map((task, i) => (i === index ? { ...task, title: name, dueDate, link } : task));
      }

      return [
        {
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          title: name,
          description: marker,
          topicId: id,
          createdAt: new Date().toISOString().split("T")[0],
          dueDate,
          link,
          completed: false,
        },
        ...prev,
      ];
    });
  };

  const handleDuplicateTopic = (topic: Topic, open = false) => {
    const copy = duplicateTopic(topic, `topic-${Date.now()}`);

    setTopics((prev) => [...prev, copy]);

    if (open) setActiveTopicId(copy.id);
  };

  const handleDeleteTopic = async (topic: Topic) => {
    const ok = await confirm({
      title: `Excluir o fluxograma "${topic.name}"?`,
      description: "Todos os blocos e as anotações ligadas a ele serão apagados.",
      confirmLabel: "Excluir fluxograma",
    });

    if (!ok) return;

    setTopics((prev) => prev.filter((item) => item.id !== topic.id));
    setTasks((prev) => prev.filter((task) => task.topicId !== topic.id));

    if (activeTopicId === topic.id) setActiveTopicId(null);
  };

  const handleCreatePipeline = (name: string, templateId: string) => {
    const pipeline = createPipeline(name, templateId);

    setPipelines((prev) => [...prev, pipeline]);
    setSection("processes");
    setActivePipelineId(pipeline.id);
  };

  const handleUpdatePipeline = (updated: Pipeline) =>
    setPipelines((prev) =>
      prev.map((pipeline) => (pipeline.id === updated.id ? updated : pipeline))
    );

  const handleDeletePipeline = async (pipeline: Pipeline) => {
    const ok = await confirm({
      title: `Excluir o processo "${pipeline.name}"?`,
      description:
        pipeline.cards.length > 0
          ? `Os ${pipeline.cards.length} card(s) dele também serão excluídos.`
          : "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir processo",
    });

    if (!ok) return;

    setPipelines((prev) => prev.filter((item) => item.id !== pipeline.id));

    if (activePipelineId === pipeline.id) setActivePipelineId(null);
  };

  const handleCreateTask = (newTask: Task) => setTasks((prev) => [newTask, ...prev]);

  const handleToggleTask = (id: string) =>
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task))
    );

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find((item) => item.id === id);

    const ok = await confirm({
      title: task?.title ? `Excluir "${task.title}"?` : "Excluir esta anotação?",
      description: "Essa ação não pode ser desfeita.",
      confirmLabel: "Excluir",
    });

    if (!ok) return;

    setTasks((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveEditedTask = (updated: Task) =>
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)));

  const handleOpenTaskModal = (date?: string, mode: "note" | "reminder" = "reminder") => {
    setTaskModalDate(date);
    setTaskModalMode(mode);
    setShowTaskModal(true);
  };

  const handleExportData = () => {
    const payload = {
      app: "yourmind",
      version: 2,
      exportedAt: new Date().toISOString(),
      folders,
      topics,
      tasks,
      pipelines,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `yourmind-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleImportData = (raw: string): string | null => {
    try {
      const data = JSON.parse(raw);

      if (
        !Array.isArray(data.folders) ||
        !Array.isArray(data.topics) ||
        !Array.isArray(data.tasks)
      ) {
        return "Esse arquivo não parece um backup do Your Mind.";
      }

      setFolders(data.folders);
      setTopics(data.topics);
      setTasks(data.tasks);
      setPipelines(Array.isArray(data.pipelines) ? data.pipelines : []);
      setActiveTopicId(null);
      setActivePipelineId(null);
      setSection("home");

      return null;
    } catch {
      return "Não foi possível ler esse arquivo.";
    }
  };

  const handleResetData = () => {
    setFolders([]);
    setTopics([]);
    setTasks([]);
    setPipelines([]);
    setActiveTopicId(null);
    setActivePipelineId(null);
    setActiveFolderId(null);
    setSection("home");
  };

  if (!mounted) {
    return <div className="h-screen w-screen bg-black" />;
  }

  const isDark = theme === "dark";

  const activeTopic = topics.find(
    (topic) => topic.id === activeTopicId && (topic.kind ?? "general") === flowKind
  );

  const activePipeline = pipelines.find((pipeline) => pipeline.id === activePipelineId);

  const goTo = (next: Section) => {
    setSection(next);
  };

  return (
    <SettingsProvider value={settings}>
      <div
        className={`relative isolate flex h-screen w-screen overflow-hidden font-sans ${
          isDark ? "bg-black text-zinc-100" : "bg-white text-zinc-900"
        } ${bgSrc && !isDark ? "has-bg-light" : ""}`}
      >
        <AnimatedBackground
          theme={theme}
          imageUrl={bgSrc}
          imageOpacity={settings.bgImageOpacity ?? 30}
          imageSaturation={settings.bgImageSaturation ?? 100}
          imageVeil={settings.bgImageVeil}
          variant={settings.bgVariant}
          pattern={settings.bgPattern}
          showLights={settings.animatedBackground}
        />

        <Sidebar
          section={section}
          onSelect={goTo}
          onOpenSettings={() => setShowSettings(true)}
          onOpenRightSidebar={() => setShowRightSidebar(true)}
          theme={theme}
        />

        <main
          className="min-w-0 flex-1 overflow-hidden"
          style={textScaleStyle(
            section === "home"
              ? settings.textScaleHome
              : section === "flows"
                ? settings.textScaleFlows
                : section === "notes"
                  ? settings.textScaleNotes
                  : section === "planning" || section === "calendar"
                    ? 100
                    : settings.textScaleProcesses
          )}
        >
          {section === "home" && (
            <Home
              tasks={tasks}
              topics={topics}
              folders={folders}
              pipelines={pipelines}
              theme={theme}
              settings={settings}
              onOpenTaskModal={handleOpenTaskModal}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onSaveEditedTask={handleSaveEditedTask}
              onCreateTask={handleCreateTask}
              onNavigate={navigate}
              onNewFlow={() => setShowTopicModal(true)}
              onNewProcess={() => setShowPipelineModal(true)}
            />
          )}

          {section === "calendar" && (
            <CalendarView
              tasks={tasks}
              folders={folders}
              topics={topics}
              pipelines={pipelines}
              theme={theme}
              settings={settings}
              onCreateTask={handleCreateTask}
              onSaveEditedTask={handleSaveEditedTask}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onCreateFolder={handleCreateFolderQuick}
              onNavigate={navigate}
            />
          )}

          {section === "notes" && (
            <Notes
              tasks={tasks}
              topics={topics}
              theme={theme}
              settings={settings}
              onOpenTaskModal={handleOpenTaskModal}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onSaveEditedTask={handleSaveEditedTask}
              onNavigate={navigate}
            />
          )}

          {section === "flows" &&
            (activeTopic ? (
              <div className="flex h-full flex-col">
                <BackBar
                  theme={theme}
                  backLabel="Voltar"
                  onBack={() => setActiveTopicId(null)}
                  title={activeTopic.name}
                  badge={flowKind === "code" ? "Programação" : "Normal"}
                  color={KIND_COLORS[flowKind]}
                  icon={flowKind === "code" ? <Code2 /> : <GitFork />}
                />

                <div className="min-h-0 flex-1">
                  {flowKind === "code" ? (
                    <CodeFlow
                      key={activeTopic.id}
                      topic={activeTopic}
                      setTopics={setTopics}
                      theme={theme}
                    />
                  ) : (
                    <Flowchart
                      key={activeTopic.id}
                      topic={activeTopic}
                      setTopics={setTopics}
                      theme={theme}
                      onEditTopic={() => setEditingTopicId(activeTopic.id)}
                      onDuplicateTopic={() => handleDuplicateTopic(activeTopic, true)}
                    />
                  )}
                </div>
              </div>
            ) : (
              <Flows
                theme={theme}
                settings={settings}
                flowKind={flowKind}
                onFlowKind={(kind) => {
                  setFlowKind(kind);
                  setActiveTopicId(null);
                }}
                folders={folders}
                topics={topics}
                activeFolderId={activeFolderId}
                onSelectFolder={setActiveFolderId}
                onCreateFolder={() => setFolderModal({ mode: "create" })}
                onEditFolder={(folder) => setFolderModal({ mode: "edit", folder })}
                onDeleteFolder={handleDeleteFolder}
                onOpenTopic={setActiveTopicId}
                onCreateTopic={() => setShowTopicModal(true)}
                onDeleteTopic={handleDeleteTopic}
                onEditTopic={(topic) => setEditingTopicId(topic.id)}
                onDuplicateTopic={(topic) => handleDuplicateTopic(topic)}
              />
            ))}

          {section === "processes" &&
            (activePipeline ? (
              <div className="flex h-full flex-col">
                <BackBar
                  theme={theme}
                  backLabel="Voltar"
                  onBack={() => setActivePipelineId(null)}
                  title={activePipeline.name}
                  badge={`${activePipeline.cards.length} cards`}
                  color={SECTION_COLORS.processes}
                  icon={<Workflow />}
                />

                <div className="min-h-0 flex-1">
                  <PipelineBoard
                    key={activePipeline.id}
                    pipeline={activePipeline}
                    onChange={handleUpdatePipeline}
                    onDelete={() => handleDeletePipeline(activePipeline)}
                    theme={theme}
                  />
                </div>
              </div>
            ) : (
              <ProcessList
                pipelines={pipelines}
                theme={theme}
                settings={settings}
                onOpen={setActivePipelineId}
                onCreate={() => setShowPipelineModal(true)}
                onDelete={handleDeletePipeline}
              />
            ))}

          {section === "planning" && <Planning theme={theme} />}

          {section === "ai" && (
            <AiAssistant theme={theme} settings={settings} />
          )}
        </main>

        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          theme={theme}
          accentColor={settings.accentColor || DEFAULT_ACCENT}
          onNavigate={navigate}
          onOpenNewTask={() => handleOpenTaskModal(undefined, "reminder")}
          onOpenNewNote={() => navigate("notes")}
        />

        {showTaskModal && (
          <TaskModal
            topics={topics}
            theme={theme}
            defaultDate={taskModalDate}
            mode={taskModalMode}
            onClose={() => setShowTaskModal(false)}
            onCreateTask={handleCreateTask}
          />
        )}

        {(showTopicModal || editingTopicId) && (
          <TopicModal
            key={editingTopicId ?? "new"}
            theme={theme}
            folders={folders}
            topic={topics.find((item) => item.id === editingTopicId)}
            defaultFolderId={activeFolderId ?? undefined}
            defaultKind={flowKind}
            onClose={() => {
              setShowTopicModal(false);
              setEditingTopicId(null);
            }}
            onSaveTopic={handleUpdateTopic}
            onCreateTopic={(name, folderId, dueDate, link, kind, templateId) => {
              handleCreateTopic(name, folderId, dueDate, link, kind, templateId);
              setShowTopicModal(false);
            }}
          />
        )}

        {showPipelineModal && (
          <PipelineModal
            theme={theme}
            onClose={() => setShowPipelineModal(false)}
            onCreate={handleCreatePipeline}
          />
        )}

        {folderModal && (
          <FolderModal
            theme={theme}
            mode={folderModal.mode}
            initialName={folderModal.mode === "edit" ? folderModal.folder.name : ""}
            initialColor={folderModal.mode === "edit" ? folderModal.folder.color : "blue"}
            onClose={() => setFolderModal(null)}
            onSave={handleSaveFolder}
          />
        )}

        {mounted && !onboardingDone && (
          <OnboardingWizardModal
            isOpen={true}
            theme={theme}
            onComplete={(config) => {
              setSettings((current) => ({
                ...current,
                userName: config.name,
                accentColor: config.accentColor,
                colorStyle: config.colorStyle,
                colorPreset: config.colorPreset,
                bgVariant: config.bgVariant,
                bgPattern: config.bgPattern,
                animatedBackground: config.animatedBackground,
              }));
              setTheme(config.theme);

              /* a capa escolhida no assistente vira a capa da tela inicial */
              if (config.homeCoverImage) {
                writeCurrentCover(config.homeCoverImage, "cover");
              }
              
              try {
                localStorage.setItem("yourmind_onboarding_done", "true");
              } catch {
                /* ignora */
              }
              setOnboardingDone(true);
            }}
          />
        )}

        {storageError && (
          <div className="fixed bottom-4 left-1/2 z-[120] max-w-md -translate-x-1/2 rounded-xl border border-red-500/30 bg-zinc-900 px-4 py-3 text-xs text-red-300 shadow-2xl">
            O armazenamento do navegador está cheio e as últimas mudanças não foram salvas. Apague imagens, anexos ou versões
            antigas dos fluxogramas e exporte um backup em Configurações.
          </div>
        )}

        {showSettings && (
          <SettingsModal
            theme={theme}
            setTheme={setTheme}
            settings={settings}
            setSettings={setSettings}
            counts={{
              folders: folders.length,
              topics: topics.length,
              tasks: tasks.length,
              pipelines: pipelines.length,
            }}
            onExport={handleExportData}
            onImport={handleImportData}
            onReset={handleResetData}
            onClose={() => setShowSettings(false)}
          />
        )}

        <RightSidebar
          isOpen={showRightSidebar}
          onClose={() => setShowRightSidebar(false)}
          theme={theme}
          userName={settings.userName || "Kamylle"}
          onUpdateUserName={(name) =>
            setSettings((curr) => ({ ...curr, userName: name }))
          }
          accentColor={settings.accentColor || DEFAULT_ACCENT}
        />
      </div>
    </SettingsProvider>
  );
}