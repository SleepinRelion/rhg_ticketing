import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import KBSuggestions from '../components/tickets/KBSuggestions.jsx';
import { Save, X, ClipboardList, FileQuestion, AlertTriangle, User, Monitor, Building2, Server, DoorOpen, ChevronRight, ArrowLeft } from 'lucide-react';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';
import FormatCategory from '../components/ui/FormatCategory.jsx';

const TYPE_CONFIG = {
  task: {
    label: 'Task',
    icon: ClipboardList,
    color: '#22d3ee',
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.3)',
    desc: 'Routine IT operations — backups, scans, server checks',
  },
  request: {
    label: 'Request',
    icon: FileQuestion,
    color: '#a78bfa',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    desc: 'Account management or hardware/device requests',
  },
  issue: {
    label: 'Issue',
    icon: AlertTriangle,
    color: '#f87171',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    desc: 'Report a problem — room, office, or infrastructure',
  },
};

const ISSUE_CATEGORY_ICONS = {
  'Room': DoorOpen,
  'Office/Dept': Building2,
  'Infra': Server,
};

const REQUEST_CATEGORY_ICONS = {
  'Account': User,
  'Asset': Monitor,
};

export default function CreateTicketPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    ticket_type: '',
    category_id: '',
    subcategory_id: '',
    room_id: '',
    asset_id: '',
    department: 'IT',
    guest_impact: 'none',
    guest_room_occupied: 'unknown',
    guest_name: '',
    requested_for: '',
    justification: '',
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

  const parentCategories = useMemo(() => {
    return allCategories.filter(c => c.ticket_type === formData.ticket_type && !c.parent_id);
  }, [allCategories, formData.ticket_type]);

  const subcategories = useMemo(() => {
    if (!formData.category_id) return [];
    return allCategories.filter(c => c.parent_id === parseInt(formData.category_id));
  }, [allCategories, formData.category_id]);

  const selectedParent = useMemo(() => {
    if (!formData.category_id) return null;
    return allCategories.find(c => c.id === parseInt(formData.category_id));
  }, [allCategories, formData.category_id]);

  const isTaskType = formData.ticket_type === 'task';
  const isRequestType = formData.ticket_type === 'request';
  const isIssueType = formData.ticket_type === 'issue';

  const isRoomIssue = isIssueType && selectedParent?.name === 'Room';
  const isOfficeIssue = isIssueType && selectedParent?.name === 'Office/Dept';
  const isInfraIssue = isIssueType && selectedParent?.name === 'Infra';

  const isAccountRequest = isRequestType && selectedParent?.name === 'Account';
  const isAssetRequest = isRequestType && selectedParent?.name === 'Asset';

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

  const handleTypeSelect = (type) => {
    setFormData(prev => ({
      ...prev,
      ticket_type: type,
      category_id: '',
      subcategory_id: '',
      room_id: '',
      asset_id: '',
      guest_impact: 'none',
      guest_name: '',
    }));
    setStep(2);
  };

  const handleCategoryChange = (catId) => {
    setFormData(prev => ({
      ...prev,
      category_id: catId,
      subcategory_id: '',
      room_id: '',
      asset_id: '',
      guest_impact: 'none',
      guest_name: '',
    }));
  };

  const handleBackToTypeSelect = () => {
    setStep(1);
    setFormData(prev => ({
      ...prev,
      ticket_type: '',
      category_id: '',
      subcategory_id: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...formData };
      if (payload.subcategory_id) {
        payload.category_id = payload.subcategory_id;
      }
      delete payload.subcategory_id;
      if (!payload.category_id) delete payload.category_id;
      if (!payload.room_id) delete payload.room_id;
      if (!payload.asset_id) delete payload.asset_id;
      if (payload.requested_for) {
        payload.description = `Requested for: ${payload.requested_for}\n${payload.justification ? `Justification: ${payload.justification}\n` : ''}\n${payload.description || ''}`.trim();
      }
      delete payload.requested_for;
      delete payload.justification;

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

  const typeConfig = TYPE_CONFIG[formData.ticket_type];

  // ========= STEP 1: TYPE SELECTION =========
  if (step === 1) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">Create Ticket</h1>
            <p className="page-subtitle">What type of ticket do you need?</p>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '20px',
          maxWidth: '900px',
        }}>
          {Object.entries(TYPE_CONFIG).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeSelect(type)}
                style={{
                  background: config.bg,
                  border: `1px solid ${config.border}`,
                  borderRadius: 'var(--radius-xl)',
                  padding: '32px 24px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = `0 12px 40px ${config.border}`;
                  e.currentTarget.style.borderColor = config.color;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = config.border;
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                  background: `${config.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '16px',
                }}>
                  <Icon size={24} style={{ color: config.color }} />
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {config.label}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {config.desc}
                </div>
                <ChevronRight size={20} style={{
                  position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                  color: config.color, opacity: 0.5,
                }} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ========= STEP 2: TYPE-SPECIFIC FORM =========
  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={handleBackToTypeSelect}
            style={{ padding: '8px', borderRadius: 'var(--radius-lg)' }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 className="page-title" style={{ margin: 0 }}>
                New {typeConfig.label}
              </h1>
              <span style={{
                background: typeConfig.bg,
                color: typeConfig.color,
                border: `1px solid ${typeConfig.border}`,
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {typeConfig.label}
              </span>
            </div>
            <p className="page-subtitle">{typeConfig.desc}</p>
          </div>
        </div>
      </div>

      <div className="ticket-detail-grid">
        <div className="ticket-detail-main">
          <form className="card" onSubmit={handleSubmit}>

            {/* ===== TITLE ===== */}
            <div className="form-group">
              <label className="form-label">Title <span style={{ color: 'var(--error)' }}>*</span></label>
              <input
                type="text"
                className="form-input"
                required
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder={
                  isTaskType ? 'e.g., Daily server health check' :
                  isRequestType ? 'e.g., New laptop for Front Desk' :
                  'e.g., TV not working in Room 204'
                }
              />
              <KBSuggestions query={formData.title} categoryId={formData.category_id} discrete={true} />
            </div>

            {/* ===== CATEGORY SECTION ===== */}
            <div style={{ marginTop: '24px', marginBottom: '8px' }}>
              <hr style={{ margin: '0 0 20px 0', borderColor: 'var(--border-color)', opacity: 0.3 }} />
              <h3 className="detail-section-title" style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px' }}>
                {isTaskType ? 'Task Type' : isRequestType ? 'Request Type' : 'Issue Location'}
              </h3>
            </div>

            {/* === TASK: Flat category grid === */}
            {isTaskType && (
              <div className="form-group">
                <label className="form-label">Category <span style={{ color: 'var(--error)' }}>*</span></label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {parentCategories.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategoryChange(String(cat.id))}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 'var(--radius-lg)',
                        border: formData.category_id === String(cat.id)
                          ? `2px solid ${typeConfig.color}`
                          : '1px solid var(--border-color)',
                        background: formData.category_id === String(cat.id)
                          ? typeConfig.bg
                          : 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: formData.category_id === String(cat.id) ? 600 : 400,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <FormatCategory name={cat.name} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* === REQUEST: Category cards === */}
            {isRequestType && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  {parentCategories.map(cat => {
                    const CatIcon = REQUEST_CATEGORY_ICONS[cat.name] || FileQuestion;
                    const isSelected = formData.category_id === String(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(String(cat.id))}
                        style={{
                          padding: '20px',
                          borderRadius: 'var(--radius-xl)',
                          border: isSelected
                            ? `2px solid ${typeConfig.color}`
                            : '1px solid var(--border-color)',
                          background: isSelected ? typeConfig.bg : 'var(--bg-secondary)',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <CatIcon size={20} style={{ color: isSelected ? typeConfig.color : 'var(--text-secondary)', marginBottom: '8px' }} />
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{cat.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{cat.description}</div>
                      </button>
                    );
                  })}
                </div>

                {subcategories.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">
                      {isAccountRequest ? 'Action' : 'Device Type'} <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                      {subcategories.map(sub => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, subcategory_id: String(sub.id) })}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-lg)',
                            border: formData.subcategory_id === String(sub.id)
                              ? `2px solid ${typeConfig.color}`
                              : '1px solid var(--border-color)',
                            background: formData.subcategory_id === String(sub.id)
                              ? typeConfig.bg
                              : 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '13px',
                            fontWeight: formData.subcategory_id === String(sub.id) ? 600 : 400,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isAccountRequest && (
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label">Requested For (Employee Name)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.requested_for}
                      onChange={e => setFormData({ ...formData, requested_for: e.target.value })}
                      placeholder="Full name of the employee"
                    />
                  </div>
                )}

                {isAssetRequest && (
                  <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="form-label">Business Justification</label>
                    <textarea
                      className="form-textarea"
                      value={formData.justification}
                      onChange={e => setFormData({ ...formData, justification: e.target.value })}
                      placeholder="Why is this device needed? e.g., New hire, replacement for damaged equipment..."
                      rows={3}
                    />
                  </div>
                )}
              </>
            )}

            {/* === ISSUE: Category cards === */}
            {isIssueType && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                  {parentCategories.map(cat => {
                    const CatIcon = ISSUE_CATEGORY_ICONS[cat.name] || AlertTriangle;
                    const isSelected = formData.category_id === String(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleCategoryChange(String(cat.id))}
                        style={{
                          padding: '20px',
                          borderRadius: 'var(--radius-xl)',
                          border: isSelected
                            ? `2px solid ${typeConfig.color}`
                            : '1px solid var(--border-color)',
                          background: isSelected ? typeConfig.bg : 'var(--bg-secondary)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <CatIcon size={24} style={{ color: isSelected ? typeConfig.color : 'var(--text-secondary)', marginBottom: '8px' }} />
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>{cat.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{cat.description}</div>
                      </button>
                    );
                  })}
                </div>

                {subcategories.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Problem Type <span style={{ color: 'var(--error)' }}>*</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                      {subcategories.map(sub => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, subcategory_id: String(sub.id) })}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-lg)',
                            border: formData.subcategory_id === String(sub.id)
                              ? `2px solid ${typeConfig.color}`
                              : '1px solid var(--border-color)',
                            background: formData.subcategory_id === String(sub.id)
                              ? typeConfig.bg
                              : 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontSize: '13px',
                            fontWeight: formData.subcategory_id === String(sub.id) ? 600 : 400,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {isRoomIssue && (
                  <>
                    <div className="form-row" style={{ marginTop: '16px' }}>
                      <div className="form-group">
                        <label className="form-label">Room <span style={{ color: 'var(--error)' }}>*</span></label>
                        <SearchableSelect
                          className="form-select"
                          value={formData.room_id}
                          onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                        >
                          <option value="">Select Room...</option>
                          {rooms.map(r => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
                        </SearchableSelect>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Guest Impact</label>
                        <SearchableSelect
                          className="form-select"
                          value={formData.guest_impact}
                          onChange={e => setFormData({ ...formData, guest_impact: e.target.value })}
                        >
                          <option value="none">None</option>
                          <option value="low">Low (Minor inconvenience)</option>
                          <option value="high">High (Major issue)</option>
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
                            placeholder="Guest name (if known)"
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
                  </>
                )}

                {isOfficeIssue && (
                  <div className="form-row" style={{ marginTop: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Department</label>
                      <SearchableSelect
                        className="form-select"
                        value={formData.department}
                        onChange={e => setFormData({ ...formData, department: e.target.value })}
                      >
                        <option value="IT">IT</option>
                        <option value="front_desk">Front Desk</option>
                        <option value="housekeeping">Housekeeping</option>
                        <option value="kitchen">Kitchen</option>
                        <option value="finance">Finance</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="management">Management</option>
                      </SearchableSelect>
                    </div>
                    {isIT && (
                      <div className="form-group">
                        <label className="form-label">Affected Asset</label>
                        <SearchableSelect
                          className="form-select"
                          value={formData.asset_id}
                          onChange={e => setFormData({ ...formData, asset_id: e.target.value })}
                        >
                          <option value="">Select Asset...</option>
                          {assets.map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                          ))}
                        </SearchableSelect>
                      </div>
                    )}
                  </div>
                )}

                {isInfraIssue && (
                  <div className="form-row" style={{ marginTop: '16px' }}>
                    <div className="form-group">
                      <label className="form-label">Affected Area / Room Block (Optional)</label>
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
                        <label className="form-label">Affected Asset</label>
                        <SearchableSelect
                          className="form-select"
                          value={formData.asset_id}
                          onChange={e => setFormData({ ...formData, asset_id: e.target.value })}
                        >
                          <option value="">Select Asset...</option>
                          {assets.map(a => (
                            <option key={a.id} value={a.id}>{a.name} ({a.asset_tag})</option>
                          ))}
                        </SearchableSelect>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ===== PRIORITY ===== */}
            <div style={{ marginTop: '24px', marginBottom: '8px' }}>
              <hr style={{ margin: '0 0 20px 0', borderColor: 'var(--border-color)', opacity: 0.3 }} />
              <h3 className="detail-section-title" style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px' }}>Priority & Details</h3>
            </div>

            <div className="form-group">
              <label className="form-label">Priority</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                  { value: 'low', label: 'Low', color: '#22c55e', desc: '1 week' },
                  { value: 'medium', label: 'Medium', color: '#eab308', desc: '3 days' },
                  { value: 'high', label: 'High', color: '#f97316', desc: '24 hours' },
                  { value: 'critical', label: 'Critical', color: '#ef4444', desc: '4 hours' },
                ].map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.value })}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 'var(--radius-lg)',
                      border: formData.priority === p.value
                        ? `2px solid ${p.color}`
                        : '1px solid var(--border-color)',
                      background: formData.priority === p.value
                        ? `${p.color}15`
                        : 'var(--bg-secondary)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px', color: formData.priority === p.value ? p.color : 'var(--text-primary)' }}>
                      {p.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {p.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ===== DESCRIPTION ===== */}
            <div className="form-group">
              <label className="form-label">
                {isTaskType ? 'Notes / Steps' : isRequestType ? 'Additional Details' : 'Detailed Description'}
              </label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder={
                  isTaskType ? 'Any specific steps or notes for this task...' :
                  isRequestType ? 'Additional information about the request...' :
                  'Describe the problem in detail — what happened, when, what you observed...'
                }
                rows={5}
              />
            </div>

            {/* ===== SUBMIT ===== */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => navigate('/tickets')} disabled={saving}>
                <X /> Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save /> {saving ? 'Creating...' : `Create ${typeConfig.label}`}
              </button>
            </div>
          </form>
        </div>

        {/* ===== SIDEBAR ===== */}
        <div className="ticket-detail-sidebar">
          {duplicates.length > 0 && (
            <div className="card" style={{ borderColor: 'var(--warning)', background: 'rgba(245, 158, 11, 0.05)' }}>
              <h3 className="detail-section-title" style={{ color: 'var(--warning)', fontSize: '14px' }}>
                Possible Duplicates Detected
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Similar open tickets already exist. Consider updating an existing ticket instead.
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
            <h3 className="detail-section-title" style={{ fontSize: '14px' }}>
              {isTaskType ? 'Task Guidelines' : isRequestType ? 'Request Guidelines' : 'Issue Guidelines'}
            </h3>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', paddingLeft: '16px', lineHeight: '1.8' }}>
              {isTaskType && (
                <>
                  <li>Select the correct <strong>task type</strong> from the grid.</li>
                  <li><strong>Daily Task</strong> = Routine daily check-ins and operations.</li>
                  <li><strong>Server Check</strong> = Monitor uptime, storage, performance.</li>
                  <li><strong>Backup / Restoration</strong> = Data backup and recovery testing.</li>
                  <li>Set priority based on operational urgency.</li>
                </>
              )}
              {isRequestType && (
                <>
                  <li>Choose <strong>Account</strong> for user/access management.</li>
                  <li>Choose <strong>Asset</strong> for hardware and device requests.</li>
                  <li>For account requests, specify who the request is for.</li>
                  <li>For asset requests, provide a business justification.</li>
                  <li>Select the specific action or device type needed.</li>
                </>
              )}
              {isIssueType && (
                <>
                  <li><strong>Room</strong> = Issues inside a guest room (TV, phone, cabling).</li>
                  <li><strong>Office/Dept</strong> = Issues in office areas (PC, laptop, printer).</li>
                  <li><strong>Infra</strong> = Infrastructure-level problems (IPTV, PABX, network, servers).</li>
                  <li>For room issues, always select the room number.</li>
                  <li>If a guest is affected, mark Guest Impact as High.</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
