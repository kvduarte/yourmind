"use client";

import { useEffect, useState } from "react";

import Sidebar from "./_components/Sidebar";
import Home from "./_components/Home";
import Notes from "./_components/Notes";
import Flows from "./_components/Flows";
import BackBar from "./_components/BackBar";
import Flowchart from "./_components/flowchart";
import CodeFlow from "./_components/CodeFlow";
import PipelineBoard from "./_components/PipelineBoard";
import ProcessList from "./_components/ProcessList";
import PipelineModal from "./_components/PipelineModal";
import FolderModal from "./_components/FolderModal";
import TaskModal from "./_components/taskModal";
import NameModal from "./_components/NameModal";
import { useConfirm } from "./_components/ConfirmDialog";
import TopicModal from "./_components/topicModal";
import AnimatedBackground from "./_components/AnimatedBackground";
import AIChat from "./_components/AIChat";
import SettingsModal from "./_components/SettingsModal";

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
import {
  FlowKind,
  KIND_COLORS,
  SECTION_COLORS,
  Section,
} from "@/lib/nav";
import { GitFork, Code2, Workflow } from "lucide-react";
import { DEFAULT_ACCENT } from "@/lib/theme";
import { textScaleStyle } from "@/lib/ui";

/** Configurações + campos da imagem de fundo (cor de destaque, opacidade e intensidade) */
type AppSettingsFull = AppSettings & {
  accentColor?: string;
  bgImageUrl?: string;
  /** 0 a 100 */
  bgImageOpacity?: number;
  /** 0 a 200 (100 = cor original) */
  bgImageSaturation?: number;
  /** 0 a 100 — véu de leitura sobre a imagem */
  bgImageVeil?: number;
};

type FolderModalState =
  | { mode: "create" }
  | { mode: "edit"; folder: Folder }
  | null;

export default function Page() {
  const confirm = useConfirm();

  /* pergunta o nome uma vez; "Agora não" também conta como respondido */
  const [nameDismissed, setNameDismissed] = useState(true);

  useEffect(() => {
    try {
      setNameDismissed(localStorage.getItem("name_prompt_done") === "1");
    } catch {
      setNameDismissed(true);
    }
  }, []);

  const finishNamePrompt = () => {
    try {
      localStorage.setItem("name_prompt_done", "1");
    } catch {
      /* ignora */
    }

    setNameDismissed(true);
  };

  /* ---------- navegação ---------- */
  const [section, setSection] = useState<Section>("home");
  const [flowKind, setFlowKind] = useState<FlowKind>("general");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);

  /* ---------- dados ---------- */
  const [folders, setFolders] = useState<Folder[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);

  const [mounted, setMounted] = useState(false);

  /* ---------- janelas ---------- */
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalDate, setTaskModalDate] = useState<string | undefined>(undefined);
  const [taskModalMode, setTaskModalMode] = useState<"note" | "reminder">("reminder");
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [folderModal, setFolderModal] = useState<FolderModalState>(null);

  const [theme, setTheme] = useState<Theme>("light");
  const [settings, setSettings] = useState<AppSettingsFull>(DEFAULT_SETTINGS);

  // imagem de fundo (arquivo original guardado no IndexedDB)
  const bgSrc = useBgImage(settings.bgImageUrl);

  /* =========================================================
     CARREGAR / SALVAR (localStorage)
  ========================================================= */

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

    // Fluxogramas antigos que já têm blocos de código viram "Programação".
    setTopics(
      read<Topic[]>("app_topics", []).map((topic) => ({
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
    if (mounted) localStorage.setItem("app_folders", JSON.stringify(folders));
  }, [folders, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem("app_topics", JSON.stringify(topics));
  }, [topics, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem("app_tasks", JSON.stringify(tasks));
  }, [tasks, mounted]);

  useEffect(() => {
    if (mounted) localStorage.setItem("app_pipelines", JSON.stringify(pipelines));
  }, [pipelines, mounted]);

  useEffect(() => {
    if (mounted) saveSettings(settings);
  }, [settings, mounted]);

  // Tamanho da interface e cantos (Configurações > Aparência)
  useEffect(() => {
    if (!mounted) return;

    document.documentElement.style.fontSize = `${UI_SCALE_PX[settings.uiScale]}px`;
    document.documentElement.style.setProperty(
      "--round",
      String(RADIUS_FACTOR[settings.radius])
    );
  }, [settings.uiScale, settings.radius, mounted]);

  // Cor de destaque: vira a variável CSS --accent usada em todo o app
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

  /* =========================================================
     NAVEGAR (usado pelos cards da tela inicial)
  ========================================================= */

  const navigate = (target: string) => {
    if (target === "notes") {
      setSection("notes");

      return;
    }

    if (target === "calendar" || target === "home") {
      setSection("home");

      return;
    }

    if (target === "flows") {
      setSection("flows");

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

  /* =========================================================
     PASTAS
  ========================================================= */

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

  /* =========================================================
     FLUXOGRAMAS
  ========================================================= */

  const handleCreateTopic = (
    name: string,
    folderId?: string,
    dueDate?: string,
    link?: string,
    kind: FlowKind = "general"
  ) => {
    const newId = `topic-${Date.now()}`;

    const newTopic: Topic = {
      id: newId,
      name,
      folderId,
      dueDate,
      link,
      kind,
      // O fluxograma normal nasce com o tópico principal no centro.
      nodes:
        kind === "code"
          ? []
          : [
              {
                id: `node-${Date.now()}`,
                title: name,
                description: "Bloco Principal",
                type: "main",
                x: 520,
                y: 240,
                width: 280,
                height: 150,
              },
            ],
      connections: [],
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

  /* =========================================================
     PROCESSOS
  ========================================================= */

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

  /* =========================================================
     ANOTAÇÕES
  ========================================================= */

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

  /* =========================================================
     BACKUP
  ========================================================= */

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

  /* =========================================================
     TELA ATUAL
  ========================================================= */

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
          showLights={isDark && settings.animatedBackground}
        />

        <Sidebar
          section={section}
          onSelect={goTo}
          onOpenSettings={() => setShowSettings(true)}
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
                      topics={topics}
                      setTopics={setTopics}
                      theme={theme}
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
        </main>

        {/* O assistente aparece apenas dentro de um fluxograma aberto */}
        {section === "flows" && activeTopic && (
          <AIChat key={activeTopic.id} topic={activeTopic} theme={theme} />
        )}

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

        {showTopicModal && (
          <TopicModal
            theme={theme}
            folders={folders}
            defaultFolderId={activeFolderId ?? undefined}
            defaultKind={flowKind}
            onClose={() => setShowTopicModal(false)}
            onCreateTopic={(name, folderId, dueDate, link, kind) => {
              handleCreateTopic(name, folderId, dueDate, link, kind);

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

        {mounted && !nameDismissed && !settings.userName && (
          <NameModal
            theme={theme}
            onSkip={finishNamePrompt}
            onSave={(name) => {
              setSettings((current) => ({ ...current, userName: name }));
              finishNamePrompt();
            }}
          />
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
      </div>
    </SettingsProvider>
  );
}