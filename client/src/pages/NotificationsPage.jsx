import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Check, Filter, Ticket, UserPlus, AlertTriangle, Clock, Shield } from 'lucide-react';

const TYPE_CONFIG = {
  ticket_assigned:   { icon: UserPlus,       color: 'var(--primary-400)',  label: 'Assignment' },
  ticket_updated:    { icon: Ticket,         color: 'var(--info)',         label: 'Update' },
  status_change:     { icon: Clock,          color: 'var(--warning)',      label: 'Status Change' },
  comment_added:     { icon: Ticket,         color: 'var(--success)',      label: 'Comment' },
  sla_warning:       { icon: AlertTriangle,  color: '#f59e0b',            label: 'SLA Warning' },
  sla_breach:        { icon: AlertTriangle,  color: 'var(--error)',        label: 'SLA Breach' },
  escalation:        { icon: Shield,         color: 'var(--error)',        label: 'Escalation' },
};

const FILTERS = [
  { value: 'all',       label: 'All' },
  { value: 'unread',    label: 'Unread' },
  { value: 'ticket_assigned', label: 'Assignments' },
  { value: 'sla_warning',     label: 'SLA Warnings' },
  { value: 'sla_breach',      label: 'SLA Breaches' },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const { success, error } = useToast();
  const navigate = useNavigate();
  const limit = 20;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/notifications?page=${page}&limit=${limit}`);
      setNotifications(res.notifications || []);
      setTotal(res.pagination?.total || 0);
    } catch (err) {
      error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function handleMarkRead(id) {
    try {
      await api(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { }
  }

  async function handleMarkAllRead() {
    try {
      await api('/notifications/read-all', { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      success('All notifications marked as read');
    } catch {
      error('Failed to mark all as read');
    }
  }

  const filtered = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.is_read;
    if (activeFilter !== 'all') return n.type === activeFilter;
    return true;
  });

  const totalPages = Math.ceil(total / limit);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  function getTypeConfig(type) {
    return TYPE_CONFIG[type] || { icon: Bell, color: 'var(--text-muted)', label: type || 'Notification' };
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">
            {total} total{unreadCount > 0 ? ` · ${unreadCount} unread on this page` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {unreadCount > 0 && (
            <button className="btn btn-secondary" onClick={handleMarkAllRead}>
              <CheckCheck size={16} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`btn btn-sm ${activeFilter === f.value ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveFilter(f.value)}
            style={{ borderRadius: '20px', padding: '6px 16px', fontSize: '13px' }}
          >
            {f.value === 'unread' && <Filter size={14} />}
            {f.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Bell size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
            <p>{activeFilter === 'unread' ? 'No unread notifications' : 'No notifications'}</p>
          </div>
        ) : (
          filtered.map(n => {
            const config = getTypeConfig(n.type);
            const Icon = config.icon;
            return (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) handleMarkRead(n.id);
                  if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
                }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  padding: '16px 20px', borderBottom: '1px solid var(--border-color)',
                  cursor: n.ticket_id ? 'pointer' : 'default',
                  backgroundColor: n.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.04)',
                  transition: 'background-color 0.15s ease',
                  position: 'relative'
                }}
                onMouseEnter={e => { if (n.ticket_id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = n.is_read ? 'transparent' : 'rgba(99, 102, 241, 0.04)'; }}
              >
                {/* Unread dot */}
                {!n.is_read && (
                  <div style={{
                    position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                    width: '6px', height: '6px', borderRadius: '50%',
                    backgroundColor: 'var(--primary-400)', boxShadow: '0 0 6px var(--primary-400)'
                  }} />
                )}

                {/* Icon */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: `${config.color}15`, border: `1px solid ${config.color}30`
                }}>
                  <Icon size={16} style={{ color: config.color }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: n.is_read ? 500 : 600, color: 'var(--text-primary)' }}>
                      {n.title}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {n.message}
                  </p>
                  <div style={{ marginTop: '6px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                      backgroundColor: `${config.color}15`, color: config.color, fontWeight: 500
                    }}>
                      {config.label}
                    </span>
                    {!n.is_read && (
                      <button
                        className="btn-icon"
                        title="Mark as read"
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                        style={{ width: '24px', height: '24px' }}
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', padding: '0 12px' }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
