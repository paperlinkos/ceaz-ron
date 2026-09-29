import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  getZones,
  getGroups,
  getChurches,
  getPCFs,
  resolvePCFHierarchy,
} from '../../services/organizationService';
import { assignSoulWinnerHierarchy } from '../../services/userService';
import type { Zone, Group, Church, PCF } from '../../types/organization';
import type { UserProfile } from '../../types/auth';

export const SoulWinnerAssigner: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);
  const [pcfs, setPcfs] = useState<PCF[]>([]);

  // Selection state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedChurchId, setSelectedChurchId] = useState<string>('');
  const [selectedPcfId, setSelectedPcfId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const loadAll = async () => {
    try {
      const [zList, gList, cList, pList] = await Promise.all([
        getZones(),
        getGroups(),
        getChurches(),
        getPCFs(),
      ]);
      setZones(zList);
      setGroups(gList);
      setChurches(cList);
      setPcfs(pList);

      if (navigator.onLine) {
        const snap = await getDocs(collection(db, 'users'));
        const uList = snap.docs.map((d) => d.data() as UserProfile);
        setUsers(uList);
      }
    } catch (err) {
      console.warn('Error loading users/orgs:', err);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const availableGroups = groups.filter((g) => g.zoneId === selectedZoneId);
  const availableChurches = churches.filter((c) => c.groupId === selectedGroupId);
  const availablePcfs = pcfs.filter((p) => p.churchId === selectedChurchId);

  const pendingUsers = users.filter((u) => u.status === 'pendingAssignment');

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedUserId) {
      setError('Please select a Soul Winner to assign.');
      return;
    }
    if (!selectedPcfId) {
      setError('Please complete the hierarchy selection down to PCF.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { pcf, church, group, zone } = await resolvePCFHierarchy(selectedPcfId);

      await assignSoulWinnerHierarchy(selectedUserId, {
        pcfId: pcf.id,
        churchId: church.id,
        groupId: group.id,
        zoneId: zone.id,
        pcfName: pcf.name,
        churchName: church.name,
        groupName: group.name,
        zoneName: zone.name,
      });

      const assignedUser = users.find((u) => u.id === selectedUserId);
      setSuccess(
        `Successfully assigned ${assignedUser?.name || 'Soul Winner'} to ${pcf.name} (${church.name}, ${group.name}, ${zone.name})!`
      );

      setSelectedUserId('');
      setSelectedPcfId('');
      await loadAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="account-card">
      <div className="form-header">
        <h2 className="form-title">
          <UserCheck size={24} className="inline-icon" /> Soul Winner Assignment
        </h2>
        <p className="form-lead">
          Assign registered Soul Winners to their Zone → Group → Church → PCF.
        </p>
      </div>

      {error && (
        <div className="error-box">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-box">
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleAssign} className="record-form">
        <div className="form-group">
          <label className="form-label">1. Select Soul Winner (Pending Assignment) *</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="form-input"
            required
          >
            <option value="">-- Select Soul Winner --</option>
            {pendingUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.email}) - PENDING
              </option>
            ))}
            {users
              .filter((u) => u.status === 'active')
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email}) - ACTIVE
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">2. Select Zone *</label>
          <select
            value={selectedZoneId}
            onChange={(e) => {
              setSelectedZoneId(e.target.value);
              setSelectedGroupId('');
              setSelectedChurchId('');
              setSelectedPcfId('');
            }}
            className="form-input"
            required
          >
            <option value="">-- Select Zone --</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} ({z.code})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">3. Select Group *</label>
          <select
            value={selectedGroupId}
            onChange={(e) => {
              setSelectedGroupId(e.target.value);
              setSelectedChurchId('');
              setSelectedPcfId('');
            }}
            disabled={!selectedZoneId}
            className="form-input"
            required
          >
            <option value="">-- Select Group --</option>
            {availableGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.code})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">4. Select Church *</label>
          <select
            value={selectedChurchId}
            onChange={(e) => {
              setSelectedChurchId(e.target.value);
              setSelectedPcfId('');
            }}
            disabled={!selectedGroupId}
            className="form-input"
            required
          >
            <option value="">-- Select Church --</option>
            {availableChurches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">5. Select PCF *</label>
          <select
            value={selectedPcfId}
            onChange={(e) => setSelectedPcfId(e.target.value)}
            disabled={!selectedChurchId}
            className="form-input"
            required
          >
            <option value="">-- Select PCF --</option>
            {availablePcfs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !selectedPcfId || !selectedUserId}
          className="submit-button"
        >
          <ShieldCheck size={18} />
          <span>{isSubmitting ? 'Assigning...' : 'Assign Soul Winner & Activate'}</span>
        </button>
      </form>
    </div>
  );
};
