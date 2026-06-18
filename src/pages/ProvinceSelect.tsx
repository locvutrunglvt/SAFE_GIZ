import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Users, Mountain, ChevronRight, Sprout, Map as MapIcon } from 'lucide-react';
import pb from '../lib/pocketbase';

const ProvinceMap = lazy(() => import('../components/ProvinceMap'));

interface ProvinceData {
  id: string; code: string; nameVi: string; nameEn: string;
  image: string; description_vi: string; description_en: string;
  stats: { farmers: number; communes: number; villages: number; farms: number; totalArea: number };
  color: string;
}

const defaultProvinces: ProvinceData[] = [
  {
    id: 'son-la', code: 'SL', nameVi: 'Sơn La', nameEn: 'Son La',
    image: '/images/son-la.png',
    description_vi: 'Vùng Tây Bắc — Cà phê Arabica',
    description_en: 'Northwest Region — Arabica coffee',
    stats: { farmers: 0, communes: 0, villages: 0, farms: 0, totalArea: 0 },
    color: '#5D4037',
  },
  {
    id: 'gia-lai', code: 'GL', nameVi: 'Gia Lai', nameEn: 'Gia Lai',
    image: '/images/gia-lai.png',
    description_vi: 'Tây Nguyên — Cà phê Robusta truyền thống',
    description_en: 'Central Highlands — Traditional Robusta coffee',
    stats: { farmers: 0, communes: 0, villages: 0, farms: 0, totalArea: 0 },
    color: '#8D6E63',
  },
];

