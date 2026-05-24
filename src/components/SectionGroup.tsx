import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Section, Snippet } from '../types';
import SnippetCard from './SnippetCard';
import DropdownMenu from './DropdownMenu';
import ConfirmDialog from './ConfirmDialog';

interface Props {
  section: Section;
  isPro: boolean;
  onUpdate: (patch: Partial<Section>) => void;
  onDelete: () => void;
  onToast: (msg: string, undoFn?: () => void) => void;
  onAfterCopy: () => void;
  onAddSnippet: () => void;
}

export default function SectionGroup({
  section,
  isPro,
  onUpdate,
  onDelete,
  onToast,
  onAfterCopy,
  onAddSnippet,
}: Props) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [nameVal, setNameVal] = useState(section.name);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const renameRef = useRef<HTMLInputElement>(null);

  // Section 自身を sortable アイテムにする
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id, disabled: !isPro });

  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    position: 'relative',
  };

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
    navigator.clipboard.writeText(text).catch(() => {});
    onAfterCopy();
  }

  // Snippet ドラッグ並び替え
  const snippetSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function handleSnippetDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const snippets = [...section.snippets];
    const oldIdx = snippets.findIndex(s => s.id === active.id);
    const newIdx = snippets.findIndex(s => s.id === over.id);
    onUpdate({ snippets: arrayMove(snippets, oldIdx, newIdx).map((s, i) => ({ ...s, order: i })) });
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
    <div ref={setNodeRef} style={dragStyle} className="section-group">
      <div
        className="section-header"
        onClick={() => !renaming && !menuOpen && onUpdate({ collapsed: !section.collapsed })}
      >
        {isPro && (
          <div
            className="sec-drag-handle"
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
          >
            <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
              <circle cx="3" cy="2.5" r="1.2" fill="currentColor" />
              <circle cx="7" cy="2.5" r="1.2" fill="currentColor" />
              <circle cx="3" cy="7" r="1.2" fill="currentColor" />
              <circle cx="7" cy="7" r="1.2" fill="currentColor" />
              <circle cx="3" cy="11.5" r="1.2" fill="currentColor" />
              <circle cx="7" cy="11.5" r="1.2" fill="currentColor" />
            </svg>
          </div>
        )}

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

        <button
          className="sec-add-btn"
          onClick={e => { e.stopPropagation(); onAddSnippet(); }}
          title={t('topbar.addSnippet')}
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1V10M1 5.5H10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>

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
        <DndContext sensors={snippetSensors} collisionDetection={closestCenter} onDragEnd={handleSnippetDragEnd}>
          <SortableContext items={sorted.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="snippets-list">
              {sorted.length === 0 && (
                <div className="empty-section">{t('empty.noSnippets')}</div>
              )}
              {sorted.map(sn => (
                <SnippetCard
                  key={sn.id}
                  snippet={sn}
                  isPro={isPro}
                  onUpdate={patch => updateSnippet(sn.id, patch)}
                  onDelete={() => deleteSnippet(sn.id)}
                  onToast={onToast}
                  onCopy={handleCopy}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
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
