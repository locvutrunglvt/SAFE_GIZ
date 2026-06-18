import { useTranslation } from 'react-i18next';
import { DataTable } from '../../components/ui';

export default function SocialList() {
  const { t } = useTranslation();

  const columns = [
    { key: 'farmer', label: t('farmers.name') },
    { key: 'data', label: t('social.title') },
    { key: 'status', label: t('common.status') },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('social.title')}</h1>
          <p className="page-subtitle">{t('social.subtitle')}</p>
        </div>
      </div>
      <DataTable columns={columns} data={[]} />
    </div>
  );
}
