import React from 'react';
import type { SoulWinningRecord } from '../types/record';
import { CheckCircle2, Clock, MapPin, Phone } from 'lucide-react';

interface RecentSubmissionsProps {
  records: SoulWinningRecord[];
  isLoading: boolean;
}

export const RecentSubmissions: React.FC<RecentSubmissionsProps> = ({ records, isLoading }) => {
  if (isLoading) {
    return (
      <div className="submissions-card">
        <h3 className="submissions-title">My Recent Submissions</h3>
        <p className="loading-text">Loading local records...</p>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="submissions-card empty-card">
        <h3 className="submissions-title">My Recent Submissions</h3>
        <p className="empty-text">No records recorded on this device yet. Use the form above to record your first soul won!</p>
      </div>
    );
  }

  return (
    <div className="submissions-card">
      <div className="submissions-header">
        <h3 className="submissions-title">My Recent Submissions</h3>
        <span className="count-pill">{records.length} Recorded</span>
      </div>

      <div className="records-list">
        {records.map((record) => {
          const formattedDate = new Date(record.clientCreatedAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div key={record.id} className="record-item">
              <div className="record-main-info">
                <div className="record-name-row">
                  <h4 className="record-name">{record.name}</h4>
                  {record.syncStatus === 'synced' ? (
                    <span className="badge badge-synced" title="Synced to Firebase Cloud">
                      <CheckCircle2 size={12} /> SYNCED
                    </span>
                  ) : (
                    <span className="badge badge-pending" title="Saved locally — waiting to sync">
                      <Clock size={12} /> PENDING SYNC
                    </span>
                  )}
                </div>

                <div className="record-meta-row">
                  <span className="meta-item">
                    <Phone size={13} />
                    {record.phone}
                  </span>
                  <span className="meta-item">
                    <MapPin size={13} />
                    {record.location}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {record.isBornAgain !== false && (
                    <span style={{ fontSize: '0.68rem', background: 'rgba(0, 135, 81, 0.2)', color: '#4ade80', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(0, 135, 81, 0.4)', fontWeight: 'bold' }}>
                      ✨ Born Again
                    </span>
                  )}
                  {record.isFilledWithHolySpirit !== false && (
                    <span style={{ fontSize: '0.68rem', background: 'rgba(255, 215, 0, 0.15)', color: '#FFD700', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255, 215, 0, 0.4)', fontWeight: 'bold' }}>
                      🔥 Spirit Filled
                    </span>
                  )}
                </div>
              </div>

              <div className="record-time">{formattedDate}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
