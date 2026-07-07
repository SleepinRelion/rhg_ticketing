import { useState, useEffect, useMemo } from 'react';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { X, Save } from 'lucide-react';
import SearchableSelect from '../ui/SearchableSelect.jsx';

export default function EditTicketModal({ ticket, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: ticket.title || '',
    description: ticket.description || '',
    priority: ticket.priority || 'medium',
    ticket_type: ticket.ticket_type || 'issue',
    category_id: ticket.category_id || '',
    department: ticket.department || '',
    room_id: ticket.room_id || '',
    asset_id: ticket.asset_id || '',
    guest_impact: ticket.guest_impact || 'none',
    guest_room_occupied: ticket.guest_room_occupied || 'unknown',
    guest_name: ticket.guest_name || '',
    hotel_id: ticket.hotel_id || '',
  });

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [assets, setAssets] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [saving, setSaving] = useState(false);

  const { error, success } = useToast();
  const { user } = useAuth();
  const isIT = ['admin', 'manager', 'technician'].includes(user?.role);

  useEffect(() => {
    Promise.all([
      api('/categories'),
      api('/departments'),
      api('/rooms'),
      api('/assets'),
      api('/hotels/public')
    ]).then(([catRes, depRes, roomRes, assetRes, hotelRes]) => {
      setCategories(catRes.categories || []);
      setDepartments(depRes.departments || []);
      setRooms(roomRes.rooms || []);
      setAssets(assetRes.assets || []);
      setHotels(hotelRes.hotels || []);
    }).catch(() => error('Failed to load form data'));
  }, [error]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (!payload.category_id) payload.category_id = null;
      if (!payload.room_id) payload.room_id = null;
      if (!payload.asset_id) payload.asset_id = null;
      if (!payload.hotel_id) payload.hotel_id = null;

      const updatedTicket = await api(`/tickets/${ticket.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      success('Ticket updated successfully');
      onSave(updatedTicket);
    } catch (err) {
      error(err.message || 'Failed to update ticket');
      setSaving(false);
    }
  };

  const isTaskType = formData.ticket_type === 'task';
  const isIssueType = formData.ticket_type === 'issue';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <h2>Edit Ticket {ticket.ticket_number}</h2>
          <button type="button" className="btn-icon" onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          <div className="form-group">
            <label className="form-label">Title <span style={{ color: 'var(--error)' }}>*</span></label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <SearchableSelect
                className="form-select"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </SearchableSelect>
            </div>
            <div className="form-group">
              <label className="form-label">Ticket Type</label>
              <SearchableSelect
                className="form-select"
                value={formData.ticket_type}
                onChange={e => setFormData({ ...formData, ticket_type: e.target.value, category_id: '' })}
              >
                <option value="task">Task</option>
                <option value="request">Request</option>
                <option value="issue">Issue</option>
              </SearchableSelect>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Hotel</label>
              <SearchableSelect
                className="form-select"
                value={formData.hotel_id || ''}
                onChange={e => setFormData({ ...formData, hotel_id: e.target.value })}
              >
                <option value="">No Hotel (Unassigned)</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </SearchableSelect>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Department</label>
              <SearchableSelect
                className="form-select"
                value={formData.department || ''}
                onChange={e => setFormData({ ...formData, department: e.target.value })}
              >
                <option value="">Select Department...</option>
                {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </SearchableSelect>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <SearchableSelect
                className="form-select"
                value={formData.category_id || ''}
                onChange={e => setFormData({ ...formData, category_id: e.target.value })}
              >
                <option value="">Select Category...</option>
                {categories.filter(c => c.ticket_type === formData.ticket_type).map(c => <option key={c.id} value={c.id}>{c.parent_id ? `  └ ${c.name}` : c.name}</option>)}
              </SearchableSelect>
            </div>
          </div>

          {!isTaskType && (
            <div className="form-row">
              <div className="form-group" style={{ flex: isIT ? 1 : 'none', width: isIT ? 'auto' : '50%' }}>
                <label className="form-label">Room</label>
                <SearchableSelect
                  className="form-select"
                  value={formData.room_id || ''}
                  onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                >
                  <option value="">None</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
                </SearchableSelect>
              </div>
              
              {isIT && (
                <div className="form-group">
                  <label className="form-label">Asset</label>
                  <SearchableSelect
                    className="form-select"
                    value={formData.asset_id || ''}
                    onChange={e => setFormData({ ...formData, asset_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {assets.filter(a => !formData.room_id || a.room_id == formData.room_id).map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                    ))}
                  </SearchableSelect>
                </div>
              )}
            </div>
          )}

          {isIssueType && (
            <>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Guest Impact</label>
                  <SearchableSelect
                    className="form-select"
                    value={formData.guest_impact}
                    onChange={e => setFormData({ ...formData, guest_impact: e.target.value })}
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="high">High</option>
                  </SearchableSelect>
                </div>
              </div>

              {formData.guest_impact === 'high' && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Guest Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.guest_name || ''}
                      onChange={e => setFormData({ ...formData, guest_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Room Occupied?</label>
                    <SearchableSelect
                      className="form-select"
                      value={formData.guest_room_occupied}
                      onChange={e => setFormData({ ...formData, guest_room_occupied: e.target.value })}
                    >
                      <option value="unknown">Unknown</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </SearchableSelect>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={5}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
