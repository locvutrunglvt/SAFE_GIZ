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
      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #3E2723 0%, #5D4037 40%, #8D6E63 100%)',
        borderRadius: 16, padding: '28px 32px', marginBottom: 24,
        color: 'white', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 80, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>{t('dashboard.title')}</h1>
          <p style={{ fontSize: 14, opacity: 0.8, margin: '6px 0 0' }}>📍 {provinceName} — {t('app.organization')}</p>
        </div>
      </div>

      {/* ── Stats Grid — 3 cols desktop, 2 cols mobile ── */}
      <div className="dashboard-stats-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24,
      }}>
        {statCards.map((card, i) => (
          <div key={i} onClick={() => navigate(card.link)} className="stat-card-hover" style={{
            background: 'white', borderRadius: 14, padding: '20px 22px', cursor: 'pointer',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
            display: 'flex', alignItems: 'center', gap: 16, transition: 'all 0.25s',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: card.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            }}>{card.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: loading ? 16 : 30, fontWeight: 800, color: '#1A1A1A', letterSpacing: '-0.02em', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
                {loading ? '···' : card.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, color: '#8D6E63', fontWeight: 500, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2C2C2C', marginBottom: 12 }}>
          {lang === 'vi' ? 'Thao tác nhanh' : 'Quick Actions'}
        </h2>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {quickActions.map((action, i) => (
            <div key={i} onClick={() => navigate(action.link)} className="stat-card-hover" style={{
              flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10,
              background: 'white', borderRadius: 12, padding: '12px 18px', cursor: 'pointer',
              border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              whiteSpace: 'nowrap', transition: 'all 0.2s', fontSize: 14, fontWeight: 600, color: '#3E2723',
            }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #F5F0EB, #EFEBE9)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5D4037', flexShrink: 0 }}>
                {action.icon}
              </div>
              {action.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Partners + Info — 2 column ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {province === 'SL' ? (
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2C2C2C', marginBottom: 12 }}>
              {lang === 'vi' ? 'Đối tác thu mua' : 'Partners'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { code: 'DT', name: 'Detech Coffee', count: stats.detechFarmers, color: '#5D4037', grad: 'linear-gradient(135deg, #5D4037, #795548)', link: '/drill/detech' },
                { code: 'PS', name: 'Phúc Sinh (K Coffee)', count: stats.phucsinhFarmers, color: '#BF360C', grad: 'linear-gradient(135deg, #BF360C, #E64A19)', link: '/drill/phucsinh' },
              ].map(p => (
                <div key={p.code} className="stat-card-hover" onClick={() => navigate(p.link)} style={{
                  background: 'white', borderRadius: 14, padding: '18px 22px',
                  display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer',
                  border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: p.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16, fontWeight: 800, flexShrink: 0, boxShadow: `0 4px 12px ${p.color}40` }}>{p.code}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#2C2C2C' }}>{p.name}</div>
                    <div style={{ fontSize: 13, color: '#8D6E63' }}>{lang === 'vi' ? 'Đối tác thu mua' : 'Purchasing partner'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: p.color, lineHeight: 1 }}>{p.count.toLocaleString()}</div>
                    <div style={{ fontSize: 12, color: '#8D6E63' }}>{lang === 'vi' ? 'nông hộ' : 'farmers'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : <div />}
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#2C2C2C', marginBottom: 12 }}>
            {lang === 'vi' ? 'Tổng quan' : 'Overview'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div onClick={() => navigate('/farmers')} className="stat-card-hover" style={{ background: 'white', borderRadius: 14, padding: '18px 22px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <FileText size={18} color="#5D4037" />
                <span style={{ fontWeight: 700, fontSize: 15, color: '#2C2C2C' }}>{lang === 'vi' ? 'Hoạt động gần đây' : 'Recent Activity'}</span>
              </div>
              <div style={{ fontSize: 14, color: '#8D6E63' }}>
                {lang === 'vi' ? `Import ${stats.farmers.toLocaleString()} nông hộ từ ${provinceName}` : `Imported ${stats.farmers.toLocaleString()} farmers from ${provinceName}`}
              </div>
            </div>
            <div onClick={() => navigate('/eudr')} className="stat-card-hover" style={{ background: 'white', borderRadius: 14, padding: '18px 22px', cursor: 'pointer', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <BarChart3 size={18} color="#5D4037" />
                <span style={{ fontWeight: 700, fontSize: 15, color: '#2C2C2C' }}>EUDR Compliance</span>
              </div>
              <div style={{ fontSize: 14, color: '#8D6E63' }}>{lang === 'vi' ? 'Xem đánh giá tuân thủ EUDR' : 'View EUDR compliance'}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center', fontSize: 12, color: '#A1887F' }}>
        {t('app.copyright')}
      </div>
    </div>
  );
}
