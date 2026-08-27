import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const [bgImage, setBgImage] = useState(null);

  useEffect(() => {
    const imageUrl = window.APP_BG_IMAGE_URL || '/login-bg.jpg';
    if (!imageUrl) return;

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => setBgImage(imageUrl);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 12) {
      setError('Password must be at least 12 characters.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to reset password. The token may be invalid or expired.');
      }
      
      setMessage(data.message);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={`login-page ${bgImage ? 'has-bg-image' : ''}`} style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
        <div className="login-card" style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#ef4444' }}>Invalid Reset Link</h2>
          <p style={{ color: 'var(--text-secondary)' }}>The password reset link is missing a token.</p>
          <Link to="/forgot-password" style={{ color: 'var(--primary-600)', textDecoration: 'none', fontWeight: '500' }}>Request a new reset link</Link>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`login-page ${bgImage ? 'has-bg-image' : ''}`}
      style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
    >
      <div className="login-card">
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img src={window.APP_LOGO_URL || "/logo.png"} alt="App Logo" className="app-logo-img" style={{ height: '48px', marginBottom: '24px', objectFit: 'contain' }} />

          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>Reset Password</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>Enter your new password below</p>
        </div>

        {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
        {message && <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '4px', marginBottom: '16px', fontSize: '14px', border: '1px solid #a7f3d0' }}>{message}</div>}

        {!message ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="At least 12 characters"
                  autoComplete="new-password"
                  style={{ paddingLeft: '40px', paddingRight: '40px' }}
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
            </div>

            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ width: '100%', padding: '12px', marginTop: '24px', fontSize: '16px', display: 'flex', justifyContent: 'center' }}
            >
              {loading ? (
                <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : 'Reset Password'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
             <button onClick={() => navigate('/login')} className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '16px' }}>
               Proceed to Login
             </button>
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px', textDecoration: 'none' }}>
            <ArrowLeft size={16} /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
