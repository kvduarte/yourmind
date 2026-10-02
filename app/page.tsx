"use client";

import React, { useEffect, useState } from "react";

import Sidebar from "./_components/sidebar";
import Showcase from "./_components/showcase";
import Flowchart from "./_components/flowchart";
import TaskModal from "./_components/taskModal";
import TopicModal from "./_components/topicModal";
import AnimatedBackground from "./_components/AnimatedBackground";

import { Folder, Task, Theme, Topic } from "@/types";

export default function Home() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const [folders, setFolders] = useState<Folder[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [mounted, setMounted] = useState(false);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);

  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setMounted(true);

    const savedFolders = localStorage.getItem("app_folders");
    const savedTopics = localStorage.getItem("app_topics");
    const savedTasks = localStorage.getItem("app_tasks");
    const savedTheme = localStorage.getItem("app_theme") as Theme | null;

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    if (savedFolders) {
      try {
        setFolders(JSON.parse(savedFolders));
      } catch {
        setFolders([]);
      }
    }

    if (savedTopics) {
      try {
        const parsedTopics: Topic[] = JSON.parse(savedTopics);

        setTopics(
          parsedTopics.map((topic) => ({
            ...topic,
            folderId: topic.folderId || undefined,
            dueDate: topic.dueDate || undefined,
          }))
        );
      } catch {
        setTopics([]);
      }
    }

    if (savedTasks) {
      try {
        setTasks(JSON.parse(savedTasks));
      } catch {
        setTasks([]);
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("app_folders", JSON.stringify(folders));
  }, [folders, mounted]);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("app_topics", JSON.stringify(topics));
  }, [topics, mounted]);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("app_tasks", JSON.stringify(tasks));
  }, [tasks, mounted]);

  useEffect(() => {
    if (!mounted) return;

    localStorage.setItem("app_theme", theme);

    document.documentElement.classList.toggle(
      "dark",
      theme === "dark"
    );

    document.documentElement.classList.toggle(
      "light",
      theme === "light"
    );
  }, [theme, mounted]);

  const handleCreateFolder = (
    name: string,
    color: string
  ) => {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      color,
    };

    setFolders((prev) => [...prev, newFolder]);
  };

  const handleUpdateFolder = (
    id: string,
    name: string,
    color: string
  ) => {
    setFolders((prev) =>
      prev.map((folder) =>
        folder.id === id
          ? {
              ...folder,
              name,
              color,
            }
          : folder
      )
    );
  };

  const handleDeleteFolder = (
    id: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();

    const folderTopics = topics.filter(
      (topic) => topic.folderId === id
    );

    const topicIds = new Set(
      folderTopics.map((topic) => topic.id)
    );

    setFolders((prev) =>
      prev.filter((folder) => folder.id !== id)
    );

    setTopics((prev) =>
      prev.filter((topic) => topic.folderId !== id)
    );

    setTasks((prev) =>
      prev.filter((task) => !topicIds.has(task.topicId))
    );

    if (activeTab === id) {
      setActiveTab("dashboard");
    }

    if (topicIds.has(activeTab)) {
      setActiveTab("dashboard");
    }
  };

  const handleCreateTopic = (
    name: string,
    folderId?: string,
    dueDate?: string
  ) => {
    const newId = `topic-${Date.now()}`;

    const newTopic: Topic = {
      id: newId,
      name,
      folderId,
      dueDate,
      nodes: [
        {
          id: `node-${Date.now()}`,
          title: name,
          description: "Bloco Principal",
          type: "main",
          x: 100,
          y: 100,
        },
      ],
      connections: [],
    };

    setTopics((prev) => [...prev, newTopic]);

    if (dueDate) {
      const newTask: Task = {
        id: `task-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`,
        title: name,
        description: "Fluxograma com data definida.",
        topicId: newId,
        createdAt: new Date().toISOString(),
        dueDate,
        completed: false,
      };

      setTasks((prev) => [newTask, ...prev]);
    }

    setActiveTab(newId);
  };

  const handleDeleteTopic = (
    id: string,
    e?: React.MouseEvent
  ) => {
    e?.stopPropagation();

    setTopics((prev) =>
      prev.filter((topic) => topic.id !== id)
    );

    setTasks((prev) =>
      prev.filter((task) => task.topicId !== id)
    );

    if (activeTab === id) {
      setActiveTab("dashboard");
    }
  };

  const handleCreateTask = (newTask: Task) => {
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
            }
          : task
      )
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) =>
      prev.filter((task) => task.id !== id)
    );
  };

  const handleSaveEditedTask = (
    updatedTask: Task
  ) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === updatedTask.id
          ? updatedTask
          : task
      )
    );
  };

  const handleSelectTopic = (
    topicId: string | null
  ) => {
    setActiveTab(topicId || "dashboard");
  };

  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-black" />
    );
  }

  const activeTopic = topics.find(
    (topic) => topic.id === activeTab
  );

  const isDark = theme === "dark";

  return (
    <div
      className={`
        relative flex h-screen w-screen overflow-hidden
        font-sans transition-colors duration-300
        ${
          isDark
            ? "bg-black text-zinc-100"
            : "bg-zinc-100 text-zinc-900"
        }
      `}
    >
      {isDark && <AnimatedBackground theme={theme} />}

      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        folders={folders}
        topics={topics}
        theme={theme}
        setTheme={setTheme}
        onCreateFolder={handleCreateFolder}
        onUpdateFolder={handleUpdateFolder}
        onDeleteFolder={handleDeleteFolder}
        onCreateTopic={() => {
          setShowTopicModal(true);
        }}
        onDeleteTopic={handleDeleteTopic}
      />

      <main
        className={`
          flex-1 flex flex-col h-screen overflow-hidden
          transition-colors duration-300
          ${
            isDark
              ? "bg-black text-zinc-100"
              : "bg-zinc-100 text-zinc-900"
          }
        `}
      >
        {activeTab === "dashboard" ? (
          <Showcase
            tasks={tasks}
            topics={topics}
            folders={folders}
            onOpenTaskModal={() =>
              setShowTaskModal(true)
            }
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onSaveEditedTask={
              handleSaveEditedTask
            }
            onSelectTopic={handleSelectTopic}
            theme={theme}
          />
        ) : activeTopic ? (
          <Flowchart
            topic={activeTopic}
            topics={topics}
            setTopics={setTopics}
            theme={theme}
          />
        ) : (
          <Showcase
            tasks={tasks}
            topics={topics}
            folders={folders}
            onOpenTaskModal={() =>
              setShowTaskModal(true)
            }
            onToggleTask={handleToggleTask}
            onDeleteTask={handleDeleteTask}
            onSaveEditedTask={
              handleSaveEditedTask
            }
            onSelectTopic={handleSelectTopic}
            theme={theme}
          />
        )}
      </main>

      {showTaskModal && (
        <TaskModal
          topics={topics}
          theme={theme}
          onClose={() =>
            setShowTaskModal(false)
          }
          onCreateTask={handleCreateTask}
        />
      )}

      {showTopicModal && (
        <TopicModal
          folders={folders}
          onClose={() =>
            setShowTopicModal(false)
          }
          onCreateTopic={(
            name,
            folderId,
            dueDate
          ) => {
            handleCreateTopic(
              name,
              folderId,
              dueDate
            );

            setShowTopicModal(false);
          }}
        />
      )}
    </div>
  );
}