import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, User, MessageSquare, AlertTriangle, GripVertical } from 'lucide-react';
import FormatCategory from '../ui/FormatCategory.jsx';
import { format } from 'date-fns';

const COLUMNS = [
  { id: 'open', title: 'Open', color: '#3b82f6', emoji: '📥' },
  { id: 'assigned', title: 'Assigned', color: '#8b5cf6', emoji: '👤' },
  { id: 'in_progress', title: 'In Progress', color: '#f59e0b', emoji: '🔧' },
  { id: 'resolved', title: 'Resolved', color: '#10b981', emoji: '✅' },
  { id: 'closed', title: 'Closed', color: '#64748b', emoji: '🔒' },
];

const PRIORITY_COLORS = {
  critical: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' },
  high:     { bg: '#fff7ed', border: '#f97316', text: '#ea580c' },
  medium:   { bg: '#eff6ff', border: '#3b82f6', text: '#2563eb' },
  low:      { bg: '#f8fafc', border: '#94a3b8', text: '#64748b' },
};

function TicketCard({ ticket, onDragStart, onDragEnd }) {
  const navigate = useNavigate();
  const pColor = PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.medium;
  const isSLABreached = ticket.sla_status === 'breached';
  const isSLAAtRisk = ticket.sla_status === 'at_risk';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: ticket.id, status: ticket.status }));
        onDragStart(ticket);
        // Add a slight delay so the drag image renders
        e.currentTarget.style.opacity = '0.4';
      }}
      onDragEnd={(e) => {
        e.currentTarget.style.opacity = '1';
        onDragEnd();
      }}
      onClick={() => navigate(`/tickets/${ticket.id}`)}
      style={{
        padding: '12px',
        marginBottom: '8px',
        borderRadius: '8px',
        borderLeft: `4px solid ${pColor.border}`,
        background: 'var(--bg-elevated)',
        cursor: 'grab',
        transition: 'all 0.2s ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        position: 'relative',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header row: ticket number + badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)', letterSpacing: '0.3px' }}>
          {ticket.ticket_number}
        </span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {isSLABreached && (
            <span style={{
              fontSize: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#ef4444',
              padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px',
              fontWeight: 600, animation: 'pulse-badge 2s infinite',
            }}>
              <AlertTriangle size={10} /> BREACHED
            </span>
          )}
          {isSLAAtRisk && (
            <span style={{
              fontSize: '10px', background: 'rgba(249, 115, 22, 0.12)', color: '#f97316',
              padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px',
              fontWeight: 600,
            }}>
              <Clock size={10} /> AT RISK
            </span>
          )}
          <span style={{
            fontSize: '10px', background: pColor.bg, color: pColor.text,
            padding: '2px 6px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase',
          }}>
            {ticket.priority}
          </span>
        </div>
      </div>

      {/* Title */}
      <div style={{
        fontWeight: 600, fontSize: '13px', lineHeight: 1.4, marginBottom: '6px',
        color: 'var(--text-primary)',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {ticket.title}
      </div>

      {/* Category */}
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
        <FormatCategory name={ticket.category_name || 'Uncategorized'} />
      </div>

      {/* Footer row: metadata */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {ticket.room_number && (
            <span title={`Room ${ticket.room_number}`}>Rm {ticket.room_number}</span>
          )}
          {ticket.ticket_type && (
            <span style={{
              background: ticket.ticket_type === 'task' ? 'rgba(6, 182, 212, 0.12)' : ticket.ticket_type === 'request' ? 'rgba(139, 92, 246, 0.12)' : 'rgba(239, 68, 68, 0.08)',
              color: ticket.ticket_type === 'task' ? '#06b6d4' : ticket.ticket_type === 'request' ? '#8b5cf6' : '#f87171',
              padding: '1px 5px', borderRadius: '3px', fontSize: '10px', textTransform: 'capitalize',
            }}>
              {ticket.ticket_type}
            </span>
          )}
        </div>
        <span style={{ fontSize: '10px' }}>
          {ticket.created_at ? format(new Date(ticket.created_at), 'MMM d') : ''}
        </span>
      </div>
    </div>
  );
}

export default function KanbanBoard({ tickets, onStatusChange }) {
  const [draggedTicket, setDraggedTicket] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e, columnId) => {
    // Only clear if actually leaving the column (not entering a child)
    const relatedTarget = e.relatedTarget;
    if (relatedTarget && e.currentTarget.contains(relatedTarget)) return;
    setDragOverColumn(null);
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(null);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.id && data.status !== columnId) {
        onStatusChange(data.id, columnId);
      }
    } catch (err) {
      console.error('Drop failed:', err);
    }

    setDraggedTicket(null);
  };

  return (
    <div style={{
      display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '16px',
      minHeight: '600px', scrollBehavior: 'smooth',
    }}>
      {COLUMNS.map(col => {
        const columnTickets = tickets.filter(t => t.status === col.id);
        const isDropTarget = dragOverColumn === col.id;
        const isDragSource = draggedTicket && draggedTicket.status === col.id;

        return (
          <div
            key={col.id}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={(e) => handleDragLeave(e, col.id)}
            onDrop={(e) => handleDrop(e, col.id)}
            style={{
              flex: '0 0 280px',
              background: isDropTarget ? 'rgba(59, 130, 246, 0.06)' : 'var(--bg-secondary)',
              borderRadius: '12px',
              display: 'flex', flexDirection: 'column',
              border: isDropTarget ? '2px dashed var(--primary-400)' : '2px solid transparent',
              transition: 'all 0.2s ease',
              transform: isDropTarget ? 'scale(1.01)' : 'scale(1)',
            }}
          >
            {/* Column header */}
            <div style={{
              padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: `2px solid ${col.color}22`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{col.title}</h3>
              </div>
              <span style={{
                fontSize: '12px', fontWeight: 700,
                background: `${col.color}18`, color: col.color,
                padding: '3px 10px', borderRadius: '12px',
                minWidth: '28px', textAlign: 'center',
              }}>
                {columnTickets.length}
              </span>
            </div>

            {/* Cards container */}
            <div style={{
              padding: '10px',
              flex: 1, overflowY: 'auto',
              maxHeight: 'calc(100vh - 320px)',
            }}>
              {columnTickets.map(ticket => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onDragStart={(t) => setDraggedTicket(t)}
                  onDragEnd={() => setDraggedTicket(null)}
                />
              ))}

              {/* Empty state / drop zone */}
              {columnTickets.length === 0 && (
                <div style={{
                  textAlign: 'center', padding: '40px 16px',
                  color: isDropTarget ? 'var(--primary-500)' : 'var(--text-muted)',
                  fontSize: '13px',
                  border: `2px dashed ${isDropTarget ? 'var(--primary-400)' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  background: isDropTarget ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
                  transition: 'all 0.2s ease',
                }}>
                  {isDropTarget ? 'Drop to move here' : 'No tickets'}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes pulse-badge {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
