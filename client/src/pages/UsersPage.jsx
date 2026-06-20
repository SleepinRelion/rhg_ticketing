import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Edit2, Trash2, Plus, Key, X, Save, Shield, ShieldOff, Unlock } from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', full_name: '', role: 'staff' });
  const [saving, setSaving] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const { error, success } = useToast();
  const { user: currentUser, isAdmin } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const data = await api('/users');
      setUsers(data.users);
    } catch (err) {
      error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', full_name: '', role: 'staff' });
    setShowModal(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setFormData({ username: user.username, email: user.email, password: '', full_name: user.full_name, role: user.role, is_active: user.is_active });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        await api(`/users/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            full_name: formData.full_name,
            role: formData.role,
            is_active: formData.is_active,
            email: formData.email
          })
        });
        success('User updated successfully');
      } else {
        await api('/users', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        success('User created successfully');
      }
      setShowModal(false);
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (id === currentUser.id) return error("You cannot delete yourself.");
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
      success('User deactivated successfully');
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to delete user');
    }
  }

  function openResetModal(id) {
    setResetUserId(id);
    setNewPassword('');
    setShowResetModal(true);
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (newPassword.length < 8) return error("Password must be at least 8 characters");
    setSaving(true);
    try {
      await api(`/users/${resetUserId}/reset-password`, {
        method: 'PUT',
        body: JSON.stringify({ new_password: newPassword })
      });
      success('Password reset successfully');
      setShowResetModal(false);
    } catch (err) {
      error(err.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlock(id) {
    if (!confirm('Are you sure you want to unlock this account?')) return;
    try {
      await api(`/users/${id}/unlock`, { method: 'POST' });
      success('User account unlocked successfully');
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to unlock account');
    }
  }

  async function handleResetMfa(id) {
    if (!confirm('Are you sure you want to reset and disable MFA for this user? They will need to set it up again.')) return;
    try {
      await api(`/users/${id}/reset-mfa`, { method: 'POST' });
      success('User MFA reset successfully');
      fetchUsers();
    } catch (err) {
      error(err.message || 'Failed to reset MFA');
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Users & Permissions</h1>
          <p className="page-subtitle">Manage system users, roles, and access</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="data-table-container">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name / Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ width: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.5 }}>
                  <td>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {u.full_name}
                      {u.mfa_enabled && <Shield size={14} className="text-green-500" title="MFA Enabled" />}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>@{u.username}</div>
                  </td>
                  <td>{u.email}</td>
                  <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                      <span className="badge" style={{ background: u.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: u.is_active ? '#34d399' : '#f87171' }}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {u.locked_until && new Date(u.locked_until) > new Date() && (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
                          Locked
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {(isAdmin() || currentUser?.role === 'manager') && (
                        <>
                          {u.locked_until && new Date(u.locked_until) > new Date() && (
                            <button className="btn-icon" onClick={() => handleUnlock(u.id)} title="Unlock Account" style={{ color: '#fbbf24' }}>
                              <Unlock size={16} />
                            </button>
                          )}
                          <button className="btn-icon" onClick={() => openResetModal(u.id)} title="Reset Password"><Key size={16} /></button>
                          {!!u.mfa_enabled && isAdmin() && (
                            <button className="btn-icon" onClick={() => handleResetMfa(u.id)} title="Reset MFA (Disable)"><ShieldOff size={16} /></button>
                          )}
                        </>
                      )}
                      <button className="btn-icon" onClick={() => openEditModal(u)} title="Edit User"><Edit2 size={16} /></button>
                      {isAdmin() && (
                        <button className="btn-icon" onClick={() => handleDelete(u.id)} style={{ color: 'var(--error)' }} disabled={u.id === currentUser.id} title="Deactivate"><Trash2 size={16} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Create User'}</h2>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input type="text" className="form-input" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Username *</label>
                  <input type="text" className="form-input" required disabled={!!editingUser} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input type="password" className="form-input" required minLength={8} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              )}
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Role</label>
                  <SearchableSelect className="form-select" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    <option value="staff">Staff</option>
                    <option value="technician">Technician</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </SearchableSelect>
                </div>
                {editingUser && (
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Status</label>
                    <SearchableSelect className="form-select" value={formData.is_active ? 'active' : 'inactive'} onChange={e => setFormData({...formData, is_active: e.target.value === 'active'})}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </SearchableSelect>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? 'Saving...' : 'Save User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button className="btn-icon" onClick={() => setShowResetModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleResetPassword} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">New Password *</label>
                <input type="password" className="form-input" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowResetModal(false)} disabled={saving}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Key size={16} /> {saving ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
