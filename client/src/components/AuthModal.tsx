import React, { useState } from 'react';
import { api } from '../services/api';
import { AuthUser, UserRole } from '../types/enums';
import { ShieldIcon, UserIcon, CheckIcon, CloseIcon } from './Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: AuthUser) => void;
  currentUser: AuthUser | null;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
  currentUser,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole.CONTRIBUTOR | UserRole.VIEWER>(UserRole.CONTRIBUTOR);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleQuickLogin = async (presetUser: string, presetPass: string) => {
    setUsername(presetUser);
    setPassword(presetPass);
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(presetUser, presetPass);
      onAuthSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username and password are required');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        const res = await api.login(username.trim(), password);
        onAuthSuccess(res.user);
      } else {
        const res = await api.register(username.trim(), password, selectedRole);
        onAuthSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || (mode === 'login' ? 'Invalid credentials' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" id="auth-modal-backdrop" onClick={onClose}>
      <div className="modal-card modal-auth" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-wrap">
            <ShieldIcon size={20} color="#38bdf8" />
            <h2 className="modal-title">
              {mode === 'login' ? 'Authentication & Role Management' : 'Register New Account'}
            </h2>
          </div>
          <button id="btn-close-auth-modal" className="btn-icon" onClick={onClose} title="Close">
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="modal-body">
          {currentUser && (
            <div className="current-auth-alert">
              <span>Currently signed in as: <strong>{currentUser.username}</strong> ({currentUser.role})</span>
            </div>
          )}

          {error && (
            <div className="error-alert" id="auth-error-banner">
              <span>{error}</span>
            </div>
          )}

          <div className="auth-quick-select">
            <label className="section-label">One-Click Demonstration Logins</label>
            <p className="section-hint">Select a seeded platform identity to authenticate via database scrypt verification:</p>
            <div className="quick-roles-grid">
              <button
                type="button"
                id="btn-quick-admin"
                className="role-card role-card-admin"
                onClick={() => handleQuickLogin('admin', 'Admin@123')}
                disabled={loading}
              >
                <div className="role-header">
                  <span className="role-name">Administrator</span>
                  <span className="role-badge badge-admin">ADMIN</span>
                </div>
                <p className="role-desc">Full CRUD control, disaster deletion privilege, emergency resource orchestration.</p>
              </button>

              <button
                type="button"
                id="btn-quick-contributor"
                className="role-card role-card-contributor"
                onClick={() => handleQuickLogin('contributor', 'Contributor@123')}
                disabled={loading}
              >
                <div className="role-header">
                  <span className="role-name">Field Contributor</span>
                  <span className="role-badge badge-contributor">CONTRIBUTOR</span>
                </div>
                <p className="role-desc">Create/update disaster incidents, register resources. Cannot delete incidents.</p>
              </button>

              <button
                type="button"
                id="btn-quick-viewer"
                className="role-card role-card-viewer"
                onClick={() => handleQuickLogin('viewer', 'Viewer@123')}
                disabled={loading}
              >
                <div className="role-header">
                  <span className="role-name">Public Viewer</span>
                  <span className="role-badge badge-viewer">VIEWER</span>
                </div>
                <p className="role-desc">Read-only live map viewer, proximity searches, community feeds. Mutations rejected (403).</p>
              </button>
            </div>
          </div>

          <div className="auth-divider">
            <span>OR CUSTOM CREDENTIALS</span>
          </div>

          <div className="auth-tabs">
            <button
              type="button"
              id="tab-auth-login"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(null); }}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-auth-register"
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => { setMode('register'); setError(null); }}
            >
              Register Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" id="custom-auth-form">
            <div className="form-group">
              <label htmlFor="auth-username">Username</label>
              <input
                id="auth-username"
                type="text"
                className="form-input"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label className="field-label">Choose Your Role</label>
                <div className="register-role-grid">
                  <button
                    type="button"
                    id="btn-role-choice-contributor"
                    className={`register-role-card ${selectedRole === UserRole.CONTRIBUTOR ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(UserRole.CONTRIBUTOR)}
                  >
                    <div className="role-card-top">
                      <span className="role-card-label">Field Contributor</span>
                      <span className="role-badge badge-contributor">CONTRIBUTOR</span>
                    </div>
                    <p className="role-card-text">
                      Report disasters, update incident status, and register emergency assets.
                    </p>
                  </button>

                  <button
                    type="button"
                    id="btn-role-choice-viewer"
                    className={`register-role-card ${selectedRole === UserRole.VIEWER ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(UserRole.VIEWER)}
                  >
                    <div className="role-card-top">
                      <span className="role-card-label">Public Viewer</span>
                      <span className="role-badge badge-viewer">VIEWER</span>
                    </div>
                    <p className="role-card-text">
                      Read-only access to interactive maps, proximity searches, and social reports.
                    </p>
                  </button>
                </div>
                <span className="input-helper">Minimum 6 characters. Selected role is stored securely in the database.</span>
              </div>
            )}

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
                id="btn-submit-auth"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In with Password' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
