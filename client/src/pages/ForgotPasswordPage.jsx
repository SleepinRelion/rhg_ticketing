import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
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

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to request password reset.');
      }
      
      setMessage(data.message);
    } catch (err) {
      setError(err.message || 'Failed to request password reset.');
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

          <h2 style={{ fontSize: '24px', fontWeight: '700', margin: '0 0 6px 0', letterSpacing: '-0.5px' }}>Forgot Password</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '15px' }}>Enter your email to receive a reset link</p>
        </div>

        {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
        {message && <div style={{ padding: '12px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '4px', marginBottom: '16px', fontSize: '14px', border: '1px solid #a7f3d0' }}>{message}</div>}

        {!message ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@radissonhotels.com"
                  autoComplete="email"
                  autoFocus
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ width: '100%', padding: '12px', marginTop: '16px', fontSize: '16px', display: 'flex', justifyContent: 'center' }}
            >
              {loading ? (
                <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              ) : 'Send Reset Link'}
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
             <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                Check your inbox and spam folder for the password reset link.
             </p>
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
