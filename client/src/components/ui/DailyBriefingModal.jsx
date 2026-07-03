import { useState, useEffect, useRef } from 'react';
import { X, CheckCircle, Clock, ArrowRight, Wrench, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client.js';

export default function DailyBriefingModal({ onClose }) {
  const [tickets, setTickets] = useState([]);
  const [pmSchedules, setPmSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canClose, setCanClose] = useState(false);
  const contentRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ticketRes, pmRes] = await Promise.all([
          api('/tickets?my_tickets=true&status=open,in_progress,pending,escalated'),
          api('/preventive-maintenance')
        ]);
        setTickets(ticketRes.tickets || []);
        
        // Filter PM schedules to overdue or due today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const pmItems = (pmRes.schedules || []).filter(p => {
          if (!p.next_due_date) return false;
          const dueDate = new Date(p.next_due_date);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate <= today; // overdue or due today
        });
        setPmSchedules(pmItems);
      } catch (err) {
        console.error('Failed to fetch briefing data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      setCanClose(true);
    }
  };

  useEffect(() => {
    if (!loading) {
      const totalItems = tickets.length + pmSchedules.length;
      if (totalItems === 0) {
        setCanClose(true);
      } else {
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
  }, [loading, tickets, pmSchedules]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'var(--error)';
      case 'high': return 'var(--warning)';
      case 'medium': return 'var(--primary-400)';
      default: return 'var(--success-color)';
    }
  };

  const totalItems = tickets.length + pmSchedules.length;

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
            Welcome back! Here are your active tasks and reminders for today.
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
              <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Loading your briefing...</p>
            </div>
          ) : totalItems === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <CheckCircle size={48} style={{ margin: '0 auto 16px', color: 'var(--success-color)' }} />
              <p>You have no active tickets or pending reminders.</p>
              <p style={{ fontSize: '14px' }}>Have a great day!</p>
            </div>
          ) : (
            <>
              {/* Reminders Section — PM schedules overdue or due today */}
              {pmSchedules.length > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <AlertTriangle size={16} style={{ color: 'var(--warning)' }} />
                    <h3 style={{ margin: 0, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--warning)', fontWeight: 700 }}>
                      Maintenance Reminders ({pmSchedules.length})
                    </h3>
                  </div>
                  {pmSchedules.map((pm, index) => {
                    const dueDate = new Date(pm.next_due_date);
                    const isOverdue = dueDate.toDateString() !== new Date().toDateString();
                    return (
                      <div 
                        key={`pm-${pm.id}`}
                        onClick={() => { onClose(); navigate('/preventive-maintenance'); }}
                        className="card hover-bg-muted"
                        style={{ 
                          padding: '14px 16px', marginBottom: '8px', cursor: 'pointer',
                          borderLeft: `4px solid ${isOverdue ? 'var(--error)' : 'var(--warning)'}`,
                          animation: `slideUp 0.4s ${index * 0.08}s both cubic-bezier(0.16, 1, 0.3, 1)`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Wrench size={14} style={{ color: 'var(--warning)' }} />
                            <span className={`badge ${isOverdue ? 'badge-danger' : 'badge-warning'}`} style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
                              {isOverdue ? 'Overdue' : 'Due Today'}
                            </span>
                          </div>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {dueDate.toLocaleDateString()}
                          </span>
                        </div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', color: 'var(--text-primary)' }}>{pm.title}</h4>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {pm.asset_name ? `${pm.asset_name} (${pm.asset_tag || 'N/A'})` : 'No asset linked'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tickets Section */}
              {tickets.length > 0 && (
                <div>
                  {pmSchedules.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0 16px', paddingTop: '16px' }}></div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Clock size={16} style={{ color: 'var(--primary-400)' }} />
                    <h3 style={{ margin: 0, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary-400)', fontWeight: 700 }}>
                      Your Active Tickets ({tickets.length})
                    </h3>
                  </div>
                  {tickets.map((t, index) => (
                    <Link key={t.id} to={`/tickets/${t.id}`} onClick={onClose} style={{ textDecoration: 'none', display: 'block', marginBottom: '8px' }}>
                      <div 
                        className="card hover-bg-muted" 
                        style={{ 
                          padding: '14px 16px', 
                          borderLeft: `4px solid ${getPriorityColor(t.priority)}`,
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          animation: `slideUp 0.4s ${(pmSchedules.length + index) * 0.08}s both cubic-bezier(0.16, 1, 0.3, 1)`
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary-400)' }}>{t.ticket_number}</span>
                            <span className={`badge badge-status-${t.status}`} style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>{t.status.replace(/_/g, ' ')}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: '12px', gap: '4px' }}>
                            <Clock size={12} /> {new Date(t.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: 'var(--text-primary)' }}>{t.title}</h4>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {t.room_number ? `Room ${t.room_number}` : t.department || 'General'}
                          </span>
                          <ArrowRight size={16} style={{ color: 'var(--primary-400)' }} />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
          
          {totalItems > 0 && !canClose && (
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
