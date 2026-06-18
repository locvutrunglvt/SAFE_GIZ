import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Mountain,
  MapPin,
  CheckSquare,
  ShoppingCart,
  GraduationCap,
  Plus,
  FileText,
  BarChart3,
  Layers,
} from 'lucide-react';
import pb from '../lib/pocketbase';

interface Stats {
  farmers: number;
  farms: number;
  villages: number;
  communes: number;
  groups: number;
  trainings: number;
  detechFarmers: number;
  phucsinhFarmers: number;
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const lang = i18n.language;
  const province = localStorage.getItem('selectedProvince') || 'SL';
  const provinceName = province === 'SL' ? (lang === 'vi' ? 'Sơn La' : 'Son La') : 'Gia Lai';

  const [stats, setStats] = useState<Stats>({ farmers: 0, farms: 0, villages: 0, communes: 0, groups: 0, trainings: 0, detechFarmers: 0, phucsinhFarmers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const results = await Promise.allSettled([
          pb.collection('farmers').getList(1, 1, { filter: `code~"SAFEGIZ-${province}"` }),
          pb.collection('farms').getList(1, 1, { filter: `code~"SAFEGIZ-${province}"` }),
        ]);
        const getValue = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value.totalItems : 0;

        // Villages/communes/groups filtered by province_code
        let villages = 0, communes = 0, groups = 0, trainings = 0;
        const extra = await Promise.allSettled([
          pb.collection('villages').getList(1, 1, { filter: `province_code="${province}"` }),
          pb.collection('communes').getList(1, 1, { filter: `province_code="${province}"` }),
          pb.collection('farmer_groups').getList(1, 1, { filter: `province_code="${province}"` }),
          pb.collection('trainings').getList(1, 1),
        ]);
        villages = getValue(extra[0]);
        communes = getValue(extra[1]);
        groups = getValue(extra[2]);
        trainings = getValue(extra[3]);

        // Partner counts
        let detechFarmers = 0, phucsinhFarmers = 0;
        try {
          const partnerResults = await Promise.allSettled([
            pb.collection('farmers').getList(1, 1, { filter: `code~"SAFEGIZ-${province}" && (group_id.name~"Detech" || group_id.name~"CẦN BỔ SUNG")` }),
            pb.collection('farmers').getList(1, 1, { filter: `code~"SAFEGIZ-${province}" && (group_id.name~"Phúc Sinh" || group_id="")` }),
          ]);
          detechFarmers = getValue(partnerResults[0]);
          phucsinhFarmers = getValue(partnerResults[1]);
        } catch { /* fallback */ }

        setStats({
          farmers: getValue(results[0]),
          farms: getValue(results[1]),
          villages,
          communes,
          groups,
          trainings,
          detechFarmers,
          phucsinhFarmers,
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetchStats();
  }, [province]);

  const statCards = [
    {
      icon: <Users size={24} />,
      label: lang === 'vi' ? 'Tổng nông dân' : 'Total Farmers',
      value: stats.farmers,
      gradient: 'linear-gradient(135deg, #5D4037, #8D6E63)',
      link: '/farmers',
    },
    {
      icon: <Mountain size={24} />,
      label: lang === 'vi' ? 'Tổng nông trại' : 'Total Farms',
      value: stats.farms,
      gradient: 'linear-gradient(135deg, #4E342E, #795548)',
      link: '/farms',
    },
    {
      icon: <MapPin size={24} />,
      label: lang === 'vi' ? 'Thôn/Bản' : 'Villages',
      value: stats.villages,
      gradient: 'linear-gradient(135deg, #6D4C41, #A1887F)',
      link: '/geography',
    },
    {
      icon: <CheckSquare size={24} />,
      label: lang === 'vi' ? 'Xã' : 'Communes',
      value: stats.communes,
      gradient: 'linear-gradient(135deg, #3E2723, #6D4C41)',
      link: '/geography',
    },
    {
      icon: <Layers size={24} />,
      label: lang === 'vi' ? 'Nhóm nông dân' : 'Farmer Groups',
      value: stats.groups,
      gradient: 'linear-gradient(135deg, #BF360C, #E64A19)',
      link: '/farmers',
    },
    {
      icon: <GraduationCap size={24} />,
      label: lang === 'vi' ? 'Buổi đào tạo' : 'Training Sessions',
      value: stats.trainings,
      gradient: 'linear-gradient(135deg, #795548, #BCAAA4)',
      link: '/training',
    },
  ];

  const quickActions = [
    { icon: <Plus size={18} />, label: lang === 'vi' ? 'Thêm nông dân' : 'Add Farmer', link: '/farmers' },
    { icon: <Mountain size={18} />, label: lang === 'vi' ? 'Thêm nông trại' : 'Add Farm', link: '/farms' },
    { icon: <CheckSquare size={18} />, label: lang === 'vi' ? 'Đánh giá EUDR' : 'EUDR Assessment', link: '/eudr' },
    { icon: <ShoppingCart size={18} />, label: lang === 'vi' ? 'Giao dịch mới' : 'New Transaction', link: '/trade' },
    { icon: <GraduationCap size={18} />, label: lang === 'vi' ? 'Đào tạo mới' : 'New Training', link: '/training' },
    { icon: <BarChart3 size={18} />, label: lang === 'vi' ? 'Xem báo cáo' : 'View Reports', link: '/budget' },
  ];

  return (
    <div className="animate-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('dashboard.title')}</h1>
          <p className="page-subtitle">
            {t('dashboard.subtitle')} — 📍 {provinceName}
          </p>
        </div>
      </div>

      {/* Project Banner */}
      <div
        className="card"
        style={{
          marginBottom: 'var(--space-xl)',
          background: 'linear-gradient(135deg, rgba(93,64,55,0.06) 0%, rgba(141,110,99,0.06) 100%)',
          border: '1px solid var(--color-coffee)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #5D4037, #8D6E63)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: '24px' }}>🌿</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 'var(--font-size-md)', color: '#5D4037' }}>
              {t('app.fullName')}
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              {t('app.description')} — {t('app.organization')}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid — Icon LEFT, Data RIGHT */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-md)',
        marginBottom: 'var(--space-xl)',
      }}>
        {statCards.map((card, i) => (
          <div
            key={i}
            onClick={() => navigate(card.link)}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '20px 24px',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: '1px solid var(--color-coffee-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
            }}
            className="stat-card-hover"
          >
            {/* Icon LEFT */}
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: card.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              {card.icon}
            </div>
            {/* Data RIGHT */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: loading ? 16 : 28, fontWeight: 800, color: '#2C2C2C',
                letterSpacing: '-0.02em', lineHeight: 1.1,
              }}>
                {loading ? '...' : card.value.toLocaleString()}
              </div>
              <div style={{
                fontSize: 13, color: '#8D6E63', fontWeight: 500, marginTop: 4,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Partner Cards — CLICKABLE → lọc nông dân theo nhóm */}
      {province === 'SL' && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)',
          marginBottom: 'var(--space-xl)',
        }}>
          <div
            className="card stat-card-hover"
            onClick={() => navigate('/drill/detech')}
            style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #5D4037, #795548)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>DT</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#3E2723' }}>Detech Coffee</div>
              <div style={{ fontSize: 12, color: '#8D6E63' }}>{lang === 'vi' ? 'Đối tác thu mua — Sơn La' : 'Purchasing partner — Son La'}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#5D4037', marginTop: 4 }}>{stats.detechFarmers.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 500, color: '#8D6E63' }}>{lang === 'vi' ? 'nông hộ' : 'farmers'}</span></div>
            </div>
            <div style={{ color: '#8D6E63', fontSize: 20 }}>→</div>
          </div>
          <div
            className="card stat-card-hover"
            onClick={() => navigate('/drill/phucsinh')}
            style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #BF360C, #E64A19)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 800, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>PS</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#3E2723' }}>Phúc Sinh (K Coffee)</div>
              <div style={{ fontSize: 12, color: '#8D6E63' }}>{lang === 'vi' ? 'Đối tác thu mua — Sơn La' : 'Purchasing partner — Son La'}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#BF360C', marginTop: 4 }}>{stats.phucsinhFarmers.toLocaleString()} <span style={{ fontSize: 11, fontWeight: 500, color: '#8D6E63' }}>{lang === 'vi' ? 'nông hộ' : 'farmers'}</span></div>
            </div>
            <div style={{ color: '#8D6E63', fontSize: 20 }}>→</div>
          </div>
        </div>
      )}

      {/* Quick Actions — CLICKABLE */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-md)' }}>
          {lang === 'vi' ? 'Thao tác nhanh' : 'Quick Actions'}
        </h2>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-md)',
        }}>
          {quickActions.map((action, i) => (
            <div
              key={i}
              onClick={() => navigate(action.link)}
              style={{
                background: 'white', borderRadius: 14, padding: '20px 12px',
                textAlign: 'center', cursor: 'pointer',
                border: '1px solid var(--color-coffee-light)',
                transition: 'all 0.3s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              className="stat-card-hover"
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'linear-gradient(135deg, #F5F0EB, #EFEBE9)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px', color: '#5D4037',
              }}>
                {action.icon}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#5D4037' }}>{action.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid-2">
        <div className="card" onClick={() => navigate('/farmers')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <h3 className="card-title">
              <FileText size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
              {lang === 'vi' ? 'Hoạt động gần đây' : 'Recent Activities'}
            </h3>
          </div>
          <div className="card-body">
            <div style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              {lang === 'vi'
                ? `Đã import ${stats.farmers.toLocaleString()} nông hộ từ ${provinceName}`
                : `Imported ${stats.farmers.toLocaleString()} farmers from ${provinceName}`}
            </div>
          </div>
        </div>
        <div className="card" onClick={() => navigate('/eudr')} style={{ cursor: 'pointer' }}>
          <div className="card-header">
            <h3 className="card-title">
              <BarChart3 size={16} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} />
              EUDR Compliance
            </h3>
          </div>
          <div className="card-body">
            <div style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: 13 }}>
              {lang === 'vi' ? 'Nhấn để xem đánh giá EUDR' : 'Click to view EUDR assessments'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 'var(--space-2xl)', paddingTop: 'var(--space-md)',
        borderTop: '1px solid var(--color-coffee)', textAlign: 'center',
        fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)',
      }}>
        {t('app.copyright')}
      </div>
    </div>
  );
}
