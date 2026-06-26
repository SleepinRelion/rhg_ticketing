import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import KBSuggestions from '../components/tickets/KBSuggestions.jsx';
import { Save, X } from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';

export default function CreateTicketPage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    ticket_type: 'issue',
    category_id: '',
    subcategory_id: '',
    room_id: '',
    asset_id: '',
    department: 'IT',
    guest_impact: 'none',
    guest_room_occupied: 'unknown',
    guest_name: '',
  });

  const [allCategories, setAllCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [assets, setAssets] = useState([]);
  const [saving, setSaving] = useState(false);
  const [duplicates, setDuplicates] = useState([]);

  const navigate = useNavigate();
  const { error, success } = useToast();
  const { user } = useAuth();
  
  const isIT = ['admin', 'manager', 'technician'].includes(user?.role);

  useEffect(() => {
    Promise.all([
      api('/categories'),
      api('/rooms'),
      api('/assets')
    ]).then(([catRes, roomRes, assetRes]) => {
      setAllCategories(catRes.categories || []);
      setRooms(roomRes.rooms || []);
      setAssets(assetRes.assets || []);
    }).catch(() => error('Failed to load form data'));
  }, []);

  // Derived: parent categories for the selected ticket type
  const parentCategories = useMemo(() => {
    return allCategories.filter(c => c.ticket_type === formData.ticket_type && !c.parent_id);
  }, [allCategories, formData.ticket_type]);

  // Derived: subcategories for the selected parent category
  const subcategories = useMemo(() => {
    if (!formData.category_id) return [];
    return allCategories.filter(c => c.parent_id === parseInt(formData.category_id));
  }, [allCategories, formData.category_id]);

  // For tasks, categories are leaf-level (no parent), so no subcategory needed
  const isTaskType = formData.ticket_type === 'task';

  // Debounced duplicate check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.title.length > 5 || formData.room_id) {
        checkDuplicates();
      } else {
        setDuplicates([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.title, formData.room_id, formData.asset_id, formData.category_id]);

  const checkDuplicates = async () => {
    try {
      const q = new URLSearchParams();
      if (formData.title) q.append('title', formData.title);
      if (formData.room_id) q.append('room_id', formData.room_id);
      if (formData.asset_id) q.append('asset_id', formData.asset_id);
      const catId = formData.subcategory_id || formData.category_id;
      if (catId) q.append('category_id', catId);

      const res = await api(`/tickets/duplicates?${q.toString()}`);
      setDuplicates(res.duplicates || []);
    } catch {}
  };

  const handleTypeChange = (newType) => {
    setFormData(prev => ({
      ...prev,
      ticket_type: newType,
      category_id: '',
      subcategory_id: '',
    }));
  };

  const handleCategoryChange = (catId) => {
    setFormData(prev => ({
      ...prev,
      category_id: catId,
      subcategory_id: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      // Use subcategory as the actual category_id if selected
      if (payload.subcategory_id) {
        payload.category_id = payload.subcategory_id;
      }
      delete payload.subcategory_id;
      if (!payload.category_id) delete payload.category_id;
      if (!payload.room_id) delete payload.room_id;
      if (!payload.asset_id) delete payload.asset_id;

      const ticket = await api('/tickets', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      success(`Ticket ${ticket.ticket_number} created successfully`);
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      error(err.message || 'Failed to create ticket');
      setSaving(false);
    }
  };

  const typeLabels = {
    task: { label: 'Task', desc: 'Routine IT operations (backups, scans, checks)' },
    request: { label: 'Request', desc: 'Account or hardware requests' },
    issue: { label: 'Issue', desc: 'Report a problem or incident' },
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Ticket</h1>
          <p className="page-subtitle">Report a new issue, request, or task</p>
        </div>
      </div>

      <div className="ticket-detail-grid">
        <div className="ticket-detail-main">
          <form className="card" onSubmit={handleSubmit}>
            {/* Ticket Type Selector */}
            <div className="form-group">
              <label className="form-label">Ticket Type <span style={{ color: 'var(--error)' }}>*</span></label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Object.entries(typeLabels).map(([value, { label }]) => (
                  <button
                    key={value}
                    type="button"
                    className={`btn ${formData.ticket_type === value ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleTypeChange(value)}
                    style={{ flex: 1, padding: '10px 16px', fontSize: '14px' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                {typeLabels[formData.ticket_type]?.desc}
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Title <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief description of the issue"
              />
              <KBSuggestions query={formData.title} categoryId={formData.category_id} discrete={true} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Priority</label>
                <SearchableSelect
                  className="form-select"
                  value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">Low (1 week resolution)</option>
                  <option value="medium">Medium (3 days resolution)</option>
                  <option value="high">High (24 hours resolution)</option>
                  <option value="critical">Critical (4 hours resolution)</option>
                </SearchableSelect>
              </div>
              <div className="form-group">
                <label className="form-label">{isTaskType ? 'Category' : 'Category'}</label>
                <SearchableSelect
                  className="form-select"
                  value={formData.category_id}
                  onChange={e => handleCategoryChange(e.target.value)}
                >
                  <option value="">Select Category...</option>
                  {parentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SearchableSelect>
              </div>
            </div>

            {/* Subcategory — only show if parent has children and not task type */}
            {!isTaskType && subcategories.length > 0 && (
              <div className="form-group">
                <label className="form-label">Subcategory</label>
                <SearchableSelect
                  className="form-select"
                  value={formData.subcategory_id}
                  onChange={e => setFormData({ ...formData, subcategory_id: e.target.value })}
                >
                  <option value="">Select Subcategory...</option>
                  {subcategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SearchableSelect>
              </div>
            )}

            <div className="form-row">
              <div className="form-group" style={{ flex: isIT ? 1 : 'none', width: isIT ? 'auto' : '50%' }}>
                <label className="form-label">Location / Room</label>
                <SearchableSelect
                  className="form-select"
                  value={formData.room_id}
                  onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                >
                  <option value="">Select Room/Area...</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
                </SearchableSelect>
              </div>
              
              {isIT && (
                <div className="form-group">
                  <label className="form-label">Asset / Equipment</label>
                  <SearchableSelect
                    className="form-select"
                    value={formData.asset_id}
                    onChange={e => setFormData({ ...formData, asset_id: e.target.value })}
                  >
                    <option value="">Select Asset (Optional)...</option>
                    {assets.filter(a => !formData.room_id || a.room_id == formData.room_id).map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                    ))}
                  </SearchableSelect>
                </div>
              )}
            </div>

            <div className="form-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Guest Impact</label>
                <SearchableSelect
                  className="form-select"
                  value={formData.guest_impact}
                  onChange={e => setFormData({ ...formData, guest_impact: e.target.value })}
                >
                  <option value="none">None</option>
                  <option value="low">Low (Minor inconvenience)</option>
                  <option value="high">High (Major issue, needs immediate fix)</option>
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
                    value={formData.guest_name}
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
                    <option value="no">No (Vacant)</option>
                  </SearchableSelect>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Detailed Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Provide as much detail as possible..."
                rows={6}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/tickets')} disabled={saving}>
                <X /> Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save /> {saving ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </form>
        </div>

        <div className="ticket-detail-sidebar">
          {duplicates.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
              <h3 className="detail-section-title" style={{ color: 'var(--warning)', fontSize: '14px' }}>
                Possible Duplicates Detected
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Similar open tickets already exist. Consider updating an existing ticket instead of creating a new one.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {duplicates.map(d => (
                  <div key={d.id} className="comment" style={{ margin: 0, padding: '8px', cursor: 'pointer' }} onClick={() => window.open(`/tickets/${d.id}`, '_blank')}>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{d.ticket_number}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{d.title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="detail-section-title" style={{ fontSize: '14px' }}>Creation Guidelines</h3>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '16px', lineHeight: '1.8' }}>
              <li>Choose the correct <strong>Ticket Type</strong> first.</li>
              <li><strong>Task</strong> = Routine operations (backups, scans).</li>
              <li><strong>Request</strong> = Account or device requests.</li>
              <li><strong>Issue</strong> = Report a problem or incident.</li>
              <li>Always select a room if the issue is physically located in one.</li>
              <li>If this affects a guest, mark Guest Impact as High.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
