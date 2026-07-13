import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Ticket, ArrowLeft, Clock, AlertTriangle, CheckCircle2, User, Building, MapPin, Loader2, Key } from 'lucide-react';
import api from '../api/client.js';

export default function GuestTicketStatusPage() {
  const [searchParams] = useSearchParams();
  const [trackingToken, setTrackingToken] = useState(searchParams.get('token') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [ticketData, setTicketData] = useState(null);

  // Auto-search if token is in URL
  useEffect(() => {
    if (searchParams.get('token')) {
      handleSearch(new Event('submit'));
    }
  }, []);

  const handleSearch = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!trackingToken.trim()) return;

    setLoading(true);
    setError(null);
    setTicketData(null);

    try {
      const res = await api(`/tickets/guest/track/${trackingToken.trim()}`);
      setTicketData(res.ticket);
    } catch (err) {
      if (err.status === 404) {
        setError("We couldn't find a ticket with that number. Please check the number and try again.");
      } else {
        setError(err.message || "Failed to retrieve ticket status.");
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusDisplay = (status) => {
    const maps = {
      open: { color: 'var(--primary-500)', bg: 'var(--primary-500-20)', label: 'Received', icon: Clock },
      assigned: { color: 'var(--warning)', bg: 'var(--warning-20)', label: 'Assigned to Staff', icon: Clock },
      in_progress: { color: 'var(--warning)', bg: 'var(--warning-20)', label: 'In Progress', icon: Loader2 },
      waiting_for_parts: { color: 'var(--warning)', bg: 'var(--warning-20)', label: 'Waiting for Parts', icon: Clock },
      waiting_for_vendor: { color: 'var(--warning)', bg: 'var(--warning-20)', label: 'Waiting for Vendor', icon: Clock },
      waiting_for_guest: { color: 'var(--primary-500)', bg: 'var(--primary-500-20)', label: 'Awaiting Your Input', icon: User },
      resolved: { color: 'var(--success)', bg: 'var(--success-20)', label: 'Resolved', icon: CheckCircle2 },
      closed: { color: 'var(--text-secondary)', bg: 'var(--border-color)', label: 'Closed', icon: CheckCircle2 },
      reopened: { color: 'var(--error)', bg: 'var(--error-20)', label: 'Reopened', icon: AlertTriangle },
      cancelled: { color: 'var(--text-secondary)', bg: 'var(--border-color)', label: 'Cancelled', icon: AlertTriangle }
    };
    
    const s = maps[status] || maps.open;
    const Icon = s.icon;
    
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: s.color, backgroundColor: s.bg, padding: '0.5rem 1rem', borderRadius: '2rem', fontWeight: 600 }}>
        <Icon size={18} />
        {s.label}
      </div>
    );
  };

  return (
    <div className="login-container" style={{ padding: '2rem 1rem' }}>
      <div className="login-card" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="login-header" style={{ marginBottom: '1.5rem' }}>
          <div className="login-logo">
            <img src={window.APP_LOGO_URL || "/logo.png"} alt="App Logo" style={{ height: '60px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          </div>
          <h1 className="login-title">Track Your Request</h1>
          <p className="login-subtitle">Enter your Secure Tracking Token to view the status</p>
        </div>

        <form onSubmit={handleSearch} style={{ marginBottom: '2rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <div className="input-group">
              <span className="input-icon"><Key size={18} /></span>
              <input 
                type="text" 
                className="form-input" 
                value={trackingToken} 
                onChange={e => setTrackingToken(e.target.value)}
                placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                required 
              />
            </div>
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }}></div> : 'Track Ticket'}
          </button>
        </form>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        {ticketData && (
          <div style={{ backgroundColor: 'var(--bg-hover)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}>{ticketData.ticket_number}</div>
                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{ticketData.title}</h3>
              </div>
              <div>
                {getStatusDisplay(ticketData.status)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <MapPin size={16} className="text-secondary" />
                <span>{ticketData.room_number ? `Room ${ticketData.room_number}` : ticketData.hotel_name || 'Hotel'}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Clock size={16} className="text-secondary" />
                <span>Submitted: {new Date(ticketData.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            {ticketData.comments && ticketData.comments.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Updates</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {ticketData.comments.map(comment => (
                    <div key={comment.id} style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        <strong style={{ color: 'var(--primary-500)' }}>Hotel Staff</strong>
                        <span className="text-secondary">{new Date(comment.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.5 }}>{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/staff-portal" className="text-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
            <ArrowLeft size={16} /> Back to Staff Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
