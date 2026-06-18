import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { Input, Button } from '../../components/ui';

export default function RegisterPage() {
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
          <h1 className="auth-title">{t('auth.register')}</h1>
          <p className="auth-subtitle">{t('auth.registerSubtitle')}</p>
        </div>

        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <Input label={t('auth.fullName')} type="text" placeholder="Nguyễn Văn A" id="fullname" />
          <Input label={t('auth.email')} type="email" placeholder="email@example.com" id="email" />
          <Input label={t('auth.password')} type="password" placeholder="••••••••" id="password" />
          <Input label={t('auth.confirmPassword')} type="password" placeholder="••••••••" id="confirmPassword" />
          <Button style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {t('auth.registerBtn')}
          </Button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <span className="text-sm text-muted">
              {t('auth.hasAccount')}{' '}
              <Link to="/auth/login">{t('auth.login')}</Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