export default function ProvinceSelect() {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [provinces, setProvinces] = useState<ProvinceData[]>(defaultProvinces);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      const getValue = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value.totalItems : 0;
      const updated = await Promise.all(defaultProvinces.map(async (prov) => {
        const results = await Promise.allSettled([
          pb.collection('farmers').getList(1, 1, { filter: `code~"SAFEGIZ-${prov.code}"` }),
          pb.collection('communes').getList(1, 1, { filter: `province_code="${prov.code}"` }),
          pb.collection('villages').getList(1, 1, { filter: `province_code="${prov.code}"` }),
          pb.collection('farms').getList(1, 1, { filter: `code~"SAFEGIZ-${prov.code}"` }),
        ]);
        let totalArea = 0;
        try {
          const areaResult = await pb.collection('farms').getList(1, 200, {
            filter: `code~"SAFEGIZ-${prov.code}" && coffee_area>0`,
            fields: 'coffee_area',
          });
          totalArea = areaResult.items.reduce((sum: number, f: any) => sum + (f.coffee_area || 0), 0);
          if (areaResult.totalPages > 1) {
            const avg = totalArea / areaResult.items.length;
            totalArea = avg * areaResult.totalItems;
          }
        } catch { /* */ }
        return {
          ...prov,
          stats: {
            farmers: getValue(results[0]),
            communes: getValue(results[1]),
            villages: getValue(results[2]),
            farms: getValue(results[3]),
            totalArea: Math.round(totalArea * 100) / 100,
          },
        };
      }));
      setProvinces(updated);
    }
    fetchStats();
  }, []);

  const handleSelect = (provinceCode: string) => {
    localStorage.setItem('selectedProvince', provinceCode);
    navigate('/dashboard');
  };

  const toggleLang = () => {
    i18n.changeLanguage(lang === 'vi' ? 'en' : 'vi');
  };

  return (
    <div className="province-select-page">
      {/* Language Toggle */}
      <button className="lang-toggle" onClick={toggleLang}>
        {lang === 'vi' ? 'EN' : 'VI'}
      </button>

      {/* GIZ Logo */}
      <div className="province-header">
        <img src="/images/giz-logo.svg" alt="GIZ" className="giz-logo" />
        <div className="project-info">
          <h1 className="project-title">SAFE Vietnam</h1>
          <p className="project-subtitle">
            {lang === 'vi'
              ? 'Nông nghiệp bền vững vì hệ sinh thái rừng'
              : 'Sustainable Agriculture for Forest Ecosystems'}
          </p>
          <p className="project-desc">
            {lang === 'vi'
              ? 'Đáp ứng Quy định không gây mất rừng của EU (EUDR)'
              : 'Supporting Vietnam\'s compliance with the EU Deforestation-Free Regulation (EUDR)'}
          </p>
        </div>
      </div>

      {/* Province Cards — BIGGER on PC */}
      <div className="province-cards province-cards-large">
        {provinces.map((prov) => (
          <div
            key={prov.id}
            className="province-card province-card-large"
            onClick={() => handleSelect(prov.code)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleSelect(prov.code)}
          >
            <div className="province-image-wrapper province-image-large">
              <img src={prov.image} alt={prov.nameVi} className="province-image" />
              <div className="province-image-overlay">
                <span className="province-code">{prov.code}</span>
              </div>
            </div>
            <div className="province-content">
              <h3 className="province-name">
                <MapPin size={20} />
                {lang === 'vi' ? prov.nameVi : prov.nameEn}
              </h3>
              <p className="province-description">
                {lang === 'vi' ? prov.description_vi : prov.description_en}
              </p>
              <div className="province-stats">
                <div className="stat-item">
                  <Users size={16} />
                  <span>{prov.stats.farmers.toLocaleString()}</span>
                  <label>{lang === 'vi' ? 'Nông hộ' : 'Farmers'}</label>
                </div>
                <div className="stat-item">
                  <Sprout size={16} />
                  <span>{prov.stats.farms.toLocaleString()}</span>
                  <label>{lang === 'vi' ? 'Nông trại' : 'Farms'}</label>
                </div>
                <div className="stat-item">
                  <Mountain size={16} />
                  <span>{prov.stats.totalArea.toLocaleString()} ha</span>
                  <label>{lang === 'vi' ? 'DT Cà phê' : 'Coffee Area'}</label>
                </div>
                <div className="stat-item">
                  <MapPin size={16} />
                  <span>{prov.stats.communes} {lang === 'vi' ? 'xã' : 'com.'} / {prov.stats.villages} {lang === 'vi' ? 'thôn' : 'vlg.'}</span>
                  <label>{lang === 'vi' ? 'Địa bàn' : 'Coverage'}</label>
                </div>
              </div>
              <div className="province-enter">
                <span>{lang === 'vi' ? 'Truy cập' : 'Enter'}</span>
                <ChevronRight size={18} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Map Section */}
      <div style={{ maxWidth: 1100, margin: '28px auto 0', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#3E2723', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapIcon size={20} color="#5D4037" />
            {lang === 'vi' ? 'Bản đồ phạm vi hoạt động' : 'Project Coverage Map'}
          </h2>
          <button
            onClick={() => setShowMap(!showMap)}
            style={{
              background: showMap ? '#5D4037' : 'white',
              color: showMap ? 'white' : '#5D4037',
              border: '1px solid #5D4037',
              borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
            }}
          >
            {showMap ? (lang === 'vi' ? 'Ẩn bản đồ' : 'Hide Map') : (lang === 'vi' ? 'Xem bản đồ' : 'Show Map')}
          </button>
        </div>

        {showMap && (
          <div style={{ height: 480, marginBottom: 20 }}>
            <Suspense fallback={
              <div style={{ height: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F0EB', borderRadius: 16 }}>
                {lang === 'vi' ? 'Đang tải bản đồ...' : 'Loading map...'}
              </div>
            }>
              <ProvinceMap lang={lang} onSelectProvince={handleSelect} />
            </Suspense>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="province-footer">
        <p>© 2026 SAFE Vietnam — GIZ | {lang === 'vi' ? 'Nông nghiệp bền vững vì hệ sinh thái rừng' : 'Sustainable Agriculture for Forest Ecosystems'}</p>
      </footer>
    </div>
  );
}
