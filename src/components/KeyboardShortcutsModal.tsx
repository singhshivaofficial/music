import React from 'react';
import { X, Keyboard, Volume2, Music, Sliders, Search } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const sections: ShortcutSection[] = [
    {
      title: 'Playback Controls',
      icon: <Music className="w-4 h-4 text-[#60519b]" />,
      shortcuts: [
        { keys: ['Space'], description: 'Play / Pause playback' },
        { keys: ['N', 'J'], description: 'Next track' },
        { keys: ['P', 'K'], description: 'Previous track' },
        { keys: ['→'], description: 'Seek forward 5 seconds' },
        { keys: ['←'], description: 'Seek backward 5 seconds' },
      ],
    },
    {
      title: 'Audio & Volume',
      icon: <Volume2 className="w-4 h-4 text-[#60519b]" />,
      shortcuts: [
        { keys: ['↑'], description: 'Increase volume by 5%' },
        { keys: ['↓'], description: 'Decrease volume by 5%' },
        { keys: ['M'], description: 'Toggle mute / unmute' },
      ],
    },
    {
      title: 'Navigation & Modes',
      icon: <Sliders className="w-4 h-4 text-[#60519b]" />,
      shortcuts: [
        { keys: ['Q'], description: 'Toggle Up Next Queue drawer' },
        { keys: ['L'], description: 'Toggle synchronized lyrics' },
        { keys: ['V'], description: 'Toggle audio visualizer' },
        { keys: ['R'], description: 'Cycle repeat mode (Off / All / One)' },
        { keys: ['S'], description: 'Toggle shuffle order' },
      ],
    },
    {
      title: 'Search & Utilities',
      icon: <Search className="w-4 h-4 text-[#60519b]" />,
      shortcuts: [
        { keys: ['/'], description: 'Focus search bar' },
        { keys: ['Esc'], description: 'Unfocus search or close dialogs' },
        { keys: ['?'], description: 'Toggle this shortcuts guide' },
      ],
    },
  ];

  return (
    <div
      id="keyboard-shortcuts-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        id="keyboard-shortcuts-dialog"
        className="w-full max-w-2xl bg-[#13141d] border border-[#31323e] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#31323e] bg-[#1e202c]/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#60519b]/20 text-[#60519b] border border-[#60519b]/40">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Keyboard Shortcuts
              </h2>
              <p className="text-xs text-[#bfc0d1]/60">
                Control your music playback and interface hands-free
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#bfc0d1]/60 hover:text-white hover:bg-[#31323e] transition-colors"
            title="Close shortcuts guide (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="p-6 overflow-y-auto space-y-6">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#bfc0d1]/70">
                {section.icon}
                <span>{section.title}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {section.shortcuts.map((sc, scIdx) => (
                  <div
                    key={scIdx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#1e202c]/40 border border-[#31323e]/50 hover:border-[#60519b]/50 transition-colors"
                  >
                    <span className="text-xs text-white/90 font-medium">
                      {sc.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold bg-[#252736] text-[#bfc0d1] border border-[#3d4052] shadow-sm min-w-[24px] text-center"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info note */}
        <div className="px-6 py-3 border-t border-[#31323e] bg-[#1e202c]/30 flex items-center justify-between text-[11px] text-[#bfc0d1]/60">
          <span>Shortcuts are disabled while typing in search or text inputs.</span>
          <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded bg-[#252736] text-[#bfc0d1] border border-[#3d4052]">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
};
