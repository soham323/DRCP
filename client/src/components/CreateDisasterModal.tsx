import React, { useState } from 'react';
import { api } from '../services/api';
import { DisasterItem, DisasterStatus } from '../types/enums';
import { AlertIcon, CloseIcon, MapPinIcon } from './Icons';
import { LocationPicker } from './LocationPicker';

interface CreateDisasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDisasterCreated: (disaster: DisasterItem) => void;
}

export const CreateDisasterModal: React.FC<CreateDisasterModalProps> = ({
  isOpen,
  onClose,
  onDisasterCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'picker' | 'nlp'>('picker');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<DisasterStatus>(DisasterStatus.ACTIVE);

  // Exact coordinates and landmark
  const [locationName, setLocationName] = useState('Manhattan, NYC');
  const [latitude, setLatitude] = useState(40.7831);
  const [longitude, setLongitude] = useState(-73.9712);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      setError('Title must be at least 3 characters');
      return;
    }

    setLoading(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const finalDescription =
      description.trim() ||
      `Incident reported at ${locationName} with active emergency response dispatched.`;

    const payload: any = {
      title: title.trim(),
      description: finalDescription,
      tags,
      status,
    };

    // If using interactive picker, pass exact coordinates
    if (activeTab === 'picker') {
      payload.latitude = latitude;
      payload.longitude = longitude;
      payload.location = {
        name: locationName,
        latitude,
        longitude,
      };
    }

    try {
      const created = await api.createDisaster(payload);
      onDisasterCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to report disaster incident');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" id="create-disaster-backdrop" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <AlertIcon size={20} color="#ef4444" />
            <h2 className="modal-title">Report Disaster Incident</h2>
          </div>
          <button id="btn-close-create-disaster" className="btn-icon" onClick={onClose} title="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-alert" id="disaster-create-error">
              <span>{error}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="location-mode-tabs">
            <button
              type="button"
              className={`location-mode-tab ${activeTab === 'picker' ? 'active' : ''}`}
              onClick={() => setActiveTab('picker')}
            >
              <MapPinIcon size={14} />
              <span>Interactive Map Pin & Device GPS</span>
            </button>
            <button
              type="button"
              className={`location-mode-tab ${activeTab === 'nlp' ? 'active' : ''}`}
              onClick={() => setActiveTab('nlp')}
            >
              <span>Automated Narrative NLP Geocoding</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} id="create-disaster-form">
            <div className="form-group">
              <label htmlFor="input-disaster-title">Incident Title *</label>
              <input
                id="input-disaster-title"
                type="text"
                className="form-input"
                placeholder="e.g. Severe Flash Flood Lower Manhattan"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Tab 1: Interactive Pinpoint Map (like Swiggy/Zomato) */}
            {activeTab === 'picker' && (
              <div className="form-group">
                <label>Pinpoint Incident Location (Drag marker, search address, or tap Device GPS):</label>
                <LocationPicker
                  latitude={latitude}
                  longitude={longitude}
                  locationName={locationName}
                  onChange={({ latitude: lat, longitude: lng, name }) => {
                    setLatitude(lat);
                    setLongitude(lng);
                    setLocationName(name);
                  }}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="input-disaster-desc">
                {activeTab === 'nlp'
                  ? 'Narrative Description with Location (NLP extracts coordinates automatically) *'
                  : 'Incident Situation Details / Notes (Optional)'}
              </label>
              <textarea
                id="input-disaster-desc"
                className="form-textarea"
                rows={2}
                placeholder={
                  activeTab === 'nlp'
                    ? 'e.g. Heavy flooding reported across Midtown Manhattan, NYC with subway entrances submerged under water.'
                    : 'Provide emergency notes, damages, or evacuation details...'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required={activeTab === 'nlp'}
              />
              {activeTab === 'nlp' && (
                <span className="input-helper">
                  Backend NLP entity extraction identifies locations (e.g. "Manhattan, NYC", "Brooklyn") and geocodes via OpenStreetMap Nominatim.
                </span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="input-disaster-tags">Tags (comma-separated)</label>
                <input
                  id="input-disaster-tags"
                  type="text"
                  className="form-input"
                  placeholder="flood, urgent, evacuation"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
              </div>

              <div className="form-group flex-1">
                <label htmlFor="select-disaster-status">Initial Status</label>
                <select
                  id="select-disaster-status"
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DisasterStatus)}
                >
                  <option value={DisasterStatus.ACTIVE}>ACTIVE</option>
                  <option value={DisasterStatus.CONTAINED}>CONTAINED</option>
                  <option value={DisasterStatus.RESOLVED}>RESOLVED</option>
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="btn-submit-disaster"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Publishing...' : 'Publish Incident (Emit Live)'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
