import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

export default function DuplicateWarning({ duplicates }) {
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(245, 158, 11, 0.1)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px',
      marginBottom: '24px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <AlertTriangle size={20} color="#f59e0b" style={{ marginTop: '2px' }} />
        <div>
          <h4 style={{ margin: '0 0 8px 0', color: '#f59e0b', fontSize: '14px', fontWeight: 600 }}>
            Possible Duplicate Tickets Found
          </h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Before submitting, please check if your issue is already being handled:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {duplicates.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-elevated)', padding: '8px 12px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginRight: '8px' }}>
                    {t.ticket_number}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className={`status-badge status-${t.status}`}>
                    {t.status.replace('_', ' ')}
                  </span>
                  <Link
                    to={`/tickets/${t.id}`}
                    target="_blank"
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '4px' }}
                    title="Open ticket in new tab"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
