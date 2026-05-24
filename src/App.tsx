import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { Section, AppSettings, ToastState, AccentColor } from './types';
import TopBar from './components/TopBar';
import SectionGroup from './components/SectionGroup';
import Toast from './components/Toast';
import SettingsView from './components/SettingsView';
import ProModal from './components/ProModal';
import i18n from './lib/i18n';
import { isTauri, loadData, saveData } from './lib/storage';

const FREE_MAX_SECTIONS = 2;
const FREE_MAX_SNIPPETS = 5;

const ACCENT_MAP: Record<AccentColor, { css: string; dim: string; border: string }> = {
  blue:   { css: 'oklch(0.64 0.18 250)', dim: 'oklch(0.64 0.18 250 / 0.15)', border: 'oklch(0.64 0.18 250 / 0.45)' },
  purple: { css: 'oklch(0.64 0.18 295)', dim: 'oklch(0.64 0.18 295 / 0.15)', border: 'oklch(0.64 0.18 295 / 0.45)' },
  green:  { css: 'oklch(0.64 0.18 155)', dim: 'oklch(0.64 0.18 155 / 0.15)', border: 'oklch(0.64 0.18 155 / 0.45)' },
  amber:  { css: 'oklch(0.70 0.17 75)',  dim: 'oklch(0.70 0.17 75  / 0.15)', border: 'oklch(0.70 0.17 75  / 0.45)' },
};

const SEED_SECTIONS: Section[] = [
  {
    id: 's1', name: 'Git', collapsed: false, order: 0,
    snippets: [
      { id: 'n1', content: 'git status',          pinned: false, order: 0 },
      { id: 'n2', content: 'git log --oneline -10', pinned: false, order: 1 },
      { id: 'n3', content: 'git stash',            pinned: false, order: 2 },
    ],
  },
  {
    id: 's2', name: 'Dev', collapsed: false, order: 1,
    snippets: [
      { id: 'n4', content: 'npm run dev',          pinned: false, order: 0 },
      { id: 'n5', content: 'docker compose up -d', pinned: false, order: 1 },
    ],
  },
];

const DEFAULT_SETTINGS: AppSettings = {
  hotkey: 'Ctrl+Shift+Space',
  closeAfterCopy: false,
  autoStart: false,
  language: 'en',
  theme: 'dark',
  accentColor: 'blue',
  bgOpacity: 90,
  windowWidth: 480,
  windowHeight: 600,
};

