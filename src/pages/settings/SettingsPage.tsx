import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/ui';

type TabKey = 'language' | 'permissions' | 'measurements' | 'data';

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('language');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'language', label: t('settings.language') },
    { key: 'permissions', label: t('settings.permissions') },
    { key: 'measurements', label: t('settings.measurements') },
    { key: 'data', label: t('settings.data') },
  ];

  return (
    <div className="animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('settings.title')}</h1>
          <p className="page-subtitle">{t('settings.subtitle')}</p>
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

      {/* Tab Content */}
      {activeTab === 'language' && (
        <Card title={t('settings.language')}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span className="text-sm">{t('settings.language')}:</span>
            <div className="lang-switcher">
              <button
                className={`lang-btn ${i18n.language === 'vi' ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage('vi')}
              >
                🇻🇳 Tiếng Việt
              </button>
              <button
                className={`lang-btn ${i18n.language === 'en' ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage('en')}
              >
                🇬🇧 English
              </button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === 'permissions' && (
        <Card title={t('settings.permissions')}>
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Permissions matrix coming soon...
          </div>
        </Card>
      )}

      {activeTab === 'measurements' && (
        <Card title={t('settings.measurements')}>
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Measurement units configuration coming soon...
          </div>
        </Card>
      )}

      {activeTab === 'data' && (
        <Card title={t('settings.data')}>
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Data management coming soon...
          </div>
        </Card>
      )}
    </div>
  );
}
