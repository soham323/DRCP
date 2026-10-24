import React from 'react';
import { AuthUser, UserRole } from '../types/enums';
import { RadioIcon, UserIcon, PlusIcon, ShieldIcon, AlertIcon } from './Icons';

interface NavbarProps {
  currentUser: AuthUser | null;
  isConnected: boolean;
  onOpenAuthModal: () => void;
  onOpenCreateDisasterModal: () => void;
  onOpenCreateResourceModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  isConnected,
  onOpenAuthModal,
  onOpenCreateDisasterModal,
  onOpenCreateResourceModal,
  onLogout,
}) => {
  const canMutate = currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.CONTRIBUTOR);

  const getRoleBadgeClass = (role?: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return 'badge-admin';
      case UserRole.CONTRIBUTOR:
        return 'badge-contributor';
      case UserRole.VIEWER:
        return 'badge-viewer';
      default:
        return 'badge-guest';
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <div className="brand-logo">
          <ShieldIcon size={22} color="#38bdf8" />
        </div>
        <div className="brand-titles">
          <h1 className="brand-name">DRCP</h1>
          <span className="brand-tagline">Disaster Response Coordination Platform</span>
        </div>
        <div className={`live-status ${isConnected ? 'status-connected' : 'status-disconnected'}`} id="ws-status-badge">
          <span className="status-dot"></span>
          <RadioIcon size={14} />
          <span className="status-text">{isConnected ? 'LIVE SYNC' : 'OFFLINE'}</span>
        </div>
      </div>

      <div className="navbar-actions">
        {canMutate && (
          <>
            <button
              id="btn-nav-create-disaster"
              className="btn btn-primary"
              onClick={onOpenCreateDisasterModal}
              title="Report Disaster with Natural Language Geocoding"
            >
              <AlertIcon size={16} />
              <span>Report Incident</span>
            </button>
            <button
              id="btn-nav-create-resource"
              className="btn btn-secondary"
              onClick={onOpenCreateResourceModal}
              title="Register Emergency Resource"
            >
              <PlusIcon size={16} />
              <span>Register Resource</span>
            </button>
          </>
        )}

        <div className="auth-profile-section" id="auth-profile-box">
          {currentUser ? (
            <div className="user-profile-badge">
              <UserIcon size={16} color="#94a3b8" />
              <div className="user-info">
                <span className="username">{currentUser.username}</span>
                <span className={`role-tag ${getRoleBadgeClass(currentUser.role)}`}>
                  {currentUser.role}
                </span>
              </div>
              <button
                id="btn-switch-role"
                className="btn btn-outline-sm"
                onClick={onOpenAuthModal}
                title="Switch credentials / role"
              >
                Switch
              </button>
              <button
                id="btn-logout"
                className="btn btn-danger-sm"
                onClick={onLogout}
                title="Sign out"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              id="btn-nav-login"
              className="btn btn-accent"
              onClick={onOpenAuthModal}
            >
              <UserIcon size={16} />
              <span>Sign In / Demo Roles</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
