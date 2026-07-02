import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { format } from 'date-fns';
import { 
  ArrowLeft, Clock, User, DoorOpen, HardDrive, Tag, 
  MessageSquare, FileText, CheckSquare, Wrench, Edit,
  Paperclip, Plus, Send, X, AlertCircle, BookOpen
} from 'lucide-react';
import KBSuggestions from '../components/tickets/KBSuggestions.jsx';
import EditTicketModal from '../components/tickets/EditTicketModal.jsx';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isManager, isTechnician } = useAuth();
  const { error, success } = useToast();

  const [ticketData, setTicketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comments');
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [isEditingTicket, setIsEditingTicket] = useState(false);

  const { socket } = useSocket();

  useEffect(() => {
    fetchTicket();
    if (isManager()) {
      api('/users/technicians').then(res => setTechnicians(res.technicians || []));
    }
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;
    
    const handleUpdate = (updatedItem) => {
      if (updatedItem && (updatedItem.id == id || updatedItem.ticket_id == id)) {
        fetchTicket();
      }
    };

    socket.on('ticket:updated', handleUpdate);
    socket.on('comment:added', handleUpdate);

    return () => {
      socket.off('ticket:updated', handleUpdate);
      socket.off('comment:added', handleUpdate);
    };
  }, [socket, id]);

  async function fetchTicket() {
    try {
      setLoading(true);
      const data = await api(`/tickets/${id}`);
      setTicketData(data.ticket);
    } catch (err) {
      error('Failed to load ticket details');
      navigate('/tickets');
    } finally {
      setLoading(false);
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      await api(`/tickets/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus })
      });
      success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
      fetchTicket();
    } catch (err) {
      error(err.message || 'Failed to update status');
    }
  };

  const handleAssign = async () => {
    if (!selectedTech) return;
    try {
      await api(`/tickets/${id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ user_id: selectedTech })
      });
      success('Technician assigned');
      setSelectedTech('');
      fetchTicket();
    } catch (err) {
      error(err.message || 'Failed to assign technician');
    }
  };

  const handleRemoveAssignee = async (userId) => {
    if (!confirm('Remove this technician?')) return;
    try {
      await api(`/tickets/${id}/assign/${userId}`, { method: 'DELETE' });
      success('Technician removed');
      fetchTicket();
    } catch (err) {
      error('Failed to remove assignee');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      await api('/comments', {
        method: 'POST',
        body: JSON.stringify({
          ticket_id: id,
          content: commentText,
          is_internal: isInternalComment
        })
      });
      setCommentText('');
      setIsInternalComment(false);
      success('Comment added');
      fetchTicket();
    } catch (err) {
      error('Failed to add comment');
    }
  };

  const canEditTicket = () => {
    if (!user || !ticketData) return false;
    if (['admin', 'manager', 'technician'].includes(user.role)) return true;
    if (user.role === 'staff' && ticketData.created_by === user.id) return true;
    return false;
  };

  const handleConvertToKB = async () => {
    try {
      await api(`/knowledge-base/from-ticket/${id}`, { method: 'POST' });
      success('Ticket converted to KB article successfully. Please review and publish it.');
      navigate(`/knowledge-base?search=${encodeURIComponent(ticketData.title)}`);
    } catch (err) {
      error(err.message || 'Failed to convert to KB article.');
    }
  };

  if (loading || !ticketData) {
    return <div className="loading-spinner"><div className="spinner"></div></div>;
  }

  const { comments = [], assignees = [], activity_logs = [] } = ticketData;
  const isActive = !['closed', 'cancelled'].includes(ticketData.status);

  return (
    <div>
      {isEditingTicket && (
        <EditTicketModal 
          ticket={ticketData} 
          onClose={() => setIsEditingTicket(false)}
          onSave={() => {
            setIsEditingTicket(false);
            fetchTicket();
          }}
        />
      )}
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn-icon" onClick={() => navigate('/tickets')}><ArrowLeft /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 className="page-title">{ticketData.ticket_number}</h1>
              <span className={`badge badge-status-${ticketData.status}`}>{ticketData.status.replace(/_/g, ' ')}</span>
              <span className={`badge badge-priority-${ticketData.priority}`}>{ticketData.priority}</span>
              {ticketData.ticket_type && (
                <span className="badge" style={{
                  background: ticketData.ticket_type === 'task' ? 'rgba(6, 182, 212, 0.15)' : ticketData.ticket_type === 'request' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: ticketData.ticket_type === 'task' ? '#22d3ee' : ticketData.ticket_type === 'request' ? '#a78bfa' : '#f87171',
                  textTransform: 'capitalize'
                }}>{ticketData.ticket_type}</span>
              )}
              {ticketData.sla_status === 'breached' && <span className="badge badge-sla-breached">SLA Breached</span>}
            </div>
            <p className="page-subtitle">{ticketData.title}</p>
          </div>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
          {canEditTicket() && (
            <button className="btn btn-secondary" onClick={() => setIsEditingTicket(true)}>
              <Edit size={16} /> Edit
            </button>
          )}
          {isActive && (
            <>
              {ticketData.status === 'open' && isTechnician() && (
                <button className="btn btn-primary" onClick={() => handleStatusChange('in_progress')}>Start Work</button>
              )}
              {ticketData.status === 'in_progress' && isTechnician() && (
                <button className="btn btn-primary" onClick={() => handleStatusChange('resolved')}>Mark Resolved</button>
              )}
              {ticketData.status === 'resolved' && isManager() && (
                <button className="btn btn-primary" onClick={() => handleStatusChange('closed')}>Close Ticket</button>
              )}
            </>
          )}
          {ticketData.status === 'closed' && isManager() && (
            <button className="btn btn-secondary" onClick={handleConvertToKB} title="Convert to Knowledge Base Article">
              <BookOpen size={16} /> Convert to KB
            </button>
          )}
        </div>
      </div>

      <div className="ticket-detail-grid">
        {/* Main Content Column */}
        <div className="ticket-detail-main">
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="detail-section-title"><FileText size={18}/> Description</h3>
            <div style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', fontSize: 'var(--font-sm)', lineHeight: 1.6 }}>
              {ticketData.description || <em style={{ opacity: 0.5 }}>No description provided.</em>}
            </div>

            {ticketData.guest_impact !== 'none' && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)', fontWeight: 600, marginBottom: '4px' }}>
                  <AlertCircle size={16} /> Guest Impact: {ticketData.guest_impact}
                </div>
                {ticketData.guest_name && <div style={{ fontSize: '13px' }}>Guest Name: <strong>{ticketData.guest_name}</strong></div>}
              </div>
            )}

            {isActive && (
              <div style={{ marginTop: '16px' }}>
                <KBSuggestions query={ticketData.title} categoryId={ticketData.category_id} discrete={true} />
              </div>
            )}
          </div>

          <div className="tabs">
            <button className={`tab ${activeTab === 'comments' ? 'active' : ''}`} onClick={() => setActiveTab('comments')}>
              <MessageSquare size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}/> 
              Comments ({comments.length})
            </button>
            <button className={`tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
              <Clock size={16} style={{ display: 'inline', marginRight: 4, verticalAlign: 'text-bottom' }}/> 
              Activity Log ({activity_logs.length})
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'comments' && (
              <div>
                <div style={{ marginBottom: '24px' }}>
                  {comments.length === 0 ? (
                    <div className="empty-state" style={{ padding: '24px' }}>
                      <p>No comments yet.</p>
                    </div>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className={`comment ${c.is_internal ? 'internal' : ''}`}>
                        <div className="comment-header">
                          <div className="comment-author">
                            {c.user_name}
                            {c.is_internal && <span className="comment-internal-badge" style={{ marginLeft: 8 }}>Internal Note</span>}
                          </div>
                          <div className="comment-time">{format(new Date(c.created_at), 'MMM d, yyyy h:mm a')}</div>
                        </div>
                        <div className="comment-body">{c.content}</div>
                      </div>
                    ))
                  )}
                </div>

                {isActive && (
                  <form className="card" onSubmit={handleAddComment}>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <textarea
                        className="form-textarea"
                        placeholder="Type a comment..."
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      {user.role !== 'staff' && (
                        <label className="form-checkbox">
                          <input type="checkbox" checked={isInternalComment} onChange={e => setIsInternalComment(e.target.checked)} />
                          Internal Note (hidden from staff/guests)
                        </label>
                      )}
                      <button type="submit" className="btn btn-primary" disabled={!commentText.trim()}>
                        <Send size={16} /> Post Comment
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="card">
                <div className="timeline">
                  {activity_logs.map(log => (
                    <div key={log.id} className="timeline-item">
                      <div className="timeline-item-time">{format(new Date(log.created_at), 'MMM d, h:mm a')}</div>
                      <div className="timeline-item-content">
                        <strong>{log.user_name}</strong> {log.action.replace(/_/g, ' ')}
                        {log.old_value && log.new_value ? ` from ${log.old_value} to ${log.new_value}` : ''}
                        {log.new_value && !log.old_value ? `: ${log.new_value}` : ''}
                      </div>
                      {log.note && <div className="timeline-item-note">"{log.note}"</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="ticket-detail-sidebar">
          <div className="card">
            <h3 className="detail-section-title"><User size={16} /> Details</h3>
            <div className="detail-row">
              <span className="detail-row-label">Created By</span>
              <span className="detail-row-value">{ticketData.creator_name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Created At</span>
              <span className="detail-row-value">{format(new Date(ticketData.created_at), 'MMM d, yyyy HH:mm')}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Type</span>
              <span className="detail-row-value" style={{ textTransform: 'capitalize' }}>{ticketData.ticket_type || 'issue'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Department</span>
              <span className="detail-row-value" style={{ textTransform: 'capitalize' }}>{ticketData.department || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Category</span>
              <span className="detail-row-value">{ticketData.category_name || '-'}</span>
            </div>
          </div>

          <div className="card">
            <h3 className="detail-section-title"><DoorOpen size={16} /> Location & Asset</h3>
            <div className="detail-row">
              <span className="detail-row-label">Room</span>
              <span className="detail-row-value">{ticketData.room_number ? `Room ${ticketData.room_number}` : '-'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Asset</span>
              <span className="detail-row-value">{ticketData.asset_name || '-'}</span>
            </div>
          </div>

          <div className="card">
            <h3 className="detail-section-title"><Clock size={16} /> SLA Deadlines</h3>
            <div className="detail-row">
              <span className="detail-row-label">First Response</span>
              <span className="detail-row-value">
                {ticketData.first_responded_at 
                  ? <span style={{ color: 'var(--success)' }}>Responded</span>
                  : format(new Date(ticketData.first_response_due_at), 'MMM d, HH:mm')}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Resolution Due</span>
              <span className="detail-row-value" style={{ color: ticketData.sla_status === 'breached' ? 'var(--error)' : 'inherit' }}>
                {format(new Date(ticketData.resolution_due_at), 'MMM d, HH:mm')}
              </span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="detail-section-title" style={{ margin: 0 }}><Wrench size={16} /> Assignees</h3>
            </div>
            
            {assignees.length === 0 ? (
              <p style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>Unassigned</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {assignees.map(a => (
                  <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="user-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{a.full_name.charAt(0)}</div>
                      <span style={{ fontSize: 'var(--font-sm)', fontWeight: 500 }}>{a.full_name}</span>
                    </div>
                    {isManager() && (
                      <button className="btn-icon" style={{ width: 24, height: 24 }} onClick={() => handleRemoveAssignee(a.id)}><X size={14}/></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isManager() && isActive && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <SearchableSelect className="form-select" value={selectedTech} onChange={e => setSelectedTech(e.target.value)} style={{ padding: '6px 10px' }}>
                  <option value="">Select tech...</option>
                  {technicians.filter(t => !assignees.find(a => a.id === t.id)).map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </SearchableSelect>
                <button className="btn btn-secondary btn-sm" onClick={handleAssign} disabled={!selectedTech}>Assign</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
