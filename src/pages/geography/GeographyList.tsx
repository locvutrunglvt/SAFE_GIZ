import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, DataTable, Badge } from '../../components/ui';
import pb from '../../lib/pocketbase';

interface ProvinceRecord {
  id: string;
  name: string;
  code: string;
}
interface CommuneRecord {
  id: string;
  name: string;
  code: string;
  expand?: {
    province_id?: { name: string };
  };
}
interface VillageRecord {
  id: string;
  name: string;
  code: string;
  expand?: {
    commune_id?: { name: string };
  };
}

type GeoTab = 'provinces' | 'communes' | 'villages';

export default function GeographyList() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const province = localStorage.getItem('selectedProvince') || 'SL';
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<GeoTab>('communes');

  const [provinces, setProvinces] = useState<ProvinceRecord[]>([]);
  const [communes, setCommunes] = useState<CommuneRecord[]>([]);
  const [villages, setVillages] = useState<VillageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (activeTab === 'provinces') {
          const result = await pb.collection('provinces').getList(page, 20, { sort: 'name' });
          setProvinces(result.items as unknown as ProvinceRecord[]);
          setTotalItems(result.totalItems);
          setTotalPages(result.totalPages);
        } else if (activeTab === 'communes') {
          const result = await pb.collection('communes').getList(page, 20, {
            sort: 'name',
            expand: 'province_id',
            filter: `province_code="${province}"`,
          });
          setCommunes(result.items as unknown as CommuneRecord[]);
          setTotalItems(result.totalItems);
          setTotalPages(result.totalPages);
        } else {
          const result = await pb.collection('villages').getList(page, 20, {
            sort: 'name',
            expand: 'commune_id',
            filter: `province_code="${province}"`,
          });
          setVillages(result.items as unknown as VillageRecord[]);
          setTotalItems(result.totalItems);
          setTotalPages(result.totalPages);
        }
      } catch (e) {
        console.error('Failed to fetch geography data:', e);
      }
      setLoading(false);
    }
    fetchData();
  }, [activeTab, page, province]);

  const tabs: { key: GeoTab; label: string }[] = [
    { key: 'provinces', label: t('geography.province') },
    { key: 'communes', label: t('geography.commune') },
    { key: 'villages', label: t('geography.village') },
  ];

  const getColumns = () => {
    if (activeTab === 'provinces') {
      return [
        { key: 'code', label: lang === 'vi' ? 'Mã' : 'Code' },
        { key: 'name', label: lang === 'vi' ? 'Tên tỉnh' : 'Province Name' },
      ];
    }
    if (activeTab === 'communes') {
      return [
        { key: 'code', label: lang === 'vi' ? 'Mã' : 'Code' },
        { key: 'name', label: lang === 'vi' ? 'Tên xã' : 'Commune Name' },
        { key: 'province', label: t('geography.province') },
      ];
    }
    return [
      { key: 'code', label: lang === 'vi' ? 'Mã' : 'Code' },
      { key: 'name', label: lang === 'vi' ? 'Tên thôn' : 'Village Name' },
      { key: 'commune', label: t('geography.commune') },
    ];
  };

  const getData = (): Record<string, unknown>[] => {
    if (activeTab === 'provinces') {
      return provinces.map((p) => ({ code: p.code || '-', name: p.name }));
    }
    if (activeTab === 'communes') {
      return communes.map((c) => ({
        code: c.code || '-',
        name: c.name,
        province: c.expand?.province_id?.name || '-',
        _onClick: () => navigate(`/farmers?commune=${c.id}&communeName=${c.name}`),
      }));
    }
    return villages.map((v) => ({
      code: v.code || '-',
      name: v.name,
      commune: v.expand?.commune_id?.name || '-',
      _onClick: () => navigate(`/farmers?village=${v.id}&villageName=${v.name}`),
    }));
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('geography.title')}</h1>
          <p className="page-subtitle">
            {t('geography.subtitle')}
            {!loading && (
              <span style={{ marginLeft: 8 }}>
                — <Badge variant="info">{totalItems} {t('common.records')}</Badge>
              </span>
            )}
          </p>
        </div>
        <div className="page-actions">
          <Button icon={<Plus size={16} />}>{t('common.add')}</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {t('common.loading')}
        </div>
      ) : (
        <>
          <DataTable columns={getColumns()} data={getData()} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 'var(--space-md)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <span>
              {t('common.page')} {page} / {totalPages} ({totalItems.toLocaleString()} {t('common.records')})
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t('common.previous')}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
