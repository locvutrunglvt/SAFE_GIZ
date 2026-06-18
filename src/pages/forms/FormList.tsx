import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, DataTable } from '../../components/ui';

export default function FormList() {
  const { t } = useTranslation();

  const columns = [
    { key: 'template', label: t('forms.template') },
    { key: 'question', label: t('forms.question') },
    { key: 'submission', label: t('forms.submission') },
    { key: 'status', label: t('common.status') },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('forms.title')}</h1>
          <p className="page-subtitle">{t('forms.subtitle')}</p>
        </div>
        <div className="page-actions">
          <Button icon={<Plus size={16} />}>{t('common.add')}</Button>
        </div>
      </div>
      <DataTable columns={columns} data={[]} />
    </div>
  );
}