export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState<'main' | 'settings'>('main');
  const [proModal, setProModal] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [sections, setSections] = useState<Section[]>(SEED_SECTIONS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hintSeen, setHintSeen] = useState(false);
  const [isPro, setIsPro] = useState(false);

  const prevHotkeyRef = useRef<string | null>(null);
  const prevAutoStartRef = useRef<boolean | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData().then(raw => {
      let savedSettings = DEFAULT_SETTINGS;
      if (raw && typeof raw === 'object') {
        const d = raw as Record<string, unknown>;
        if (Array.isArray(d.sections)) setSections(d.sections as Section[]);
        if (d.settings) {
          savedSettings = { ...DEFAULT_SETTINGS, ...(d.settings as Partial<AppSettings>) };
          setSettings(savedSettings);
        }
        if (typeof d.hintSeen === 'boolean') setHintSeen(d.hintSeen);
      }
      if (isTauri()) {
        getCurrentWindow()
          .setSize(new LogicalSize(savedSettings.windowWidth, savedSettings.windowHeight))
          .catch(() => {});
      }
      setLoaded(true);
    });
    if (isTauri()) {
      invoke<boolean>('check_license').then(setIsPro).catch(() => {});
    }
  }, []);

  // ウィンドウリサイズを検知してサイズを settings に保存
  useEffect(() => {
    if (!isTauri()) return;
    const appWin = getCurrentWindow();
    let timer: ReturnType<typeof setTimeout>;
    const p = appWin.onResized(async () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const sf = await appWin.scaleFactor();
          const phys = await appWin.innerSize();
          const log = phys.toLogical(sf);
          setSettings(prev => ({
            ...prev,
            windowWidth: Math.round(log.width),
            windowHeight: Math.round(log.height),
          }));
        } catch {}
      }, 500);
    });
    return () => {
      clearTimeout(timer);
      p.then(fn => fn());
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveData({ version: 1, sections, settings, hintSeen });
  }, [sections, settings, hintSeen, loaded]);

  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const a = ACCENT_MAP[settings.accentColor];
    const r = document.documentElement;
    r.style.setProperty('--accent', a.css);
    r.style.setProperty('--accent-dim', a.dim);
    r.style.setProperty('--accent-border', a.border);
    const base = settings.theme === 'light' ? '#fafbfc' : '#161a1f';
    r.style.setProperty('--bg-window', `color-mix(in srgb, ${base} ${settings.bgOpacity}%, transparent)`);
  }, [settings.accentColor, settings.bgOpacity, settings.theme]);

  useEffect(() => {
    if (!isTauri() || !loaded) return;
    if (prevHotkeyRef.current === null) { prevHotkeyRef.current = settings.hotkey; return; }
    if (prevHotkeyRef.current !== settings.hotkey) {
      prevHotkeyRef.current = settings.hotkey;
      invoke('update_hotkey', { hotkey: settings.hotkey }).catch(console.error);
    }
  }, [settings.hotkey, loaded]);

  useEffect(() => {
    if (!isTauri() || !loaded) return;
    if (prevAutoStartRef.current === null) { prevAutoStartRef.current = settings.autoStart; return; }
    if (prevAutoStartRef.current !== settings.autoStart) {
      prevAutoStartRef.current = settings.autoStart;
      invoke('set_autostart', { enabled: settings.autoStart }).catch(console.error);
    }
  }, [settings.autoStart, loaded]);

  useEffect(() => {
    if (!isTauri()) return;
    const p = listen('window-blur', () => {
      if (view === 'settings') return;
      invoke('hide_window').catch(() => {});
    });
    return () => { p.then(fn => fn()); };
  }, [view]);

  useEffect(() => {
    if (!isTauri()) return;
    const p = listen('open-settings', () => setView('settings'));
    return () => { p.then(fn => fn()); };
  }, []);

  // Esc でウィンドウを閉じる（編集中・Settings 中は除外）
  useEffect(() => {
    if (!isTauri()) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (view === 'settings') return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') return;
      invoke('hide_window').catch(() => {});
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [view]);

  const showToast = useCallback((msg: string, undoFn?: () => void) => {
    setToast({ key: Date.now(), msg, undoFn });
  }, []);

  const handleAfterCopy = useCallback(() => {
    if (settings.closeAfterCopy && isTauri()) {
      invoke('hide_window').catch(console.error);
    } else {
      showToast(t('toast.copied'));
    }
  }, [settings.closeAfterCopy, showToast, t]);

  // Export
  function handleExport() {
    const data = JSON.stringify({ version: 1, sections, settings, hintSeen }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'snipdock-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import
  function handleImportClick() {
    importInputRef.current?.click();
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        if (Array.isArray(raw.sections)) {
          setSections(raw.sections as Section[]);
          showToast(t('toast.imported'));
        } else {
          showToast(t('toast.importError'));
        }
      } catch {
        showToast(t('toast.importError'));
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  }

  const totalSnippets = sections.reduce((n, s) => n + s.snippets.length, 0);

  function addSection() {
    if (!isPro && sections.length >= FREE_MAX_SECTIONS) { setProModal(true); return; }
    setSections(prev => [
      ...prev,
      { id: uuidv4(), name: 'New Section', collapsed: false, order: prev.length, snippets: [] },
    ]);
  }

  function addSnippet(sectionId: string) {
    if (!isPro && totalSnippets >= FREE_MAX_SNIPPETS) { setProModal(true); return; }
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return {
        ...s,
        collapsed: false,
        snippets: [
          { id: uuidv4(), content: '', pinned: false, order: 0 },
          ...s.snippets.map(sn => ({ ...sn, order: sn.order + 1 })),
        ],
      };
    }));
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

  // Section ドラッグ並び替え
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const oldIdx = sorted.findIndex(s => s.id === active.id);
      const newIdx = sorted.findIndex(s => s.id === over.id);
      return arrayMove(sorted, oldIdx, newIdx).map((s, i) => ({ ...s, order: i }));
    });
  }

  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="tool-window">
      <div
        className="drag-handle"
        onMouseDown={() => {
          if (isTauri()) getCurrentWindow().startDragging().catch(() => {});
        }}
      >
        <div className="drag-handle-pip" />
      </div>

      <TopBar
        view={view}
        onAddSection={addSection}
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
          onExport={handleExport}
          onImport={handleImportClick}
        />
      ) : (
        <div className="main-area">
          {sortedSections.length === 0 ? (
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
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
              <SortableContext items={sortedSections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {sortedSections.map(sec => (
                  <SectionGroup
                    key={sec.id}
                    section={sec}
                    isPro={isPro}
                    onUpdate={patch => updateSection(sec.id, patch)}
                    onDelete={() => deleteSection(sec.id)}
                    onToast={showToast}
                    onAfterCopy={handleAfterCopy}
                    onAddSnippet={() => addSnippet(sec.id)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />

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
