import { ClipboardList, FileQuestion, AlertTriangle } from 'lucide-react';

export const TYPE_CONFIG = {
  task: {
    label: 'Task',
    icon: ClipboardList,
    color: '#22d3ee',
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.3)',
    desc: 'Routine IT operations: backups, scans, server checks',
  },
  request: {
    label: 'Request',
    icon: FileQuestion,
    color: '#a78bfa',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    desc: 'Account management or hardware/device requests',
  },
  issue: {
    label: 'Issue',
    icon: AlertTriangle,
    color: '#f87171',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    desc: 'Report a problem: room, office, or infrastructure',
  },
};

export default function TicketTypeSelector({ onSelect }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Ticket</h1>
          <p className="page-subtitle">What type of ticket do you need?</p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        maxWidth: '900px',
      }}>
        {Object.entries(TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              style={{
                background: config.bg,
                border: `1px solid ${config.border}`,
                borderRadius: 'var(--radius-xl)',
                padding: '32px 24px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = `0 12px 40px ${config.border}`;
                e.currentTarget.style.borderColor = config.color;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = config.border;
              }}
            >
              <div style={{
                position: 'absolute', top: '-20px', right: '-20px',
                width: '100px', height: '100px', borderRadius: '50%',
                background: `radial-gradient(circle, ${config.color} 0%, transparent 70%)`,
                opacity: 0.1,
              }} />
              
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: `${config.color}20`, color: config.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <Icon size={24} />
              </div>
              
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                {config.label}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {config.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
