import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { Input, Button } from '../../components/ui';

export default function LoginPage() {
  const { t } = useTranslation();

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #2E7D32, #81C784)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Leaf size={28} color="white" />
          </div>
          <h1 className="auth-title">{t('app.name')}</h1>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)', fontWeight: 600, marginBottom: 4 }}>
            {t('app.subtitle')}
          </p>
          <p className="auth-subtitle">{t('auth.loginSubtitle')}</p>
        </div>

        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <Input label={t('auth.email')} type="email" placeholder="admin@safe-vietnam.org" id="email" />
          <Input label={t('auth.password')} type="password" placeholder="••••••••" id="password" />
          <Button style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {t('auth.loginBtn')}
          </Button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span className="text-sm text-muted">
              {t('auth.noAccount')}{' '}
              <Link to="/auth/register">{t('auth.register')}</Link>
            </span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <Link to="/auth/forgot-password" className="text-sm">
              {t('auth.forgotPassword')}
            </Link>
          </div>
        </form>

        {/* GIZ Footer */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--color-coffee-light)',
            textAlign: 'center',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
          }}
        >
          {t('app.organization')}
        </div>
      </div>
    </div>
  );
}
