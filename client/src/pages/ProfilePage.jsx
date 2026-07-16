import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client.js';
import { useApi } from '../hooks/useApi.js';
import { useToast } from '../context/ToastContext.jsx';
import { Camera, Save, User, Shield, Lock, Smartphone } from 'lucide-react';

export default function ProfilePage() {
  const { user, login } = useAuth();
  const { success, error } = useToast();
  
  const [searchParams] = useSearchParams();
  const isMfaForced = searchParams.get('mfa_setup') === 'true';
  const [activeTab, setActiveTab] = useState(isMfaForced ? 'security' : 'profile');

  // Profile Form
  const [fullName, setFullName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  // Security Form (Change Password)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { execute: saveProfileApi, loading: savingProfile } = useApi(null, { immediate: false });
  const { execute: changePasswordApi, loading: savingPassword } = useApi(null, { immediate: false });

  // MFA State
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaSetupPhase, setMfaSetupPhase] = useState('none'); // none, setup, verifying
  const [mfaQrCode, setMfaQrCode] = useState('');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBackupCodes, setMfaBackupCodes] = useState([]);
  const [mfaPassword, setMfaPassword] = useState(''); // for disabling MFA

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || user.full_name || '');
      setMfaEnabled(user.mfaEnabled || user.mfa_enabled || false);
      if (user.avatar_url) {
        setAvatarPreview(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api', '')}${user.avatar_url}` : user.avatar_url);
      }
      
      // Auto-start MFA setup if forced and not yet enabled
      if (isMfaForced && !(user.mfaEnabled || user.mfa_enabled)) {
        setActiveTab('security');
        handleStartMfaSetup();
      }
    }
  }, [user, isMfaForced]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return error('Image must be less than 5MB');
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('full_name', fullName);
      if (avatarFile) formData.append('avatar', avatarFile);

      const res = await saveProfileApi('/users/profile', { method: 'PUT', body: formData });
      const updatedUser = {
        ...user,
        fullName: res.user.full_name,
        full_name: res.user.full_name,
        avatar_url: res.user.avatar_url,
      };
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      success('Notification preferences updated');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      error(err.message || 'Failed to update profile.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return error("New passwords do not match.");
    if (newPassword.length < 8) return error("New password must be at least 8 characters.");
    try {
      await changePasswordApi('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword })
      });
      success('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      error(err.message || 'Failed to change password.');
    }
  };

  const handleStartMfaSetup = async () => {
    try {
      const res = await api('/auth/mfa/setup', { method: 'POST' });
      setMfaQrCode(res.qrCode);
      setMfaSecret(res.secret);
      setMfaSetupPhase('setup');
    } catch (err) {
      error(err.message || 'Failed to initiate MFA setup.');
    }
  };

  const handleVerifyMfa = async (e) => {
    e.preventDefault();
    try {
      const res = await api('/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code: mfaCode })
      });
      setMfaBackupCodes(res.backupCodes);
      setMfaEnabled(true);
      setMfaSetupPhase('backup');
      success('Two-factor authentication enabled successfully!');
      
      // Update local user state
      const updatedUser = { ...user, mfaEnabled: true, mfa_enabled: true };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      error(err.message || 'Invalid verification code.');
    }
  };

  const handleDisableMfa = async (e) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.')) return;
    try {
      await api('/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ password: mfaPassword })
      });
      setMfaEnabled(false);
      setMfaPassword('');
      setMfaSetupPhase('none');
      success('Two-factor authentication has been disabled.');
      
      const updatedUser = { ...user, mfaEnabled: false, mfa_enabled: false };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } catch (err) {
      error(err.message || 'Failed to disable MFA. Check your password.');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your personal and security settings</p>
      </div>

      {isMfaForced && (
        <div className="alert alert-error" style={{ marginBottom: '24px' }}>
          <strong>Action Required:</strong> Two-Factor Authentication is compulsory. You must set it up before you can access the ticketing system.
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        {!isMfaForced && (
          <button className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('profile')}>
            <User size={16} /> Personal Info
          </button>
        )}
        <button className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab('security')}>
          <Shield size={16} /> Security
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
              <div 
                style={{
                  width: '120px', height: '120px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  position: 'relative', border: '2px solid var(--border-color)', cursor: 'pointer', marginBottom: '16px'
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : <User size={48} color="var(--text-muted)" />}
                
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: '6px', display: 'flex', justifyContent: 'center' }}>
                  <Camera size={16} color="white" />
                </div>
              </div>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/jpeg, image/png, image/webp" onChange={handleFileChange} />
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Click to change profile picture</span>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            
            <div className="form-group">
              <label className="form-label">Email</label>
              <input type="text" className="form-input" value={user?.email || ''} disabled />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Email cannot be changed.</span>
            </div>

            <div className="form-group">
              <label className="form-label">Role</label>
              <input type="text" className="form-input" value={user?.role || ''} disabled style={{ textTransform: 'capitalize' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                <Save size={16} /> {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
          {/* Change Password Card */}
          {!isMfaForced && (
            <div className="card">
              <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} /> Change Password
              </h2>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input type="password" className="form-input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">New Password</label>
                    <input type="password" className="form-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Confirm New Password</label>
                    <input type="password" className="form-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} />
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="submit" className="btn btn-primary" disabled={savingPassword}>
                    {savingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MFA Card */}
          <div className="card">
            <h2 style={{ fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Smartphone size={20} /> Two-Factor Authentication (2FA)
            </h2>
            
            {mfaEnabled && mfaSetupPhase === 'none' ? (
              <div>
                <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', borderRadius: '8px', marginBottom: '16px', color: '#047857' }}>
                  <strong>Status: Enabled.</strong> Your account is protected with an extra layer of security.
                </div>
                
                {isMfaForced && (
                  <button className="btn btn-primary" onClick={() => window.location.href = '/'}>
                    Continue to Application
                  </button>
                )}
              </div>
            ) : (
              <div>
                {mfaSetupPhase === 'none' && (
                  <div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                      Add an extra layer of security to your account. Once enabled, you will be required to enter both your password and an authentication code from your mobile app to sign in.
                    </p>
                    <button className="btn btn-primary" onClick={handleStartMfaSetup}>
                      Set up Two-Factor Authentication
                    </button>
                  </div>
                )}

                {mfaSetupPhase === 'setup' && (
                  <div>
                    <p style={{ marginBottom: '16px' }}>1. Scan this QR code with your authenticator app (like Google Authenticator or Authy).</p>
                    <div style={{ background: 'white', padding: '16px', display: 'inline-block', borderRadius: '8px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
                      <img src={mfaQrCode} alt="MFA QR Code" style={{ width: '200px', height: '200px' }} />
                    </div>
                    
                    <form onSubmit={handleVerifyMfa} style={{ marginTop: '16px' }}>
                      <p style={{ marginBottom: '8px' }}>2. Enter the 6-digit code generated by your app to verify the setup.</p>
                      <div className="form-row" style={{ alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: 1, maxWidth: '200px' }}>
                          <label className="form-label">Verification Code</label>
                          <input type="text" className="form-input" value={mfaCode} onChange={e => setMfaCode(e.target.value)} required placeholder="000000" maxLength={6} style={{ letterSpacing: '4px', textAlign: 'center', fontSize: '18px' }} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginBottom: '16px' }}>Verify & Enable</button>
                        <button type="button" className="btn btn-ghost" style={{ marginBottom: '16px' }} onClick={() => setMfaSetupPhase('none')}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                {mfaSetupPhase === 'backup' && (
                  <div>
                    <div style={{ padding: '16px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #F59E0B', borderRadius: '8px', marginBottom: '16px', color: '#B45309' }}>
                      <strong>Important: Save these backup codes!</strong><br />
                      If you lose access to your authenticator app, you can use these codes to sign in. Each code can only be used once. They will not be shown again.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '16px', letterSpacing: '2px' }}>
                      {mfaBackupCodes.map((code, i) => (
                        <div key={i}>{code}</div>
                      ))}
                    </div>
                    <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => setMfaSetupPhase('none')}>
                      I have saved my backup codes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
