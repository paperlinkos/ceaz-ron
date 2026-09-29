import React from 'react';
import { Target, Calendar, ShieldCheck, HeartHandshake } from 'lucide-react';
import { REACH_OUT_NIGERIA_EVENT } from '../../config/eventConfig';

interface AboutViewProps {
  onOpenAuth: (mode: 'login' | 'signup') => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onOpenAuth }) => {
  return (
    <div className="public-card">
      <div className="public-hero">
        <div className="hero-badge">
          <span>ABOUT THE CAMPAIGN</span>
        </div>
        <h2 className="hero-title">{REACH_OUT_NIGERIA_EVENT.name}</h2>
        <p className="hero-lead">
          CEAZ1 Reachout Nigeria Soul Winning Campaign is a zonal mobilization taking place on October 1st, 2026.
        </p>
      </div>

      <div className="about-details-grid">
        <div className="about-item">
          <Target size={20} className="text-green-accent" />
          <div>
            <h4>Zonal Goal</h4>
            <p>Targeting 40,000 souls recorded live across all Groups, Churches, PCFs, and Soul Winners.</p>
          </div>
        </div>

        <div className="about-item">
          <Calendar size={20} className="text-green-accent" />
          <div>
            <h4>Event Date</h4>
            <p>October 1, 2026 — Live zonal mission control and upward race visualization.</p>
          </div>
        </div>

        <div className="about-item">
          <ShieldCheck size={20} className="text-green-accent" />
          <div>
            <h4>Authenticated Recording</h4>
            <p>Every soul-winning record is linked to a verified Soul Winner profile and PCF hierarchy.</p>
          </div>
        </div>
      </div>

      <div className="about-cta">
        <h3>Ready to participate?</h3>
        <button onClick={() => onOpenAuth('signup')} className="btn-green-accent btn-large">
          <HeartHandshake size={18} />
          <span>Register as a Soul Winner</span>
        </button>
      </div>
    </div>
  );
};
