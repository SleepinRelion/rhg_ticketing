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

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await api(`/preventive-maintenance/${id}`, { method: 'DELETE' });
      success('Schedule deleted successfully');
      fetchSchedules();
    } catch (err) {
      error(err.message || 'Failed to delete schedule');
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

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : schedules.length === 0 ? (
        <div className="empty-state card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            <Calendar size={48} style={{ margin: '0 auto', opacity: 0.5 }} />
          </div>
          <h3>No Maintenance Schedules</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Keep your assets in top condition by setting up recurring maintenance tasks.</p>
          <button className="btn btn-primary" onClick={() => openModal()}>Create First Schedule</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {sortedItems.map(schedule => {
            const dueDate = new Date(schedule.next_due_date);
            const isOverdue = dueDate < new Date() && dueDate.toDateString() !== new Date().toDateString();
            const isDueToday = dueDate.toDateString() === new Date().toDateString();

            return (
              <div key={schedule.id} className="card hover-bg-muted" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {isOverdue ? (
                    <span className="badge badge-danger">Overdue</span>
                  ) : isDueToday ? (
                    <span className="badge badge-warning">Due Today</span>
                  ) : (
                    <span className="badge badge-success">Upcoming</span>
                  )}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="btn-icon" style={{ color: 'var(--primary-500)', width: 28, height: 28 }} title="Edit Schedule" onClick={() => openModal(schedule)}><Edit size={16} /></button>
                    <button className="btn-icon" style={{ color: 'var(--error)', width: 28, height: 28 }} title="Delete Schedule" onClick={() => handleDelete(schedule.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
                
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', color: 'var(--text-primary)' }}>{schedule.title}</h3>
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {schedule.asset_name} ({schedule.asset_tag})
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', background: 'var(--bg-color)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '2px', fontSize: '12px' }}>Frequency</div>
                    <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{schedule.frequency}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '2px', fontSize: '12px' }}>Due Date</div>
                    <div style={{ fontWeight: 500, color: isOverdue ? 'var(--error)' : isDueToday ? 'var(--warning-dark)' : 'inherit' }}>
                      {format(new Date(schedule.next_due_date), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>

                <button 
                  className="btn btn-secondary" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', color: 'var(--success-color)', border: '1px solid var(--success-color)' }}
                  onClick={() => handleComplete(schedule.id)}
                >
                  <CheckCircle size={16} /> Mark Completed
                </button>
              </div>
            );
          })}
        </div>
      )}

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
