import React, { useState } from 'react';
import { DisasterItem, DisasterStatus } from '../types/enums';
import { AlertIcon, MapPinIcon, RefreshIcon } from './Icons';

interface DisasterSidebarProps {
  disasters: DisasterItem[];
  selectedDisaster: DisasterItem | null;
  onSelectDisaster: (disaster: DisasterItem) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const DisasterSidebar: React.FC<DisasterSidebarProps> = ({
  disasters,
  selectedDisaster,
  onSelectDisaster,
  onRefresh,
  isLoading,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredDisasters = disasters.filter((d) => {
    const matchesStatus = filterStatus === 'ALL' || d.status === filterStatus;
    const matchesSearch =
      d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <aside className="disaster-sidebar" id="disaster-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title-row">
          <div className="title-wrap">
            <AlertIcon size={18} color="#ef4444" />
            <h2 className="sidebar-title">Disaster Incidents</h2>
          </div>
          <button
            id="btn-refresh-disasters"
            className="btn-icon"
            onClick={onRefresh}
            disabled={isLoading}
            title="Reload incidents from backend"
          >
            <RefreshIcon size={16} className={isLoading ? 'spin-animation' : ''} />
          </button>
        </div>

        <div className="search-bar-wrap">
          <input
            id="input-search-disasters"
            type="text"
            className="search-input"
            placeholder="Search by title, location, tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="status-filter-pills">
          {['ALL', DisasterStatus.ACTIVE, DisasterStatus.CONTAINED, DisasterStatus.RESOLVED].map((st) => (
            <button
              key={st}
              id={`filter-pill-${st.toLowerCase()}`}
              className={`pill-btn ${filterStatus === st ? 'active' : ''}`}
              onClick={() => setFilterStatus(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="disaster-list" id="disaster-list-container">
        {filteredDisasters.length === 0 ? (
          <div className="empty-state">
            <p>No incidents match the selected criteria.</p>
          </div>
        ) : (
          filteredDisasters.map((disaster) => {
            const isSelected = selectedDisaster?.id === disaster.id;
            return (
              <div
                key={disaster.id}
                id={`disaster-card-${disaster.id}`}
                className={`disaster-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectDisaster(disaster)}
              >
                <div className="card-top">
                  <span className={`status-badge status-${disaster.status.toLowerCase()}`}>
                    {disaster.status}
                  </span>
                  <span className="card-timestamp">
                    {new Date(disaster.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <h3 className="card-title">{disaster.title}</h3>

                <div className="card-location">
                  <MapPinIcon size={14} color="#64748b" />
                  <span>{disaster.location.name}</span>
                </div>

                <div className="card-tags">
                  {disaster.tags.map((tag) => (
                    <span key={tag} className="tag-chip">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="sidebar-footer">
        <span>Showing {filteredDisasters.length} of {disasters.length} incidents</span>
      </div>
    </aside>
  );
};
