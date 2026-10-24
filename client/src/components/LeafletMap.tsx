import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  DisasterItem,
  EmergencyResourceItem,
  DisasterStatus,
  ResourceType,
} from '../types/enums';

interface LeafletMapProps {
  disasters: DisasterItem[];
  selectedDisaster: DisasterItem | null;
  onSelectDisaster: (disaster: DisasterItem) => void;
  resources: EmergencyResourceItem[];
  radiusKm: number;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  disasters,
  selectedDisaster,
  onSelectDisaster,
  resources,
  radiusKm,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const circleLayerRef = useRef<L.Circle | null>(null);

  // 1. Initialize Map instance once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default coordinates: Manhattan NYC
    const defaultCenter: L.LatLngExpression = [40.7831, -73.9712];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 12,
      zoomControl: false,
    });

    // Standard OpenStreetMap tiles - 100% Free, Public, Zero API Key required
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Update Markers & Radius Circle when data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Helper: SVG Disaster Pin
    const createDisasterIcon = (status: DisasterStatus, isSelected: boolean) => {
      let color = '#ef4444'; // ACTIVE = red
      if (status === DisasterStatus.CONTAINED) color = '#f59e0b'; // amber
      if (status === DisasterStatus.RESOLVED) color = '#10b981'; // green

      const pulseClass = status === DisasterStatus.ACTIVE ? 'disaster-pulse' : '';
      const selectedClass = isSelected ? 'marker-selected' : '';

      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="disaster-marker ${pulseClass} ${selectedClass}" style="--marker-color: ${color};">
            <div class="marker-core" style="background-color: ${color};">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            ${isSelected ? '<div class="marker-beacon"></div>' : ''}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
    };

    // Helper: SVG Resource Pin
    const createResourceIcon = (type: ResourceType) => {
      let color = '#3b82f6';
      let symbol = '+';
      switch (type) {
        case ResourceType.HOSPITAL:
          color = '#2563eb';
          symbol = 'H';
          break;
        case ResourceType.SHELTER:
          color = '#8b5cf6';
          symbol = 'S';
          break;
        case ResourceType.FOOD:
          color = '#10b981';
          symbol = 'F';
          break;
        case ResourceType.WATER:
          color = '#06b6d4';
          symbol = 'W';
          break;
        case ResourceType.RESCUE_TEAM:
          color = '#f97316';
          symbol = 'R';
          break;
      }

      return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div class="resource-marker" style="--resource-color: ${color};">
            <div class="resource-core" style="background-color: ${color};">
              <span class="resource-letter">${symbol}</span>
            </div>
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
    };

    // Plot all disasters
    disasters.forEach((disaster) => {
      const isSelected = selectedDisaster?.id === disaster.id;
      const marker = L.marker([disaster.location.latitude, disaster.location.longitude], {
        icon: createDisasterIcon(disaster.status, isSelected),
        zIndexOffset: isSelected ? 1000 : 500,
      });

      marker.bindPopup(`
        <div class="popup-card">
          <div class="popup-status-badge status-${disaster.status.toLowerCase()}">${disaster.status}</div>
          <h4 class="popup-title">${disaster.title}</h4>
          <p class="popup-loc">${disaster.location.name}</p>
          <div class="popup-coords">[${disaster.location.latitude.toFixed(4)}, ${disaster.location.longitude.toFixed(4)}]</div>
          <p class="popup-desc">${disaster.description.slice(0, 120)}...</p>
        </div>
      `);

      marker.on('click', () => {
        onSelectDisaster(disaster);
      });

      marker.addTo(markersGroup);
    });

    // Plot nearby resources within radius
    resources.forEach((resource) => {
      const marker = L.marker([resource.location.latitude, resource.location.longitude], {
        icon: createResourceIcon(resource.type),
        zIndexOffset: 100,
      });

      const distLabel = resource.distance_km !== undefined ? `${resource.distance_km.toFixed(2)} km away` : '';

      marker.bindPopup(`
        <div class="popup-card popup-resource">
          <div class="popup-type-badge">${resource.type}</div>
          <h4 class="popup-title">${resource.name}</h4>
          <p class="popup-loc">${resource.location.name}</p>
          ${distLabel ? `<div class="popup-distance">Distance: <strong>${distLabel}</strong></div>` : ''}
          <div class="popup-meta">Capacity: ${resource.capacity} units</div>
          <div class="popup-status">Status: ${resource.status}</div>
        </div>
      `);

      marker.addTo(markersGroup);
    });

    // Draw / Update Radius Circle around selected disaster
    if (circleLayerRef.current) {
      circleLayerRef.current.remove();
      circleLayerRef.current = null;
    }

    if (selectedDisaster) {
      const radiusMeters = radiusKm * 1000;
      const circle = L.circle([selectedDisaster.location.latitude, selectedDisaster.location.longitude], {
        radius: radiusMeters,
        color: '#0284c7',
        fillColor: '#38bdf8',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '6, 8',
      }).addTo(markersGroup);

      circleLayerRef.current = circle;

      // Smoothly pan map to selected incident
      map.panTo([selectedDisaster.location.latitude, selectedDisaster.location.longitude], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [disasters, selectedDisaster, resources, radiusKm, onSelectDisaster]);

  return (
    <div className="map-wrapper" id="leaflet-map-wrapper">
      <div ref={mapContainerRef} className="leaflet-map-container" id="drcp-leaflet-map" />
      <div className="map-overlay-controls">
        <div className="map-legend">
          <div className="legend-title">Map Overlay Legend</div>
          <div className="legend-row">
            <span className="legend-indicator dot-red"></span>
            <span>Active Incident</span>
          </div>
          <div className="legend-row">
            <span className="legend-indicator dot-amber"></span>
            <span>Contained</span>
          </div>
          <div className="legend-row">
            <span className="legend-indicator dot-green"></span>
            <span>Resolved</span>
          </div>
          <div className="legend-divider"></div>
          <div className="legend-row">
            <span className="legend-indicator dot-blue"></span>
            <span>Hospitals (H)</span>
          </div>
          <div className="legend-row">
            <span className="legend-indicator dot-purple"></span>
            <span>Shelters (S)</span>
          </div>
          <div className="legend-row">
            <span className="legend-indicator dot-emerald"></span>
            <span>Food Supplies (F)</span>
          </div>
          <div className="legend-row">
            <span className="legend-indicator dot-cyan"></span>
            <span>Water Stations (W)</span>
          </div>
          <div className="legend-row">
            <span className="legend-indicator dot-orange"></span>
            <span>Rescue Teams (R)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
