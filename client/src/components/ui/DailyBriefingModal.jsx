import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';

export default function DailyBriefingModal({ onClose }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canClose, setCanClose] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const res = await api('/tickets?my_tickets=true&status=open,in_progress,pending,escalated');
        setTickets(res.tickets || []);
      } catch (err) {
        console.error('Failed to fetch briefing tickets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Allow a small margin of error (e.g. 5px) for browser scroll calculations
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      setCanClose(true);
    }
  };

  useEffect(() => {
    // If no tickets or content is smaller than container, allow close immediately
    if (!loading) {
      if (tickets.length === 0) {
        setCanClose(true);
      } else {
        // Small delay to allow render
        setTimeout(() => {
          if (contentRef.current) {
            const { scrollHeight, clientHeight } = contentRef.current;
            if (scrollHeight <= clientHeight) {
              setCanClose(true);
            }
          }
        }, 100);
      }
    }
  }, [loading, tickets]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'var(--error)';
      case 'high': return 'var(--warning)';
      case 'medium': return 'var(--primary-400)';
      default: return 'var(--success-color)';
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        background: 'var(--bg-elevated)',
        width: '100%', maxWidth: '600px',
        maxHeight: '90vh',
        borderRadius: '16px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Tiny cross icon top right for bypass */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '4px', opacity: 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Dismiss"
        >
          <X size={14} />
        </button>

        <div style={{ padding: '32px 32px 16px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', background: 'linear-gradient(135deg, var(--primary-400), var(--primary-600))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Daily Briefing
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Welcome back! Here are your active tasks for today.
          </p>
        </div>

        <div 
          ref={contentRef}
          onScroll={handleScroll}
          style={{ 
            padding: '24px 32px', 
            overflowY: 'auto', 
            flex: 1,
            display: 'flex', flexDirection: 'column', gap: '16px'
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <div className="spinner" style={{ margin: '0 auto' }}></div>
              <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading your tickets...</p>
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} style={{ margin: '0 auto 16px', color: 'var(--success-color)' }} />
              <p>You have no active tickets assigned to you.</p>
              <p style={{ fontSize: '14px' }}>Have a great day!</p>
            </div>
          ) : (
            tickets.map((t, index) => (
              <Link key={t.id} to={`/tickets/${t.id}`} onClick={onClose} style={{ textDecoration: 'none' }}>
                <div 
                  className="card hover-bg-muted" 
                  style={{ 
                    padding: '16px', 
                    borderLeft: `4px solid ${getPriorityColor(t.priority)}`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    animation: `slideUp 0.4s ${index * 0.1}s both cubic-bezier(0.16, 1, 0.3, 1)`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary-400)' }}>{t.ticket_number}</span>
                      <span className={`badge badge-status-${t.status}`} style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>{t.status.replace(/_/g, ' ')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12px', gap: '4px' }}>
                      <Clock size={12} /> {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', color: 'var(--text-primary)' }}>{t.title}</h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {t.room_number ? `Room ${t.room_number}` : t.department || 'General'}
                    </span>
                    <ArrowRight size={16} style={{ color: 'var(--primary-400)' }} />
                  </div>
                </div>
              </Link>
            ))
          )}
          
          {tickets.length > 0 && !canClose && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', animation: 'pulse 2s infinite' }}>
              <span>Scroll to view all</span>
              <ArrowRight size={14} style={{ transform: 'rotate(90deg)' }} />
            </div>
          )}
        </div>

        <div style={{ padding: '16px 32px 32px', textAlign: 'center' }}>
          <button 
            className="btn btn-primary" 
            style={{ 
              width: '100%', padding: '12px', fontSize: '16px', fontWeight: 600,
              opacity: canClose ? 1 : 0.5,
              cursor: canClose ? 'pointer' : 'not-allowed',
              transition: 'all 0.3s'
            }}
            onClick={canClose ? onClose : undefined}
            disabled={!canClose}
          >
            {canClose ? "Let's Get to Work" : "Review All Tasks to Continue"}
          </button>
        </div>
        
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </div>
  );
}
