import React from 'react';
import { WifiOff, Check, CloudUpload } from 'lucide-react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface StatusBannerProps {
  lastStatus: 'idle' | 'recorded_offline' | 'synced';
  pendingCount: number;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ lastStatus, pendingCount }) => {
  const { isOnline } = useNetworkStatus();

  if (!isOnline) {
    return (
      <div className="banner banner-offline" role="status">
        <WifiOff size={16} />
        <div>
          <strong>OFFLINE — SAVING LOCALLY</strong>
          <p className="banner-subtext">
            {pendingCount > 0
              ? `${pendingCount} record${pendingCount > 1 ? 's' : ''} stored safely on device. Will auto-sync when online.`
              : 'Submissions are stored safely on your device and synced automatically when connected.'}
          </p>
        </div>
      </div>
    );
  }

  if (lastStatus === 'recorded_offline') {
    return (
      <div className="banner banner-success" role="status">
        <Check size={16} />
        <div>
          <strong>RECORDED</strong>
          <p className="banner-subtext">Record saved locally. Will sync to Firebase shortly.</p>
        </div>
      </div>
    );
  }

  if (lastStatus === 'synced') {
    return (
      <div className="banner banner-synced" role="status">
        <CloudUpload size={16} />
        <div>
          <strong>SYNCED</strong>
          <p className="banner-subtext">Your soul-winning record has been synced to Cloud Firestore.</p>
        </div>
      </div>
    );
  }

  return null;
};
