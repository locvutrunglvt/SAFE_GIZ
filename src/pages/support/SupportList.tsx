import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, DataTable } from '../../components/ui';

export default function SupportList() {
  const { t } = useTranslation();

  const columns = [
    { key: 'category', label: t('support.category') },
    { key: 'item', label: t('support.item') },
    { key: 'distribution', label: t('support.distribution') },
    { key: 'investment', label: t('support.investment') },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('support.title')}</h1>
          <p className="page-subtitle">{t('support.subtitle')}</p>
        </div>
        <div className="page-actions">
          <Button icon={<Plus size={16} />}>{t('common.add')}</Button>
        </div>
      </div>
      <DataTable columns={columns} data={[]} />
    </div>
  );
}
