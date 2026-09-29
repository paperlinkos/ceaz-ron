import React, { useState } from 'react';
import { Lock, X, LogIn, AlertCircle, Building, KeyRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'login' | 'help'>('login');

  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { loginWithChurchCode } = useAuth();

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await loginWithChurchCode(loginIdentifier, loginPassword);

      if (!result.success) {
        setError(result.error || 'Invalid Church Code or Password.');
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" style={{ maxWidth: '490px' }}>
        <button onClick={onClose} className="modal-close-btn" aria-label="Close">
          <X size={20} />
        </button>

        <div className="modal-header">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(0, 135, 81, 0.1)',
              color: '#008751',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              marginBottom: '10px',
            }}
          >
            <Building size={14} />
            CHURCH REPRESENTATIVE PORTAL
          </div>

          <h3 className="modal-title">
            {mode === 'login' ? 'Church Representative Sign In' : 'Forgotten Password'}
          </h3>
          <p className="modal-subtitle">
            {mode === 'login' &&
              'Sign in using your assigned Church Code (Username) and Password. No sign-up is required.'}
            {mode === 'help' &&
              'Your password is issued by Abuja Zone 1. Contact your zonal admin to have it reset.'}
          </p>
        </div>

        {error && (
          <div className="error-box">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* 1. SIGN IN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} noValidate className="modal-form">
            <div className="form-group">
              <label className="form-label">Church Code (Username) or Email</label>
              <div className="input-wrapper">
                <Building size={18} className="input-icon" />
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    setError('');
                  }}
                  placeholder="e.g. CH-KBS, CH-GWARINPA1"
                  className="form-input"
                  disabled={isSubmitting}
                  autoFocus
                  autoCapitalize="characters"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <span className="input-helper">
                Assigned by Abuja Zone 1 (1 designated account per church)
              </span>
            </div>

            <div className="form-group">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <label className="form-label">Password</label>
                <button
                  type="button"
                  onClick={() => setMode('help')}
                  className="text-btn"
                  style={{ fontSize: '0.72rem', color: '#008751', fontWeight: 700 }}
                >
                  Forgot?
                </button>
              </div>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter the password issued to you"
                  className="form-input"
                  disabled={isSubmitting}
                  /* Issued passwords mix cases and contain ! % &, which iOS
                     and Android keyboards will silently rewrite unless these
                     are set. That produced "Invalid Church Code or Password"
                     for credentials that were in fact correct. */
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-button"
              style={{ marginTop: '0.5rem' }}
            >
              {isSubmitting ? 'Verifying Credentials...' : 'Sign In to Church Portal'}
              <LogIn size={18} />
            </button>
          </form>
        )}

        {/* 2. FORGOT PASSWORD — routed to the zonal admin */}
        {mode === 'help' && (
          <div className="modal-form">
            <div
              style={{
                background: 'rgba(0, 135, 81, 0.05)',
                border: '1px solid rgba(0, 135, 81, 0.2)',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#008751',
                  marginBottom: '6px',
                }}
              >
                <KeyRound size={16} />
                Passwords are set by the campaign office
              </div>
              <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                Representatives cannot reset their own password. Reach out to your Zonal Admin or
                Group Coordinator with your Church Code, and they will issue you a new password from
                the admin panel.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="submit-button"
              style={{ marginTop: '0.75rem' }}
            >
              <ShieldCheck size={18} />
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
