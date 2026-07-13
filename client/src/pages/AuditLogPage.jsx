import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { format } from 'date-fns';
import { Shield, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import useSortableTable from '../hooks/useSortableTable.js';

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const { sortedItems, requestSort, sortConfig } = useSortableTable(logs);
  
  const [filters, setFilters] = useState({ action: '', entity_type: '' });
  const { error } = useToast();

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 20 });
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const res = await api(`/audit-logs?${params.toString()}`);
      setLogs(res.logs || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch (err) {
      error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Security ledger of all system activity</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
            <label className="form-label">Action Filter</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g., ticket_created, user_login..."
              value={filters.action || ''}
              onChange={e => { setFilters({...filters, action: e.target.value}); setPage(1); }}
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
            <label className="form-label">Entity Type Filter</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g., ticket, user, settings..."
              value={filters.entity_type || ''}
              onChange={e => { setFilters({...filters, entity_type: e.target.value}); setPage(1); }}
            />
          </div>
          <div className="form-group" style={{ minWidth: '150px', margin: 0 }}>
            <label className="form-label">Date From</label>
            <input 
              type="date" 
              className="form-input" 
              value={filters.date_from || ''}
              onChange={e => { setFilters({...filters, date_from: e.target.value}); setPage(1); }}
            />
          </div>
          <div className="form-group" style={{ minWidth: '150px', margin: 0 }}>
            <label className="form-label">Date To</label>
            <input 
              type="date" 
              className="form-input" 
              value={filters.date_to || ''}
              onChange={e => { setFilters({...filters, date_to: e.target.value}); setPage(1); }}
            />
          </div>
          <div style={{ paddingBottom: '2px' }}>
            <button className="btn btn-secondary" onClick={async () => {
              try {
                const params = new URLSearchParams({ ...filters, export: 'true' });
                const token = localStorage.getItem('accessToken');
                const baseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
                const res = await fetch(`${baseUrl}/audit-logs?${params.toString()}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-hotel-id': localStorage.getItem('activeHotelId') || '',
                  },
                });
                if (!res.ok) throw new Error('Export failed');
                const blob = await res.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(downloadUrl);
              } catch (err) {
                error('Failed to export CSV');
              }
            }}>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="card table-container table-responsive">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th onClick={() => requestSort('created_at')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Timestamp {sortConfig?.key === 'created_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('actor_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Actor {sortConfig?.key === 'actor_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('action')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Action {sortConfig?.key === 'action' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('entity_type')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Entity Type {sortConfig?.key === 'entity_type' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('entity_id')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    Entity ID {sortConfig?.key === 'entity_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => requestSort('ip_address')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                    IP Address {sortConfig?.key === 'ip_address' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map(log => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}</td>
                    <td>
                      {log.actor_name ? (
                        <div>
                          <div style={{ fontWeight: 500 }}>{log.actor_name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{log.actor_username}</div>
                        </div>
                      ) : 'System'}
                    </td>
                    <td><span className="badge badge-primary">{log.action}</span></td>
                    <td style={{ textTransform: 'capitalize' }}>{log.entity_type}</td>
                    <td>{log.entity_id || '-'}</td>
                    <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>{log.ip_address}</td>
                    <td>
                      {log.details ? (
                        <details style={{ fontSize: '12px', cursor: 'pointer' }}>
                          <summary style={{ color: 'var(--primary-600)' }}>View JSON</summary>
                          <pre style={{ margin: '8px 0 0', padding: '8px', background: 'var(--bg-color)', borderRadius: '4px', maxWidth: '300px', overflowX: 'auto' }}>
                            {JSON.stringify(typeof log.details === 'string' ? JSON.parse(log.details) : log.details, null, 2)}
                          </pre>
                        </details>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      No audit logs found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  Page {page} of {totalPages}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-ghost" 
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    style={{ padding: '8px' }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    style={{ padding: '8px' }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
