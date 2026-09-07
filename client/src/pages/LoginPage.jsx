import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ExternalLink, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [emailConfirm, setEmailConfirm] = useState(''); // honeypot
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [requirePasswordChange, setRequirePasswordChange] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [bgImage, setBgImage] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const imageUrl = window.APP_BG_IMAGE_URL || '/login-bg.jpg';
    if (!imageUrl) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => setBgImage(imageUrl);
    // If it fails to load (e.g., deleted), bgImage remains null and fallback CSS applies
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(loginId.trim(), password, mfaCode, emailConfirm);
      if (res.requirePasswordChange) {
        setRequirePasswordChange(true);
        setTempToken(res.tempToken);
      } else if (res.mfaRequired) {
        setRequiresMfa(true);
      } else if (res.success) {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (newPassword.length < 8) {
      return setError('Password must be at least 8 characters.');
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api/auth/force-change-password' : '/api/auth/force-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update password');
      
      // Password changed successfully, ask them to login again
      setRequirePasswordChange(false);
      setTempToken('');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      alert('Password updated successfully! Please log in with your new password.');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`login-page ${bgImage ? 'has-bg-image' : ''}`}
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      <div className="login-card">
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={window.APP_LOGO_URL || "/logo.png"} alt="App Logo" className="app-logo-img" style={{ height: '48px', marginBottom: '24px', objectFit: 'contain' }} />

          {!requiresMfa && (
            <>
              <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>Welcome Back</h2>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>Ticketing Platform</p>
            </>
          )}
        </div>

        {error && <div className="login-error">{error}</div>}

        {requirePasswordChange ? (
          <form onSubmit={handleChangePassword}>
            <div style={{ marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center' }}>
              Your administrator has required you to change your password before logging in.
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
            <button type="button" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} onClick={() => setRequirePasswordChange(false)} disabled={loading}>
              Cancel
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            {!requiresMfa ? (
            <>
              <div className="form-group">
                <label className="form-label">Email or Username</label>
                <input
                  type="text"
                  className="form-input"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  required
                  placeholder="name@radissonhotels.com"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              {/* Honeypot field - Bots will fill this, humans won't see it */}
              <div style={{ display: 'none' }} aria-hidden="true">
                <label>Confirm Email</label>
                <input 
                  type="text" 
                  name="_email_confirm"
                  value={emailConfirm}
                  onChange={(e) => setEmailConfirm(e.target.value)}
                  tabIndex="-1" 
                  autoComplete="off" 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{ paddingRight: '40px' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div style={{ textAlign: 'right', marginTop: '6px' }}>
                  <Link to="/forgot-password" style={{ fontSize: '13px', color: 'var(--primary-600)', textDecoration: 'none' }}>Forgot Password?</Link>
                </div>
              </div>
            </>
          ) : (
            <div className="form-group">
              <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                <Shield size={32} style={{ color: 'var(--primary-500)', marginBottom: '8px' }} />
                <label className="form-label">Authenticator App Required</label>
                <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-secondary)' }}>
                  Enter the 6-digit code from your Authenticator App.
                </p>
              </div>
              <input
                type="text"
                className="form-input"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                required
                placeholder="000000"
                maxLength={6}
                style={{ textAlign: 'center', fontSize: 'var(--font-xl)', letterSpacing: '0.5em', marginTop: '24px', marginBottom: '24px', padding: '16px' }}
                autoFocus
              />
            </div>
          )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '24px' }} disabled={loading}>
              {loading ? 'Authenticating...' : (requiresMfa ? 'Verify Code' : 'Sign In')}
            </button>

            {requiresMfa && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }}
                onClick={() => { setRequiresMfa(false); setMfaCode(''); }}
                disabled={loading}
              >
                Back to login
              </button>
            )}

          {!requiresMfa && (
            <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>Don't have system access?</p>
              <Link to="/staff-portal" className="btn btn-outline" style={{ display: 'inline-flex', width: '100%', justifyContent: 'center' }}>
                <ExternalLink size={16} style={{ marginRight: '0.5rem' }} /> Submit Ticket via Staff Portal
              </Link>
            </div>
          )}
        </form>
        )}
      </div>
    </div>
  );
}
