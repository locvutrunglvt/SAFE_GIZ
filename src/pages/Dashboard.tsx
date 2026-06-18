import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Users, Mountain, MapPin, CheckSquare, ShoppingCart,
  GraduationCap, Plus, FileText, BarChart3, Layers, ArrowRight, ChevronRight,
} from 'lucide-react';
import pb from '../lib/pocketbase';

interface Stats {
  farmers: number; farms: number; villages: number; communes: number;
  groups: number; trainings: number; detechFarmers: number; phucsinhFarmers: number;
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
        const gv = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value.totalItems : 0;
        const results = await Promise.allSettled([
          pb.collection('farmers').getList(1, 1, { filter: `code~"SAFEGIZ-${province}"` }),
          pb.collection('farms').getList(1, 1, { filter: `code~"SAFEGIZ-${province}"` }),
          pb.collection('villages').getList(1, 1, { filter: `province_code="${province}"` }),
          pb.collection('communes').getList(1, 1, { filter: `province_code="${province}"` }),
          pb.collection('farmer_groups').getList(1, 1, { filter: `province_code="${province}"` }),
          pb.collection('trainings').getList(1, 1),
        ]);
        let dF = 0, pF = 0;
        try {
          const pr = await Promise.allSettled([
            pb.collection('farmers').getList(1, 1, { filter: `code~"SAFEGIZ-${province}" && (group_id.name~"Detech" || group_id.name~"CẦN BỔ SUNG")` }),
            pb.collection('farmers').getList(1, 1, { filter: `code~"SAFEGIZ-${province}" && (group_id.name~"Phúc Sinh" || group_id="")` }),
          ]);
          dF = gv(pr[0]); pF = gv(pr[1]);
        } catch {}
        setStats({
          farmers: gv(results[0]), farms: gv(results[1]),
          villages: gv(results[2]), communes: gv(results[3]),
          groups: gv(results[4]), trainings: gv(results[5]),
          detechFarmers: dF, phucsinhFarmers: pF,
        });
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    fetchStats();
  }, [province]);

  const fmt = (n: number) => loading ? '—' : n.toLocaleString();

  return (
    <div className="animate-in">

      {/* ══════════ PC LAYOUT ══════════ */}
      <div className="dashboard-pc" style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 80px)' }}>
        <div className="dashboard-header-bar" style={{ background: 'linear-gradient(135deg, #3E2723 0%, #4E342E 50%, #5D4037 100%)', borderRadius: 14, padding: '20px 28px', marginBottom: 18, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 16px rgba(62,39,35,0.25)' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.5, marginBottom: 4 }}>SAFE — GIZ VIETNAM</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{t('dashboard.title')}</h1>
            <p style={{ fontSize: 13, opacity: 0.6, margin: '4px 0 0' }}>📍 {provinceName}</p>
          </div>
          <div className="dashboard-header-stats" style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(stats.farmers)}</div><div style={{ fontSize: 10, opacity: 0.5 }}>{lang === 'vi' ? 'Nông dân' : 'Farmers'}</div></div>
            <div style={{ width: 1, height: 30, background: 'rgba(255,255,255,0.15)' }} />
            <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(stats.farms)}</div><div style={{ fontSize: 10, opacity: 0.5 }}>{lang === 'vi' ? 'Nông trại' : 'Farms'}</div></div>
          </div>
        </div>

        <div className="dashboard-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 14, marginBottom: 18 }}>
          {[
            { icon: <Users size={20} />, label: lang === 'vi' ? 'Nông dân' : 'Farmers', value: stats.farmers, link: '/farmers' },
            { icon: <Mountain size={20} />, label: lang === 'vi' ? 'Nông trại' : 'Farms', value: stats.farms, link: '/farms' },
            { icon: <MapPin size={20} />, label: lang === 'vi' ? 'Thôn/Bản' : 'Villages', value: stats.villages, link: '/geography' },
            { icon: <CheckSquare size={20} />, label: lang === 'vi' ? 'Xã' : 'Communes', value: stats.communes, link: '/geography' },
            { icon: <Layers size={20} />, label: lang === 'vi' ? 'Nhóm' : 'Groups', value: stats.groups, link: '/farmers' },
            { icon: <GraduationCap size={20} />, label: lang === 'vi' ? 'Đào tạo' : 'Training', value: stats.trainings, link: '/training' },
          ].map((k, i) => (
            <div key={i} onClick={() => navigate(k.link)} style={{
              background: 'linear-gradient(145deg, #FFF 0%, #F8F5F2 100%)', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', position: 'relative', overflow: 'hidden',
              boxShadow: '0 6px 0 #D7CCC8, 0 8px 16px rgba(62,39,35,0.12), inset 0 1px 0 rgba(255,255,255,0.9)', border: '1px solid #E8E0DB', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 0 #BCAAA4, 0 14px 28px rgba(62,39,35,0.18), inset 0 1px 0 rgba(255,255,255,0.9)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 6px 0 #D7CCC8, 0 8px 16px rgba(62,39,35,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #5D4037, #8D6E63)', borderRadius: '14px 14px 0 0' }} />
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #5D4037, #8D6E63)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: 12, boxShadow: '0 3px 8px rgba(93,64,55,0.3)' }}>{k.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#2C2C2C', lineHeight: 1 }}>{fmt(k.value)}</div>
              <div style={{ fontSize: 12, color: '#8D6E63', fontWeight: 600, marginTop: 5 }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div className="dashboard-middle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #E8E0DB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#3E2723', marginBottom: 14 }}>⚡ {lang === 'vi' ? 'Thao tác nhanh' : 'Quick Actions'}</h3>
            <div className="dashboard-quick-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {[
                { icon: <Plus size={15} />, label: lang === 'vi' ? 'Thêm nông dân' : 'Add Farmer', link: '/farmers' },
                { icon: <Mountain size={15} />, label: lang === 'vi' ? 'Thêm nông trại' : 'Add Farm', link: '/farms' },
                { icon: <CheckSquare size={15} />, label: 'EUDR', link: '/eudr' },
                { icon: <ShoppingCart size={15} />, label: lang === 'vi' ? 'Giao dịch' : 'Trade', link: '/trade' },
                { icon: <GraduationCap size={15} />, label: lang === 'vi' ? 'Đào tạo' : 'Training', link: '/training' },
                { icon: <BarChart3 size={15} />, label: lang === 'vi' ? 'Báo cáo' : 'Reports', link: '/budget' },
              ].map((a, i) => (
                <div key={i} onClick={() => navigate(a.link)} style={{ background: '#FAFAF8', borderRadius: 10, padding: '14px 10px', textAlign: 'center', cursor: 'pointer', border: '1px solid #EFEBE9', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#F5F0EB'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#FAFAF8'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#5D4037', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>{a.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5D4037' }}>{a.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #EFEBE9' }}>
              <div onClick={() => navigate('/eudr')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 0' }}>
                <BarChart3 size={16} color="#5D4037" /><span style={{ fontSize: 13, color: '#5D4037', fontWeight: 600 }}>EUDR Compliance</span><ArrowRight size={14} color="#A1887F" style={{ marginLeft: 'auto' }} />
              </div>
            </div>
          </div>
          <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #E8E0DB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#3E2723', marginBottom: 14 }}><ShoppingCart size={15} color="#5D4037" style={{ marginRight: 6 }} />{lang === 'vi' ? 'Đối tác thu mua' : 'Partners'}</h3>
            {province === 'SL' && [
              { code: 'DT', name: 'Detech Coffee', desc: lang === 'vi' ? 'Đối tác — Sơn La' : 'Partner — Son La', count: stats.detechFarmers, link: '/drill/detech' },
              { code: 'PS', name: 'Phúc Sinh', desc: 'K Coffee — Sơn La', count: stats.phucsinhFarmers, link: '/drill/phucsinh' },
            ].map(p => (
              <div key={p.code} onClick={() => navigate(p.link)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid #EFEBE9', cursor: 'pointer' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #5D4037, #8D6E63)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{p.code}</div>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, fontSize: 15, color: '#2C2C2C' }}>{p.name}</div><div style={{ fontSize: 12, color: '#8D6E63' }}>{p.desc}</div></div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}><div style={{ fontSize: 22, fontWeight: 800, color: '#3E2723' }}>{fmt(p.count)}</div><div style={{ fontSize: 11, color: '#A1887F' }}>{lang === 'vi' ? 'nông hộ' : 'farmers'}</div></div>
              </div>
            ))}
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #EFEBE9', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#FAFAF8', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#3E2723' }}>{provinceName}</div><div style={{ fontSize: 11, color: '#8D6E63' }}>{lang === 'vi' ? 'Tỉnh' : 'Province'}</div></div>
              <div style={{ background: '#FAFAF8', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}><div style={{ fontSize: 20, fontWeight: 800, color: '#3E2723' }}>{fmt(stats.detechFarmers + stats.phucsinhFarmers)}</div><div style={{ fontSize: 11, color: '#8D6E63' }}>{lang === 'vi' ? 'Tổng' : 'Total'}</div></div>
            </div>
          </div>
        </div>
        <div style={{ paddingTop: 10, textAlign: 'center', fontSize: 11, color: '#BCAAA4', marginTop: 10 }}>{t('app.copyright')}</div>
      </div>

      {/* ══════════ MOBILE LAYOUT ══════════ */}
      <div className="dashboard-mobile">
        <div style={{ background: 'linear-gradient(145deg, #3E2723, #5D4037)', borderRadius: 16, padding: '24px 20px', marginBottom: 16, color: 'white' }}>
          <div style={{ fontSize: 9, letterSpacing: 2.5, opacity: 0.35, textTransform: 'uppercase', marginBottom: 2 }}>SAFE — GIZ VIETNAM</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{provinceName}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {[
            { val: stats.farmers, lbl: lang === 'vi' ? 'Nông dân' : 'Farmers', icon: <Users size={16} />, link: '/farmers' },
            { val: stats.farms, lbl: lang === 'vi' ? 'Nông trại' : 'Farms', icon: <Mountain size={16} />, link: '/farms' },
            { val: stats.communes, lbl: lang === 'vi' ? 'Xã' : 'Communes', icon: <CheckSquare size={16} />, link: '/geography' },
            { val: stats.villages, lbl: lang === 'vi' ? 'Thôn/Bản' : 'Villages', icon: <MapPin size={16} />, link: '/geography' },
          ].map((k, i) => (
            <div key={i} onClick={() => navigate(k.link)} style={{ background: 'white', borderRadius: 14, padding: '16px', border: '1px solid #ECE7E3', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: '#5D4037', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k.icon}</div>
                <span style={{ fontSize: 11, color: '#8D6E63', fontWeight: 600 }}>{k.lbl}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#2C2C2C' }}>{fmt(k.val)}</div>
            </div>
          ))}
        </div>

        {province === 'SL' && (
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #ECE7E3', marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 0', fontSize: 13, fontWeight: 700, color: '#3E2723' }}>{lang === 'vi' ? 'Đối tác thu mua' : 'Partners'}</div>
            {[
              { code: 'DT', name: 'Detech Coffee', count: stats.detechFarmers, link: '/drill/detech' },
              { code: 'PS', name: 'Phúc Sinh', count: stats.phucsinhFarmers, link: '/drill/phucsinh' },
            ].map((p) => (
              <div key={p.code} onClick={() => navigate(p.link)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderTop: '1px solid #F0EBE6', cursor: 'pointer' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #5D4037, #8D6E63)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{p.code}</div>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: '#2C2C2C' }}>{p.name}</div></div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#3E2723' }}>{fmt(p.count)}</div>
                <ChevronRight size={14} color="#BCAAA4" />
              </div>
            ))}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 14, border: '1px solid #ECE7E3', overflow: 'hidden' }}>
          {[
            { icon: <Plus size={16} />, label: lang === 'vi' ? 'Thêm nông dân' : 'Add Farmer', link: '/farmers' },
            { icon: <Mountain size={16} />, label: lang === 'vi' ? 'Thêm nông trại' : 'Add Farm', link: '/farms' },
            { icon: <BarChart3 size={16} />, label: 'EUDR Compliance', link: '/eudr' },
            { icon: <ShoppingCart size={16} />, label: lang === 'vi' ? 'Giao dịch' : 'Trade', link: '/trade' },
            { icon: <GraduationCap size={16} />, label: lang === 'vi' ? 'Đào tạo' : 'Training', link: '/training' },
            { icon: <FileText size={16} />, label: lang === 'vi' ? 'Báo cáo' : 'Reports', link: '/budget' },
          ].map((item, i) => (
            <div key={i} onClick={() => navigate(item.link)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', borderTop: i > 0 ? '1px solid #F0EBE6' : 'none', cursor: 'pointer' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F5F0EB', color: '#5D4037', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#3E2723', flex: 1 }}>{item.label}</span>
              <ChevronRight size={14} color="#D7CCC8" />
            </div>
          ))}
        </div>

        <div style={{ paddingTop: 14, textAlign: 'center', fontSize: 10, color: '#BCAAA4' }}>© 2026 SAFE Vietnam — GIZ</div>
      </div>
    </div>
  );
}
