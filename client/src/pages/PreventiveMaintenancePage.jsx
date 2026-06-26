import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { Calendar, Plus, CheckCircle, Edit, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';
import useSortableTable from '../hooks/useSortableTable.js';

export default function PreventiveMaintenancePage() {
  const [schedules, setSchedules] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { sortedItems, requestSort, sortConfig } = useSortableTable(schedules);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    asset_id: '',
    title: '',
    description: '',
    frequency: 'monthly',
    next_due_date: format(new Date(), 'yyyy-MM-dd')
  });
  const { success, error } = useToast();

  useEffect(() => {
    fetchSchedules();
    fetchAssets();
  }, []);

  async function fetchSchedules() {
    try {
      const res = await api('/preventive-maintenance');
      setSchedules(res.schedules || []);
    } catch (err) {
      error('Failed to load maintenance schedules');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAssets() {
    try {
      const res = await api('/assets');
      setAssets(res.assets || []);
    } catch (err) {
      console.error('Failed to load assets');
    }
  }

  const openModal = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        asset_id: schedule.asset_id || '',
        title: schedule.title || '',
        description: schedule.description || '',
        frequency: schedule.frequency || 'monthly',
        next_due_date: schedule.next_due_date ? format(new Date(schedule.next_due_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        asset_id: '',
        title: '',
        description: '',
        frequency: 'monthly',
        next_due_date: format(new Date(), 'yyyy-MM-dd')
      });
    }
    setIsModalOpen(true);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingSchedule) {
        await api(`/preventive-maintenance/${editingSchedule.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
        success('Schedule updated successfully');
      } else {
        await api('/preventive-maintenance', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
        success('Schedule created successfully');
      }
      setIsModalOpen(false);
      fetchSchedules();
    } catch (err) {
      error(err.message || 'Failed to save schedule');
    }
  }

  async function handleComplete(id) {
    if (!window.confirm('Mark this task as completed? The next due date will be calculated automatically.')) return;
    try {
      await api(`/preventive-maintenance/${id}/complete`, { method: 'POST' });
      success('Task marked as completed');
      fetchSchedules();
    } catch (err) {
      error(err.message || 'Failed to complete task');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Preventive Maintenance</h1>
          <p className="page-subtitle">Manage recurring tasks and asset servicing schedules</p>
        </div>
        <button className="btn btn-primary" onClick={() => openModal()} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> Add Schedule
        </button>
      </div>

      <div className="card table-container">
        {loading ? (
          <div className="loading-spinner"><div className="spinner"></div></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Status</th>
                <th onClick={() => requestSort('title')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Task {sortConfig?.key === 'title' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('asset_name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Asset {sortConfig?.key === 'asset_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('frequency')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Frequency {sortConfig?.key === 'frequency' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('next_due_date')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Next Due Date {sortConfig?.key === 'next_due_date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => requestSort('last_completed_at')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                  Last Completed {sortConfig?.key === 'last_completed_at' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map(schedule => {
                const dueDate = new Date(schedule.next_due_date);
                const isOverdue = dueDate < new Date() && dueDate.toDateString() !== new Date().toDateString();
                const isDueToday = dueDate.toDateString() === new Date().toDateString();

                return (
                  <tr key={schedule.id}>
                    <td>
                      {isOverdue ? (
                        <span className="badge badge-danger">Overdue</span>
                      ) : isDueToday ? (
                        <span className="badge badge-warning">Due Today</span>
                      ) : (
                        <span className="badge badge-success">Upcoming</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{schedule.title}</td>
                    <td>{schedule.asset_name} ({schedule.asset_tag})</td>
                    <td style={{ textTransform: 'capitalize' }}>{schedule.frequency}</td>
                    <td>{format(new Date(schedule.next_due_date), 'MMM d, yyyy')}</td>
                    <td>{schedule.last_completed_at ? format(new Date(schedule.last_completed_at), 'MMM d, yyyy') : 'Never'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-ghost" 
                          style={{ color: 'var(--success-color)' }}
                          title="Mark Completed"
                          onClick={() => handleComplete(schedule.id)}
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          className="btn btn-ghost" 
                          style={{ color: 'var(--primary-500)' }}
                          title="Edit Schedule"
                          onClick={() => openModal(schedule)}
                        >
                          <Edit size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {schedules.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    No preventive maintenance schedules configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingSchedule ? 'Edit Schedule' : 'New Maintenance Schedule'}</h2>
              <button type="button" className="btn-icon" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g. Quarterly HVAC Filter Change"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Asset</label>
                <SearchableSelect 
                  className="form-input" 
                  required
                  value={formData.asset_id}
                  onChange={e => setFormData({...formData, asset_id: e.target.value})}
                  disabled={!!editingSchedule}
                >
                  <option value="">Select an asset...</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                  ))}
                </SearchableSelect>
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-input" 
                  rows="3"
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                ></textarea>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Frequency</label>
                  <SearchableSelect 
                    className="form-input" 
                    value={formData.frequency}
                    onChange={e => setFormData({...formData, frequency: e.target.value})}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="bimonthly">Bi-monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="semiannual">Semi-annual</option>
                    <option value="annual">Annual</option>
                  </SearchableSelect>
                </div>
                
                <div className="form-group">
                  <label className="form-label">First Due Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required
                    value={formData.next_due_date}
                    onChange={e => setFormData({...formData, next_due_date: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editingSchedule ? 'Save Changes' : 'Create Schedule'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
