import React, { useState, useCallback, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutsDialog from '../components/ui/KeyboardShortcutsDialog';
import CommandPalette from '../components/ui/CommandPalette';

interface GlobalShortcutsContextType {
  openCommandPalette: () => void;
  openShortcutsDialog: () => void;
}

const GlobalShortcutsContext = createContext<GlobalShortcutsContextType | null>(null);

export const useGlobalShortcuts = () => {
  const context = useContext(GlobalShortcutsContext);
  if (!context) {
    throw new Error('useGlobalShortcuts must be used within GlobalShortcutsProvider');
  }
  return context;
};

export const GlobalShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsDialogOpen, setShortcutsDialogOpen] = useState(false);

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
  }, []);

  const openShortcutsDialog = useCallback(() => {
    setShortcutsDialogOpen(true);
  }, []);

  // Define global shortcuts
  useKeyboardShortcuts([
    // Command Palette
    {
      key: 'k',
      ctrl: true,
      description: 'Open command palette',
      action: openCommandPalette,
      preventDefault: true,
    },
    // Shortcuts Dialog
    {
      key: '?',
      shift: true,
      description: 'Show keyboard shortcuts',
      action: openShortcutsDialog,
      preventDefault: true,
    },
    // Navigation shortcuts
    {
      key: 'n',
      ctrl: true,
      description: 'New report',
      action: () => navigate('/app/reporting'),
      preventDefault: true,
    },
  ]);

  const contextValue: GlobalShortcutsContextType = {
    openCommandPalette,
    openShortcutsDialog,
  };

  return (
    <GlobalShortcutsContext.Provider value={contextValue}>
      {children}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <KeyboardShortcutsDialog
        open={shortcutsDialogOpen}
        onClose={() => setShortcutsDialogOpen(false)}
      />
    </GlobalShortcutsContext.Provider>
  );
};
