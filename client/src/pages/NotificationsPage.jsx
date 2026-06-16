import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  useEffect(() => { api('/notifications?limit=50').then(res => setNotifications(res.notifications || [])); }, []);

  return (
    <div>
      <div className="page-header"><div><h1 className="page-title">All Notifications</h1></div></div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {notifications.map(n => {
          const content = (
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', opacity: n.is_read ? 0.6 : 1, transition: 'background-color 0.2s', ...(n.ticket_id ? { cursor: 'pointer' } : {}) }}>
              <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>{n.title}</h4>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>{n.message}</p>
            </div>
          );

          if (n.ticket_id) {
            return (
              <Link key={n.id} to={`/tickets/${n.ticket_id}`} style={{ textDecoration: 'none', display: 'block' }}>
                {content}
              </Link>
            );
          }

          return <div key={n.id}>{content}</div>;
        })}
        {notifications.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>No notifications</div>
        )}
      </div>
    </div>
  );
}
