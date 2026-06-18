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
  ArrowRight,
  TrendingUp,
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

        let detechFarmers = 0, phucsinhFarmers = 0;
        try {
          const partnerResults = await Promise.allSettled([
            pb.collection('farmers').getList(1, 1, { filter: `code~"SAFEGIZ-${province}" && (group_id.name~"Detech" || group_id.name~"CẦN BỔ SUNG")` }),
            pb.collection('farmers').getList(1, 1, { filter: `code~"SAFEGIZ-${province}" && (group_id.name~"Phúc Sinh" || group_id="")` }),
          ]);
          detechFarmers = getValue(partnerResults[0]);
          phucsinhFarmers = getValue(partnerResults[1]);
        } catch { /* fallback */ }

        setStats({ farmers: getValue(results[0]), farms: getValue(results[1]), villages, communes, groups, trainings, detechFarmers, phucsinhFarmers });
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetchStats();
  }, [province]);

  /* ── Premium Stat Cards with gradients ── */
  const mainStats = [
    {
      icon: <Users size={22} />, label: lang === 'vi' ? 'Nông dân' : 'Farmers',
      value: stats.farmers, bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      shadow: 'rgba(102,126,234,0.4)', link: '/farmers',
    },
    {
      icon: <Mountain size={22} />, label: lang === 'vi' ? 'Nông trại' : 'Farms',
      value: stats.farms, bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      shadow: 'rgba(245,87,108,0.4)', link: '/farms',
    },
    {
      icon: <MapPin size={22} />, label: lang === 'vi' ? 'Thôn/Bản' : 'Villages',
      value: stats.villages, bg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      shadow: 'rgba(79,172,254,0.4)', link: '/geography',
    },
    {
      icon: <CheckSquare size={22} />, label: lang === 'vi' ? 'Xã' : 'Communes',
      value: stats.communes, bg: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      shadow: 'rgba(67,233,123,0.4)', link: '/geography',
    },
  ];

  const secondaryStats = [
    {
      icon: <Layers size={18} />, label: lang === 'vi' ? 'Nhóm nông dân' : 'Groups',
      value: stats.groups, color: '#BF360C', link: '/farmers',
    },
    {
      icon: <GraduationCap size={18} />, label: lang === 'vi' ? 'Đào tạo' : 'Training',
      value: stats.trainings, color: '#5D4037', link: '/training',
    },
  ];

  const quickActions = [
    { icon: <Plus size={16} />, label: lang === 'vi' ? 'Thêm nông dân' : 'Add Farmer', link: '/farmers', accent: '#667eea' },
    { icon: <Mountain size={16} />, label: lang === 'vi' ? 'Thêm nông trại' : 'Add Farm', link: '/farms', accent: '#f5576c' },
    { icon: <CheckSquare size={16} />, label: lang === 'vi' ? 'Đánh giá EUDR' : 'EUDR', link: '/eudr', accent: '#43e97b' },
    { icon: <ShoppingCart size={16} />, label: lang === 'vi' ? 'Giao dịch' : 'Trade', link: '/trade', accent: '#4facfe' },
    { icon: <GraduationCap size={16} />, label: lang === 'vi' ? 'Đào tạo' : 'Training', link: '/training', accent: '#f093fb' },
    { icon: <BarChart3 size={16} />, label: lang === 'vi' ? 'Báo cáo' : 'Reports', link: '/budget', accent: '#fa709a' },
  ];

  return (
    <div className="animate-in" style={{ maxWidth: 1200, margin: '0 auto' }}>

      {/* ══════════ HERO BANNER ══════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #533483 100%)',
        borderRadius: 20, padding: '32px 36px', marginBottom: 28,
        color: 'white', position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
      }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', top: -60, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(102,126,234,0.15)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 120, width: 140, height: 140, borderRadius: '50%', background: 'rgba(245,87,108,0.1)' }} />
        <div style={{ position: 'absolute', top: 20, right: 200, width: 80, height: 80, borderRadius: '50%', background: 'rgba(79,172,254,0.08)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.6, marginBottom: 8 }}>
              SAFE — GIZ VIETNAM
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
              {t('dashboard.title')}
            </h1>
            <p style={{ fontSize: 14, opacity: 0.7, margin: '8px 0 0', maxWidth: 400 }}>
              📍 {provinceName} — {lang === 'vi' ? 'Nông nghiệp bền vững vì hệ sinh thái rừng' : 'Sustainable Agriculture for Forest Ecosystems'}
            </p>
          </div>
          <div style={{
            display: 'flex', gap: 20, background: 'rgba(255,255,255,0.08)',
            borderRadius: 14, padding: '14px 22px', backdropFilter: 'blur(10px)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{loading ? '—' : stats.farmers.toLocaleString()}</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{lang === 'vi' ? 'Nông dân' : 'Farmers'}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{loading ? '—' : stats.farms.toLocaleString()}</div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{lang === 'vi' ? 'Nông trại' : 'Farms'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ MAIN STATS — colored gradient cards ══════════ */}
      <div className="dashboard-stats-grid" style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20,
      }}>
        {mainStats.map((s, i) => (
          <div key={i} onClick={() => navigate(s.link)} style={{
            background: s.bg, borderRadius: 16, padding: '22px 24px', cursor: 'pointer',
            color: 'white', position: 'relative', overflow: 'hidden',
            boxShadow: `0 6px 20px ${s.shadow}`, transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 10px 30px ${s.shadow}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 20px ${s.shadow}`; }}
          >
            <div style={{ position: 'absolute', top: -15, right: -15, width: 70, height: 70, borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {s.icon}
              </div>
              <TrendingUp size={14} style={{ opacity: 0.5, marginLeft: 'auto' }} />
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {loading ? '···' : s.value.toLocaleString()}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Secondary stats — inline */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {secondaryStats.map((s, i) => (
          <div key={i} onClick={() => navigate(s.link)} style={{
            flex: 1, background: 'white', borderRadius: 12, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer',
            border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#1A1A1A' }}>{loading ? '···' : s.value}</div>
              <div style={{ fontSize: 12, color: '#8D6E63', fontWeight: 500 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ══════════ QUICK ACTIONS ══════════ */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1A1A1A', marginBottom: 12 }}>
          {lang === 'vi' ? '⚡ Thao tác nhanh' : '⚡ Quick Actions'}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
          {quickActions.map((a, i) => (
            <div key={i} onClick={() => navigate(a.link)} style={{
              background: 'white', borderRadius: 12, padding: '14px 12px',
              textAlign: 'center', cursor: 'pointer',
              border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.accent; e.currentTarget.style.boxShadow = `0 4px 14px ${a.accent}25`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: `${a.accent}12`, color: a.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px',
              }}>{a.icon}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#3E2723' }}>{a.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════ PARTNERS + OVERVIEW ══════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        {/* Partners */}
        {province === 'SL' ? (
          <div style={{ background: 'white', borderRadius: 16, padding: '22px 24px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1A1A1A', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={16} color="#5D4037" />
              {lang === 'vi' ? 'Đối tác thu mua' : 'Partners'}
            </h3>
            {[
              { code: 'DT', name: 'Detech Coffee', count: stats.detechFarmers, bg: 'linear-gradient(135deg, #667eea, #764ba2)', link: '/drill/detech' },
              { code: 'PS', name: 'Phúc Sinh (K Coffee)', count: stats.phucsinhFarmers, bg: 'linear-gradient(135deg, #f5576c, #ff6b6b)', link: '/drill/phucsinh' },
            ].map(p => (
              <div key={p.code} onClick={() => navigate(p.link)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0',
                borderBottom: '1px solid rgba(0,0,0,0.04)', cursor: 'pointer',
              }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{p.code}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1A1A1A' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#8D6E63' }}>{lang === 'vi' ? 'Đối tác thu mua' : 'Partner'}</div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#1A1A1A' }}>{p.count.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: '#8D6E63' }}>{lang === 'vi' ? 'nông hộ' : 'farmers'}</div>
                  </div>
                  <ArrowRight size={14} color="#A1887F" />
                </div>
              </div>
            ))}
          </div>
        ) : <div />}

        {/* Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div onClick={() => navigate('/farmers')} style={{
            flex: 1, background: 'linear-gradient(135deg, #667eea08, #764ba212)',
            borderRadius: 16, padding: '22px 24px', cursor: 'pointer',
            border: '1px solid rgba(102,126,234,0.15)', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(102,126,234,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#667eea18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={16} color="#667eea" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A' }}>
                {lang === 'vi' ? 'Hoạt động gần đây' : 'Recent Activity'}
              </span>
            </div>
            <div style={{ fontSize: 14, color: '#5D4037', lineHeight: 1.5 }}>
              {lang === 'vi' ? `Import ${stats.farmers.toLocaleString()} nông hộ từ ${provinceName}` : `Imported ${stats.farmers.toLocaleString()} farmers from ${provinceName}`}
            </div>
          </div>
          <div onClick={() => navigate('/eudr')} style={{
            flex: 1, background: 'linear-gradient(135deg, #43e97b08, #38f9d712)',
            borderRadius: 16, padding: '22px 24px', cursor: 'pointer',
            border: '1px solid rgba(67,233,123,0.15)', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(67,233,123,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#43e97b18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BarChart3 size={16} color="#2E7D32" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A' }}>EUDR Compliance</span>
            </div>
            <div style={{ fontSize: 14, color: '#5D4037', lineHeight: 1.5 }}>
              {lang === 'vi' ? 'Đánh giá tuân thủ quy định chống phá rừng EU' : 'EU Deforestation Regulation compliance'}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)', textAlign: 'center', fontSize: 12, color: '#A1887F' }}>
        {t('app.copyright')}
      </div>
    </div>
  );
}
