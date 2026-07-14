import { format } from 'date-fns';
import { MessageSquare, Paperclip, Activity, FileText } from 'lucide-react';

export default function ActivityTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="empty-state" style={{ padding: '32px' }}>
        <p>No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="timeline">
      {timeline.map((item, index) => {
        const isComment = item.timeline_type === 'comment';
        const isAttachment = item.timeline_type === 'attachment';
        const isActivity = item.timeline_type === 'activity_log';

        // Choose icon based on type
        let Icon = Activity;
        let iconBg = 'var(--bg-secondary)';
        let iconColor = 'var(--text-secondary)';

        if (isComment) {
          Icon = MessageSquare;
          iconBg = item.is_internal ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)';
          iconColor = item.is_internal ? '#f59e0b' : '#3b82f6';
        } else if (isAttachment) {
          Icon = Paperclip;
          iconBg = 'rgba(16, 185, 129, 0.1)';
          iconColor = '#10b981';
        }

        return (
          <div key={`${item.timeline_type}-${item.id}`} className="timeline-item" style={{ position: 'relative', paddingLeft: '48px', paddingBottom: '24px' }}>
            {/* Connection line */}
            {index !== timeline.length - 1 && (
              <div style={{
                position: 'absolute', left: '19px', top: '32px', bottom: '-8px',
                width: '2px', background: 'var(--border-color)', zIndex: 0
              }} />
            )}
            
            {/* Icon circle */}
            <div style={{
              position: 'absolute', left: '0', top: '0',
              width: '40px', height: '40px', borderRadius: '50%',
              background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 1, border: '2px solid var(--bg-primary)'
            }}>
              <Icon size={18} style={{ color: iconColor }} />
            </div>

            <div className="card" style={{ padding: '16px', margin: 0, border: isComment && item.is_internal ? '1px solid rgba(245, 158, 11, 0.3)' : undefined, background: isComment && item.is_internal ? 'rgba(245, 158, 11, 0.05)' : undefined }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ fontSize: '14px' }}>
                  <strong>{item.user_name || 'System'}</strong>
                  {isActivity && (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {' '} {item.action.replace(/_/g, ' ')}
                    </span>
                  )}
                  {isAttachment && (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {' '} uploaded an attachment
                    </span>
                  )}
                  {isComment && item.is_internal && (
                    <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '11px', marginLeft: '8px' }}>Internal Note</span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>

              {isComment && (
                <div style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap', color: 'var(--text-primary)' }}>
                  {item.content}
                </div>
              )}

              {isActivity && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                  {(() => {
                    // Helper to make field names human-readable
                    const formatFieldName = (field) => {
                      const fieldMap = {
                        title: 'Title', description: 'Description', priority: 'Priority',
                        ticket_type: 'Type', category_id: 'Category', room_id: 'Room',
                        asset_id: 'Asset', guest_impact: 'Guest Impact',
                        guest_room_occupied: 'Guest Room Occupied', guest_name: 'Guest Name',
                        status: 'Status', department: 'Department', vendor_name: 'Vendor',
                        cost_estimate: 'Cost Estimate', actual_cost: 'Actual Cost',
                        sla_status: 'SLA Status', requires_vendor: 'Requires Vendor',
                      };
                      return fieldMap[field] || field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    };

                    // Try to parse JSON arrays in old_value/new_value
                    const tryParseFields = (val) => {
                      if (!val) return null;
                      try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed)) return parsed.map(formatFieldName);
                      } catch { /* not JSON */ }
                      return null;
                    };

                    const newFields = tryParseFields(item.new_value);
                    const oldFields = tryParseFields(item.old_value);

                    if (newFields && !item.old_value) {
                      // "Set to [array of fields]" → "Updated X, Y, Z"
                      return `Updated: ${newFields.join(', ')}`;
                    }
                    if (newFields && oldFields) {
                      return `Changed: ${newFields.join(', ')}`;
                    }

                    // Default: plain text display
                    if (item.old_value && item.new_value) return `Changed from ${item.old_value} to ${item.new_value}`;
                    if (item.new_value && !item.old_value) return `Set to ${item.new_value}`;
                    return null;
                  })()}
                  {item.note && <div style={{ marginTop: '4px', fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>"{item.note}"</div>}
                </div>
              )}

              {isAttachment && (
                <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <FileText size={16} style={{ color: 'var(--text-secondary)' }} />
                  <a 
                    href={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api', '')}${item.file_url}` : item.file_url} 
                    target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: '13px', fontWeight: 500, color: 'var(--primary-500)', textDecoration: 'none' }}
                  >
                    {item.file_name}
                  </a>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    ({Math.round(item.file_size / 1024)} KB)
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
