import React, { useState } from 'react';
import { api } from '../services/api';
import { EmergencyResourceItem, ResourceType } from '../types/enums';
import { PlusIcon, CloseIcon } from './Icons';
import { LocationPicker } from './LocationPicker';

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResourceCreated: (resource: EmergencyResourceItem) => void;
}

export const CreateResourceModal: React.FC<CreateResourceModalProps> = ({
  isOpen,
  onClose,
  onResourceCreated,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ResourceType>(ResourceType.HOSPITAL);
  const [locationName, setLocationName] = useState('Times Square Medical Field Hub');
  const [latitude, setLatitude] = useState(40.758);
  const [longitude, setLongitude] = useState(-73.9855);
  const [capacity, setCapacity] = useState('150');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Resource name is required');
      return;
    }
    if (!locationName.trim()) {
      setError('Location name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await api.createResource({
        name: name.trim(),
        type,
        locationName: locationName.trim(),
        latitude,
        longitude,
        capacity: parseInt(capacity, 10) || 100,
      });
      onResourceCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register resource');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" id="create-resource-backdrop" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <PlusIcon size={20} color="#38bdf8" />
            <h2 className="modal-title">Register Emergency Resource</h2>
          </div>
          <button id="btn-close-create-resource" className="btn-icon" onClick={onClose} title="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-alert" id="resource-create-error">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} id="create-resource-form">
            <div className="form-group">
              <label htmlFor="input-res-name">Asset / Facility Name *</label>
              <input
                id="input-res-name"
                type="text"
                className="form-input"
                placeholder="e.g. Central Park Field Hospital"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="select-res-type">Resource Type *</label>
                <select
                  id="select-res-type"
                  className="form-select"
                  value={type}
                  onChange={(e) => setType(e.target.value as ResourceType)}
                >
                  <option value={ResourceType.HOSPITAL}>HOSPITAL</option>
                  <option value={ResourceType.SHELTER}>SHELTER</option>
                  <option value={ResourceType.FOOD}>FOOD</option>
                  <option value={ResourceType.WATER}>WATER</option>
                  <option value={ResourceType.RESCUE_TEAM}>RESCUE_TEAM</option>
                </select>
              </div>

              <div className="form-group flex-1">
                <label htmlFor="input-res-capacity">Capacity Units *</label>
                <input
                  id="input-res-capacity"
                  type="number"
                  min="1"
                  className="form-input"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Interactive Pinpoint Map & Device GPS Picker */}
            <div className="form-group">
              <label>Pinpoint Facility Location (Drag pin or tap Device GPS):</label>
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                locationName={locationName}
                onChange={({ latitude: lat, longitude: lng, name: locName }) => {
                  setLatitude(lat);
                  setLongitude(lng);
                  setLocationName(locName);
                }}
              />
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
                id="btn-submit-resource"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register Resource'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
