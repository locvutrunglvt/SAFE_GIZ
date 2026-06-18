import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Bell, ChevronRight, Leaf, Menu, Search } from 'lucide-react';
import GlobalSearch from '../GlobalSearch';

export default function Header({ onMobileMenuToggle }: { onMobileMenuToggle?: () => void }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const switchLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const lang = i18n.language;
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const getBreadcrumbLabel = (segment: string): string => {
    const labelMap: Record<string, string> = {
      dashboard: t('menu.dashboard'),
      farmers: t('menu.farmers'),
      farms: t('menu.farms'),
      eudr: t('menu.eudr'),
      trade: t('menu.trade'),
      support: t('menu.support'),
      training: t('menu.training'),
      personnel: t('menu.personnel'),
      budget: t('menu.budget'),
      social: t('menu.social'),
      forms: t('menu.forms'),
      settings: t('menu.settings'),
      geography: t('menu.geography'),
      map: t('menu.map'),
    };
    return labelMap[segment] || segment;
  };

  return (
    <>
      <header className="header">
        <div className="header-left">
          <button className="mobile-menu-btn" onClick={onMobileMenuToggle}>
            <Menu size={22} />
          </button>
          <div className="breadcrumb">
            <span>{t('menu.dashboard')}</span>
            {pathSegments.map((segment, index) => (
              <span key={segment} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronRight size={14} className="breadcrumb-sep" />
                <span className={index === pathSegments.length - 1 ? 'breadcrumb-current' : ''}>
                  {getBreadcrumbLabel(segment)}
                </span>
              </span>
            ))}
          </div>

          {/* Project Name — Large & Prominent */}
          <div style={{
            marginLeft: 20, paddingLeft: 20, borderLeft: '2px solid var(--color-coffee)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Leaf size={20} style={{ color: '#8D6E63', flexShrink: 0 }} />
            <span style={{ fontSize: 15, color: '#3E2723', fontWeight: 700, letterSpacing: '0.01em', lineHeight: 1.3 }}>
              <span style={{ color: '#6D4C41', fontSize: 16, fontWeight: 800 }}>SAFE</span>
              {lang === 'vi' ? ' — Nông nghiệp bền vững vì hệ sinh thái rừng' : ' — Sustainable Agriculture for Forest Ecosystems'}
            </span>
          </div>
        </div>

        <div className="header-right">
          <button
            className="header-btn"
            onClick={() => setSearchOpen(true)}
            title={lang === 'vi' ? 'Tìm kiếm (Ctrl+K)' : 'Search (Ctrl+K)'}
            style={{ position: 'relative' }}
          >
            <Search size={18} />
            <span style={{
              fontSize: 10, padding: '1px 5px', borderRadius: 4,
              background: '#EFEBE9', color: '#8D6E63', fontWeight: 600,
              border: '1px solid #D7CCC8', marginLeft: 4,
            }}>⌘K</span>
          </button>
          <div className="lang-switcher">
            <button className={`lang-btn ${i18n.language === 'vi' ? 'active' : ''}`} onClick={() => switchLanguage('vi')}>VI</button>
            <button className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`} onClick={() => switchLanguage('en')}>EN</button>
          </div>
          <button className="header-btn">
            <Bell size={18} />
            <span className="notification-dot" />
          </button>
          <div className="user-avatar">LV</div>
        </div>
      </header>
      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}

