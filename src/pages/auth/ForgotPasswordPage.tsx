import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { Input, Button } from '../../components/ui';

export default function ForgotPasswordPage() {
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
          <h1 className="auth-title">{t('auth.forgotPassword')}</h1>
          <p className="auth-subtitle">{t('auth.forgotSubtitle')}</p>
        </div>

        <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
          <Input label={t('auth.email')} type="email" placeholder="email@example.com" id="email" />
          <Button style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {t('auth.resetBtn')}
          </Button>
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <Link to="/auth/login" className="text-sm">
              ← {t('common.back')} {t('auth.login')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
