import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { seedDemoData } from '../utils/demoDataSeeder';
import { Shield, ChevronDown, ChevronUp, Church, Building2, Check, RefreshCw } from 'lucide-react';
import { DEFAULT_CHURCHES, DEFAULT_GROUPS } from '../services/organizationService';
import type { UserRole } from '../types/auth';

export const DevRoleSwitcher: React.FC = () => {
  const { setDevRole, role, soulWinnerProfile } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);
  const [seedSuccess, setSeedSuccess] = useState<boolean>(false);
  const [churchSearch, setChurchSearch] = useState<string>('');

  const handleRoleSelect = (targetRole: UserRole | 'pending' | 'logout', specificId?: string) => {
    if (targetRole === 'logout') {
      sessionStorage.setItem('ron_just_logged_out', 'true');
    }
    setDevRole(targetRole, specificId);
    setIsOpen(false);
  };

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedDemoData();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 3000);
      window.location.reload();
    } catch (err) {
      console.error('Failed to seed demo data:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const currentRoleLabel =
    role === 'superAdmin'
      ? 'Super Admin'
      : role === 'zoneManager'
      ? 'Abuja Zone 1 Leader'
      : role === 'groupManager'
      ? `${soulWinnerProfile?.groupName || 'Group Leader'}`
      : role === 'churchManager'
      ? `${soulWinnerProfile?.churchName || 'Church Rep'}`
      : 'Observer (Logged Out)';

  const popularChurches = [
    { id: 'ch-zonal-church-1', name: 'Zonal Church 1', code: 'CH-ZNC1' },
    { id: 'ch-ce-kbs', name: 'CE KBS', code: 'CH-KBS' },
    { id: 'ch-ce-gwarinpa-1', name: 'CE Gwarinpa 1', code: 'CH-GWARINPA1' },
    { id: 'ch-ce-kubwa', name: 'CE Kubwa', code: 'CH-KBW1' },
    { id: 'ch-ce-bwari-main', name: 'CE Bwari Main', code: 'CH-BWRM' },
    { id: 'ch-ce-express', name: 'CE Express', code: 'CH-EXP' },
    { id: 'ch-ce-kuje', name: 'CE Kuje', code: 'CH-KUJ1' },
    { id: 'ch-ce-lokogoma', name: 'CE Lokogoma', code: 'CH-LKG1' },
    { id: 'ch-ce-ushafa', name: 'CE Ushafa', code: 'CH-USH' },
  ];

  const filteredChurches = DEFAULT_CHURCHES.filter(
    (c) =>
      c.name.toLowerCase().includes(churchSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(churchSearch.toLowerCase())
  );

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '46px',
        right: '16px',
        zIndex: 9999,
        fontFamily: "'Orbitron', sans-serif",
      }}
    >
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #008751 0%, #005a36 100%)',
            color: '#ffffff',
            padding: '10px 16px',
            borderRadius: '24px',
            border: '1.5px solid #FFD700',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            fontWeight: '700',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <Shield size={16} color="#FFD700" />
          <span>ACCOUNT: {currentRoleLabel}</span>
          <ChevronUp size={16} />
        </button>
      ) : (
        <div
          style={{
            background: '#0d1f18',
            border: '1.5px solid rgba(0, 135, 81, 0.7)',
            borderRadius: '16px',
            padding: '16px',
            width: '360px',
            maxHeight: '85vh',
            overflowY: 'auto',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
            color: '#e2e8f0',
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              borderBottom: '1px solid #1e3a2f',
              paddingBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="#FFD700" />
              <span style={{ fontWeight: '800', fontSize: '14px', color: '#FFD700' }}>
                SWITCH ACCOUNT
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <ChevronDown size={18} />
            </button>
          </div>

          <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '12px' }}>
            Simulate logged-in Church Representatives, Group Coordinators, or Zonal Leadership:
          </div>

          {/* 1. CHURCH REPRESENTATIVE ACCOUNTS */}
          <div style={{ marginBottom: '14px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#4ade80',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
              }}
            >
              <Church size={14} />
              <span>Church Representative Accounts (1 per church)</span>
            </div>

            {/* Quick Picks Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
              {popularChurches.map((c) => {
                const isActive =
                  role === 'churchManager' && soulWinnerProfile?.churchId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleRoleSelect('churchManager', c.id)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: isActive ? '1.5px solid #FFD700' : '1px solid #1e3a2f',
                      background: isActive ? '#008751' : '#142920',
                      color: '#ffffff',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                      <div style={{ fontSize: '9px', color: '#94a3b8' }}>{c.code}</div>
                    </div>
                    {isActive && <Check size={14} color="#FFD700" />}
                  </button>
                );
              })}
            </div>

            {/* Church Search & All 129 Selector */}
            <input
              type="text"
              value={churchSearch}
              onChange={(e) => setChurchSearch(e.target.value)}
              placeholder="Search all 129 churches..."
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #1e3a2f',
                background: '#071710',
                color: '#ffffff',
                fontSize: '11px',
                marginBottom: '6px',
                boxSizing: 'border-box',
              }}
            />

            {churchSearch.trim() && (
              <div
                style={{
                  maxHeight: '120px',
                  overflowY: 'auto',
                  border: '1px solid #1e3a2f',
                  borderRadius: '8px',
                  background: '#071710',
                  padding: '4px',
                  marginBottom: '8px',
                }}
              >
                {filteredChurches.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleRoleSelect('churchManager', c.id)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: '#cbd5e1',
                      fontSize: '11px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{c.name}</span>
                    <span style={{ color: '#00ff87', fontSize: '10px' }}>{c.code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. GROUP COORDINATOR ACCOUNTS */}
          <div style={{ marginBottom: '14px', borderTop: '1px solid #1e3a2f', paddingTop: '10px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#60a5fa',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
              }}
            >
              <Building2 size={14} />
              <span>Group Coordinator Accounts ({DEFAULT_GROUPS.length} Groups)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
              {DEFAULT_GROUPS.slice(0, 6).map((g) => {
                const isActive = role === 'groupManager' && soulWinnerProfile?.groupId === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => handleRoleSelect('groupManager', g.id)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: isActive ? '1.5px solid #FFD700' : '1px solid #1e3a2f',
                      background: isActive ? '#1d4ed8' : '#142920',
                      color: '#ffffff',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 'bold' }}>{g.name}</span>
                    {isActive && <Check size={14} color="#FFD700" />}
                  </button>
                );
              })}
            </div>

            {/* Select any of all 24 groups */}
            <select
              value={role === 'groupManager' ? soulWinnerProfile?.groupId || '' : ''}
              onChange={(e) => {
                if (e.target.value) {
                  handleRoleSelect('groupManager', e.target.value);
                }
              }}
              style={{
                width: '100%',
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid #1e3a2f',
                background: '#071710',
                color: '#60a5fa',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              <option value="">Select from all {DEFAULT_GROUPS.length} Groups...</option>
              {DEFAULT_GROUPS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code})
                </option>
              ))}
            </select>
          </div>

          {/* 3. ZONAL LEADERSHIP & OBSERVER */}
          <div style={{ borderTop: '1px solid #1e3a2f', paddingTop: '10px', marginBottom: '12px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#f59e0b',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}
            >
              Zonal Leadership & Observer
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                onClick={() => handleRoleSelect('zoneManager')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: role === 'zoneManager' ? '1.5px solid #FFD700' : '1px solid #1e3a2f',
                  background: role === 'zoneManager' ? '#b45309' : '#142920',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 'bold',
                }}
              >
                🏛️ Abuja Zone 1
              </button>

              <button
                onClick={() => handleRoleSelect('superAdmin')}
                style={{
                  padding: '8px',
                  borderRadius: '8px',
                  border: role === 'superAdmin' ? '1.5px solid #FFD700' : '1px solid #1e3a2f',
                  background: role === 'superAdmin' ? '#008751' : '#142920',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontWeight: 'bold',
                }}
              >
                🛡️ Super Admin
              </button>

              <button
                onClick={() => handleRoleSelect('logout')}
                style={{
                  gridColumn: 'span 2',
                  padding: '8px',
                  borderRadius: '8px',
                  border: !role ? '1.5px solid #ef4444' : '1px solid #1e3a2f',
                  background: !role ? '#991b1b' : '#142920',
                  color: '#fff',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }}
              >
                🌐 Observer Mode (Logged Out)
              </button>
            </div>
          </div>

          {/* 4. DEMO DATA SEEDER */}
          <div style={{ borderTop: '1px solid #1e3a2f', paddingTop: '10px' }}>
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              style={{
                width: '100%',
                padding: '9px',
                borderRadius: '8px',
                border: '1px solid #FFD700',
                background: seedSuccess ? '#008751' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <RefreshCw size={14} className={isSeeding ? 'animate-spin' : ''} />
              <span>{isSeeding ? 'Seeding Demo Data...' : seedSuccess ? 'Demo Data Seeded!' : '⚡ Seed Demo Soul Data'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
