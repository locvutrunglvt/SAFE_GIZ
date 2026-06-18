import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Users, Sprout, MapPin, Mountain, ArrowLeft, Home } from 'lucide-react';
import pb from '../../lib/pocketbase';

/* ── Types ── */
interface KPI { farmers: number; farms: number; area: number; }
interface ListItem { id: string; name: string; kpi: KPI; }

/* ── Levels: partner → commune → village → group → farmer ── */
type Level = 'commune' | 'village' | 'group' | 'farmer' | 'farm';

const LEVEL_LABELS_VI: Record<Level, string> = {
  commune: 'Xã', village: 'Thôn/Bản', group: 'Nhóm hộ', farmer: 'Nông dân', farm: 'Nông trại',
};
const LEVEL_LABELS_EN: Record<Level, string> = {
  commune: 'Commune', village: 'Village', group: 'Group', farmer: 'Farmer', farm: 'Farm',
};

/* ── Helper: count KPI for a filter ── */


export default function DrillDown() {
  const { partner } = useParams<{ partner: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const province = localStorage.getItem('selectedProvince') || 'SL';

  const partnerName = partner === 'detech' ? 'Detech Coffee' : 'Phúc Sinh (K Coffee)';
  const partnerColor = partner === 'detech' ? '#5D4037' : '#BF360C';

  // Current drill-down state from URL params
  const communeId = searchParams.get('commune') || '';
  const communeName = searchParams.get('communeName') || '';
  const villageId = searchParams.get('village') || '';
  const villageName = searchParams.get('villageName') || '';
  const groupId = searchParams.get('group') || '';
  const groupName = searchParams.get('groupName') || '';

  // Determine current level
  const currentLevel: Level = groupId ? 'farmer' : villageId ? 'group' : communeId ? 'village' : 'commune';

  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryKPI, setSummaryKPI] = useState<KPI>({ farmers: 0, farms: 0, area: 0 });

  // Build base filter for partner
  const getPartnerGroupFilter = useCallback(() => {
    if (partner === 'detech') {
      return `(group_id.name~"Detech" || group_id.name~"CẦN BỔ SUNG")`;
    }
    return `(group_id.name~"Phúc Sinh" || group_id.name="ĐẦY ĐỦ")`;
  }, [partner]);

  useEffect(() => {
    async function fetchLevel() {
      setLoading(true);
      const baseFilter = `code~"SAFEGIZ-${province}" && ${getPartnerGroupFilter()}`;

      try {
        if (currentLevel === 'commune') {
          // Show communes — get distinct communes via farmer data
          const communeMap = new Map<string, { id: string; name: string; count: number; area: number }>();
          let page = 1;
          while (true) {
            const result = await pb.collection('farmers').getList(page, 200, {
              filter: baseFilter,
              expand: 'village_id,village_id.commune_id',
              sort: 'code',
            });
            for (const f of result.items) {
              const commune = (f as any).expand?.village_id?.expand?.commune_id;
              if (commune) {
                const existing = communeMap.get(commune.id) || { id: commune.id, name: commune.name, count: 0, area: 0 };
                existing.count++;
                communeMap.set(commune.id, existing);
              }
            }
            if (page >= result.totalPages) break;
            page++;
          }

          // Get farm areas per commune
          const communeItems: ListItem[] = [];
          for (const [cId, cData] of communeMap) {
            communeItems.push({
              id: cId, name: cData.name,
              kpi: { farmers: cData.count, farms: cData.count, area: 0 },
            });
          }
          communeItems.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
          setItems(communeItems);

          // Summary
          const totalFarmers = communeItems.reduce((s, c) => s + c.kpi.farmers, 0);
          setSummaryKPI({ farmers: totalFarmers, farms: totalFarmers, area: 0 });

        } else if (currentLevel === 'village') {
          // Show villages in selected commune
          const villageMap = new Map<string, { id: string; name: string; count: number }>();
          let page = 1;
          const cFilter = `${baseFilter} && village_id.commune_id="${communeId}"`;
          while (true) {
            const result = await pb.collection('farmers').getList(page, 200, {
              filter: cFilter,
              expand: 'village_id',
              sort: 'code',
            });
            for (const f of result.items) {
              const village = (f as any).expand?.village_id;
              if (village) {
                const existing = villageMap.get(village.id) || { id: village.id, name: village.name, count: 0 };
                existing.count++;
                villageMap.set(village.id, existing);
              }
            }
            if (page >= result.totalPages) break;
            page++;
          }

          const villageItems: ListItem[] = [];
          for (const [vId, vData] of villageMap) {
            villageItems.push({
              id: vId, name: vData.name,
              kpi: { farmers: vData.count, farms: vData.count, area: 0 },
            });
          }
          villageItems.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
          setItems(villageItems);

          const totalFarmers = villageItems.reduce((s, v) => s + v.kpi.farmers, 0);
          setSummaryKPI({ farmers: totalFarmers, farms: totalFarmers, area: 0 });

        } else if (currentLevel === 'group') {
          // Show groups in selected village
          const groupMap = new Map<string, { id: string; name: string; count: number }>();
          const vFilter = `${baseFilter} && village_id="${villageId}"`;
          let page = 1;
          while (true) {
            const result = await pb.collection('farmers').getList(page, 200, {
              filter: vFilter,
              expand: 'group_id',
              sort: 'code',
            });
            for (const f of result.items) {
              const group = (f as any).expand?.group_id;
              if (group) {
                const existing = groupMap.get(group.id) || { id: group.id, name: group.name, count: 0 };
                existing.count++;
                groupMap.set(group.id, existing);
              }
            }
            if (page >= result.totalPages) break;
            page++;
          }

          const groupItems: ListItem[] = [];
          for (const [gId, gData] of groupMap) {
            groupItems.push({
              id: gId, name: gData.name,
              kpi: { farmers: gData.count, farms: gData.count, area: 0 },
            });
          }
          groupItems.sort((a, b) => b.kpi.farmers - a.kpi.farmers);
          setItems(groupItems);

          const totalFarmers = groupItems.reduce((s, g) => s + g.kpi.farmers, 0);
          setSummaryKPI({ farmers: totalFarmers, farms: totalFarmers, area: 0 });

        } else if (currentLevel === 'farmer') {
          // Show farmers in selected group + village
          const fFilter = `${baseFilter} && village_id="${villageId}" && group_id="${groupId}"`;
          const result = await pb.collection('farmers').getList(1, 200, {
            filter: fFilter,
            expand: 'group_id,village_id',
            sort: 'full_name',
          });

          const farmerItems: ListItem[] = result.items.map((f: any) => ({
            id: f.id,
            name: `${f.full_name} — ${f.code}`,
            kpi: { farmers: 1, farms: 1, area: 0 },
          }));
          setItems(farmerItems);
          setSummaryKPI({ farmers: result.totalItems, farms: result.totalItems, area: 0 });
        }
      } catch (e) {
        console.error('DrillDown fetch error:', e);
      }
      setLoading(false);
    }
    fetchLevel();
  }, [currentLevel, communeId, villageId, groupId, province, partner, getPartnerGroupFilter]);

  // Breadcrumb segments
  const breadcrumbs: { label: string; onClick?: () => void }[] = [
    { label: partnerName, onClick: () => setSearchParams({}) },
  ];
  if (communeId) {
    breadcrumbs.push({
      label: `${lang === 'vi' ? 'Xã' : 'Commune'}: ${communeName}`,
      onClick: () => setSearchParams({ commune: communeId, communeName }),
    });
  }
  if (villageId) {
    breadcrumbs.push({
      label: `${lang === 'vi' ? 'Thôn' : 'Village'}: ${villageName}`,
      onClick: () => setSearchParams({ commune: communeId, communeName, village: villageId, villageName }),
    });
  }
  if (groupId) {
    breadcrumbs.push({ label: `${lang === 'vi' ? 'Nhóm' : 'Group'}: ${groupName}` });
  }

  // Handle item click
  const handleItemClick = (item: ListItem) => {
    if (currentLevel === 'commune') {
      setSearchParams({ commune: item.id, communeName: item.name });
    } else if (currentLevel === 'village') {
      setSearchParams({ commune: communeId, communeName, village: item.id, villageName: item.name });
    } else if (currentLevel === 'group') {
      setSearchParams({ commune: communeId, communeName, village: villageId, villageName, group: item.id, groupName: item.name });
    } else if (currentLevel === 'farmer') {
      navigate(`/farmers/${item.id}`);
    }
  };

  // Go back one level
  const handleBack = () => {
    if (groupId) {
      setSearchParams({ commune: communeId, communeName, village: villageId, villageName });
    } else if (villageId) {
      setSearchParams({ commune: communeId, communeName });
    } else if (communeId) {
      setSearchParams({});
    } else {
      navigate('/dashboard');
    }
  };

  const levelLabel = lang === 'vi' ? LEVEL_LABELS_VI[currentLevel] : LEVEL_LABELS_EN[currentLevel];

  return (
    <div className="animate-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 'var(--space-md)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <button onClick={handleBack} style={{
              background: 'none', border: '1px solid #D7CCC8', borderRadius: 8, padding: '6px 10px',
              cursor: 'pointer', color: '#5D4037', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <ArrowLeft size={16} /> {lang === 'vi' ? 'Quay lại' : 'Back'}
            </button>
            <button onClick={() => navigate('/dashboard')} style={{
              background: 'none', border: '1px solid #D7CCC8', borderRadius: 8, padding: '6px 10px',
              cursor: 'pointer', color: '#8D6E63', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Home size={16} />
            </button>
          </div>
          <h1 className="page-title" style={{ color: partnerColor }}>
            {partnerName}
          </h1>
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
        padding: '10px 16px', background: '#F5F0EB', borderRadius: 10, marginBottom: 'var(--space-md)',
        fontSize: 13, color: '#5D4037',
      }}>
        {breadcrumbs.map((bc, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && <ChevronRight size={14} style={{ color: '#A1887F' }} />}
            <span
              onClick={bc.onClick}
              style={{
                cursor: bc.onClick && i < breadcrumbs.length - 1 ? 'pointer' : 'default',
                fontWeight: i === breadcrumbs.length - 1 ? 700 : 400,
                color: i === breadcrumbs.length - 1 ? partnerColor : '#8D6E63',
                textDecoration: bc.onClick && i < breadcrumbs.length - 1 ? 'underline' : 'none',
              }}
            >{bc.label}</span>
          </span>
        ))}
      </div>

      {/* Summary KPIs */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-sm)',
        marginBottom: 'var(--space-md)',
      }}>
        <div className="card" style={{ padding: '14px 18px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
            <Users size={18} style={{ color: partnerColor }} />
            <span style={{ fontSize: 22, fontWeight: 800, color: partnerColor }}>{summaryKPI.farmers.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 11, color: '#8D6E63' }}>{lang === 'vi' ? 'Nông dân' : 'Farmers'}</div>
        </div>
        <div className="card" style={{ padding: '14px 18px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
            <Sprout size={18} style={{ color: '#2E7D32' }} />
            <span style={{ fontSize: 22, fontWeight: 800, color: '#2E7D32' }}>{summaryKPI.farms.toLocaleString()}</span>
          </div>
          <div style={{ fontSize: 11, color: '#8D6E63' }}>{lang === 'vi' ? 'Nông trại' : 'Farms'}</div>
        </div>
        <div className="card" style={{ padding: '14px 18px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
            <MapPin size={18} style={{ color: '#E64A19' }} />
            <span style={{ fontSize: 22, fontWeight: 800, color: '#E64A19' }}>{items.length}</span>
          </div>
          <div style={{ fontSize: 11, color: '#8D6E63' }}>{levelLabel}</div>
        </div>
      </div>

      {/* Level Label */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#5D4037', marginBottom: 8 }}>
        {lang === 'vi' ? `Danh sách ${levelLabel}` : `${levelLabel} List`} ({items.length})
      </div>

      {/* Items List */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#8D6E63' }}>
            {lang === 'vi' ? 'Đang tải...' : 'Loading...'}
          </div>
        ) : items.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#A1887F' }}>
            {lang === 'vi' ? 'Không có dữ liệu' : 'No data'}
          </div>
        ) : (
          <div>
            {items.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 18px', cursor: 'pointer',
                  borderBottom: idx < items.length - 1 ? '1px solid #EFEBE9' : 'none',
                  background: idx % 2 === 0 ? 'white' : '#FAFAF8',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F5F0EB')}
                onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? 'white' : '#FAFAF8')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `linear-gradient(135deg, ${partnerColor}22, ${partnerColor}11)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: partnerColor, fontWeight: 700, fontSize: 13, flexShrink: 0,
                  }}>
                    {currentLevel === 'commune' && <MapPin size={16} />}
                    {currentLevel === 'village' && <Mountain size={16} />}
                    {currentLevel === 'group' && <Users size={16} />}
                    {currentLevel === 'farmer' && <span>{idx + 1}</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#3E2723' }}>{item.name}</div>
                    {currentLevel !== 'farmer' && (
                      <div style={{ fontSize: 12, color: '#8D6E63', marginTop: 2 }}>
                        {item.kpi.farmers} {lang === 'vi' ? 'nông dân' : 'farmers'}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: '#A1887F', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
