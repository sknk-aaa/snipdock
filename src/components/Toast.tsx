import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  msg: string;
  undoFn?: () => void;
  onDone: () => void;
}

const VISIBLE_MS = 5000;
const EXIT_MS = 180;

export default function Toast({ msg, undoFn, onDone }: Props) {
  const { t } = useTranslation();
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), VISIBLE_MS);
    const t2 = setTimeout(onDone, VISIBLE_MS + EXIT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  function handleUndo() {
    undoFn?.();
    onDone();
  }

  return (
    <div className="toast-wrap">
      <div className={`toast${exiting ? ' exiting' : ''}`}>
        <svg className="toast-check" width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeWidth="1.2" />
          <path d="M3.5 6.5L5.5 8.5L9.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {msg}
        {undoFn && (
          <button className="toast-undo" onClick={handleUndo}>
            {t('toast.undo')}
          </button>
        )}
      </div>
    </div>
  );
}
