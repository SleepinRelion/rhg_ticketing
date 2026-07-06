import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Ticket, Search } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', textAlign: 'center', padding: '2rem'
    }}>
      {/* Animated 404 */}
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <div style={{
          fontSize: '120px', fontWeight: 800, lineHeight: 1,
          background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          opacity: 0.15, userSelect: 'none'
        }}>
          404
        </div>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '64px', height: '64px', borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.1)', border: '2px solid rgba(99, 102, 241, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'float 3s ease-in-out infinite'
        }}>
          <Search size={28} style={{ color: 'var(--primary-400)' }} />
        </div>
      </div>

      <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: 'var(--text-primary)' }}>
        Page Not Found
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '400px', lineHeight: 1.6, marginBottom: '32px' }}>
        The page you're looking for doesn't exist or has been moved. Try navigating back or use one of the links below.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          <Home size={16} /> Go to Dashboard
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Go Back
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/tickets')}>
          <Ticket size={16} /> View Tickets
        </button>
      </div>

      {/* Float animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
