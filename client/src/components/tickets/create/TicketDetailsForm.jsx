import { ArrowLeft, Save, X, FileQuestion, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import SearchableSelect from '../../ui/SearchableSelect.jsx';
import FormatCategory from '../../ui/FormatCategory.jsx';
import KBSuggestions from '../KBSuggestions.jsx';
import DuplicateWarning from './DuplicateWarning.jsx';

export default function TicketDetailsForm({
  formData,
  setFormData,
  typeConfig,
  parentCategories,
  subcategories,
  rooms,
  assets,
  departments,
  duplicates,
  saving,
  onSubmit,
  onBack,
  onCancel,
  isIT,
  handleCategoryChange,
  REQUEST_CATEGORY_ICONS,
  ISSUE_CATEGORY_ICONS
}) {
  const isTaskType = formData.ticket_type === 'task';
  const isRequestType = formData.ticket_type === 'request';
  const isIssueType = formData.ticket_type === 'issue';

  const isRoomIssue = isIssueType && parentCategories.find(c => c.id === Number(formData.category_id))?.name === 'Room';
  const isOfficeIssue = isIssueType && parentCategories.find(c => c.id === Number(formData.category_id))?.name === 'Office/Dept';
  const isInfraIssue = isIssueType && parentCategories.find(c => c.id === Number(formData.category_id))?.name === 'Infrastructure';

  const isAccountRequest = isRequestType && parentCategories.find(c => c.id === Number(formData.category_id))?.name === 'Account';
  const isAssetRequest = isRequestType && parentCategories.find(c => c.id === Number(formData.category_id))?.name === 'Asset';

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onBack}
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
          
          <DuplicateWarning duplicates={duplicates} />

          <form className="card" onSubmit={onSubmit}>
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
              <KBSuggestions query={formData.title} categoryId={formData.category_id} discrete={false} />
            </div>

            {/* ===== CATEGORY SECTION ===== */}
            <div style={{ marginTop: '24px', marginBottom: '8px' }}>
              <hr style={{ margin: '0 0 20px 0', borderColor: 'var(--border-color)', opacity: 0.3 }} />
              <h3 className="detail-section-title" style={{ marginTop: 0, marginBottom: '16px', fontSize: '14px' }}>
                {isTaskType ? 'Task Type' : isRequestType ? 'Request Type' : 'Issue Location'}
              </h3>
            </div>

            {/* === TASK === */}
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

            {/* === REQUEST === */}
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

            {/* === ISSUE === */}
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
                        <option value="">Select Department</option>
                        {departments.map(d => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))}
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
              <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
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
          {duplicates && duplicates.length > 0 && (
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
