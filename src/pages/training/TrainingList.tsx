import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, DataTable } from '../../components/ui';

export default function TrainingList() {
  const { t } = useTranslation();

  const columns = [
    { key: 'session', label: t('training.session') },
    { key: 'topic', label: t('training.topic') },
    { key: 'date', label: t('training.date') },
    { key: 'participant', label: t('training.participant') },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('training.title')}</h1>
          <p className="page-subtitle">{t('training.subtitle')}</p>
        </div>
        <div className="page-actions">
          <Button icon={<Plus size={16} />}>{t('common.add')}</Button>
        </div>
      </div>
      <DataTable columns={columns} data={[]} />
    </div>
  );
}
