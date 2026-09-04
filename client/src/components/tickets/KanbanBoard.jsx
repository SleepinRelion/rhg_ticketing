import React from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { Clock } from 'lucide-react';
import FormatCategory from '../ui/FormatCategory.jsx';

const COLUMNS = [
  { id: 'open', title: 'Open', color: 'var(--status-open)' },
  { id: 'assigned', title: 'Assigned', color: 'var(--status-assigned)' },
  { id: 'in_progress', title: 'In Progress', color: 'var(--status-in_progress)' },
  { id: 'resolved', title: 'Resolved', color: 'var(--status-resolved)' },
  { id: 'closed', title: 'Closed', color: 'var(--status-closed)' }
];

function SortableTicketCard({ ticket }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab'
  };

  const navigate = useNavigate();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="card"
      onDoubleClick={(e) => {
        e.stopPropagation();
        navigate(`/tickets/${ticket.id}`);
      }}
      style={{
        ...style,
        padding: '12px',
        marginBottom: '8px',
        borderLeft: `4px solid var(--priority-${ticket.priority})`,
        background: 'var(--bg-elevated)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)' }}>{ticket.ticket_number}</span>
        {ticket.sla_status === 'breached' && (
          <span style={{ fontSize: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={10} /> SLA
          </span>
        )}
      </div>
      <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '4px', lineHeight: 1.4 }}>{ticket.title}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}><FormatCategory name={ticket.category_name || 'Uncategorized'} /></div>
    </div>
  );
}

export default function KanbanBoard({ tickets, onStatusChange }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;

    const ticketId = active.id;
    const overId = over.id;
    
    // Check if dropped on a column container
    const isColumn = COLUMNS.find(c => c.id === overId);
    
    if (isColumn) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket && ticket.status !== isColumn.id) {
        onStatusChange(ticketId, isColumn.id);
      }
      return;
    }

    // Dropped on another ticket
    const overTicket = tickets.find(t => t.id === overId);
    const activeTicket = tickets.find(t => t.id === ticketId);

    if (activeTicket && overTicket && activeTicket.status !== overTicket.status) {
      onStatusChange(ticketId, overTicket.status);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', minHeight: '600px' }}>
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        {COLUMNS.map(col => {
          const columnTickets = tickets.filter(t => t.status === col.id);
          return (
            <div key={col.id} style={{ flex: '0 0 300px', background: 'var(--bg-secondary)', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col.color }}></div>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{col.title}</h3>
                </div>
                <span style={{ fontSize: '12px', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-muted)' }}>
                  {columnTickets.length}
                </span>
              </div>
              
              <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
                <SortableContext 
                  id={col.id}
                  items={columnTickets.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {columnTickets.map(ticket => (
                    <SortableTicketCard key={ticket.id} ticket={ticket} />
                  ))}
                  {columnTickets.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)', fontSize: '13px', border: '2px dashed var(--border-color)', borderRadius: '8px' }}>
                      Drop tickets here
                    </div>
                  )}
                </SortableContext>
              </div>
            </div>
          );
        })}
      </DndContext>
    </div>
  );
}
