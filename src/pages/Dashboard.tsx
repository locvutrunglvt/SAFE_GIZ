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
      {/* ── Compact Header ── */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2C2C2C', margin: 0, lineHeight: 1.2 }}>
          {t('dashboard.title')}
        </h1>
        <p style={{ fontSize: 14, color: '#8D6E63', margin: '4px 0 0', fontWeight: 500 }}>
          📍 {provinceName} — {t('app.organization')}
        </p>
      </div>

      {/* ── Stats Grid — 2 cols on mobile, 3 on desktop ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        marginBottom: 20,
      }}>
        {statCards.map((card, i) => (
          <div
            key={i}
            onClick={() => navigate(card.link)}
            className="stat-card-hover"
            style={{
              background: 'white',
              borderRadius: 12,
              padding: '14px 16px',
              cursor: 'pointer',
              border: '1px solid #E8E0DB',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              transition: 'box-shadow 0.2s',
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: card.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', flexShrink: 0,
            }}>
              {card.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: loading ? 14 : 24, fontWeight: 800, color: '#2C2C2C',
                lineHeight: 1.1,
              }}>
                {loading ? '···' : card.value.toLocaleString()}
              </div>
              <div style={{
                fontSize: 12, color: '#8D6E63', fontWeight: 500, marginTop: 2,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Quick Actions — horizontal scroll strip ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#3E2723', marginBottom: 10 }}>
          {lang === 'vi' ? 'Thao tác nhanh' : 'Quick Actions'}
        </h2>
        <div style={{
          display: 'flex', gap: 10, overflowX: 'auto',
          paddingBottom: 4, WebkitOverflowScrolling: 'touch' as any,
        }}>
          {quickActions.map((action, i) => (
            <div
              key={i}
              onClick={() => navigate(action.link)}
              style={{
                flex: '0 0 auto',
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'white', borderRadius: 10,
                padding: '10px 14px',
                cursor: 'pointer',
                border: '1px solid #E8E0DB',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
                fontSize: 13, fontWeight: 600, color: '#5D4037',
              }}
              className="stat-card-hover"
            >
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: '#F5F0EB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#5D4037', flexShrink: 0,
              }}>
                {action.icon}
              </div>
              {action.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Partner Section — 1 column stack on mobile ── */}
      {province === 'SL' && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#3E2723', marginBottom: 10 }}>
            {lang === 'vi' ? 'Đối tác thu mua' : 'Purchasing Partners'}
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Detech */}
            <div
              className="stat-card-hover"
              onClick={() => navigate('/drill/detech')}
              style={{
                background: 'white', borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', border: '1px solid #E8E0DB',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #5D4037, #795548)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 15, fontWeight: 800, flexShrink: 0,
              }}>DT</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#3E2723' }}>Detech Coffee</div>
                <div style={{ fontSize: 12, color: '#8D6E63' }}>
                  {lang === 'vi' ? 'Đối tác thu mua — Sơn La' : 'Purchasing partner — Son La'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#5D4037', lineHeight: 1 }}>{stats.detechFarmers.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#8D6E63' }}>{lang === 'vi' ? 'nông hộ' : 'farmers'}</div>
              </div>
            </div>
            {/* Phuc Sinh */}
            <div
              className="stat-card-hover"
              onClick={() => navigate('/drill/phucsinh')}
              style={{
                background: 'white', borderRadius: 12, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', border: '1px solid #E8E0DB',
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #BF360C, #E64A19)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 15, fontWeight: 800, flexShrink: 0,
              }}>PS</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#3E2723' }}>Phúc Sinh (K Coffee)</div>
                <div style={{ fontSize: 12, color: '#8D6E63' }}>
                  {lang === 'vi' ? 'Đối tác thu mua — Sơn La' : 'Purchasing partner — Son La'}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#BF360C', lineHeight: 1 }}>{stats.phucsinhFarmers.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#8D6E63' }}>{lang === 'vi' ? 'nông hộ' : 'farmers'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <div
          onClick={() => navigate('/farmers')}
          style={{
            background: 'white', borderRadius: 12, padding: '14px 16px',
            cursor: 'pointer', border: '1px solid #E8E0DB',
          }}
          className="stat-card-hover"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <FileText size={16} color="#5D4037" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#3E2723' }}>
              {lang === 'vi' ? 'Hoạt động gần đây' : 'Recent Activity'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#8D6E63', lineHeight: 1.4 }}>
            {lang === 'vi'
              ? `Import ${stats.farmers.toLocaleString()} nông hộ`
              : `Imported ${stats.farmers.toLocaleString()} farmers`}
          </div>
        </div>
        <div
          onClick={() => navigate('/eudr')}
          style={{
            background: 'white', borderRadius: 12, padding: '14px 16px',
            cursor: 'pointer', border: '1px solid #E8E0DB',
          }}
          className="stat-card-hover"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <BarChart3 size={16} color="#5D4037" />
            <span style={{ fontWeight: 700, fontSize: 14, color: '#3E2723' }}>EUDR</span>
          </div>
          <div style={{ fontSize: 13, color: '#8D6E63', lineHeight: 1.4 }}>
            {lang === 'vi' ? 'Xem đánh giá EUDR' : 'View EUDR assessments'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        paddingTop: 12, borderTop: '1px solid #E8E0DB',
        textAlign: 'center', fontSize: 12, color: '#A1887F',
      }}>
        {t('app.copyright')}
      </div>
    </div>
  );
}
