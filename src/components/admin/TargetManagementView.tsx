import React, { useState, useEffect, useMemo } from 'react';
import {
  Target as TargetIcon,
  Save,
  AlertCircle,
  CheckCircle2,
  Search,
  Building,
  Users,
  Check,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  getTargets,
  saveTarget,
  saveMultipleTargets,
  getOfficialTarget,
  resetTargetsToOfficialDefaults,
} from '../../services/targetService';
import { getGroups, getChurches, getPCFs } from '../../services/organizationService';
import { getAllLocalRecords } from '../../services/indexedDbService';
import { REACH_OUT_NIGERIA_EVENT } from '../../config/eventConfig';
import { useEventConfig } from '../../hooks/useEventConfig';
import type { Target, TargetLevel, TargetFormData } from '../../types/target';
import type { Group, Church, PCF } from '../../types/organization';
import type { SoulWinningRecord } from '../../types/record';

type ActiveMatrixTab = 'groups' | 'churches' | 'pcfs' | 'single';

export const TargetManagementView: React.FC = () => {
  const { userProfile, role } = useAuth();
  const isSuperAdmin = role === 'superAdmin';
  const { eventConfig } = useEventConfig();

  const [activeTab, setActiveTab] = useState<ActiveMatrixTab>('groups');
  const [targets, setTargets] = useState<Target[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [pcfs, setPcfs] = useState<PCF[]>([]);
  const [records, setRecords] = useState<SoulWinningRecord[]>([]);

  // Draft inputs for fast inline editing
  const [groupDrafts, setGroupDrafts] = useState<Record<string, number>>({});
  const [churchDrafts, setChurchDrafts] = useState<Record<string, number>>({});
  const [pcfDrafts, setPcfDrafts] = useState<Record<string, number>>({});

  // Single target state
  const [singleLevel, setSingleLevel] = useState<TargetLevel>('zone');
  const [singleOrgId, setSingleOrgId] = useState<string>('default_zone');
  const [singleTargetInput, setSingleTargetInput] = useState<string>('50000');

  // Filters & Search
  const [groupSearch, setGroupSearch] = useState<string>('');
  const [churchSearch, setChurchSearch] = useState<string>('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [pcfChurchFilter, setPcfChurchFilter] = useState<string>('all');

  // UI state
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedRowIds, setSavedRowIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, gList, cList, pList, rList] = await Promise.all([
        getTargets(),
        getGroups(),
        getChurches(),
        getPCFs(),
        getAllLocalRecords(),
      ]);
      setTargets(tList);
      setGroups(gList);
      setChurches(cList);
      setPcfs(pList);
      setRecords(rList);

      // Populate initial drafts from active targets or official PDF targets
      const gDrafts: Record<string, number> = {};
      gList.forEach((g) => {
        const found = tList.find((t) => t.level === 'group' && t.organizationId === g.id && t.status === 'active');
        const official = getOfficialTarget('group', g.id);
        gDrafts[g.id] = found ? found.target : (official ?? 1000);
      });
      setGroupDrafts(gDrafts);

      const cDrafts: Record<string, number> = {};
      cList.forEach((c) => {
        const found = tList.find((t) => t.level === 'church' && t.organizationId === c.id && t.status === 'active');
        const official = getOfficialTarget('church', c.id);
        cDrafts[c.id] = found ? found.target : (official ?? 100);
      });
      setChurchDrafts(cDrafts);

      const pDrafts: Record<string, number> = {};
      pList.forEach((p) => {
        const found = tList.find((t) => t.level === 'pcf' && t.organizationId === p.id && t.status === 'active');
        pDrafts[p.id] = found ? found.target : 50;
      });
      setPcfDrafts(pDrafts);

      // Pre-fill single form
      const existingZone = tList.find((t) => t.level === 'zone' && t.status === 'active');
      setSingleTargetInput(existingZone ? existingZone.target.toString() : (eventConfig.target || 50000).toString());
    } catch (err) {
      console.warn('Error loading target data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [eventConfig.target]);

  // Actual souls calculation maps
  const groupSoulsWon = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      if (r.groupId) {
        map[r.groupId] = (map[r.groupId] || 0) + 1;
      }
    });
    return map;
  }, [records]);

  const churchSoulsWon = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      if (r.churchId) {
        map[r.churchId] = (map[r.churchId] || 0) + 1;
      }
    });
    return map;
  }, [records]);

  const pcfSoulsWon = useMemo(() => {
    const map: Record<string, number> = {};
    records.forEach((r) => {
      if (r.pcfId) {
        map[r.pcfId] = (map[r.pcfId] || 0) + 1;
      }
    });
    return map;
  }, [records]);

  // Summaries
  const zonalTargetGoal = useMemo(() => {
    const zoneTarget = targets.find((t) => t.level === 'zone' && t.status === 'active');
    return zoneTarget ? zoneTarget.target : eventConfig.target || REACH_OUT_NIGERIA_EVENT.zonalTarget;
  }, [targets, eventConfig.target]);

  const totalGroupTargetAllocated = useMemo(() => {
    return Object.values(groupDrafts).reduce((acc, val) => acc + (val || 0), 0);
  }, [groupDrafts]);

  const totalChurchTargetAllocated = useMemo(() => {
    return Object.values(churchDrafts).reduce((acc, val) => acc + (val || 0), 0);
  }, [churchDrafts]);

  // Handler: Change single target level
  const handleSingleLevelChange = (lvl: TargetLevel) => {
    setSingleLevel(lvl);
    setError(null);
    setSuccessMsg(null);
    if (lvl === 'zone') {
      setSingleOrgId('default_zone');
      setSingleTargetInput(zonalTargetGoal.toString());
    } else if (lvl === 'group') {
      if (groups.length > 0) {
        setSingleOrgId(groups[0].id);
        setSingleTargetInput((groupDrafts[groups[0].id] || 1000).toString());
      }
    } else if (lvl === 'church') {
      if (churches.length > 0) {
        setSingleOrgId(churches[0].id);
        setSingleTargetInput((churchDrafts[churches[0].id] || 250).toString());
      }
    } else if (lvl === 'pcf') {
      if (pcfs.length > 0) {
        setSingleOrgId(pcfs[0].id);
        setSingleTargetInput((pcfDrafts[pcfs[0].id] || 50).toString());
      }
    }
  };

  // Handler: Save Individual Target Row
  const handleSaveSingleRow = async (level: TargetLevel, orgId: string, targetVal: number) => {
    if (!isSuperAdmin) return;
    if (targetVal <= 0 || isNaN(targetVal)) {
      setError('Target must be greater than zero.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    try {
      const saved = await saveTarget(
        { level, organizationId: orgId, target: targetVal },
        userProfile?.id || 'superAdmin'
      );
      setTargets((prev) => {
        const filtered = prev.filter((t) => !(t.level === level && t.organizationId === orgId));
        return [...filtered, saved];
      });
      setSavedRowIds((prev) => ({ ...prev, [orgId]: true }));
      setTimeout(() => {
        setSavedRowIds((prev) => ({ ...prev, [orgId]: false }));
      }, 2500);
      setSuccessMsg(`Target of ${targetVal.toLocaleString()} saved successfully.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    }
  };

  // Handler: Batch Save All Group Targets
  const handleSaveAllGroups = async () => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const items: TargetFormData[] = Object.entries(groupDrafts).map(([orgId, val]) => ({
        level: 'group',
        organizationId: orgId,
        target: val,
      }));

      const saved = await saveMultipleTargets(items, userProfile?.id || 'superAdmin');
      setTargets((prev) => {
        const savedIds = new Set(saved.map((s) => s.id));
        const filtered = prev.filter((t) => !savedIds.has(t.id));
        return [...filtered, ...saved];
      });

      setSuccessMsg(`Successfully saved all ${saved.length} group targets! Total: ${totalGroupTargetAllocated.toLocaleString()} souls.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Batch Save All Church Targets
  const handleSaveAllChurches = async () => {
    if (!isSuperAdmin) return;
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const items: TargetFormData[] = Object.entries(churchDrafts).map(([orgId, val]) => ({
        level: 'church',
        organizationId: orgId,
        target: val,
      }));

      const saved = await saveMultipleTargets(items, userProfile?.id || 'superAdmin');
      setTargets((prev) => {
        const savedIds = new Set(saved.map((s) => s.id));
        const filtered = prev.filter((t) => !savedIds.has(t.id));
        return [...filtered, ...saved];
      });

      setSuccessMsg(`Successfully saved all ${saved.length} church targets! Total: ${totalChurchTargetAllocated.toLocaleString()} souls.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Single Target Submit
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(singleTargetInput, 10);
    if (isNaN(num) || num <= 0) {
      setError('Target must be a valid positive number.');
      return;
    }
    setIsSaving(true);
    try {
      const saved = await saveTarget(
        { level: singleLevel, organizationId: singleOrgId, target: num },
        userProfile?.id || 'superAdmin'
      );
      setTargets((prev) => {
        const filtered = prev.filter((t) => !(t.level === singleLevel && t.organizationId === singleOrgId));
        return [...filtered, saved];
      });

      if (singleLevel === 'group') {
        setGroupDrafts((prev) => ({ ...prev, [singleOrgId]: num }));
      } else if (singleLevel === 'church') {
        setChurchDrafts((prev) => ({ ...prev, [singleOrgId]: num }));
      } else if (singleLevel === 'pcf') {
        setPcfDrafts((prev) => ({ ...prev, [singleOrgId]: num }));
      }

      setSuccessMsg(`Saved target of ${num.toLocaleString()} souls for ${singleLevel.toUpperCase()}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Handler: Reset all targets to official PDF defaults
  const handleResetToOfficialDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all Group and Church targets to the official values from the PDF document? This will overwrite any custom targets and sync across the entire zone.')) {
      return;
    }
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const resetList = await resetTargetsToOfficialDefaults(userProfile?.id || 'superAdmin');
      setTargets(resetList);

      const gDrafts: Record<string, number> = {};
      groups.forEach((g) => {
        const found = resetList.find((t) => t.level === 'group' && t.organizationId === g.id && t.status === 'active');
        gDrafts[g.id] = found ? found.target : (getOfficialTarget('group', g.id) ?? 1000);
      });
      setGroupDrafts(gDrafts);

      const cDrafts: Record<string, number> = {};
      churches.forEach((c) => {
        const found = resetList.find((t) => t.level === 'church' && t.organizationId === c.id && t.status === 'active');
        cDrafts[c.id] = found ? found.target : (getOfficialTarget('church', c.id) ?? 100);
      });
      setChurchDrafts(cDrafts);

      setSuccessMsg(`Successfully restored all 20 Groups and 98 Churches to their official targets from the PDF document! Total: ${totalChurchTargetAllocated.toLocaleString()} souls.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Milestone progression color helper (The ONLY colored elements in the table)
  const getMilestoneProgressStyle = (pct: number) => {
    if (pct >= 100) {
      return {
        background: '#ecfdf5',
        color: '#065f46',
        border: '1px solid #6ee7b7',
        badge: '👑',
      };
    }
    if (pct >= 75) {
      return {
        background: '#faf5ff',
        color: '#6b21a8',
        border: '1px solid #d8b4fe',
        badge: '🥇',
      };
    }
    if (pct >= 50) {
      return {
        background: '#eff6ff',
        color: '#1e40af',
        border: '1px solid #93c5fd',
        badge: '🥈',
      };
    }
    if (pct >= 25) {
      return {
        background: '#fffbeb',
        color: '#92400e',
        border: '1px solid #fcd34d',
        badge: '🥉',
      };
    }
    return {
      background: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      badge: '',
    };
  };

  if (!isSuperAdmin) {
    return (
      <div className="account-card empty-card" style={{ background: '#ffffff', border: '1px solid #e2e8f0' }}>
        <AlertCircle size={32} style={{ color: '#0f172a' }} />
        <h3 className="account-title" style={{ color: '#0f172a' }}>Target Management Restricted</h3>
        <p className="account-lead" style={{ color: '#64748b' }}>
          Managing organizational targets is reserved for SuperAdmin accounts only.
        </p>
      </div>
    );
  }

  // Filtered lists
  const filteredGroups = groups.filter(
    (g) =>
      g.name.toLowerCase().includes(groupSearch.toLowerCase()) ||
      g.code.toLowerCase().includes(groupSearch.toLowerCase())
  );

  const filteredChurches = churches.filter((c) => {
    const matchesGroup = selectedGroupFilter === 'all' || c.groupId === selectedGroupFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(churchSearch.toLowerCase()) ||
      c.code.toLowerCase().includes(churchSearch.toLowerCase());
    return matchesGroup && matchesSearch;
  });

  const filteredPcfs = pcfs.filter((p) => {
    return pcfChurchFilter === 'all' || p.churchId === pcfChurchFilter;
  });

  return (
    <div className="account-card" style={{ maxWidth: '1150px', margin: '0 auto', background: '#ffffff', border: '1px solid #e2e8f0' }}>
      {/* Header */}
      <div className="form-header" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', border: '1px solid #e2e8f0' }}>
          <TargetIcon size={22} />
        </div>
        <div>
          <h2 className="form-title" style={{ color: '#0f172a', fontWeight: '800', margin: 0, fontSize: '1.25rem', letterSpacing: '-0.01em' }}>
            TARGET CONFIGURATION MATRIX
          </h2>
          <p className="form-lead" style={{ color: '#64748b', margin: '3px 0 0 0', fontSize: '0.85rem' }}>
            Manage target soul-winning goals for the Zone, Groups, Churches, and PCFs with live progress tracking and bulk editing.
          </p>
        </div>
      </div>

      {/* TOP SUMMARY STATS BAR (PURE MONOCHROME) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '14px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '18px 20px',
          marginBottom: '24px',
        }}
      >
        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', letterSpacing: '0.04em' }}>TOTAL ZONAL TARGET</span>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', marginTop: '3px' }}>
            {zonalTargetGoal.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>SOULS</span>
          </div>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', letterSpacing: '0.04em' }}>SUM OF GROUP TARGETS</span>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', marginTop: '3px' }}>
            {totalGroupTargetAllocated.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>SOULS</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>
            {((totalGroupTargetAllocated / zonalTargetGoal) * 100).toFixed(1)}% of Zonal Target
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', letterSpacing: '0.04em' }}>SUM OF CHURCH TARGETS</span>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', marginTop: '3px' }}>
            {totalChurchTargetAllocated.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>SOULS</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>
            Across {churches.length} active churches
          </span>
        </div>

        <div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', letterSpacing: '0.04em' }}>TOTAL SOULS WON (LIVE)</span>
          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', marginTop: '3px' }}>
            {records.length.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>SOULS</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '500' }}>
            {((records.length / zonalTargetGoal) * 100).toFixed(1)}% achieved
          </span>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: '600' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.86rem', fontWeight: '600' }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* MATRIX SUBTABS & RESTORE BUTTON (MONOCHROME) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <button
            type="button"
            onClick={() => { setActiveTab('groups'); setError(null); setSuccessMsg(null); }}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'groups' ? '#0f172a' : 'transparent',
              color: activeTab === 'groups' ? '#ffffff' : '#475569',
              boxShadow: activeTab === 'groups' ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Users size={15} /> GROUPS TARGETS ({groups.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('churches'); setError(null); setSuccessMsg(null); }}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'churches' ? '#0f172a' : 'transparent',
              color: activeTab === 'churches' ? '#ffffff' : '#475569',
              boxShadow: activeTab === 'churches' ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Building size={15} /> CHURCHES TARGETS ({churches.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('pcfs'); setError(null); setSuccessMsg(null); }}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'pcfs' ? '#0f172a' : 'transparent',
              color: activeTab === 'pcfs' ? '#ffffff' : '#475569',
              boxShadow: activeTab === 'pcfs' ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            PCFs TARGETS ({pcfs.length})
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('single'); setError(null); setSuccessMsg(null); }}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: '700',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: activeTab === 'single' ? '#0f172a' : 'transparent',
              color: activeTab === 'single' ? '#ffffff' : '#475569',
              boxShadow: activeTab === 'single' ? '0 1px 3px rgba(15,23,42,0.12)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <TargetIcon size={15} /> QUICK SINGLE SETTER
          </button>
        </div>

        <button
          type="button"
          onClick={handleResetToOfficialDefaults}
          disabled={isSaving}
          style={{
            padding: '8px 16px',
            fontSize: '0.82rem',
            fontWeight: '700',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: '8px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Restore all groups and churches to their exact official targets from the PDF document"
        >
          <RotateCcw size={15} />
          <span>{isSaving ? 'RESTORING...' : 'RESET TO OFFICIAL PDF TARGETS'}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#64748b', fontSize: '0.9rem' }}>
          Loading targets and organizational units...
        </div>
      ) : activeTab === 'groups' ? (
        /* ================= TAB 1: GROUPS TARGET MATRIX ================= */
        <div>
          {/* Actions & Search */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#64748b' }} />
              <input
                type="text"
                value={groupSearch}
                onChange={(e) => setGroupSearch(e.target.value)}
                placeholder="Search Group by name or code..."
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.86rem',
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleSaveAllGroups}
              disabled={isSaving}
              style={{
                padding: '9px 18px',
                fontWeight: '700',
                fontSize: '0.84rem',
                borderRadius: '8px',
                border: '1px solid #0f172a',
                background: '#0f172a',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                boxShadow: '0 1px 3px rgba(15,23,42,0.15)',
              }}
            >
              <Save size={16} />
              <span>{isSaving ? 'SAVING GROUPS...' : 'SAVE ALL GROUP TARGETS'}</span>
            </button>
          </div>

          {/* Groups Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>GROUP NAME & CODE</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>CHURCHES</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>OFFICIAL PDF TARGET</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>SOULS WON</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>CURRENT TARGET (SOULS)</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>PROGRESS</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((g) => {
                  const currentTarget = groupDrafts[g.id] || 0;
                  const officialTarget = getOfficialTarget('group', g.id);
                  const isModified = officialTarget !== undefined && currentTarget !== officialTarget;
                  const actual = groupSoulsWon[g.id] || 0;
                  const pct = currentTarget > 0 ? Math.round((actual / currentTarget) * 100) : 0;
                  const churchCount = churches.filter((c) => c.groupId === g.id).length;
                  const isSaved = savedRowIds[g.id];
                  const mStyle = getMilestoneProgressStyle(pct);

                  return (
                    <tr
                      key={g.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSaved ? '#f8fafc' : 'transparent',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.92rem' }}>{g.name}</div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {g.code}</span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#475569', fontWeight: '500' }}>
                        {churchCount} Churches
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>
                          {officialTarget ? officialTarget.toLocaleString() : 'N/A'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: '800' }}>
                        {actual.toLocaleString()}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={currentTarget}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setGroupDrafts((prev) => ({ ...prev, [g.id]: val }));
                          }}
                          style={{
                            maxWidth: '130px',
                            padding: '6px 10px',
                            fontWeight: '700',
                            color: '#0f172a',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.88rem',
                          }}
                        />
                        {isModified ? (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', fontWeight: '600' }}>
                            Custom (PDF: {officialTarget?.toLocaleString()})
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', fontWeight: '600' }}>
                            Matches PDF
                          </div>
                        )}
                      </td>

                      {/* Milestone progression colors only */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '0.78rem',
                            fontWeight: '800',
                            background: mStyle.background,
                            color: mStyle.color,
                            border: mStyle.border,
                          }}
                        >
                          {mStyle.badge && <span style={{ fontSize: '0.85rem' }}>{mStyle.badge}</span>}
                          <span>{pct}%</span>
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveSingleRow('group', g.id, currentTarget)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: isSaved ? '#0f172a' : '#cbd5e1',
                            background: isSaved ? '#0f172a' : '#ffffff',
                            color: isSaved ? '#ffffff' : '#0f172a',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                          title="Save this group's target"
                        >
                          {isSaved ? <Check size={14} /> : <Save size={14} />}
                          <span>{isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'churches' ? (
        /* ================= TAB 2: CHURCHES TARGET MATRIX ================= */
        <div>
          {/* Filters & Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '240px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: '#64748b' }} />
                <input
                  type="text"
                  value={churchSearch}
                  onChange={(e) => setChurchSearch(e.target.value)}
                  placeholder="Search Church name..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.86rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Filter size={16} style={{ color: '#64748b' }} />
                <select
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                  style={{
                    width: '240px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.86rem',
                  }}
                >
                  <option value="all">All Groups ({churches.length} churches)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAllChurches}
              disabled={isSaving}
              style={{
                padding: '9px 18px',
                fontWeight: '700',
                fontSize: '0.84rem',
                borderRadius: '8px',
                border: '1px solid #0f172a',
                background: '#0f172a',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                boxShadow: '0 1px 3px rgba(15,23,42,0.15)',
              }}
            >
              <Save size={16} />
              <span>{isSaving ? 'SAVING CHURCHES...' : 'SAVE ALL CHURCH TARGETS'}</span>
            </button>
          </div>

          {/* Churches Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>CHURCH NAME</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>PARENT GROUP</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>OFFICIAL PDF TARGET</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>SOULS WON</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>CURRENT TARGET (SOULS)</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>PROGRESS</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredChurches.map((c) => {
                  const currentTarget = churchDrafts[c.id] || 0;
                  const officialTarget = getOfficialTarget('church', c.id);
                  const isModified = officialTarget !== undefined && currentTarget !== officialTarget;
                  const actual = churchSoulsWon[c.id] || 0;
                  const pct = currentTarget > 0 ? Math.round((actual / currentTarget) * 100) : 0;
                  const parentGroup = groups.find((g) => g.id === c.groupId);
                  const isSaved = savedRowIds[c.id];
                  const mStyle = getMilestoneProgressStyle(pct);

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSaved ? '#f8fafc' : 'transparent',
                        transition: 'background 0.2s ease',
                      }}
                    >
                      {/* CHURCH NAME & CODE - BOLD & HIGHLY VISIBLE */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.92rem' }}>{c.name}</div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {c.code}</span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#334155', fontWeight: '600' }}>
                        {parentGroup?.name || 'Unassigned'}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>
                          {officialTarget ? officialTarget.toLocaleString() : 'N/A'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: '800' }}>
                        {actual.toLocaleString()}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={currentTarget}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setChurchDrafts((prev) => ({ ...prev, [c.id]: val }));
                          }}
                          style={{
                            maxWidth: '130px',
                            padding: '6px 10px',
                            fontWeight: '700',
                            color: '#0f172a',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.88rem',
                          }}
                        />
                        {isModified ? (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', fontWeight: '600' }}>
                            Custom (PDF: {officialTarget?.toLocaleString()})
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px', fontWeight: '600' }}>
                            Matches PDF
                          </div>
                        )}
                      </td>

                      {/* Milestone progression colors only */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '0.78rem',
                            fontWeight: '800',
                            background: mStyle.background,
                            color: mStyle.color,
                            border: mStyle.border,
                          }}
                        >
                          {mStyle.badge && <span style={{ fontSize: '0.85rem' }}>{mStyle.badge}</span>}
                          <span>{pct}%</span>
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveSingleRow('church', c.id, currentTarget)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: isSaved ? '#0f172a' : '#cbd5e1',
                            background: isSaved ? '#0f172a' : '#ffffff',
                            color: isSaved ? '#ffffff' : '#0f172a',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                          title="Save this church's target"
                        >
                          {isSaved ? <Check size={14} /> : <Save size={14} />}
                          <span>{isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'pcfs' ? (
        /* ================= TAB 3: PCF TARGET MATRIX ================= */
        <div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
            <Filter size={16} style={{ color: '#64748b' }} />
            <select
              value={pcfChurchFilter}
              onChange={(e) => setPcfChurchFilter(e.target.value)}
              style={{
                maxWidth: '300px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '0.86rem',
              }}
            >
              <option value="all">All Churches ({pcfs.length} PCFs)</option>
              {churches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#ffffff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>PCF NAME & CODE</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>CHURCH</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>SOULS WON</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>TARGET GOAL (SOULS)</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em' }}>PROGRESS</th>
                  <th style={{ padding: '12px 16px', fontSize: '0.72rem', fontWeight: '700', letterSpacing: '0.04em', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredPcfs.map((p) => {
                  const currentTarget = pcfDrafts[p.id] || 0;
                  const actual = pcfSoulsWon[p.id] || 0;
                  const pct = currentTarget > 0 ? Math.round((actual / currentTarget) * 100) : 0;
                  const parentChurch = churches.find((c) => c.id === p.churchId);
                  const isSaved = savedRowIds[p.id];
                  const mStyle = getMilestoneProgressStyle(pct);

                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.92rem' }}>{p.name}</div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Code: {p.code}</span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#334155', fontWeight: '600' }}>
                        {parentChurch?.name || 'Unassigned'}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: '800' }}>
                        {actual.toLocaleString()}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={currentTarget}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 0;
                            setPcfDrafts((prev) => ({ ...prev, [p.id]: val }));
                          }}
                          style={{
                            maxWidth: '120px',
                            padding: '6px 10px',
                            fontWeight: '700',
                            color: '#0f172a',
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.88rem',
                          }}
                        />
                      </td>

                      {/* Milestone progression colors only */}
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '16px',
                            fontSize: '0.78rem',
                            fontWeight: '800',
                            background: mStyle.background,
                            color: mStyle.color,
                            border: mStyle.border,
                          }}
                        >
                          {mStyle.badge && <span style={{ fontSize: '0.85rem' }}>{mStyle.badge}</span>}
                          <span>{pct}%</span>
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => handleSaveSingleRow('pcf', p.id, currentTarget)}
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.78rem',
                            fontWeight: '700',
                            borderRadius: '6px',
                            border: '1px solid',
                            borderColor: isSaved ? '#0f172a' : '#cbd5e1',
                            background: isSaved ? '#0f172a' : '#ffffff',
                            color: isSaved ? '#ffffff' : '#0f172a',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {isSaved ? <Check size={14} /> : <Save size={14} />}
                          <span>{isSaved ? 'Saved' : 'Save'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ================= TAB 4: QUICK SINGLE SETTER (MONOCHROME) ================= */
        <div style={{ maxWidth: '600px', margin: '0 auto', background: '#f8fafc', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ color: '#0f172a', fontSize: '1.1rem', marginBottom: '16px', fontWeight: '800' }}>
            SET INDIVIDUAL TARGET
          </h3>
          <form onSubmit={handleSingleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="form-label" style={{ color: '#334155', fontWeight: '700', fontSize: '0.75rem' }}>ORGANIZATION LEVEL</label>
              <select
                value={singleLevel}
                onChange={(e) => handleSingleLevelChange(e.target.value as TargetLevel)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.88rem',
                }}
              >
                <option value="zone">ZONE (Zonal Campaign Overall)</option>
                <option value="group">GROUP LEVEL</option>
                <option value="church">CHURCH LEVEL</option>
                <option value="pcf">PCF LEVEL</option>
              </select>
            </div>

            {singleLevel !== 'zone' && (
              <div className="form-group">
                <label className="form-label" style={{ color: '#334155', fontWeight: '700', fontSize: '0.75rem' }}>SELECT {singleLevel.toUpperCase()}</label>
                <select
                  value={singleOrgId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSingleOrgId(id);
                    if (singleLevel === 'group') {
                      setSingleTargetInput((groupDrafts[id] || 1000).toString());
                    } else if (singleLevel === 'church') {
                      setSingleTargetInput((churchDrafts[id] || 250).toString());
                    } else if (singleLevel === 'pcf') {
                      setSingleTargetInput((pcfDrafts[id] || 50).toString());
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#0f172a',
                    fontSize: '0.88rem',
                  }}
                >
                  {singleLevel === 'group' &&
                    groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </option>
                    ))}
                  {singleLevel === 'church' &&
                    churches.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  {singleLevel === 'pcf' &&
                    pcfs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" style={{ color: '#334155', fontWeight: '700', fontSize: '0.75rem' }}>TARGET SOUL GOAL</label>
              <input
                type="number"
                min="1"
                step="1"
                value={singleTargetInput}
                onChange={(e) => setSingleTargetInput(e.target.value)}
                placeholder="e.g. 5000"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  fontSize: '0.88rem',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              style={{
                width: '100%',
                padding: '11px 18px',
                fontWeight: '700',
                fontSize: '0.88rem',
                borderRadius: '8px',
                border: '1px solid #0f172a',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                boxShadow: '0 1px 3px rgba(15,23,42,0.15)',
              }}
            >
              <Save size={18} />
              <span>{isSaving ? 'SAVING TARGET...' : 'SAVE TARGET'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
