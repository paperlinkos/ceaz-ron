import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import {
  getZones,
  getGroups,
  getChurches,
} from '../../services/organizationService';
import { assignSoulWinnerHierarchy } from '../../services/userService';
import type { Zone, Group, Church } from '../../types/organization';
import type { UserProfile } from '../../types/auth';

export const SoulWinnerAssigner: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [churches, setChurches] = useState<Church[]>([]);

  // Selection state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [selectedChurchId, setSelectedChurchId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const loadAll = async () => {
    try {
      const [zList, gList, cList] = await Promise.all([
        getZones(),
        getGroups(),
        getChurches(),
      ]);
      setZones(zList);
      setGroups(gList);
      setChurches(cList);

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

  const pendingUsers = users.filter((u) => u.status === 'pendingAssignment');

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedUserId) {
      setError('Please select a Soul Winner to assign.');
      return;
    }
    if (!selectedChurchId) {
      setError('Please complete the hierarchy selection down to Church.');
      return;
    }

    const church = churches.find((c) => c.id === selectedChurchId);
    const group = groups.find((g) => g.id === (church?.groupId || selectedGroupId));
    const zone = zones.find((z) => z.id === (group?.zoneId || selectedZoneId)) || zones[0];

    if (!church || !group) {
      setError('Selected Church or Group could not be resolved.');
      return;
    }

    setIsSubmitting(true);

    try {
      await assignSoulWinnerHierarchy(selectedUserId, {
        churchId: church.id,
        groupId: group.id,
        zoneId: zone ? zone.id : 'zone-abuja-1',
        churchName: church.name,
        groupName: group.name,
        zoneName: zone ? zone.name : 'Abuja Zone 1',
      });

      const assignedUser = users.find((u) => u.id === selectedUserId);
      setSuccess(
        `Successfully assigned ${assignedUser?.name || 'Soul Winner'} to ${church.name} (${group.name}, ${zone?.name || 'Abuja Zone 1'})!`
      );

      setSelectedUserId('');
      setSelectedChurchId('');
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
          Assign registered Soul Winners to their Zone → Group → Church.
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

        <button
          type="submit"
          disabled={isSubmitting || !selectedChurchId || !selectedUserId}
          className="submit-button"
        >
          <ShieldCheck size={18} />
          <span>{isSubmitting ? 'Assigning...' : 'Assign Soul Winner & Activate'}</span>
        </button>
      </form>
    </div>
  );
};
