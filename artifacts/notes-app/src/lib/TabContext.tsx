import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TabContextType {
  openTabs: number[];
  activeTabId: number | null;
  openTab: (noteId: number) => void;
  closeTab: (noteId: number) => void;
  reorderTabs: (newTabs: number[]) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export function TabProvider({ children }: { children: ReactNode }) {
  const [openTabs, setOpenTabs] = useState<number[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);

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
        // If we closed the active tab, make the last tab active
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1] : null);
      }
      return newTabs;
    });
  };

  const reorderTabs = (newTabs: number[]) => {
    setOpenTabs(newTabs);
  };

  return (
    <TabContext.Provider value={{ openTabs, activeTabId, openTab, closeTab, reorderTabs }}>
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
