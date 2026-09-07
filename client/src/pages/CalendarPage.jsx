import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isToday, parseISO, addHours,
  isBefore, differenceInHours, addMonths, subMonths, startOfDay, endOfDay,
  eachHourOfInterval
} from 'date-fns';
import {
  Calendar as CalendarIcon, Clock, Wrench, CheckCircle, Plus, ChevronDown,
  Ticket, Link as LinkIcon, Copy, X, Search, Filter, ChevronLeft, ChevronRight,
  AlertTriangle, ExternalLink, User, MessageSquare, ArrowRight, LayoutGrid, List, Columns
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIORITY_COLORS = {
  critical: { bg: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  high:     { bg: 'rgba(249, 115, 22, 0.12)', color: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
  medium:   { bg: 'rgba(59, 130, 246, 0.12)',  color: '#3b82f6', border: 'rgba(59, 130, 246, 0.3)' },
  low:      { bg: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  pm:       { bg: 'rgba(16, 185, 129, 0.12)',  color: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
};

function getItemStyle(item) {
  if (item.type === 'pm') return PRIORITY_COLORS.pm;
  return PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.medium;
}

function getItemUrgency(item) {
  if (item.type === 'pm') return 'normal';
  const now = new Date();
  const due = item.date;
  if (isBefore(due, now)) return 'overdue';
  if (differenceInHours(due, now) <= 2) return 'at_risk';
  return 'normal';
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [icalUrl, setIcalUrl] = useState('');
  const [showIcalModal, setShowIcalModal] = useState(false);

  // Sidebar detail panel
  const [selectedItem, setSelectedItem] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'ticket' | 'pm'
  const [priorityFilter, setPriorityFilter] = useState(''); // '' | 'critical' | 'high' etc.
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Drag state
  const [dragItem, setDragItem] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState('');

  const { error, success } = useToast();
  const { user, isManager } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchData(); }, [currentDate]);

  async function fetchData() {
    setLoading(true);
    try {
      const [ticketRes, pmRes] = await Promise.all([
        api('/tickets?limit=500&status=open,in_progress,assigned,waiting_for_parts,waiting_for_vendor,waiting_for_guest'),
        api('/preventive-maintenance')
      ]);

      const calendarItems = [
        ...(ticketRes.tickets || []).filter(t => t.resolution_due_at).map(t => ({
          ...t,
          type: 'ticket',
          date: parseISO(t.resolution_due_at),
          titleDisplay: `${t.ticket_number} - ${t.title}`,
          assignee_names: t.assignee_names || ''
        })),
        ...(pmRes.schedules || []).filter(p => p.next_due_date).map(p => ({
          ...p,
          type: 'pm',
          date: parseISO(p.next_due_date),
          titleDisplay: `PM: ${p.title} (${p.asset_name || 'N/A'})`
        }))
      ];

      setItems(calendarItems);
    } catch (err) {
      error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (typeFilter !== 'all' && item.type !== typeFilter) return false;
      if (priorityFilter && item.type === 'ticket' && item.priority !== priorityFilter) return false;
      if (assigneeFilter && item.type === 'ticket' && !String(item.assignee_names || '').toLowerCase().includes(assigneeFilter.toLowerCase())) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.titleDisplay.toLowerCase().includes(q) ||
               (item.ticket_number && item.ticket_number.toLowerCase().includes(q));
      }
      return true;
    });
  }, [items, typeFilter, priorityFilter, assigneeFilter, searchQuery]);

  // Stats
  const overdueCount = useMemo(() => filteredItems.filter(i => getItemUrgency(i) === 'overdue').length, [filteredItems]);
  const atRiskCount = useMemo(() => filteredItems.filter(i => getItemUrgency(i) === 'at_risk').length, [filteredItems]);

  // Today's agenda
  const todayItems = useMemo(() => {
    return filteredItems
      .filter(item => isSameDay(item.date, new Date()))
      .sort((a, b) => a.date - b.date);
  }, [filteredItems]);

  // iCal subscription
  async function handleSubscribe() {
    try {
      const res = await api('/calendar/token');
      const apiBase = import.meta.env.VITE_API_URL || window.location.origin;
      const activeHotelId = localStorage.getItem('activeHotelId') || user?.primary_hotel_id;
      if (!activeHotelId) { error('Could not determine your hotel.'); return; }
      setIcalUrl(`${apiBase}/api/calendar/feed/${activeHotelId}/${res.token}.ics`);
      setShowIcalModal(true);
    } catch (err) { error('Failed to generate calendar subscription link'); }
  }

  const copyIcalUrl = () => { navigator.clipboard.writeText(icalUrl); success('Calendar link copied!'); };

  // Navigation
  const goNext = () => {
    if (viewMode === 'month') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, 7));
    else setCurrentDate(addDays(currentDate, 1));
  };
  const goPrev = () => {
    if (viewMode === 'month') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addDays(currentDate, -7));
    else setCurrentDate(addDays(currentDate, -1));
  };
  const goToday = () => setCurrentDate(new Date());

  const getNavLabel = () => {
    if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate);
      const we = addDays(ws, 6);
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'EEEE, MMMM d, yyyy');
  };

  // Drag & Drop handlers
  const canDrag = isManager() || user?.role === 'admin';

  const handleDragStart = (e, item) => {
    if (!canDrag) return;
    setDragItem(item);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    if (dragItem) setDragOverDate(day);
  };

  const handleDragLeave = () => { setDragOverDate(null); };

  const handleDrop = (e, day) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!dragItem || isSameDay(dragItem.date, day)) { setDragItem(null); return; }
    setShowRescheduleModal({ item: dragItem, newDate: day });
    setDragItem(null);
  };

  const confirmReschedule = async () => {
    const { item, newDate } = showRescheduleModal;
    try {
      await api('/calendar/reschedule', {
        method: 'PUT',
        body: JSON.stringify({
          itemType: item.type,
          itemId: item.id,
          newDate: newDate.toISOString(),
          reason: rescheduleReason
        })
      });
      success(`${item.type === 'pm' ? 'PM schedule' : 'Ticket deadline'} rescheduled.`);
      setShowRescheduleModal(null);
      setRescheduleReason('');
      fetchData();
    } catch (err) {
      error(err.message || 'Failed to reschedule');
    }
  };

  // Render a single calendar item chip
  const renderItemChip = (item, compact = false) => {
    const style = getItemStyle(item);
    const urgency = getItemUrgency(item);
    return (
      <div
        key={`${item.type}-${item.id}`}
        draggable={canDrag}
        onDragStart={(e) => handleDragStart(e, item)}
        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
        style={{
          fontSize: compact ? '11px' : '12px',
          padding: compact ? '3px 6px' : '5px 8px',
          background: style.bg,
          color: style.color,
          borderRadius: '5px',
          cursor: canDrag ? 'grab' : 'pointer',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          borderLeft: `3px solid ${style.color}`,
          position: 'relative',
          animation: urgency === 'overdue' ? 'pulse-red 2s infinite' : undefined,
          opacity: urgency === 'overdue' ? 0.9 : 1,
        }}
        title={item.titleDisplay}
      >
        {urgency === 'overdue' && <span style={{ marginRight: '4px' }}>⚠️</span>}
        {urgency === 'at_risk' && <span style={{ marginRight: '4px' }}>🟡</span>}
        {item.titleDisplay}
      </div>
    );
  };

  // Get items for a specific day
  const getDayItems = (day) => filteredItems.filter(item => isSameDay(item.date, day));

  // ===== MONTH VIEW =====
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = addDays(startOfWeek(addDays(monthEnd, 6)), 6);
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', marginBottom: '1px', background: 'var(--border-color)' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', padding: '8px', background: 'var(--bg-secondary)' }}>
              {day}
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', flex: 1, background: 'var(--border-color)' }}>
          {days.map((day, i) => {
            const dayItems = getDayItems(day);
            const isDragTarget = dragOverDate && isSameDay(day, dragOverDate);
            return (
              <div
                key={i}
                onDragOver={(e) => handleDragOver(e, day)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}
                onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                style={{
                  padding: '6px',
                  background: isDragTarget ? 'rgba(59, 130, 246, 0.1)' : isToday(day) ? 'rgba(59, 130, 246, 0.04)' : 'var(--bg-primary)',
                  opacity: isSameMonth(day, monthStart) ? 1 : 0.4,
                  display: 'flex', flexDirection: 'column', overflow: 'hidden',
                  cursor: 'pointer',
                  minHeight: '90px',
                  outline: isDragTarget ? '2px dashed var(--primary-500)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  fontWeight: isToday(day) ? 700 : 500,
                  fontSize: '13px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: '4px',
                }}>
                  <span style={{
                    color: isToday(day) ? 'white' : 'var(--text-primary)',
                    background: isToday(day) ? 'var(--primary-500)' : 'transparent',
                    width: '24px', height: '24px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px',
                  }}>
                    {format(day, 'd')}
                  </span>
                  {dayItems.length > 0 && (
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {dayItems.length}
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {dayItems.slice(0, 3).map(item => renderItemChip(item, true))}
                  {dayItems.length > 3 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '2px' }}>
                      +{dayItems.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  };

  // ===== WEEK VIEW =====
  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '1px', background: 'var(--border-color)', flexShrink: 0 }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '8px' }}></div>
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              onClick={() => { setCurrentDate(day); setViewMode('day'); }}
              style={{
                textAlign: 'center', padding: '8px', background: 'var(--bg-secondary)',
                cursor: 'pointer',
                borderBottom: isToday(day) ? '3px solid var(--primary-500)' : 'none',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{format(day, 'EEE')}</div>
              <div style={{
                fontSize: '18px', fontWeight: isToday(day) ? 700 : 500,
                color: isToday(day) ? 'var(--primary-500)' : 'var(--text-primary)',
              }}>{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        {/* Hourly grid */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {hours.filter(h => h >= 6 && h <= 22).map(hour => (
            <div key={hour} style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', gap: '1px', background: 'var(--border-color)', minHeight: '50px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '4px 8px', fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
                {format(new Date(2000, 0, 1, hour), 'ha')}
              </div>
              {weekDays.map(day => {
                const cellDate = addHours(startOfDay(day), hour);
                const cellItems = filteredItems.filter(item => {
                  const itemHour = item.date.getHours();
                  return isSameDay(item.date, day) && itemHour === hour;
                });
                const isDragTarget = dragOverDate && isSameDay(day, dragOverDate);
                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    onDragOver={(e) => handleDragOver(e, day)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day)}
                    style={{
                      background: isDragTarget ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-primary)',
                      padding: '2px',
                      display: 'flex', flexDirection: 'column', gap: '1px',
                    }}
                  >
                    {cellItems.map(item => renderItemChip(item, true))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ===== DAY VIEW =====
  const renderDayView = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i).filter(h => h >= 6 && h <= 22);
    const dayItemsList = getDayItems(currentDate);

    return (
      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
        {/* Hourly timeline */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {hours.map(hour => {
            const hourItems = dayItemsList.filter(item => item.date.getHours() === hour);
            return (
              <div key={hour} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', minHeight: '60px', padding: '8px 0' }}>
                <div style={{ width: '60px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'right', paddingTop: '4px', flexShrink: 0 }}>
                  {format(new Date(2000, 0, 1, hour), 'h:mm a')}
                </div>
                <div
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}
                  onDragOver={(e) => handleDragOver(e, currentDate)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, currentDate)}
                >
                  {hourItems.map(item => renderItemChip(item, false))}
                </div>
              </div>
            );
          })}
          {/* All-day items (PM tasks that don't have a specific hour) */}
          {dayItemsList.filter(i => i.type === 'pm').length > 0 && (
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px', marginTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>ALL DAY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {dayItemsList.filter(i => i.type === 'pm').map(item => renderItemChip(item, false))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 className="page-title"><CalendarIcon size={24} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }} /> Calendar & Reminders</h1>
            <p className="page-subtitle">
              Track upcoming deadlines
              {overdueCount > 0 && <span style={{ color: '#ef4444', fontWeight: 600, marginLeft: '12px' }}>⚠️ {overdueCount} overdue</span>}
              {atRiskCount > 0 && <span style={{ color: '#f97316', fontWeight: 600, marginLeft: '12px' }}>🟡 {atRiskCount} at risk</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleSubscribe}>
              <LinkIcon size={16} style={{ marginRight: '4px' }} /> Subscribe
            </button>
            <div style={{ position: 'relative' }}>
              <button className="btn btn-primary" onClick={() => setShowAddMenu(!showAddMenu)} onBlur={() => setTimeout(() => setShowAddMenu(false), 200)}>
                <Plus size={16} style={{ marginRight: '4px' }} /> Add <ChevronDown size={14} style={{ marginLeft: '4px' }} />
              </button>
              {showAddMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '4px', zIndex: 10, boxShadow: '0 10px 25px rgba(0,0,0,0.2)', minWidth: '200px' }}>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '4px' }} onMouseDown={(e) => { e.preventDefault(); navigate('/tickets/new'); }}>
                    <Ticket size={16} style={{ marginRight: '8px', color: 'var(--primary-400)' }} /> New Ticket
                  </button>
                  <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onMouseDown={(e) => { e.preventDefault(); navigate('/preventive-maintenance'); }}>
                    <Wrench size={16} style={{ marginRight: '8px', color: 'var(--warning)' }} /> New PM Schedule
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: View Toggle + Filters + Navigation */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px', flexShrink: 0 }}>
        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {[
            { id: 'month', label: 'Month', icon: LayoutGrid },
            { id: 'week', label: 'Week', icon: Columns },
            { id: 'day', label: 'Day', icon: List },
          ].map(v => {
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                className={`btn ${viewMode === v.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ borderRadius: 0, padding: '6px 12px', fontSize: '13px' }}
                onClick={() => setViewMode(v.id)}
              >
                <Icon size={14} style={{ marginRight: '4px' }} /> {v.label}
              </button>
            );
          })}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={goToday}>Today</button>
          <button className="btn-icon" onClick={goPrev}><ChevronLeft size={18} /></button>
          <span style={{ fontWeight: 600, minWidth: '160px', textAlign: 'center', fontSize: '14px' }}>{getNavLabel()}</span>
          <button className="btn-icon" onClick={goNext}><ChevronRight size={18} /></button>
        </div>

        <div style={{ flex: 1 }}></div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '28px', width: '160px', height: '32px', fontSize: '13px' }}
            />
          </div>
          <select className="form-input" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ height: '32px', fontSize: '13px', width: 'auto' }}>
            <option value="all">All Types</option>
            <option value="ticket">Tickets</option>
            <option value="pm">PM Tasks</option>
          </select>
          <select className="form-input" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ height: '32px', fontSize: '13px', width: 'auto' }}>
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Main content area */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
        {/* Calendar */}
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
          {loading ? (
            <div className="loading-spinner" style={{ flex: 1 }}><div className="spinner"></div></div>
          ) : (
            <>
              {viewMode === 'month' && renderMonthView()}
              {viewMode === 'week' && renderWeekView()}
              {viewMode === 'day' && renderDayView()}
            </>
          )}
        </div>

        {/* Right sidebar: Detail panel or Today's Agenda */}
        <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
          {/* Detail panel (when an item is selected) */}
          {selectedItem ? (
            <div className="card" style={{ flex: 1, overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Details</h3>
                <button className="btn-icon" onClick={() => setSelectedItem(null)} style={{ width: 24, height: 24 }}><X size={16} /></button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  {selectedItem.type === 'pm' ? 'Maintenance' : 'Ticket'}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, lineHeight: 1.4, marginBottom: '8px' }}>{selectedItem.titleDisplay}</div>

                {selectedItem.type === 'ticket' && (
                  <>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <span className={`badge badge-status-${selectedItem.status}`}>{selectedItem.status?.replace(/_/g, ' ')}</span>
                      <span className={`badge badge-priority-${selectedItem.priority}`}>{selectedItem.priority}</span>
                      {getItemUrgency(selectedItem) === 'overdue' && <span className="badge badge-sla-breached">Overdue</span>}
                      {getItemUrgency(selectedItem) === 'at_risk' && <span className="badge badge-sla-at_risk">At Risk</span>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={14} /> Due: {format(selectedItem.date, 'MMM d, yyyy h:mm a')}
                      </div>
                      {selectedItem.category_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Filter size={14} /> {selectedItem.category_name}
                        </div>
                      )}
                      {selectedItem.room_number && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          🏨 Room {selectedItem.room_number}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                      <button className="btn btn-primary" style={{ flex: 1, fontSize: '13px' }} onClick={() => navigate(`/tickets/${selectedItem.id}`)}>
                        <ExternalLink size={14} style={{ marginRight: '4px' }} /> Open Ticket
                      </button>
                    </div>
                  </>
                )}

                {selectedItem.type === 'pm' && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={14} /> Due: {format(selectedItem.date, 'MMM d, yyyy')}
                      </div>
                      {selectedItem.asset_name && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Wrench size={14} /> {selectedItem.asset_name}
                        </div>
                      )}
                      {selectedItem.frequency && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CalendarIcon size={14} /> {selectedItem.frequency}
                        </div>
                      )}
                    </div>
                    <div style={{ marginTop: '16px' }}>
                      <button className="btn btn-primary" style={{ width: '100%', fontSize: '13px' }} onClick={() => navigate('/preventive-maintenance')}>
                        <ExternalLink size={14} style={{ marginRight: '4px' }} /> View PM Schedules
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Today's Agenda */
            <div className="card" style={{ flex: 1, overflow: 'auto' }}>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={16} /> Today's Agenda
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                {format(new Date(), 'EEEE, MMMM d')} · {todayItems.length} item{todayItems.length !== 1 ? 's' : ''}
              </p>

              {todayItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                  <CheckCircle size={32} style={{ marginBottom: '8px', opacity: 0.3 }} />
                  <div style={{ fontSize: '13px' }}>Nothing due today!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {todayItems.map(item => {
                    const style = getItemStyle(item);
                    const urgency = getItemUrgency(item);
                    return (
                      <div
                        key={`agenda-${item.type}-${item.id}`}
                        onClick={() => setSelectedItem(item)}
                        style={{
                          padding: '10px 12px',
                          background: style.bg,
                          borderLeft: `3px solid ${style.color}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'transform 0.1s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateX(2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: style.color }}>
                            {urgency === 'overdue' && '⚠️ '}
                            {urgency === 'at_risk' && '🟡 '}
                            {item.type === 'ticket' ? item.ticket_number : 'PM'}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {format(item.date, 'h:mm a')}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{item.title || item.titleDisplay}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Confirmation Modal */}
      {showRescheduleModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: 'var(--radius-lg)', maxWidth: '440px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '8px', fontSize: '18px' }}>Reschedule?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '4px' }}>
              Move <strong>{showRescheduleModal.item.titleDisplay}</strong>
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              From <strong>{format(showRescheduleModal.item.date, 'MMM d, yyyy')}</strong>
              {' → '}
              <strong style={{ color: 'var(--primary-500)' }}>{format(showRescheduleModal.newDate, 'MMM d, yyyy')}</strong>
            </p>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">Reason (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Guest checkout delayed, parts not arrived..."
                value={rescheduleReason}
                onChange={e => setRescheduleReason(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => { setShowRescheduleModal(null); setRescheduleReason(''); }}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmReschedule}>Confirm Reschedule</button>
            </div>
          </div>
        </div>
      )}

      {/* iCal Subscribe Modal */}
      {showIcalModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: 'var(--radius-lg)', maxWidth: '500px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', display: 'flex', alignItems: 'center' }}>
              <CalendarIcon size={20} style={{ marginRight: '8px', color: 'var(--primary-500)' }} /> Subscribe to Calendar
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px', lineHeight: 1.5 }}>
              Use this iCal link to sync with Microsoft Outlook, Apple Calendar, or Google Calendar.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input type="text" value={icalUrl} readOnly className="form-input" style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px', background: 'var(--bg-elevated)' }} />
              <button className="btn btn-primary" onClick={copyIcalUrl}><Copy size={16} /></button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowIcalModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0); }
        }
      `}</style>
    </div>
  );
}
