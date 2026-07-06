import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Plus, Filter, Download, Trash2, Tag, Play, Ticket, CheckCircle2, ChevronDown, ChevronUp, X, User } from 'lucide-react';
import { format } from 'date-fns';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';
import FormatCategory from '../components/ui/FormatCategory.jsx';

const FILTER_KEYS = ['status', 'priority', 'search', 'month', 'year', 'category_id', 'department', 'sla_status', 'assignee_id', 'ticket_type', 'sort_by', 'sort_order', 'room_id', 'my_tickets', 'date_from', 'date_to'];
const DEFAULT_FILTERS = { status: '', priority: '', search: '', month: '', year: '', category_id: '', department: '', sla_status: '', assignee_id: '', ticket_type: '', sort_by: 'created_at', sort_order: 'desc', room_id: '', my_tickets: '', date_from: '', date_to: '' };

export default function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL search params
  const getFiltersFromURL = useCallback(() => {
    const f = { ...DEFAULT_FILTERS };
    for (const key of FILTER_KEYS) {
      const val = searchParams.get(key);
      if (val) f[key] = val;
    }
    return f;
  }, [searchParams]);

  const [tickets, setTickets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(getFiltersFromURL);
  const [selectedTickets, setSelectedTickets] = useState(new Set());
  const [availableYears, setAvailableYears] = useState([]);
  const [categories, setCategories] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const isInitialMount = useRef(true);

  const navigate = useNavigate();
  const { user, isManager } = useAuth();
  const { socket } = useSocket();
  const { error, success } = useToast();

  useEffect(() => {
    api('/tickets/years').then(data => {
      if (data.years) setAvailableYears(data.years);
    }).catch(console.error);

    api('/categories').then(data => {
      if (data.categories) setCategories(data.categories);
    }).catch(console.error);

    api('/users/technicians').then(data => {
      if (data.technicians) setTechnicians(data.technicians);
    }).catch(console.error);

    api('/departments').then(data => {
      if (data.departments) setDepartments(data.departments);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleTicketUpdate = () => {
      fetchTickets(pagination.page, filters);
    };

    socket.on('ticket:created', handleTicketUpdate);
    socket.on('ticket:updated', handleTicketUpdate);

    return () => {
      socket.off('ticket:created', handleTicketUpdate);
      socket.off('ticket:updated', handleTicketUpdate);
    };
  }, [socket, pagination.page, filters]);

  // Sync filters to URL when they change (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchTickets(1, filters);
      return;
    }
    // Update URL params
    const params = new URLSearchParams();
    for (const [key, val] of Object.entries(filters)) {
      if (val && val !== DEFAULT_FILTERS[key]) {
        params.set(key, val);
      }
    }
    setSearchParams(params, { replace: true });
    fetchTickets(1, filters);
  }, [filters]);

  // When URL changes (e.g., browser back), sync filters from URL
  useEffect(() => {
    const urlFilters = getFiltersFromURL();
    const filtersChanged = FILTER_KEYS.some(k => (urlFilters[k] || '') !== (filters[k] || ''));
    if (filtersChanged) {
      setFilters(urlFilters);
    }
  }, [searchParams]);


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
      const query = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))).toString();
      const blob = await api(`/tickets/export?${query}`);
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

  const handleSingleAction = async (ticketId, action, value = null) => {
    let resolutionNote = null;
    
    if (value === 'closed' || value === 'resolved') {
      resolutionNote = prompt('Please enter a brief resolution note to close this ticket:');
      if (resolutionNote === null) return; // Cancelled
      if (resolutionNote.trim() === '') {
        error('A resolution note is required to close a ticket.');
        return;
      }
    } else {
      if (!confirm('Are you sure you want to perform this action?')) return;
    }

    try {
      await api('/tickets/bulk', {
        method: 'POST',
        body: JSON.stringify({
          ticket_ids: [ticketId],
          action,
          value,
          resolution_note: resolutionNote
        })
      });
      success('Action completed');
      fetchTickets(pagination.page);
    } catch (err) {
      error('Action failed');
    }
  };

  const handleSort = (field) => {
    setFilters(prev => ({
      ...prev,
      sort_by: field,
      sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc'
    }));
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

      <div className="toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div className="search-input-wrapper">
          <Filter />
          <SearchableSelect
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
          </SearchableSelect>
        </div>

        <div className="search-input-wrapper">
          <Filter />
          <SearchableSelect
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
          </SearchableSelect>
        </div>

        <SearchableSelect
          className="form-select"
          value={filters.ticket_type || ''}
          onChange={e => setFilters({ ...filters, ticket_type: e.target.value })}
          style={{ width: 130 }}
        >
          <option value="">All Types</option>
          <option value="task">Task</option>
          <option value="request">Request</option>
          <option value="issue">Issue</option>
        </SearchableSelect>

        <SearchableSelect
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
        </SearchableSelect>

        <SearchableSelect
          className="form-select"
          value={filters.year || ''}
          onChange={e => setFilters({ ...filters, year: e.target.value })}
          style={{ width: 110 }}
        >
          <option value="">All Years</option>
          {availableYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </SearchableSelect>

        <button
          className={`btn btn-sm ${filters.my_tickets ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilters({ ...filters, my_tickets: filters.my_tickets ? '' : 'true' })}
          title="Show only tickets created by or assigned to me"
        >
          <User size={14} />
          My Tickets
        </button>

        <button
          className={`btn btn-sm ${showMoreFilters ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          style={{ position: 'relative' }}
        >
          {showMoreFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          More Filters
          {(() => {
            const count = [filters.category_id, filters.department, filters.sla_status, filters.assignee_id, filters.date_from, filters.date_to, filters.room_id].filter(Boolean).length;
            return count > 0 ? (
              <span style={{
                position: 'absolute', top: -6, right: -6, background: 'var(--error)', color: '#fff',
                borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{count}</span>
            ) : null;
          })()}
        </button>

        {Object.entries(filters).some(([k, v]) => v && v !== DEFAULT_FILTERS[k]) && (
          <button
            className={`btn btn-ghost btn-sm`}
            onClick={() => setFilters({ ...DEFAULT_FILTERS })}
            style={{ color: 'var(--error)', fontSize: 12 }}
          >
            <X size={14} /> Clear All
          </button>
        )}

        <div className="toolbar-spacer" />

        {selectedTickets.size > 0 && isManager() && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-elevated)', padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--primary-500)' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-400)' }}>{selectedTickets.size} selected</span>
            <div style={{ width: 1, height: 16, background: 'var(--border-color)', margin: '0 4px' }} />
            <button className="btn btn-ghost btn-sm" onClick={() => handleBulkAction('change_status', 'in_progress')} title="Mark In Progress"><Play size={14} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleBulkAction('change_status', 'resolved')} title="Mark Resolved"><CheckCircle2 size={14} /></button>
            {['admin', 'manager'].includes(user.role) && (
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--error)' }} onClick={() => handleBulkAction('soft_delete')} title="Delete"><Trash2 size={14} /></button>
            )}
          </div>
        )}
      </div>

      {showMoreFilters && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 16px',
          background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-color)', margin: '0 0 16px 0',
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
            <SearchableSelect
              className="form-select"
              value={filters.category_id}
              onChange={e => setFilters({ ...filters, category_id: e.target.value })}
              style={{ width: 180 }}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SearchableSelect>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Department</label>
            <SearchableSelect
              className="form-select"
              value={filters.department}
              onChange={e => setFilters({ ...filters, department: e.target.value })}
              style={{ width: 160 }}
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.name}>{d.name}</option>
              ))}
            </SearchableSelect>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SLA Status</label>
            <SearchableSelect
              className="form-select"
              value={filters.sla_status}
              onChange={e => setFilters({ ...filters, sla_status: e.target.value })}
              style={{ width: 150 }}
            >
              <option value="">All SLA</option>
              <option value="on_track">On Track</option>
              <option value="at_risk">At Risk</option>
              <option value="breached">Breached</option>
            </SearchableSelect>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Assigned To</label>
            <SearchableSelect
              className="form-select"
              value={filters.assignee_id}
              onChange={e => setFilters({ ...filters, assignee_id: e.target.value })}
              style={{ width: 180 }}
            >
              <option value="">All Assignees</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </SearchableSelect>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date From</label>
            <input
              type="date"
              className="form-input"
              value={filters.date_from || ''}
              onChange={e => setFilters({ ...filters, date_from: e.target.value })}
              style={{ minHeight: '42px', fontSize: '14px', width: 140 }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date To</label>
            <input
              type="date"
              className="form-input"
              value={filters.date_to || ''}
              onChange={e => setFilters({ ...filters, date_to: e.target.value })}
              style={{ minHeight: '42px', fontSize: '14px', width: 140 }}
            />
          </div>
        </div>
      )}

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
                <th onClick={() => handleSort('ticket_number')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  ID {filters.sort_by === 'ticket_number' && (filters.sort_order === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('ticket_type')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Type {filters.sort_by === 'ticket_type' && (filters.sort_order === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('title')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Title {filters.sort_by === 'title' && (filters.sort_order === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Status {filters.sort_by === 'status' && (filters.sort_order === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('priority')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Priority {filters.sort_by === 'priority' && (filters.sort_order === 'asc' ? '↑' : '↓')}
                </th>
                <th>Room/Asset</th>
                <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Created {filters.sort_by === 'created_at' && (filters.sort_order === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('sla_status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  SLA {filters.sort_by === 'sla_status' && (filters.sort_order === 'asc' ? '↑' : '↓')}
                </th>
                {isManager() && <th style={{ textAlign: 'right' }}>Actions</th>}
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
                  <td>
                    <span className="badge" style={{
                      background: ticket.ticket_type === 'task' ? 'rgba(6, 182, 212, 0.15)' : ticket.ticket_type === 'request' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: ticket.ticket_type === 'task' ? '#22d3ee' : ticket.ticket_type === 'request' ? '#a78bfa' : '#f87171',
                      textTransform: 'capitalize', fontSize: 11
                    }}>{ticket.ticket_type || 'issue'}</span>
                  </td>
                  <td className="ticket-title">
                    <div style={{ fontWeight: 600 }}>{ticket.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}><FormatCategory name={ticket.category_name || 'Uncategorized'} /></div>
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
                  {isManager() && (
                    <td style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '4px' }}>
                        {ticket.status !== 'in_progress' && (
                          <button className="btn btn-ghost btn-sm" style={{ padding: '4px', height: 'auto', minHeight: 0 }} onClick={() => handleSingleAction(ticket.id, 'change_status', 'in_progress')} title="Mark In Progress">
                            <Play size={16} />
                          </button>
                        )}
                        {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                          <button className="btn btn-ghost btn-sm" style={{ padding: '4px', height: 'auto', minHeight: 0, color: 'var(--success)' }} onClick={() => handleSingleAction(ticket.id, 'change_status', 'resolved')} title="Mark Resolved">
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {ticket.status !== 'closed' && (
                          <button className="btn btn-ghost btn-sm" style={{ padding: '4px', height: 'auto', minHeight: 0, color: 'var(--text-muted)' }} onClick={() => handleSingleAction(ticket.id, 'change_status', 'closed')} title="Close Ticket">
                            <X size={16} />
                          </button>
                        )}
                        {['admin', 'manager'].includes(user.role) && (
                          <button className="btn btn-ghost btn-sm" style={{ padding: '4px', height: 'auto', minHeight: 0, color: 'var(--error)' }} onClick={() => handleSingleAction(ticket.id, 'soft_delete')} title="Delete">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
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
              <SearchableSelect 
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', appearance: 'none', textAlign: 'center' }}
                value={pagination.page}
                onChange={(e) => fetchTickets(Number(e.target.value))}
                title="Select page"
              >
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                  <option key={page} value={page} style={{ textAlign: 'center' }}>{page}</option>
                ))}
              </SearchableSelect>
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
