import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinIcon, RefreshIcon } from './Icons';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  locationName: string;
  onChange: (coords: { latitude: number; longitude: number; name: string }) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  locationName,
  onChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Reverse geocode to get human-readable landmark from lat/lng
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'DRCP-LocationPicker/1.0',
          Accept: 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const address = data.address || {};
        const landmark =
          address.suburb ||
          address.neighbourhood ||
          address.commercial ||
          address.road ||
          address.city ||
          address.town ||
          data.display_name?.split(',').slice(0, 2).join(',') ||
          `Location [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
        return landmark;
      }
    } catch {
      // Fallback if reverse geocode fails
    }
    return locationName || `Coordinates [${lat.toFixed(4)}, ${lng.toFixed(4)}]`;
  };

  // Helper to update location
  const updatePosition = useCallback(
    async (lat: number, lng: number, manualName?: string) => {
      const name = manualName || (await reverseGeocode(lat, lng));
      onChange({ latitude: lat, longitude: lng, name });

      if (mapInstanceRef.current && markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        mapInstanceRef.current.panTo([lat, lng], { animate: true });
      }
    },
    [onChange, locationName]
  );

  // 1. Initialize Mini Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = latitude || 40.7831;
    const initialLng = longitude || -73.9712;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: false,
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Custom Draggable Pin (like Swiggy / Zomato address picker)
    const pinIcon = L.divIcon({
      className: 'location-picker-marker',
      html: `
        <div class="picker-pin">
          <div class="picker-head">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div class="picker-pulse"></div>
        </div>
      `,
      iconSize: [36, 46],
      iconAnchor: [18, 46],
    });

    const marker = L.marker([initialLat, initialLng], {
      icon: pinIcon,
      draggable: true,
    }).addTo(map);

    // Update coordinates on drag end
    marker.on('dragend', async () => {
      const pos = marker.getLatLng();
      const resolvedName = await reverseGeocode(pos.lat, pos.lng);
      onChange({ latitude: pos.lat, longitude: pos.lng, name: resolvedName });
    });

    // Update coordinates on map click
    map.on('click', async (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      map.panTo(e.latlng, { animate: true });
      const resolvedName = await reverseGeocode(e.latlng.lat, e.latlng.lng);
      onChange({ latitude: e.latlng.lat, longitude: e.latlng.lng, name: resolvedName });
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // Sync external coordinates changes to marker
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - latitude) > 0.0001 || Math.abs(currentPos.lng - longitude) > 0.0001) {
        markerRef.current.setLatLng([latitude, longitude]);
        mapInstanceRef.current.panTo([latitude, longitude], { animate: true });
      }
    }
  }, [latitude, longitude]);

  // Handle GPS Current Device Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setStatusMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsGeolocating(true);
    setStatusMessage('Acquiring high-accuracy GPS coordinates from your device...');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setIsGeolocating(false);
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setStatusMessage(`Device GPS lock acquired (Accuracy: ±${Math.round(position.coords.accuracy)}m)`);
        await updatePosition(lat, lng);
        setTimeout(() => setStatusMessage(null), 4000);
      },
      (err) => {
        setIsGeolocating(false);
        setStatusMessage(`Could not access device location: ${err.message}. Please select on the map.`);
        setTimeout(() => setStatusMessage(null), 4000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Handle Search for location
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setStatusMessage(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchQuery.trim()
      )}&format=json&limit=5`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'DRCP-LocationPicker/1.0',
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        if (data.length === 0) {
          setStatusMessage('No locations found for this query. Try a nearby city or landmark.');
        }
      }
    } catch {
      setStatusMessage('Location search request failed. Please click directly on the map.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (result: any) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const name = result.display_name?.split(',').slice(0, 2).join(',') || result.display_name;
    updatePosition(lat, lng, name);
    setSearchResults([]);
    setSearchQuery('');
  };

  return (
    <div className="location-picker-component" id="location-picker-container">
      {/* Top Controls: Search and Device GPS */}
      <div className="picker-controls-row">
        <form onSubmit={handleSearch} className="picker-search-form">
          <input
            type="text"
            className="picker-search-input"
            placeholder="Search address, landmark, or city (e.g. Bandra, Times Square)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-secondary-sm"
            disabled={isSearching}
            title="Search Address"
          >
            {isSearching ? 'Searching...' : 'Find'}
          </button>
        </form>

        <button
          type="button"
          id="btn-use-device-gps"
          className="btn btn-accent-sm"
          onClick={handleUseCurrentLocation}
          disabled={isGeolocating}
          title="Detect GPS location from current device"
        >
          <span className="gps-target-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="22" y1="12" x2="18" y2="12"/>
              <line x1="6" y1="12" x2="2" y2="12"/>
              <line x1="12" y1="6" x2="12" y2="2"/>
              <line x1="12" y1="22" x2="12" y2="18"/>
            </svg>
          </span>
          <span>{isGeolocating ? 'Acquiring GPS...' : 'Use Device GPS'}</span>
        </button>
      </div>

      {/* Search Autocomplete Suggestions */}
      {searchResults.length > 0 && (
        <div className="picker-search-dropdown" id="search-results-dropdown">
          {searchResults.map((item, idx) => (
            <div
              key={idx}
              className="picker-search-item"
              onClick={() => handleSelectSearchResult(item)}
            >
              <MapPinIcon size={14} color="#38bdf8" />
              <span className="search-item-text">{item.display_name}</span>
            </div>
          ))}
        </div>
      )}

      {statusMessage && (
        <div className="picker-status-banner">
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Interactive Swiggy/Zomato style Pinpoint Map */}
      <div className="picker-map-card">
        <div ref={mapContainerRef} className="picker-leaflet-canvas" />
        <div className="picker-map-hint">
          <span>Drag the red pin or click anywhere on the map to set exact coordinates.</span>
        </div>
      </div>

      {/* Active Selected Coordinates Display */}
      <div className="picker-coords-bar">
        <div className="coords-col">
          <label>Selected Landmark:</label>
          <strong title={locationName}>{locationName || 'Unnamed spot'}</strong>
        </div>
        <div className="coords-col text-right">
          <label>Exact Coordinates:</label>
          <span className="coords-values">
            [{latitude.toFixed(5)}, {longitude.toFixed(5)}]
          </span>
        </div>
      </div>
    </div>
  );
};
