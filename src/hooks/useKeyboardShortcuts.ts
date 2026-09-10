import { useEffect } from 'react';

interface KeyboardShortcutsOptions {
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeekForward: (seconds?: number) => void;
  onSeekBackward: (seconds?: number) => void;
  onVolumeUp: () => void;
  onVolumeDown: () => void;
  onToggleMute: () => void;
  onToggleLyrics: () => void;
  onToggleQueue: () => void;
  onCycleRepeat: () => void;
  onToggleShuffle: () => void;
  onToggleVisualizer: () => void;
  onFocusSearch: () => void;
  onCloseModals: () => void;
  onToggleShortcutsModal: () => void;
}

export function useKeyboardShortcuts({
  onTogglePlay,
  onNext,
  onPrevious,
  onSeekForward,
  onSeekBackward,
  onVolumeUp,
  onVolumeDown,
  onToggleMute,
  onToggleLyrics,
  onToggleQueue,
  onCycleRepeat,
  onToggleShuffle,
  onToggleVisualizer,
  onFocusSearch,
  onCloseModals,
  onToggleShortcutsModal,
}: KeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // CRITICAL INPUT GUARD: Completely ignore all hotkey triggers if the user is typing in an input
      const activeTag = document.activeElement?.tagName;
      const isInputFocused =
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable;

      if (isInputFocused) {
        if (e.key === 'Escape') {
          (document.activeElement as HTMLElement)?.blur(); // Escape unfocuses search
        }
        return;
      }

      // If user pressed '?' (Shift + / or ?) -> toggle Keyboard Shortcuts Cheat Sheet
      if (e.key === '?') {
        e.preventDefault();
        onToggleShortcutsModal();
        return;
      }

      switch (e.code) {
        // Space: Toggle Play / Pause
        case 'Space':
          e.preventDefault();
          onTogglePlay();
          break;

        // Arrow Right: Seek forward 5s
        case 'ArrowRight':
          e.preventDefault();
          onSeekForward(5);
          break;

        // Arrow Left: Seek backward 5s
        case 'ArrowLeft':
          e.preventDefault();
          onSeekBackward(5);
          break;

        // Arrow Up: Volume up 5%
        case 'ArrowUp':
          e.preventDefault();
          onVolumeUp();
          break;

        // Arrow Down: Volume down 5%
        case 'ArrowDown':
          e.preventDefault();
          onVolumeDown();
          break;

        // M: Toggle Mute
        case 'KeyM':
          e.preventDefault();
          onToggleMute();
          break;

        // N or J: Next Track
        case 'KeyN':
        case 'KeyJ':
          e.preventDefault();
          onNext();
          break;

        // P or K: Previous Track
        case 'KeyP':
        case 'KeyK':
          e.preventDefault();
          onPrevious();
          break;

        // L: Toggle Lyrics
        case 'KeyL':
          e.preventDefault();
          onToggleLyrics();
          break;

        // Q: Toggle Up Next Queue Drawer
        case 'KeyQ':
          e.preventDefault();
          onToggleQueue();
          break;

        // R: Cycle Repeat Mode
        case 'KeyR':
          e.preventDefault();
          onCycleRepeat();
          break;

        // S: Toggle Shuffle
        case 'KeyS':
          e.preventDefault();
          onToggleShuffle();
          break;

        // V: Toggle Audio Visualizer
        case 'KeyV':
          e.preventDefault();
          onToggleVisualizer();
          break;

        // Slash (/): Focus Search Input
        case 'Slash':
          if (!e.shiftKey) {
            e.preventDefault();
            onFocusSearch();
          }
          break;

        // Escape: Close open modals/drawers
        case 'Escape':
          e.preventDefault();
          onCloseModals();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    onTogglePlay,
    onNext,
    onPrevious,
    onSeekForward,
    onSeekBackward,
    onVolumeUp,
    onVolumeDown,
    onToggleMute,
    onToggleLyrics,
    onToggleQueue,
    onCycleRepeat,
    onToggleShuffle,
    onToggleVisualizer,
    onFocusSearch,
    onCloseModals,
    onToggleShortcutsModal,
  ]);
}
