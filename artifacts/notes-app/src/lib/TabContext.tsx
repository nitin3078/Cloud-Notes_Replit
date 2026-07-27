import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TabContextType {
  openTabs: number[];
  activeTabId: number | null;
  openTab: (noteId: number) => void;
  closeTab: (noteId: number) => void;
  reorderTabs: (newTabs: number[]) => void;
  unlockedNoteIds: Set<number>;
  unlockNote: (noteId: number) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [openTabs, setOpenTabs] = useState<number[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [unlockedNoteIds, setUnlockedNoteIds] = useState<Set<number>>(new Set());

  const openTab = (noteId: number) => {
    if (!openTabs.includes(noteId)) {
      setOpenTabs((prev) => [...prev, noteId]);
    }
    setActiveTabId(noteId);
  };

  const closeTab = (noteId: number) => {
    setOpenTabs((prev) => {
      const newTabs = prev.filter((id) => id !== noteId);
      if (activeTabId === noteId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
      }
      return newTabs;
    });
  };

  const reorderTabs = (newTabs: number[]) => {
    setOpenTabs(newTabs);
  };

  const unlockNote = (noteId: number) => {
    setUnlockedNoteIds((prev) => new Set([...prev, noteId]));
  };

  return (
    <TabContext.Provider value={{ openTabs, activeTabId, openTab, closeTab, reorderTabs, unlockedNoteIds, unlockNote }}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabs must be used within a TabProvider');
  }
  return context;
}
