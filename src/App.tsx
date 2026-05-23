import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import type { Section, AppSettings, ToastState, AccentColor } from './types';
import TopBar from './components/TopBar';
import SectionGroup from './components/SectionGroup';
import Toast from './components/Toast';
import SettingsView from './components/SettingsView';
import ProModal from './components/ProModal';
import i18n from './lib/i18n';

const FREE_MAX_SECTIONS = 5;
const FREE_MAX_SNIPPETS = 20;

const ACCENT_MAP: Record<AccentColor, { css: string; dim: string; border: string }> = {
  blue:   { css: 'oklch(0.64 0.18 250)', dim: 'oklch(0.64 0.18 250 / 0.15)', border: 'oklch(0.64 0.18 250 / 0.45)' },
  purple: { css: 'oklch(0.64 0.18 295)', dim: 'oklch(0.64 0.18 295 / 0.15)', border: 'oklch(0.64 0.18 295 / 0.45)' },
  green:  { css: 'oklch(0.64 0.18 155)', dim: 'oklch(0.64 0.18 155 / 0.15)', border: 'oklch(0.64 0.18 155 / 0.45)' },
  amber:  { css: 'oklch(0.70 0.17 75)',  dim: 'oklch(0.70 0.17 75  / 0.15)', border: 'oklch(0.70 0.17 75  / 0.45)' },
};

const SEED_SECTIONS: Section[] = [
  {
    id: 's1', name: 'Git', collapsed: false, order: 0,
    snippets: [{ id: 'n1', content: 'git status', language: 'bash', pinned: false, order: 0 }],
  },
  {
    id: 's2', name: 'Node', collapsed: false, order: 1,
    snippets: [{ id: 'n2', content: 'npm run dev', language: 'bash', pinned: false, order: 0 }],
  },
  {
    id: 's3', name: 'Docker', collapsed: false, order: 2,
    snippets: [{ id: 'n3', content: 'docker compose up -d', language: 'bash', pinned: false, order: 0 }],
  },
  {
    id: 's4', name: 'AI', collapsed: false, order: 3,
    snippets: [{ id: 'n4', content: 'Please review this code and explain potential bugs.', language: 'plain', pinned: false, order: 0 }],
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  hotkey: 'Ctrl+Shift+Space',
  closeAfterCopy: false,
  autoStart: false,
  language: 'en',
  accentColor: 'blue',
  bgOpacity: 90,
  windowWidth: 480,
  windowHeight: 600,
};

function loadState(): { sections: Section[]; settings: AppSettings; hintSeen: boolean } {
  try {
    const raw = localStorage.getItem('snipdock');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sections: parsed.sections ?? SEED_SECTIONS,
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        hintSeen: parsed.hintSeen ?? false,
      };
    }
  } catch { /* ignore */ }
  return { sections: SEED_SECTIONS, settings: DEFAULT_SETTINGS, hintSeen: false };
}

export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState<'main' | 'settings'>('main');
  const [proModal, setProModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const initial = loadState();
  const [sections, setSections] = useState<Section[]>(initial.sections);
  const [settings, setSettings] = useState<AppSettings>(initial.settings);
  const [hintSeen, setHintSeen] = useState(initial.hintSeen);
  const [isPro] = useState(false);

  useEffect(() => {
    localStorage.setItem('snipdock', JSON.stringify({ sections, settings, hintSeen }));
  }, [sections, settings, hintSeen]);

  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language]);

  useEffect(() => {
    const a = ACCENT_MAP[settings.accentColor];
    const r = document.documentElement;
    r.style.setProperty('--accent', a.css);
    r.style.setProperty('--accent-dim', a.dim);
    r.style.setProperty('--accent-border', a.border);
    r.style.setProperty('--bg-window', `oklch(0.13 0.013 265 / ${settings.bgOpacity / 100})`);
  }, [settings.accentColor, settings.bgOpacity]);

  const showToast = useCallback((msg: string, undoFn?: () => void) => {
    setToast({ key: Date.now(), msg, undoFn });
  }, []);

  const totalSnippets = sections.reduce((n, s) => n + s.snippets.length, 0);

  function addSection() {
    if (!isPro && sections.length >= FREE_MAX_SECTIONS) {
      setProModal(true);
      return;
    }
    setSections(prev => [
      ...prev,
      { id: uuidv4(), name: 'New Section', collapsed: false, order: prev.length, snippets: [] },
    ]);
  }

  function addSnippet() {
    if (!isPro && totalSnippets >= FREE_MAX_SNIPPETS) {
      setProModal(true);
      return;
    }
    setSections(prev => {
      if (!prev.length) return prev;
      const openIdx = prev.findIndex(s => !s.collapsed);
      const idx = openIdx >= 0 ? openIdx : 0;
      const target = prev[idx];
      const updated: Section = {
        ...target,
        collapsed: false,
        snippets: [
          { id: uuidv4(), content: '', language: 'bash', pinned: false, order: 0 },
          ...target.snippets.map(s => ({ ...s, order: s.order + 1 })),
        ],
      };
      return prev.map((s, i) => (i === idx ? updated : s));
    });
  }

  function updateSection(id: string, patch: Partial<Section>) {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  }

  function deleteSection(id: string) {
    const removed = sections.find(s => s.id === id);
    if (!removed) return;
    setSections(prev => prev.filter(s => s.id !== id));
    showToast(t('toast.sectionDeleted'), () => {
      setSections(prev => [...prev, removed].sort((a, b) => a.order - b.order));
    });
  }

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings(prev => ({ ...prev, ...patch }));
  }

  return (
    <div className="tool-window">
      <div className="drag-handle" data-tauri-drag-region>
        <div className="drag-handle-pip" />
      </div>

      <TopBar
        view={view}
        onAddSection={addSection}
        onAddSnippet={addSnippet}
        onToggleSettings={() => setView(v => (v === 'settings' ? 'main' : 'settings'))}
      />

      {!hintSeen && view === 'main' && (
        <div className="hint-banner">
          <span className="hint-text">{t('hint.hotkey')}</span>
          <button className="hint-close" onClick={() => setHintSeen(true)}>×</button>
        </div>
      )}

      {view === 'settings' ? (
        <SettingsView
          settings={settings}
          isPro={isPro}
          onUpdate={updateSettings}
          onProModal={() => setProModal(true)}
        />
      ) : (
        <div className="main-area">
          {sections.length === 0 ? (
            <div className="empty-main">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="3" width="18" height="22" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <rect x="10" y="8" width="18" height="22" rx="3" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 12H18M9 16.5H15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              <span className="empty-label">{t('empty.noSections')}</span>
              <span className="empty-sub">{t('empty.addSection')}</span>
            </div>
          ) : (
            sections.map(sec => (
              <SectionGroup
                key={sec.id}
                section={sec}
                isPro={isPro}
                totalSnippets={totalSnippets}
                onUpdate={patch => updateSection(sec.id, patch)}
                onDelete={() => deleteSection(sec.id)}
                onToast={showToast}
                onProModal={() => setProModal(true)}
              />
            ))
          )}
        </div>
      )}

      {toast && (
        <Toast
          key={toast.key}
          msg={toast.msg}
          undoFn={toast.undoFn}
          onDone={() => setToast(null)}
        />
      )}

      {proModal && (
        <ProModal onClose={() => setProModal(false)} />
      )}
    </div>
  );
}
