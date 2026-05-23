import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Section, Snippet } from '../types';
import SnippetCard from './SnippetCard';
import DropdownMenu from './DropdownMenu';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  section: Section;
  isPro: boolean;
  totalSnippets: number;
  onUpdate: (patch: Partial<Section>) => void;
  onDelete: () => void;
  onToast: (msg: string, undoFn?: () => void) => void;
  onProModal: () => void;
}

export default function SectionGroup({
  section,
  onUpdate,
  onDelete,
  onToast,
}: Props) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState(section.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renaming && renameRef.current) renameRef.current.focus();
  }, [renaming]);

  function commitRename() {
    onUpdate({ name: nameVal.trim() || section.name });
    setRenaming(false);
  }

  function updateSnippet(id: string, patch: Partial<Snippet>) {
    onUpdate({ snippets: section.snippets.map(s => (s.id === id ? { ...s, ...patch } : s)) });
  }

  function deleteSnippet(id: string) {
    const removed = section.snippets.find(s => s.id === id);
    if (!removed) return;
    onUpdate({ snippets: section.snippets.filter(s => s.id !== id) });
    onToast(t('toast.snippetDeleted'), () => {
      onUpdate({ snippets: [...section.snippets.filter(s => s.id !== id), removed].sort((a, b) => a.order - b.order) });
    });
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text).catch(() => { /* no-op in non-secure context */ });
  }

  const sorted = [...section.snippets].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.order - b.order;
  });

  const maxH = section.collapsed ? '0px' : `${sorted.length * 160 + 80}px`;

  const menuItems = [
    { label: t('section.rename'), onClick: () => setRenaming(true) },
    'sep' as const,
    { label: t('section.delete'), danger: true, onClick: () => setConfirmOpen(true) },
  ];

  return (
    <div className="section-group">
      <div
        className="section-header"
        onClick={() => !renaming && !menuOpen && onUpdate({ collapsed: !section.collapsed })}
      >
        <svg className={`chevron${section.collapsed ? ' collapsed' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {renaming ? (
          <input
            ref={renameRef}
            className="rename-input"
            value={nameVal}
            placeholder={t('section.renamePlaceholder')}
            onChange={e => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setNameVal(section.name); setRenaming(false); }
            }}
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className="section-title-text">
            {section.name}
            <span className="section-count"> · {section.snippets.length}</span>
          </span>
        )}

        <div className="dropdown-wrap" onClick={e => e.stopPropagation()}>
          <button
            className="sec-menu-btn"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          >
            ···
          </button>
          {menuOpen && (
            <DropdownMenu items={menuItems} onClose={() => setMenuOpen(false)} />
          )}
        </div>
      </div>

      <div className="section-body" style={{ maxHeight: maxH }}>
        <div className="snippets-list">
          {sorted.length === 0 && (
            <div className="empty-section">{t('empty.noSnippets')}</div>
          )}
          {sorted.map(sn => (
            <SnippetCard
              key={sn.id}
              snippet={sn}
              onUpdate={patch => updateSnippet(sn.id, patch)}
              onDelete={() => deleteSnippet(sn.id)}
              onToast={onToast}
              onCopy={handleCopy}
            />
          ))}
        </div>
      </div>
      {confirmOpen && (
        <ConfirmDialog
          message={t('confirm.deleteSection', { name: section.name })}
          onConfirm={() => { setConfirmOpen(false); onDelete(); }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
}
