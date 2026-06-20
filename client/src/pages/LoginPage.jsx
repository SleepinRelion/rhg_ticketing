import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, ExternalLink } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState(''); // honeypot
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password, mfaCode, emailConfirm);
      if (res.mfaRequired) {
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

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div style={{ display: 'inline-block', backgroundColor: '#ffffff', padding: '12px 24px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', marginBottom: '24px' }}>
            <img src="/logo.png" alt="Radisson Logo" style={{ height: '60px', objectFit: 'contain' }} />
          </div>
          <h2>Welcome Back</h2>
          <p>Hotel Ticketing & Operations System</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!requiresMfa ? (
            <>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@hotel.com"
                  autoComplete="email"
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
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
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
                style={{ textAlign: 'center', fontSize: 'var(--font-xl)', letterSpacing: '0.2em' }}
                autoFocus
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Signing in...' : requiresMfa ? 'Verify Code' : 'Sign in'}
          </button>

          {requiresMfa && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ width: '100%', marginTop: '8px' }}
              onClick={() => { setRequiresMfa(false); setMfaCode(''); setPassword(''); }}
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
      </div>
    </div>
  );
}
