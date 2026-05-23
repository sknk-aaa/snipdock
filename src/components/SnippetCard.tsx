import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Snippet, Language } from '../types';
import DropdownMenu from './DropdownMenu';
import { highlight } from '../lib/highlight';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'plain',      label: 'Plain' },
  { value: 'bash',       label: 'Bash' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python',     label: 'Python' },
  { value: 'json',       label: 'JSON' },
  { value: 'yaml',       label: 'YAML' },
  { value: 'sql',        label: 'SQL' },
];

interface Props {
  snippet: Snippet;
  onUpdate: (patch: Partial<Snippet>) => void;
  onDelete: () => void;
  onToast: (msg: string, undoFn?: () => void) => void;
  onCopy: (text: string) => void;
}

export default function SnippetCard({ snippet, onUpdate, onDelete, onToast, onCopy }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(snippet.content === '');
  const [draft, setDraft] = useState(snippet.content);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

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

  const highlighted = useMemo(
    () => highlight(snippet.content, snippet.language),
    [snippet.content, snippet.language],
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
    <div className={`snippet-card${snippet.pinned ? ' is-pinned' : ''}${editing ? ' is-editing' : ''}`}>
      <div className="card-controls">
        {snippet.pinned && <div className="pin-dot" title="Pinned" />}
        <div className="lang-wrap">
          <select
            className="lang-select"
            value={snippet.language}
            onChange={e => onUpdate({ language: e.target.value as Language })}
            onClick={e => e.stopPropagation()}
          >
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
          <svg className="lang-arrow" width="7" height="5" viewBox="0 0 7 5" fill="none">
            <path d="M1 1L3.5 4L6 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
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
          <span
            className="code-display"
            dangerouslySetInnerHTML={{ __html: highlighted || '&nbsp;' }}
          />
        )}
      </div>
    </div>
  );
}
