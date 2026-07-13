import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Save, Plus, Trash2, Download, Server, Mail, Shield, Settings as SettingsIcon } from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('backups');
  
  // Hotel Settings State
  const [hotelSettings, setHotelSettings] = useState({});
  const [savingHotelSettings, setSavingHotelSettings] = useState(false);
  
  // Backup State
  const [schedules, setSchedules] = useState([]);
  const [newSchedule, setNewSchedule] = useState({ frequency: 'daily', recipients: '' });
  const [exportEmails, setExportEmails] = useState('');
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Env State
  const [envConfig, setEnvConfig] = useState({});
  const [savingEnv, setSavingEnv] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const { success, error } = useToast();

  useEffect(() => {
    fetchSchedules();
    fetchEnvConfig();
    fetchHotelSettings();
  }, []);

  async function fetchHotelSettings() {
    try {
      const data = await api('/settings/hotel');
      if (data.settings) setHotelSettings(data.settings);
    } catch (err) {
      error('Failed to load hotel settings.');
    }
  }

  async function fetchSchedules() {
    try {
      const data = await api('/backups/schedules');
      setSchedules(data.schedules);
    } catch (err) {
      error('Failed to load backup schedules.');
    } finally {
      setLoading(false);
    }
  }

  async function fetchEnvConfig() {
    try {
      const data = await api('/settings/env');
      if (data.env) {
        setEnvConfig(data.env);
      }
    } catch (err) {
      error('Failed to load environment config.');
    }
  }

  async function handleAddSchedule(e) {
    e.preventDefault();
    if (!newSchedule.recipients) return error('Please enter recipient emails.');
    const recipients = newSchedule.recipients.split(',').map(e => e.trim()).filter(Boolean);
    try {
      const added = await api('/backups/schedules', {
        method: 'POST',
        body: JSON.stringify({ frequency: newSchedule.frequency, recipients })
      });
      setSchedules([added, ...schedules]);
      setNewSchedule({ frequency: 'daily', recipients: '' });
      success('Backup schedule added successfully.');
    } catch (err) {
      error(err.message || 'Failed to add schedule.');
    }
  }

  async function handleDeleteSchedule(id) {
    if (!window.confirm('Delete this backup schedule?')) return;
    try {
      await api(`/backups/schedules/${id}`, { method: 'DELETE' });
      setSchedules(schedules.filter(s => s.id !== id));
      success('Schedule deleted.');
    } catch (err) {
      error('Failed to delete schedule.');
    }
  }

  async function handleManualExport() {
    if (!exportEmails) return error('Please enter recipient emails for the export.');
    const recipients = exportEmails.split(',').map(e => e.trim()).filter(Boolean);
    setExporting(true);
    try {
      const res = await api('/backups/export', { method: 'POST', body: JSON.stringify({ recipients }) });
      success(res.message);
      setExportEmails('');
    } catch (err) {
      error(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  }

  const handleEnvChange = (key, value) => {
    setEnvConfig(prev => ({ ...prev, [key]: value }));
  };

  async function handleSaveEnv(e) {
    e.preventDefault();
    setSavingEnv(true);
    try {
      const filteredUpdates = { ...envConfig };

      const res = await api('/settings/env', {
        method: 'PUT',
        body: JSON.stringify({ updates: filteredUpdates })
      });
      success(res.message);
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err) {
      error(err.message || 'Failed to save configuration.');
      setSavingEnv(false);
    }
  }

  async function handleSendTestEmail(e) {
    if (e) e.preventDefault();
    if (!testEmail) return error('Please enter an email address for testing.');
    setSendingTestEmail(true);
    try {
      const res = await api('/settings/test-email', {
        method: 'POST',
        body: JSON.stringify({ to: testEmail })
      });
      success(res.message);
    } catch (err) {
      error(err.message || 'Failed to send test email.');
    } finally {
      setSendingTestEmail(false);
    }
  }

  const handleHotelSettingChange = (key, value) => {
    setHotelSettings(prev => ({ ...prev, [key]: value }));
  };

  async function handleSaveHotelSettings(e) {
    e.preventDefault();
    setSavingHotelSettings(true);
    try {
      const res = await api('/settings/hotel', {
        method: 'PUT',
        body: JSON.stringify({ updates: hotelSettings })
      });
      success(res.message);
    } catch (err) {
      error(err.message || 'Failed to save hotel settings.');
    } finally {
      setSavingHotelSettings(false);
    }
  }

  const envFields = {
    app: [
      { key: 'APP_NAME', label: 'Application Name', type: 'text', placeholder: 'IT Ticketing System' },
      { key: 'APP_URL', label: 'Application URL', type: 'url', placeholder: 'http://localhost:5173' },
      { key: 'APP_TIMEZONE', label: 'Timezone', type: 'select', options: ['Indian/Mauritius', 'UTC', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'] },
      { key: 'PORT', label: 'Server Port', type: 'number', placeholder: '3001' },
      { key: 'NODE_ENV', label: 'Environment', type: 'select', options: ['development', 'production'] },
      { key: 'APP_LOGO_URL', label: 'Logo URL', type: 'text', placeholder: '/logo.png' },
      { key: 'APP_BG_COLOR', label: 'Background Color', type: 'text', placeholder: '#0f172a' },
      { key: 'APP_BG_IMAGE_URL', label: 'Background Image URL', type: 'text', placeholder: 'https://example.com/bg.jpg' },
    ],
    email: [
      { key: 'SMTP_ENABLED', label: 'Enable Email Notifications', type: 'select', options: ['true', 'false'] },
      { key: 'SMTP_HOST', label: 'SMTP Host', type: 'text', placeholder: 'smtp.gmail.com' },
      { key: 'SMTP_PORT', label: 'SMTP Port', type: 'number', placeholder: '587' },
      { key: 'SMTP_SECURE', label: 'Use SSL/TLS (Secure)', type: 'select', options: ['true', 'false'] },
      { key: 'SMTP_USER', label: 'SMTP Username / Email', type: 'text', placeholder: 'hotel@example.com' },
      { key: 'SMTP_PASS', label: 'SMTP Password', type: 'password', placeholder: '********' },
      { key: 'SMTP_FROM', label: 'Sender Email Address', type: 'text', placeholder: 'noreply@hotel.com' },
    ],
    database: [
      { key: 'DB_HOST', label: 'Database Host', type: 'text', placeholder: 'localhost' },
      { key: 'DB_PORT', label: 'Database Port', type: 'number', placeholder: '5432' },
      { key: 'DB_NAME', label: 'Database Name', type: 'text', placeholder: 'hotel_tickets' },
      { key: 'DB_USER', label: 'Database Username', type: 'text', placeholder: 'postgres' },
      { key: 'DB_PASSWORD', label: 'Database Password', type: 'password', placeholder: '********' },
    ],
    security: [
      { key: 'JWT_SECRET', label: 'Authentication Secret Key', type: 'password', placeholder: 'secret-key' },
      { key: 'JWT_EXPIRES_IN', label: 'Session Timeout', type: 'text', placeholder: '15m' },
      { key: 'LOGIN_RATE_LIMIT_MAX', label: 'Max Login Attempts', type: 'number', placeholder: '5' },
      { key: 'LOGIN_RATE_LIMIT_WINDOW_MS', label: 'Lockout Window (ms)', type: 'number', placeholder: '900000' },
    ]
  };

  const renderField = (field) => (
    <div key={field.key} className="form-group">
      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{field.label}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{field.key}</span>
      </label>
      {field.type === 'select' ? (
        <SearchableSelect 
          className="form-select" 
          value={envConfig[field.key] || ''} 
          onChange={e => handleEnvChange(field.key, e.target.value)}
        >
          <option value="">-- Select --</option>
          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </SearchableSelect>
      ) : (
        <input 
          type={field.type} 
          className="form-input" 
          placeholder={field.placeholder}
          value={envConfig[field.key] || ''} 
          onChange={e => handleEnvChange(field.key, e.target.value)} 
        />
      )}
    </div>
  );

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Manage system configurations and backups</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          className={`btn ${activeTab === 'hotel' ? 'btn-primary' : 'btn-ghost'}`} 
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab('hotel')}
        >
          Hotel Settings
        </button>
        <button 
          className={`btn ${activeTab === 'backups' ? 'btn-primary' : 'btn-ghost'}`} 
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab('backups')}
        >
          Automated Backups
        </button>
        <button 
          className={`btn ${activeTab === 'environment' ? 'btn-primary' : 'btn-ghost'}`} 
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab('environment')}
        >
          Environment Config
        </button>
      </div>

      {activeTab === 'hotel' && (
        <form onSubmit={handleSaveHotelSettings} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="detail-section-title" style={{ marginBottom: '4px' }}>Hotel-Specific Settings</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                Manage operational settings specific to this hotel.
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingHotelSettings}>
              <Save size={16} /> {savingHotelSettings ? 'Saving...' : 'Save Hotel Settings'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="form-group">
              <label className="form-label">Ticket Number Prefix</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. IT-"
                value={hotelSettings.TICKET_PREFIX || ''}
                onChange={e => handleHotelSettingChange('TICKET_PREFIX', e.target.value)}
              />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Prepended to all ticket numbers.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Default Priority</label>
              <SearchableSelect 
                className="form-select" 
                value={hotelSettings.DEFAULT_PRIORITY || 'medium'}
                onChange={e => handleHotelSettingChange('DEFAULT_PRIORITY', e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </SearchableSelect>
            </div>

            <div className="form-group">
              <label className="form-label">Allow Guest Tickets</label>
              <SearchableSelect 
                className="form-select" 
                value={hotelSettings.ALLOW_GUEST_TICKETS || 'false'}
                onChange={e => handleHotelSettingChange('ALLOW_GUEST_TICKETS', e.target.value)}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </SearchableSelect>
            </div>

            <div className="form-group">
              <label className="form-label">Auto-Assign Tickets</label>
              <SearchableSelect 
                className="form-select" 
                value={hotelSettings.AUTO_ASSIGN || 'false'}
                onChange={e => handleHotelSettingChange('AUTO_ASSIGN', e.target.value)}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </SearchableSelect>
            </div>
          </div>
        </form>
      )}

      {activeTab === 'backups' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          <div className="card">
            <h2 className="detail-section-title">Automated Email Backups</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Configure recurring database backups to be sent via email. 
            </p>

            <form onSubmit={handleAddSchedule} style={{ marginBottom: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Add New Schedule</h4>
              <div className="form-row">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Frequency</label>
                  <SearchableSelect 
                    className="form-select" 
                    value={newSchedule.frequency}
                    onChange={e => setNewSchedule({ ...newSchedule, frequency: e.target.value })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </SearchableSelect>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Recipients (comma separated)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="admin@hotel.com"
                    value={newSchedule.recipients}
                    onChange={e => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }}>
                <Plus size={16} /> Add Schedule
              </button>
            </form>

            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Frequency</th>
                    <th>Recipients</th>
                    <th>Last Run</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center' }}>No backup schedules configured.</td></tr>
                  ) : (
                    schedules.map(s => (
                      <tr key={s.id}>
                        <td style={{ textTransform: 'capitalize' }}>{s.frequency}</td>
                        <td>
                          {s.recipients.map((r, i) => (
                            <div key={i} className="badge" style={{ marginRight: '4px', marginBottom: '4px' }}>{r}</div>
                          ))}
                        </td>
                        <td>{s.last_run_at ? new Date(s.last_run_at).toLocaleDateString() : 'Never'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn-icon" onClick={() => handleDeleteSchedule(s.id)} style={{ color: 'var(--error)' }}>
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ height: 'fit-content' }}>
            <h2 className="detail-section-title">Manual Backup Export</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Trigger an immediate full database backup and have it emailed to specified recipients.
            </p>
            <div className="form-group">
              <label className="form-label">Recipients (comma separated)</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="user@example.com"
                value={exportEmails}
                onChange={e => setExportEmails(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={handleManualExport} disabled={exporting || !exportEmails}>
              <Download size={16} /> {exporting ? 'Sending...' : 'Trigger Manual Export'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'environment' && (
        <form onSubmit={handleSaveEnv} className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 className="detail-section-title" style={{ marginBottom: '4px' }}>System Configuration</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: 0 }}>
                WARNING: Saving these settings will safely restart the server to apply changes. Current settings are auto-filled below.
              </p>
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingEnv}>
              <Save size={16} /> {savingEnv ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* App Settings */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <SettingsIcon size={16} /> Application Settings
              </h3>
              {envFields.app.map(renderField)}
            </div>

            {/* Email/SMTP Settings */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Mail size={16} /> SMTP & Email
              </h3>
              {envFields.email.map(renderField)}

              <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px' }}>Send Test Email</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>Send a test email using the currently saved SMTP configuration above.</p>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="email" 
                    className="form-input" 
                    placeholder="user@example.com"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleSendTestEmail} disabled={sendingTestEmail}>
                    {sendingTestEmail ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>

            {/* Database Settings */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Server size={16} /> Database
              </h3>
              {envFields.database.map(renderField)}
            </div>

            {/* Security Limits */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Shield size={16} /> Security & Limits
              </h3>
              {envFields.security.map(renderField)}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
