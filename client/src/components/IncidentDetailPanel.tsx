import React, { useState } from 'react';
import {
  DisasterItem,
  EmergencyResourceItem,
  CommunityReportItem,
  AuthUser,
  UserRole,
  DisasterStatus,
  ResourceType,
} from '../types/enums';
import {
  AlertIcon,
  MapPinIcon,
  RefreshIcon,
  TrashIcon,
  HospitalIcon,
  ShelterIcon,
  WaterIcon,
  FoodIcon,
  RescueIcon,
  CheckIcon,
} from './Icons';

interface IncidentDetailPanelProps {
  disaster: DisasterItem | null;
  currentUser: AuthUser | null;
  resources: EmergencyResourceItem[];
  radiusKm: number;
  onRadiusChange: (radius: number) => void;
  resourceTypeFilter: ResourceType | undefined;
  onResourceTypeFilterChange: (type: ResourceType | undefined) => void;
  reports: CommunityReportItem[];
  cacheHeader: string;
  isReportsDegraded: boolean;
  isLoadingReports: boolean;
  onRefreshReports: () => void;
  onUpdateStatus: (id: string, status: DisasterStatus) => Promise<void>;
  onDeleteDisaster: (id: string) => Promise<void>;
}

export const IncidentDetailPanel: React.FC<IncidentDetailPanelProps> = ({
  disaster,
  currentUser,
  resources,
  radiusKm,
  onRadiusChange,
  resourceTypeFilter,
  onResourceTypeFilterChange,
  reports,
  cacheHeader,
  isReportsDegraded,
  isLoadingReports,
  onRefreshReports,
  onUpdateStatus,
  onDeleteDisaster,
}) => {
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!disaster) {
    return (
      <section className="detail-panel empty-detail" id="incident-detail-panel">
        <div className="empty-selection">
          <AlertIcon size={36} color="#64748b" />
          <h3>No Disaster Selected</h3>
          <p>Select an incident from the list or click a marker on the map to inspect proximity resources and live community reports.</p>
        </div>
      </section>
    );
  }

  const canEdit = currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CONTRIBUTOR);
  const canDelete = currentUser && currentUser.role === UserRole.ADMIN;

  const handleStatusChange = async (newStatus: DisasterStatus) => {
    setIsUpdatingStatus(true);
    setActionError(null);
    try {
      await onUpdateStatus(disaster.id, newStatus);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to permanently delete incident: "${disaster.title}"?`)) {
      return;
    }
    setIsDeleting(true);
    setActionError(null);
    try {
      await onDeleteDisaster(disaster.id);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete disaster');
    } finally {
      setIsDeleting(false);
    }
  };

  const getResourceIcon = (type: ResourceType) => {
    switch (type) {
      case ResourceType.HOSPITAL:
        return <HospitalIcon size={16} color="#2563eb" />;
      case ResourceType.SHELTER:
        return <ShelterIcon size={16} color="#8b5cf6" />;
      case ResourceType.FOOD:
        return <FoodIcon size={16} color="#10b981" />;
      case ResourceType.WATER:
        return <WaterIcon size={16} color="#06b6d4" />;
      case ResourceType.RESCUE_TEAM:
        return <RescueIcon size={16} color="#f97316" />;
    }
  };

  return (
    <section className="detail-panel" id="incident-detail-panel">
      {actionError && (
        <div className="error-alert" id="detail-action-error">
          <span>{actionError}</span>
        </div>
      )}

      {/* Incident Header */}
      <div className="detail-header">
        <div className="detail-status-row">
          <span className={`status-badge status-${disaster.status.toLowerCase()}`}>
            {disaster.status}
          </span>
          <div className="coords-chip">
            [{disaster.location.latitude.toFixed(4)}, {disaster.location.longitude.toFixed(4)}]
          </div>
        </div>

        <h2 className="detail-title" id="selected-incident-title">{disaster.title}</h2>

        <div className="detail-location">
          <MapPinIcon size={16} color="#38bdf8" />
          <span>{disaster.location.name}</span>
        </div>

        <p className="detail-description">{disaster.description}</p>

        <div className="detail-tags">
          {disaster.tags.map((t) => (
            <span key={t} className="tag-chip">
              #{t}
            </span>
          ))}
        </div>

        {/* RBAC Operations Bar */}
        {canEdit && (
          <div className="rbac-operations-bar">
            <div className="status-dropdown-wrap">
              <label htmlFor="select-incident-status">Status:</label>
              <select
                id="select-incident-status"
                className="form-select-sm"
                value={disaster.status}
                disabled={isUpdatingStatus}
                onChange={(e) => handleStatusChange(e.target.value as DisasterStatus)}
              >
                <option value={DisasterStatus.ACTIVE}>ACTIVE</option>
                <option value={DisasterStatus.CONTAINED}>CONTAINED</option>
                <option value={DisasterStatus.RESOLVED}>RESOLVED</option>
              </select>
            </div>

            {canDelete && (
              <button
                id="btn-delete-incident"
                className="btn btn-danger-sm"
                onClick={handleDelete}
                disabled={isDeleting}
                title="Admin deletion privilege"
              >
                <TrashIcon size={14} />
                <span>{isDeleting ? 'Deleting...' : 'Delete Incident'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Geospatial Haversine Proximity Search Section */}
      <div className="detail-section proximity-section">
        <div className="section-header-row">
          <h3 className="section-heading">Emergency Assets Proximity</h3>
          <span className="results-badge" id="nearby-resources-count">{resources.length} found</span>
        </div>

        <div className="radius-slider-card">
          <div className="radius-slider-header">
            <label htmlFor="radius-slider">Proximity Search Radius:</label>
            <span className="radius-val" id="current-radius-label">{radiusKm} km</span>
          </div>

          <input
            id="radius-slider"
            type="range"
            min="1"
            max="50"
            step="1"
            value={radiusKm}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="radius-range-input"
          />

          <div className="radius-presets">
            {[1, 3, 5, 10, 20, 50].map((r) => (
              <button
                key={r}
                id={`btn-preset-radius-${r}`}
                type="button"
                className={`preset-btn ${radiusKm === r ? 'active' : ''}`}
                onClick={() => onRadiusChange(r)}
              >
                {r}km
              </button>
            ))}
          </div>
        </div>

        {/* Resource Type Filter */}
        <div className="resource-filter-row">
          <button
            type="button"
            className={`pill-btn-sm ${!resourceTypeFilter ? 'active' : ''}`}
            onClick={() => onResourceTypeFilterChange(undefined)}
          >
            All Types
          </button>
          {[
            ResourceType.HOSPITAL,
            ResourceType.SHELTER,
            ResourceType.FOOD,
            ResourceType.WATER,
            ResourceType.RESCUE_TEAM,
          ].map((type) => (
            <button
              key={type}
              id={`filter-res-${type.toLowerCase()}`}
              type="button"
              className={`pill-btn-sm ${resourceTypeFilter === type ? 'active' : ''}`}
              onClick={() => onResourceTypeFilterChange(type)}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Resource Items */}
        <div className="resources-list" id="resources-list-container">
          {resources.length === 0 ? (
            <div className="empty-substate">
              <p>No resources found within {radiusKm} km radius.</p>
              <span className="hint-text">Increase the search radius slider above to discover regional assets.</span>
            </div>
          ) : (
            resources.map((res) => (
              <div key={res.id} className="resource-card" id={`resource-card-${res.id}`}>
                <div className="res-icon-wrap">{getResourceIcon(res.type)}</div>
                <div className="res-info">
                  <div className="res-name-row">
                    <h4 className="res-name">{res.name}</h4>
                    {res.distance_km !== undefined && (
                      <span className="res-distance">{res.distance_km.toFixed(2)} km</span>
                    )}
                  </div>
                  <div className="res-meta-row">
                    <span className="res-type-tag">{res.type}</span>
                    <span className="res-capacity">Cap: {res.capacity}</span>
                    <span className="res-status">{res.status}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cache-Aside Social Reports & Outage Resilience Section */}
      <div className="detail-section cache-section">
        <div className="section-header-row">
          <div className="cache-heading-wrap">
            <h3 className="section-heading">Live Community Social Feed</h3>
            <span className={`cache-badge cache-${cacheHeader.toLowerCase()}`} id="cache-status-badge">
              X-Cache: {cacheHeader}
            </span>
          </div>
          <button
            id="btn-refresh-cache"
            className="btn-icon-sm"
            onClick={onRefreshReports}
            disabled={isLoadingReports}
            title="Reload social reports (Trigger Cache Hit / Miss)"
          >
            <RefreshIcon size={14} className={isLoadingReports ? 'spin-animation' : ''} />
          </button>
        </div>

        {isReportsDegraded && (
          <div className="degraded-alert" id="cache-degraded-notice">
            <AlertIcon size={14} color="#f59e0b" />
            <span>Downstream gateway outage detected. Serving baseline cached reports via Circuit Breaker.</span>
          </div>
        )}

        <div className="reports-list" id="community-reports-container">
          {reports.length === 0 ? (
            <div className="empty-substate">
              <p>No reports currently available.</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="report-item">
                <div className="report-author-row">
                  <span className="report-author">{report.author}</span>
                  <span className="report-source">{report.source}</span>
                </div>
                <p className="report-content">{report.content}</p>
                <span className="report-time">
                  {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};
