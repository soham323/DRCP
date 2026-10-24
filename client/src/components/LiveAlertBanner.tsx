import React, { useEffect } from 'react';
import { RealtimeEvent, DisasterItem } from '../types/enums';
import { RadioIcon, CloseIcon, AlertIcon } from './Icons';

export interface AlertNotification {
  id: string;
  event: RealtimeEvent;
  title: string;
  disaster: DisasterItem;
  timestamp: string;
}

interface LiveAlertBannerProps {
  alert: AlertNotification | null;
  onDismiss: () => void;
  onViewDisaster: (disaster: DisasterItem) => void;
}

export const LiveAlertBanner: React.FC<LiveAlertBannerProps> = ({
  alert,
  onDismiss,
  onViewDisaster,
}) => {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 7000);
    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const isCreated = alert.event === RealtimeEvent.DISASTER_CREATED;

  return (
    <div className={`live-alert-toast ${isCreated ? 'toast-created' : 'toast-updated'}`} id="live-alert-toast">
      <div className="toast-icon">
        <RadioIcon size={18} color="#ffffff" />
      </div>

      <div className="toast-content">
        <div className="toast-tag">
          {isCreated ? 'REAL-TIME BROADCAST: NEW INCIDENT' : 'REAL-TIME BROADCAST: STATUS UPDATED'}
        </div>
        <h4 className="toast-title">{alert.disaster.title}</h4>
        <p className="toast-loc">{alert.disaster.location.name}</p>
      </div>

      <div className="toast-actions">
        <button
          id="btn-toast-view"
          className="btn-toast-action"
          onClick={() => {
            onViewDisaster(alert.disaster);
            onDismiss();
          }}
        >
          Inspect
        </button>
        <button
          id="btn-toast-dismiss"
          className="btn-toast-close"
          onClick={onDismiss}
          title="Dismiss alert"
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
};
