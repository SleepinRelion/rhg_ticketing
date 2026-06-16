import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Plus, Filter, Download, Trash2, Tag, Play, Ticket, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function TicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', search: '', month: '', year: '' });
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [availableYears, setAvailableYears] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, isManager } = useAuth();
  const { socket } = useSocket();
  const { error, success } = useToast();

  useEffect(() => {
    api('/tickets/years').then(data => {
      if (data.years) setAvailableYears(data.years);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleTicketUpdate = () => {
      // Refresh the current page of tickets
      fetchTickets(pagination.page, filters);
    };

    socket.on('ticket:created', handleTicketUpdate);
    socket.on('ticket:updated', handleTicketUpdate);

    return () => {
      socket.off('ticket:created', handleTicketUpdate);
      socket.off('ticket:updated', handleTicketUpdate);
    };
  }, [socket, pagination.page, filters]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const search = params.get('search') || '';
    const date_from = params.get('date_from') || '';
    const date_to = params.get('date_to') || '';
    setFilters(f => ({ ...f, search, date_from, date_to }));
    fetchTickets(1, { ...filters, search, date_from, date_to });
  }, [location.search]);

  useEffect(() => {
    fetchTickets(pagination.page, filters);
  }, [filters]);

  async function fetchTickets(page = 1, currentFilters = filters) {
    try {
      setLoading(true);
      const query = new URLSearchParams({
        page,
        limit: pagination.limit,
        ...Object.fromEntries(Object.entries(currentFilters).filter(([_, v]) => v))
      }).toString();

      const data = await api(`/tickets?${query}`);
      setTickets(data.tickets);
      setPagination(data.pagination);
    } catch (err) {
      error('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }

  const handleExport = async () => {
    try {
      const blob = await api('/tickets/export');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      success('Exported successfully');
    } catch (err) {
      error('Failed to export tickets');
    }
  };

  const handleBulkAction = async (action, value = null) => {
    if (selectedTickets.size === 0) return;
    if (!confirm(`Are you sure you want to perform this action on ${selectedTickets.size} tickets?`)) return;

    try {
      await api('/tickets/bulk', {
        method: 'POST',
        body: JSON.stringify({
          ticket_ids: Array.from(selectedTickets),
          action,
          value
        })
      });
      success('Bulk action completed');
      setSelectedTickets(new Set());
      fetchTickets(pagination.page);
    } catch (err) {
      error('Bulk action failed');
    }
  };

  const toggleSelect = (id) => {
    const newSet = new Set(selectedTickets);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTickets(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedTickets.size === tickets.length) {
      setSelectedTickets(new Set());
    } else {
      setSelectedTickets(new Set(tickets.map(t => t.id)));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-subtitle">Manage maintenance and guest requests</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleExport}><Download /> Export CSV</button>
          <button className="btn btn-primary" onClick={() => navigate('/tickets/new')}><Plus /> New Ticket</button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-input-wrapper">
          <Filter />
          <select
            className="form-select"
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            style={{ width: 160, paddingLeft: 36 }}
          >
            <option value="">All Statuses</option>
            <option value="open,assigned">Active (Open/Assigned)</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_for_parts,waiting_for_vendor,waiting_for_guest">Waiting/Blocked</option>
            <option value="resolved,closed">Resolved/Closed</option>
          </select>
        </div>

        <div className="search-input-wrapper">
          <Filter />
          <select
            className="form-select"
            value={filters.priority}
            onChange={e => setFilters({ ...filters, priority: e.target.value })}
            style={{ width: 160, paddingLeft: 36 }}
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <select
          className="form-select"
          value={filters.month || ''}
          onChange={e => setFilters({ ...filters, month: e.target.value })}
          style={{ width: 130 }}
        >
          <option value="">All Months</option>
          <option value="1">January</option>
          <option value="2">February</option>
          <option value="3">March</option>
          <option value="4">April</option>
          <option value="5">May</option>
          <option value="6">June</option>
          <option value="7">July</option>
          <option value="8">August</option>
          <option value="9">September</option>
          <option value="10">October</option>
          <option value="11">November</option>
          <option value="12">December</option>
        </select>

        <select
          className="form-select"
          value={filters.year || ''}
          onChange={e => setFilters({ ...filters, year: e.target.value })}
          style={{ width: 110 }}
        >
          <option value="">All Years</option>
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <div className="toolbar-spacer" />

        {selectedTickets.size > 0 && isManager() && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-elevated)', padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--primary-500)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-400)' }}>{selectedTickets.size} selected</span>
            <div style={{ width: 1, height: 16, background: 'var(--border-color)', margin: '0 4px' }} />
            <button className="btn btn-ghost btn-sm" onClick={() => handleBulkAction('change_status', 'in_progress')} title="Mark In Progress"><Play size={14} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleBulkAction('change_status', 'resolved')} title="Mark Resolved"><CheckCircle2 size={14} /></button>
            {user.role === 'admin' && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleBulkAction('soft_delete')} title="Delete"><Trash2 size={14} /></button>
            )}
          </div>
        )}
      </div>

      <div className="data-table-container">
        {loading && tickets.length === 0 ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <Ticket />
            <h3>No tickets found</h3>
            <p>Try adjusting your filters or create a new ticket.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {isManager() && (
                  <th style={{ width: 40 }}>
                    <div className="form-checkbox">
                      <input type="checkbox" checked={selectedTickets.size === tickets.length} onChange={toggleSelectAll} />
                    </div>
                  </th>
                )}
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Room/Asset</th>
                <th>Created</th>
                <th>SLA</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(ticket => (
                <tr key={ticket.id} className="clickable" onClick={(e) => {
                  if (e.target.type === 'checkbox') return;
                  navigate(`/tickets/${ticket.id}`);
                }}>
                  {isManager() && (
                    <td onClick={e => e.stopPropagation()}>
                      <div className="form-checkbox">
                        <input type="checkbox" checked={selectedTickets.has(ticket.id)} onChange={() => toggleSelect(ticket.id)} />
                      </div>
                    </td>
                  )}
                  <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{ticket.ticket_number}</td>
                  <td className="ticket-title">
                    <div style={{ fontWeight: 600 }}>{ticket.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ticket.category_name || 'Uncategorized'}</div>
                  </td>
                  <td><span className={`badge badge-status-${ticket.status}`}>{ticket.status.replace(/_/g, ' ')}</span></td>
                  <td><span className={`badge badge-priority-${ticket.priority}`}>{ticket.priority}</span></td>
                  <td>
                    {ticket.room_number && <div>Room {ticket.room_number}</div>}
                    {ticket.asset_name && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ticket.asset_name}</div>}
                  </td>
                  <td>{format(new Date(ticket.created_at), 'MMM d, h:mm a')}</td>
                  <td>
                    {ticket.sla_status === 'on_track' ? <span className="badge badge-sla-on_track">On Track</span> :
                     ticket.sla_status === 'at_risk' ? <span className="badge badge-sla-at_risk">At Risk</span> :
                     <span className="badge badge-sla-breached">Breached</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="pagination">
          <div>{(pagination.page - 1) * pagination.limit + 1} / {pagination.total}</div>
          <div className="pagination-buttons" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              className="pagination-btn"
              disabled={pagination.page === 1}
              onClick={() => fetchTickets(pagination.page - 1)}
            >
              Previous
            </button>
            
            <div className="pagination-btn" style={{ position: 'relative', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '4px 8px 4px 12px', display: 'flex', alignItems: 'center', gap: '4px', pointerEvents: 'none' }}>
                <span style={{ fontWeight: 500 }}>{pagination.page}</span>
                <span style={{ opacity: 0.7 }}>/ {pagination.totalPages}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
              <select 
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', appearance: 'none', textAlign: 'center' }}
                value={pagination.page}
                onChange={(e) => fetchTickets(Number(e.target.value))}
                title="Select page"
              >
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                  <option key={page} value={page} style={{ textAlign: 'center' }}>{page}</option>
                ))}
              </select>
            </div>

            <button
              className="pagination-btn"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchTickets(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
