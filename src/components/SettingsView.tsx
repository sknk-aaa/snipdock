import { useTranslation } from 'react-i18next';
import type { AppSettings, AccentColor, AppLanguage } from '../types';
import Toggle from './Toggle';

const ACCENT_COLORS: { key: AccentColor; hex: string }[] = [
  { key: 'blue',   hex: '#4c8eff' },
  { key: 'purple', hex: '#9c6fff' },
  { key: 'green',  hex: '#3cbf74' },
  { key: 'amber',  hex: '#e8a030' },
];

interface Props {
  settings: AppSettings;
  isPro: boolean;
  onUpdate: (patch: Partial<AppSettings>) => void;
  onProModal: () => void;
}

export default function SettingsView({ settings, isPro, onUpdate, onProModal }: Props) {
  const { t } = useTranslation();

  const hotkeyParts = settings.hotkey.split('+');

  return (
    <div className="settings-view">
      <div className="settings-section">
        <div className="settings-section-label">{t('settings.general')}</div>

        <div className="setting-row">
          <div className="setting-label">
            {t('settings.hotkey')}
            <span className="setting-sub">{t('settings.hotkeyDesc')}</span>
          </div>
          <div className="kbd-combo">
            {hotkeyParts.map((k, i) => <kbd key={i}>{k}</kbd>)}
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-label">{t('settings.startup')}</div>
          <Toggle on={settings.autoStart} onChange={v => onUpdate({ autoStart: v })} />
        </div>

        <div className="setting-row">
          <div className="setting-label">
            {t('settings.closeAfterCopy')}
            <span className="setting-sub">{t('settings.closeAfterCopyDesc')}</span>
          </div>
          <Toggle on={settings.closeAfterCopy} onChange={v => onUpdate({ closeAfterCopy: v })} />
        </div>
      </div>

      <div className="settings-sep" />

      <div className="settings-section">
        <div className="settings-section-label">{t('settings.appearance')}</div>

        <div className="setting-row">
          <div className="setting-label">{t('settings.accentColor')}</div>
          <div className="swatch-row">
            {ACCENT_COLORS.map(({ key, hex }) => (
              <div
                key={key}
                className={`swatch${settings.accentColor === key ? ' active' : ''}`}
                style={{ background: hex }}
                onClick={() => onUpdate({ accentColor: key })}
                title={key}
              />
            ))}
          </div>
        </div>

        <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="setting-label">{t('settings.bgOpacity')}</span>
            <span className="setting-value">{settings.bgOpacity}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            value={settings.bgOpacity}
            onChange={e => onUpdate({ bgOpacity: Number(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
          />
        </div>
      </div>

      <div className="settings-sep" />

      <div className="settings-section">
        <div className="settings-section-label">{t('settings.language')}</div>
        <div className="setting-row">
          <div className="lang-pill-row">
            {(['ja', 'en'] as AppLanguage[]).map(lang => (
              <button
                key={lang}
                className={`lang-pill${settings.language === lang ? ' active' : ''}`}
                onClick={() => onUpdate({ language: lang })}
              >
                {lang === 'ja' ? t('settings.japanese') : t('settings.english')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-sep" />

      <div className="settings-section">
        <div className="settings-section-label">{t('settings.data')}</div>

        <div className={`setting-row${!isPro ? ' disabled' : ''}`}>
          <div className="setting-label">
            {t('settings.export')}
            <span className="setting-sub">{t('settings.exportDesc')}</span>
          </div>
          {!isPro && <span className="pro-badge">PRO</span>}
        </div>

        <div className={`setting-row${!isPro ? ' disabled' : ''}`}>
          <div className="setting-label">
            {t('settings.import')}
            <span className="setting-sub">{t('settings.importDesc')}</span>
          </div>
          {!isPro && <span className="pro-badge">PRO</span>}
        </div>
      </div>

      <div className="settings-sep" />

      <div className="settings-section" style={{ padding: '6px 0 0' }}>
        {!isPro && (
          <div className="pro-upgrade-row" onClick={onProModal}>
            <div className="pro-badge">{t('pro.badge')}</div>
            <div>
              <div className="pro-upgrade-text">{t('pro.upgrade')}</div>
              <div className="pro-upgrade-sub">{t('pro.upgradeDesc')}</div>
            </div>
            <span className="pro-arrow">›</span>
          </div>
        )}
      </div>

      <div className="settings-sep" />

      <div className="settings-section">
        <div className="settings-section-label">{t('settings.about')}</div>
        <div className="about-row">
          <span className="about-label">{t('settings.version')}</span>
          <span className="about-value">0.1.0</span>
        </div>
        <div className="about-row">
          <span className="about-label">{t('pro.free')}</span>
          <span className="about-value">{isPro ? t('pro.active') : t('pro.free')}</span>
        </div>
      </div>
    </div>
  );
}
