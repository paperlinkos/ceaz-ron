import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Phone,
  X,
  LogIn,
  ShieldCheck,
  AlertCircle,
  Building,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { type ChurchAccount } from '../../services/churchAccountService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup' | 'activate';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
}) => {
  const [mode, setMode] = useState<'login' | 'activate' | 'reset'>(
    initialMode === 'activate' || initialMode === 'signup' ? 'login' : 'login'
  );

  const [loginIdentifier, setLoginIdentifier] = useState<string>(''); // Church Code or Email
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Activation State for Church Representative
  const [activeChurchAccount, setActiveChurchAccount] = useState<ChurchAccount | null>(null);
  const [repName, setRepName] = useState<string>('');
  const [repEmail, setRepEmail] = useState<string>('');
  const [repPhone, setRepPhone] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const { loginWithChurchCode, activateChurch, resetPassword } = useAuth();

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    const cleanId = loginIdentifier.trim();
    const cleanPass = loginPassword.trim();

    if (!cleanId || !cleanPass) {
      setError('Please enter your Church Code (Username) and Password.');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await loginWithChurchCode(cleanId, cleanPass);

      if (!result.success) {
        setError(result.error || 'Invalid Church Code or Password.');
        setIsSubmitting(false);
        return;
      }

      // If this is the church's first time signing in, route to Activation form
      if (result.requiresActivation && result.churchAccount) {
        setActiveChurchAccount(result.churchAccount);
        setMode('activate');
        setError('');
        setSuccessMsg(
          `Welcome, ${result.churchAccount.churchName}! Please complete your Representative profile to activate this account.`
        );
        setIsSubmitting(false);
        return;
      }

      // Successfully signed in
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    if (!activeChurchAccount) {
      setError('No active church selected for activation.');
      setIsSubmitting(false);
      return;
    }

    if (!repName.trim()) {
      setError('Please enter your Full Name as Church Representative.');
      setIsSubmitting(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!repEmail.trim() || !emailRegex.test(repEmail.trim())) {
      setError('Please enter a valid official email address.');
      setIsSubmitting(false);
      return;
    }

    if (!repPhone.trim() || repPhone.trim().length < 7) {
      setError('Please enter a valid phone number (at least 7 digits).');
      setIsSubmitting(false);
      return;
    }

    try {
      const actRes = await activateChurch(activeChurchAccount.churchCode, {
        name: repName.trim(),
        email: repEmail.trim(),
        phone: repPhone.trim(),
        newPassword: newPassword.trim() || undefined,
      });

      if (!actRes.success) {
        setError(actRes.error || 'Failed to activate church account.');
        setIsSubmitting(false);
        return;
      }

      // Successful activation and session establishment
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    if (!repEmail) {
      setError('Please enter your representative email address.');
      setIsSubmitting(false);
      return;
    }

    try {
      await resetPassword(repEmail);
      setSuccessMsg('Password reset link sent to your email.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
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
            {mode === 'login' && 'Church Representative Sign In'}
            {mode === 'activate' && 'Representative Activation'}
            {mode === 'reset' && 'Reset Password'}
          </h3>
          <p className="modal-subtitle">
            {mode === 'login' &&
              'Sign in using your assigned Church Code (Username) and Password.'}
            {mode === 'activate' &&
              `Enter representative contact data for ${activeChurchAccount?.churchName || 'your Church'}.`}
            {mode === 'reset' &&
              'Enter your registered representative email address to receive reset instructions.'}
          </p>
        </div>

        {error && (
          <div className="error-box">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && <div className="success-box">{successMsg}</div>}

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
                  onClick={() => setMode('reset')}
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
                  placeholder="Enter initial or updated password"
                  className="form-input"
                  disabled={isSubmitting}
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

        {/* 2. FIRST-TIME ACTIVATION FORM */}
        {mode === 'activate' && activeChurchAccount && (
          <form onSubmit={handleActivationSubmit} noValidate className="modal-form">
            <div
              style={{
                background: 'rgba(0, 135, 81, 0.05)',
                border: '1px solid rgba(0, 135, 81, 0.2)',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '1rem',
              }}
            >
              <div
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  color: '#008751',
                  marginBottom: '2px',
                }}
              >
                {activeChurchAccount.churchName} ({activeChurchAccount.churchCode})
              </div>
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Parent Group: <strong>{activeChurchAccount.groupName}</strong> • Target:{' '}
                <strong>{activeChurchAccount.targetSouls.toLocaleString()} souls</strong>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Representative Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  placeholder="e.g. Bro. David Emmanuel"
                  className="form-input"
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Representative Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  value={repEmail}
                  onChange={(e) => setRepEmail(e.target.value)}
                  placeholder="e.g. david.emmanuel@gmail.com"
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>
              <span className="input-helper">
                Required: Stored by Abuja Zone 1 to retain contact data on each representative
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Representative Phone Number</label>
              <div className="input-wrapper">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  value={repPhone}
                  onChange={(e) => setRepPhone(e.target.value)}
                  placeholder="e.g. 08031234567"
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                New Secret Password <span style={{ color: '#94a3b8' }}>(Optional)</span>
              </label>
              <div className="input-wrapper">
                <KeyRound size={18} className="input-icon" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Leave blank to keep default password"
                  className="form-input"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-button"
              style={{ marginTop: '0.75rem' }}
            >
              {isSubmitting ? 'Activating Profile...' : 'Complete Activation & Enter Portal'}
              <ShieldCheck size={18} />
            </button>
          </form>
        )}

        {/* 3. PASSWORD RESET FORM */}
        {mode === 'reset' && (
          <form onSubmit={handleResetSubmit} noValidate className="modal-form">
            <div className="form-group">
              <label className="form-label">Registered Representative Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  value={repEmail}
                  onChange={(e) => setRepEmail(e.target.value)}
                  placeholder="Enter representative email"
                  className="form-input"
                  disabled={isSubmitting}
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="submit-button">
              {isSubmitting ? 'Sending...' : 'Send Reset Link'}
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="secondary-button"
              style={{ marginTop: '0.5rem' }}
            >
              Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
