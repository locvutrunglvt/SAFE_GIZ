import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button, DataTable } from '../../components/ui';

export default function TradeList() {
  const { t } = useTranslation();

  const columns = [
    { key: 'buyer', label: t('trade.buyer') },
    { key: 'product', label: t('trade.product') },
    { key: 'quantity', label: t('trade.quantity') },
    { key: 'price', label: t('trade.price') },
    { key: 'quality', label: t('trade.quality') },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('trade.title')}</h1>
          <p className="page-subtitle">{t('trade.subtitle')}</p>
        </div>
        <div className="page-actions">
          <Button icon={<Plus size={16} />}>{t('common.add')}</Button>
        </div>
      </div>
      <DataTable columns={columns} data={[]} />
    </div>
  );
}
