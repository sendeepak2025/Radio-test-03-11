import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  action: () => void;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 * @param shortcuts Array of keyboard shortcut configurations
 * @param options Configuration options
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (preventDefault || shortcut.preventDefault) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts, enabled, preventDefault]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.meta) parts.push('Cmd');
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(' + ');
}

/**
 * Get all available shortcuts grouped by category
 */
export function getShortcutCategories() {
  return {
    navigation: [
      { key: 'g+d', description: 'Go to Dashboard', ctrl: false },
      { key: 'g+w', description: 'Go to Worklist', ctrl: false },
      { key: 'g+r', description: 'Go to Reports', ctrl: false },
      { key: 'g+a', description: 'Go to Analytics', ctrl: false },
    ],
    actions: [
      { key: 'n', description: 'New Report', ctrl: true },
      { key: 's', description: 'Save Report', ctrl: true },
      { key: 'p', description: 'Print/Export PDF', ctrl: true },
      { key: 'k', description: 'Open Command Palette', ctrl: true },
    ],
    editing: [
      { key: 'f', description: 'Focus Findings', ctrl: true, shift: true },
      { key: 'i', description: 'Focus Impression', ctrl: true, shift: true },
      { key: 'Enter', description: 'Accept AI Suggestion', ctrl: true },
      { key: 'v', description: 'Start Voice Dictation', ctrl: true, shift: true },
      { key: 'z', description: 'Undo', ctrl: true },
      { key: 'z', description: 'Redo', ctrl: true, shift: true },
    ],
    navigation2: [
      { key: 'j', description: 'Next Report', ctrl: false },
      { key: 'k', description: 'Previous Report', ctrl: false },
      { key: '/', description: 'Search', ctrl: false },
      { key: '?', description: 'Show Shortcuts', ctrl: false, shift: true },
    ],
    general: [
      { key: 'Escape', description: 'Close Dialog/Cancel', ctrl: false },
      { key: 'Tab', description: 'Next Field', ctrl: false },
      { key: 'Tab', description: 'Previous Field', shift: true },
    ],
  };
}
