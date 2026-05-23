import { useTranslation } from 'react-i18next';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ message, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={e => e.stopPropagation()}>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-cancel" onClick={onCancel}>{t('confirm.cancel')}</button>
          <button className="confirm-delete" onClick={onConfirm}>{t('confirm.delete')}</button>
        </div>
      </div>
    </div>
  );
}
