import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Snippet } from '../types';
import DropdownMenu from './DropdownMenu';

interface Props {
  snippet: Snippet;
  isPro: boolean;
  onUpdate: (patch: Partial<Snippet>) => void;
  onDelete: () => void;
  onToast: (msg: string, undoFn?: () => void) => void;
  onCopy: (text: string) => void;
}

export default function SnippetCard({ snippet, isPro, onUpdate, onDelete, onToast, onCopy }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(snippet.content === '');
  const [draft, setDraft] = useState(snippet.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: snippet.id,
    disabled: !isPro,
  });

  const dragStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  useEffect(() => {
    if (editing && taRef.current) {
      const ta = taRef.current;
      ta.focus();
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
      const len = ta.value.length;
      ta.setSelectionRange(len, len);
    }
  }, [editing]);

  function commit() {
    const v = draft.trim();
    onUpdate({ content: v || snippet.content });
    setEditing(false);
  }

  function cancel() {
    setDraft(snippet.content);
    setEditing(false);
  }

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const text = editing ? draft : snippet.content;
      onCopy(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    },
    [editing, draft, snippet.content, onCopy],
  );

  const menuItems = [
    {
      label: snippet.pinned ? t('snippet.unpin') : t('snippet.pin'),
      onClick: () => onUpdate({ pinned: !snippet.pinned }),
    },
    'sep' as const,
    {
      label: t('snippet.delete'),
      danger: true,
      onClick: () => {
        onDelete();
        onToast(t('toast.snippetDeleted'));
      },
    },
  ];

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={`snippet-card${snippet.pinned ? ' is-pinned' : ''}${editing ? ' is-editing' : ''}`}
    >
      <div className="card-controls">
        {isPro && (
          <div className="snip-drag-handle" {...attributes} {...listeners}>
            <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
              <circle cx="2.5" cy="2" r="1.1" fill="currentColor" />
              <circle cx="5.5" cy="2" r="1.1" fill="currentColor" />
              <circle cx="2.5" cy="6" r="1.1" fill="currentColor" />
              <circle cx="5.5" cy="6" r="1.1" fill="currentColor" />
              <circle cx="2.5" cy="10" r="1.1" fill="currentColor" />
              <circle cx="5.5" cy="10" r="1.1" fill="currentColor" />
            </svg>
          </div>
        )}
        {snippet.pinned && <div className="pin-dot" title="Pinned" />}
        <div className="ctrl-spacer" />
        <button
          className={`copy-btn${copied ? ' copied' : ''}`}
          onClick={handleCopy}
          title={t('snippet.copy')}
        >
          {copied ? (
            <>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t('snippet.copied')}
            </>
          ) : (
            <>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="0.5" y="2.5" width="6.5" height="7" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
                <path d="M3 2.5V2A1.2 1.2 0 014.2.8h4.1A1.2 1.2 0 019.5 2v5.5A1.2 1.2 0 018.3 7.7H8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              {t('snippet.copy')}
            </>
          )}
        </button>
        <div className="dropdown-wrap">
          <button
            className="snip-menu-btn"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
          >
            ···
          </button>
          {menuOpen && (
            <DropdownMenu items={menuItems} onClose={() => setMenuOpen(false)} />
          )}
        </div>
      </div>

      <div className="code-wrap" onClick={() => !editing && setEditing(true)}>
        {editing ? (
          <>
            <textarea
              ref={taRef}
              className="code-textarea"
              value={draft}
              rows={1}
              onChange={e => {
                setDraft(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onBlur={commit}
              onKeyDown={e => {
                if (e.key === 'Escape') { e.preventDefault(); cancel(); }
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(); }
              }}
            />
            <div className="edit-hint">
              <kbd>Ctrl+Enter</kbd> {t('snippet.editHint').split('·')[0].replace('保存: ', '').replace('Save: ', '')} · <kbd>Esc</kbd>
            </div>
          </>
        ) : (
          <span className="code-display">{snippet.content || ' '}</span>
        )}
      </div>
    </div>
  );
}
