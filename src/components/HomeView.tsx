import React from 'react';
import { HeartHandshake, Compass, UserCheck, Target, Calendar, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { REACH_OUT_NIGERIA_EVENT } from '../config/eventConfig';

interface HomeViewProps {
  onNavigate: (tab: 'home' | 'record' | 'account' | 'org') => void;
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenAuth }) => {
  const { isAuthenticated, isActiveSoulWinner, isPendingAssignment, userProfile } = useAuth();

  const handleRecordClick = () => {
    if (!isAuthenticated) {
      onOpenAuth('signup');
    } else {
      onNavigate('record');
    }
  };

  return (
    <div className="home-card">
      <div className="home-hero">
        <div className="hero-badge">
          <span>CAMPAIGN EVENT</span>
        </div>
        <h2 className="hero-title">{REACH_OUT_NIGERIA_EVENT.name}</h2>
        <p className="hero-lead">{REACH_OUT_NIGERIA_EVENT.description}</p>

        {/* CAMPAIGN EVENT CONFIG METRICS */}
        <div className="event-metrics-grid">
          <div className="metric-box">
            <Target size={18} className="metric-icon" />
            <div>
              <span className="metric-label">Zonal Target</span>
              <span className="metric-value">{REACH_OUT_NIGERIA_EVENT.zonalTarget.toLocaleString()} SOULS</span>
            </div>
          </div>
          <div className="metric-box">
            <Calendar size={18} className="metric-icon" />
            <div>
              <span className="metric-label">Campaign Date</span>
              <span className="metric-value">October 1, 2026</span>
            </div>
          </div>
        </div>
      </div>

      <div className="home-status-box">
        {isAuthenticated ? (
          <div className="home-user-welcome">
            <UserCheck size={20} className="text-success" />
            <div>
              <strong>Welcome, {userProfile?.name}!</strong>
              <p className="banner-subtext">
                {isActiveSoulWinner
                  ? 'Your account is active. Tap below to start recording souls won!'
                  : isPendingAssignment
                  ? 'Your account is pending PCF assignment. An administrator will assign your PCF shortly.'
                  : 'Account status notice: check My Account.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="home-guest-box">
            <div className="guest-notice">
              <Lock size={16} className="text-gold" />
              <span>Sign in required to record souls. Anonymous submissions are prohibited.</span>
            </div>
            <div className="home-guest-actions">
              <button onClick={() => onOpenAuth('login')} className="submit-button">
                Sign In
              </button>
              <button onClick={() => onOpenAuth('signup')} className="secondary-button">
                Register
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="home-actions-grid">
        <button
          onClick={handleRecordClick}
          className="home-nav-card nav-card-primary"
        >
          <HeartHandshake size={24} />
          <div>
            <h3>I WON A SOUL</h3>
            <p>{isAuthenticated ? 'Record a soul won in the field' : 'Sign up to start recording souls'}</p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('account')}
          className="home-nav-card nav-card-secondary"
        >
          <Compass size={24} />
          <div>
            <h3>MY ACCOUNT</h3>
            <p>View your PCF, Church, Group & Zone</p>
          </div>
        </button>
      </div>
    </div>
  );
};
