import { useTranslation } from 'react-i18next';

interface Props {
  onClose: () => void;
}

const FEATURE_KEYS = ['pro.feature1', 'pro.feature2', 'pro.feature3', 'pro.feature4'] as const;

export default function ProModal({ onClose }: Props) {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-eyebrow">{t('pro.modalEyebrow')}</div>
        <div className="modal-title">{t('pro.modalTitle')}</div>
        <div className="modal-sub">
          {t('pro.modalSub', { snippets: 20, sections: 5 })}
        </div>
        <ul className="modal-features">
          {FEATURE_KEYS.map(key => (
            <li className="modal-feature" key={key}>
              <div className="feature-check">
                <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                  <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              {t(key)}
            </li>
          ))}
        </ul>
        <button className="modal-cta">{t('pro.upgradeBtn')}</button>
        <button className="modal-dismiss" onClick={onClose}>{t('pro.dismiss')}</button>
      </div>
    </div>
  );
}
