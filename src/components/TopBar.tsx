import { useTranslation } from 'react-i18next';

interface Props {
  view: 'main' | 'settings';
  onAddSection: () => void;
  onToggleSettings: () => void;
}

export default function TopBar({ view, onAddSection, onToggleSettings }: Props) {
  const { t } = useTranslation();
  const isSettings = view === 'settings';

  return (
    <div className="top-bar">
      {isSettings ? (
        <button className="bar-btn" onClick={onToggleSettings}>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M7 1.5L3 5.5L7 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {t('topbar.back')}
        </button>
      ) : (
        <>
          <button className="bar-btn" onClick={onAddSection}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1V10M1 5.5H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {t('topbar.addSection')}
          </button>
        </>
      )}
      <div className="bar-spacer" />
      <button
        className={`settings-bar-btn${isSettings ? ' active' : ''}`}
        onClick={onToggleSettings}
      >
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
          <circle cx="6.5" cy="6.5" r="2.1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M6.5 1.2V2.8M6.5 10.2V11.8M1.2 6.5H2.8M10.2 6.5H11.8M2.6 2.6L3.7 3.7M9.3 9.3L10.4 10.4M2.6 10.4L3.7 9.3M9.3 3.7L10.4 2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {t('topbar.settings')}
      </button>
    </div>
  );
}
