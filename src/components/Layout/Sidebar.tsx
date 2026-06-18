import { NavLink, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Globe,
  Users,
  Mountain,
  CheckSquare,
  ShoppingCart,
  Package,
  GraduationCap,
  UserCog,
  DollarSign,
  BarChart3,
  FileText,
  Upload,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Leaf,
  MapPin,
  ClipboardList,
  FileQuestion,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface MenuItem {
  key: string;
  path: string;
  icon: React.ReactNode;
  section: string;
}

const menuItems: MenuItem[] = [
  { key: 'dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, section: 'main' },
  { key: 'geography', path: '/geography', icon: <Globe size={20} />, section: 'main' },
  { key: 'farmers', path: '/farmers', icon: <Users size={20} />, section: 'management' },
  { key: 'farms', path: '/farms', icon: <Mountain size={20} />, section: 'management' },
  { key: 'eudr', path: '/eudr', icon: <CheckSquare size={20} />, section: 'management' },
  { key: 'eudr_compliance', path: '/eudr-compliance', icon: <ClipboardList size={20} />, section: 'management' },
  { key: 'farmer_quest', path: '/farmer-quest', icon: <FileQuestion size={20} />, section: 'management' },
  { key: 'field_quest', path: '/field-quest', icon: <FileQuestion size={20} />, section: 'management' },
  { key: 'trade', path: '/trade', icon: <ShoppingCart size={20} />, section: 'management' },
  { key: 'support', path: '/support', icon: <Package size={20} />, section: 'management' },
  { key: 'training', path: '/training', icon: <GraduationCap size={20} />, section: 'management' },
  { key: 'personnel', path: '/personnel', icon: <UserCog size={20} />, section: 'management' },
  { key: 'budget', path: '/budget', icon: <DollarSign size={20} />, section: 'management' },
  { key: 'social', path: '/social', icon: <BarChart3 size={20} />, section: 'management' },
  { key: 'forms', path: '/forms', icon: <FileText size={20} />, section: 'system' },
  { key: 'import', path: '/import', icon: <Upload size={20} />, section: 'system' },
  { key: 'auth', path: '/auth/login', icon: <Shield size={20} />, section: 'system' },
  { key: 'settings', path: '/settings', icon: <Settings size={20} />, section: 'system' },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useTranslation();
  const location = useLocation();

  const sections = [
    { key: 'main', label: t('menu.main') },
    { key: 'management', label: t('menu.management') },
    { key: 'system', label: t('menu.system') },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo — clickable to go home */}
      <Link to="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>
        <div className="sidebar-logo-icon">
          <Leaf size={24} />
        </div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-title">{t('app.name')}</div>
          <div className="sidebar-logo-subtitle">{t('app.sidebarSubtitle')}</div>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map((section) => {
          const items = menuItems.filter((item) => item.section === section.key);
          if (items.length === 0) return null;
          return (
            <div key={section.key}>
              <div className="sidebar-section-title">{section.label}</div>
              {items.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.path}
                  className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => onMobileClose?.()}
                >
                  <span className="nav-item-icon">{item.icon}</span>
                  <span className="nav-item-label">{t(`menu.${item.key}`)}</span>
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* Back to Province Selection */}
      <Link
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : '10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: '12px 16px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.5)',
          fontSize: '13px',
          fontWeight: 500,
          transition: 'all 0.2s',
          textDecoration: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'white';
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <MapPin size={16} style={{ flexShrink: 0 }} />
        {!collapsed && <span>{t('menu.changeProvince')}</span>}
      </Link>

      {/* Toggle */}
      <button className="sidebar-toggle" onClick={onToggle}>
        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>
    </aside>
  );
}
