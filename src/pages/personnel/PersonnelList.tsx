import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, DataTable } from '../../components/ui';

export default function PersonnelList() {
  const { t } = useTranslation();

  const columns = [
    { key: 'staff', label: t('personnel.staff') },
    { key: 'type', label: t('personnel.type') },
    { key: 'position', label: t('personnel.position') },
    { key: 'status', label: t('common.status') },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('personnel.title')}</h1>
          <p className="page-subtitle">{t('personnel.subtitle')}</p>
        </div>
        <div className="page-actions">
          <Button icon={<Plus size={16} />}>{t('common.add')}</Button>
        </div>
      </div>
      <DataTable columns={columns} data={[]} />
    </div>
  );
}
