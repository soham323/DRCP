import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { LeafletMap } from './components/LeafletMap';
import { DisasterSidebar } from './components/DisasterSidebar';
import { IncidentDetailPanel } from './components/IncidentDetailPanel';
import { AuthModal } from './components/AuthModal';
import { CreateDisasterModal } from './components/CreateDisasterModal';
import { CreateResourceModal } from './components/CreateResourceModal';
import { LiveAlertBanner, AlertNotification } from './components/LiveAlertBanner';
import { api } from './services/api';
import { socketService } from './services/socket';
import {
  AuthUser,
  DisasterItem,
  EmergencyResourceItem,
  CommunityReportItem,
  DisasterStatus,
  ResourceType,
  RealtimeEvent,
} from './types/enums';

export const App: React.FC = () => {
  // Global & Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Disaster & Proximity State
  const [disasters, setDisasters] = useState<DisasterItem[]>([]);
  const [selectedDisaster, setSelectedDisaster] = useState<DisasterItem | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(3);
  const [resources, setResources] = useState<EmergencyResourceItem[]>([]);
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ResourceType | undefined>(undefined);

  // Social Reports & Cache-Aside State
  const [reports, setReports] = useState<CommunityReportItem[]>([]);
  const [cacheHeader, setCacheHeader] = useState<string>('MISS');
  const [isReportsDegraded, setIsReportsDegraded] = useState<boolean>(false);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);
  const [isLoadingDisasters, setIsLoadingDisasters] = useState<boolean>(false);

  // Modals & Real-time Alerts
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isCreateDisasterModalOpen, setIsCreateDisasterModalOpen] = useState<boolean>(false);
  const [isCreateResourceModalOpen, setIsCreateResourceModalOpen] = useState<boolean>(false);
  const [liveAlert, setLiveAlert] = useState<AlertNotification | null>(null);

  // 1. Initial Load: Auth check, Disasters fetch, Socket connect
  useEffect(() => {
    // Check existing auth token
    api.getMe().then((user) => {
      setCurrentUser(user);
    });

    // Connect WebSocket
    socketService.connect();
    const unbindConn = socketService.onConnectionChange(setIsConnected);

    // Initial load of incidents
    loadDisasters();

    return () => {
      unbindConn();
      socketService.disconnect();
    };
  }, []);

  // 2. Real-Time Socket Event Bindings
  useEffect(() => {
    const unbindCreated = socketService.on(RealtimeEvent.DISASTER_CREATED, (eventPayload: any) => {
      const newDisaster: DisasterItem = eventPayload.data;
      if (!newDisaster || !newDisaster.id) return;

      setDisasters((prev) => {
        if (prev.some((d) => d.id === newDisaster.id)) return prev;
        return [newDisaster, ...prev];
      });

      setLiveAlert({
        id: `alert-${Date.now()}`,
        event: RealtimeEvent.DISASTER_CREATED,
        title: 'New Incident Reported',
        disaster: newDisaster,
        timestamp: new Date().toISOString(),
      });
    });

    const unbindUpdated = socketService.on(RealtimeEvent.DISASTER_UPDATED, (eventPayload: any) => {
      const updatedDisaster: DisasterItem = eventPayload.data;
      if (!updatedDisaster || !updatedDisaster.id) return;

      setDisasters((prev) =>
        prev.map((d) => (d.id === updatedDisaster.id ? updatedDisaster : d))
      );

      setSelectedDisaster((curr) => {
        if (curr?.id === updatedDisaster.id) {
          return updatedDisaster;
        }
        return curr;
      });

      setLiveAlert({
        id: `alert-${Date.now()}`,
        event: RealtimeEvent.DISASTER_UPDATED,
        title: 'Incident Status Updated',
        disaster: updatedDisaster,
        timestamp: new Date().toISOString(),
      });
    });

    const unbindDeleted = socketService.on(RealtimeEvent.DISASTER_DELETED, (eventPayload: any) => {
      const deletedId = eventPayload.data?.id;
      if (!deletedId) return;

      setDisasters((prev) => prev.filter((d) => d.id !== deletedId));
      setSelectedDisaster((curr) => (curr?.id === deletedId ? null : curr));
    });

    return () => {
      unbindCreated();
      unbindUpdated();
      unbindDeleted();
    };
  }, []);

  // 3. Fetch Disasters List
  const loadDisasters = async () => {
    setIsLoadingDisasters(true);
    try {
      const list = await api.getDisasters();
      setDisasters(list);
      // Select first disaster by default if none selected
      setSelectedDisaster((prev) => prev || (list.length > 0 ? list[0] : null));
    } catch (err) {
      console.error('Failed to load disasters:', err);
    } finally {
      setIsLoadingDisasters(false);
    }
  };

  // 4. Load Nearby Resources & Social Reports whenever selected disaster or radius changes
  const loadProximityResources = useCallback(async () => {
    if (!selectedDisaster) {
      setResources([]);
      return;
    }

    try {
      const res = await api.getNearbyResources(
        selectedDisaster.id,
        radiusKm,
        resourceTypeFilter
      );
      setResources(res.resources);
    } catch (err) {
      console.error('Failed to fetch nearby resources:', err);
      setResources([]);
    }
  }, [selectedDisaster, radiusKm, resourceTypeFilter]);

  const loadReports = useCallback(async () => {
    if (!selectedDisaster) {
      setReports([]);
      return;
    }

    setIsLoadingReports(true);
    try {
      const res = await api.getCommunityReports(selectedDisaster.id);
      setReports(res.reports);
      setCacheHeader(res.cacheHeader);
      setIsReportsDegraded(res.degraded);
    } catch (err) {
      console.error('Failed to fetch community reports:', err);
      setReports([]);
    } finally {
      setIsLoadingReports(false);
    }
  }, [selectedDisaster]);

  useEffect(() => {
    loadProximityResources();
  }, [loadProximityResources]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Handlers
  const handleSelectDisaster = (disaster: DisasterItem) => {
    setSelectedDisaster(disaster);
  };

  const handleUpdateStatus = async (id: string, newStatus: DisasterStatus) => {
    const updated = await api.updateDisaster(id, { status: newStatus });
    setDisasters((prev) => prev.map((d) => (d.id === id ? updated : d)));
    setSelectedDisaster(updated);
  };

  const handleDeleteDisaster = async (id: string) => {
    await api.deleteDisaster(id);
    setDisasters((prev) => prev.filter((d) => d.id !== id));
    setSelectedDisaster(null);
  };

  const handleDisasterCreated = (created: DisasterItem) => {
    setDisasters((prev) => [created, ...prev]);
    setSelectedDisaster(created);
  };

  const handleResourceCreated = (created: EmergencyResourceItem) => {
    loadProximityResources();
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
  };

  return (
    <div className="drcp-dashboard-app" id="drcp-root-app">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        isConnected={isConnected}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenCreateDisasterModal={() => setIsCreateDisasterModalOpen(true)}
        onOpenCreateResourceModal={() => setIsCreateResourceModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Command Dashboard Layout */}
      <main className="dashboard-main-layout">
        {/* Left: Disaster Incidents List */}
        <DisasterSidebar
          disasters={disasters}
          selectedDisaster={selectedDisaster}
          onSelectDisaster={handleSelectDisaster}
          onRefresh={loadDisasters}
          isLoading={isLoadingDisasters}
        />

        {/* Center: Interactive Geospatial Leaflet Map */}
        <LeafletMap
          disasters={disasters}
          selectedDisaster={selectedDisaster}
          onSelectDisaster={handleSelectDisaster}
          resources={resources}
          radiusKm={radiusKm}
        />

        {/* Right: Selected Incident Detail & Proximity Panel */}
        <IncidentDetailPanel
          disaster={selectedDisaster}
          currentUser={currentUser}
          resources={resources}
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
          resourceTypeFilter={resourceTypeFilter}
          onResourceTypeFilterChange={setResourceTypeFilter}
          reports={reports}
          cacheHeader={cacheHeader}
          isReportsDegraded={isReportsDegraded}
          isLoadingReports={isLoadingReports}
          onRefreshReports={loadReports}
          onUpdateStatus={handleUpdateStatus}
          onDeleteDisaster={handleDeleteDisaster}
        />
      </main>

      {/* Real-time Socket.io Toast Banner */}
      <LiveAlertBanner
        alert={liveAlert}
        onDismiss={() => setLiveAlert(null)}
        onViewDisaster={handleSelectDisaster}
      />

      {/* Dialog Modals */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={setCurrentUser}
        currentUser={currentUser}
      />

      <CreateDisasterModal
        isOpen={isCreateDisasterModalOpen}
        onClose={() => setIsCreateDisasterModalOpen(false)}
        onDisasterCreated={handleDisasterCreated}
      />

      <CreateResourceModal
        isOpen={isCreateResourceModalOpen}
        onClose={() => setIsCreateResourceModalOpen(false)}
        onResourceCreated={handleResourceCreated}
      />
    </div>
  );
};
export default App;
