import { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { format, startOfWeek, addDays, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Clock, Wrench, CheckCircle, Plus, ChevronDown, Ticket, Link as LinkIcon, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [icalUrl, setIcalUrl] = useState('');
  const [showIcalModal, setShowIcalModal] = useState(false);
  const { error, success } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  async function fetchData() {
    setLoading(true);
    try {
      const [ticketRes, pmRes] = await Promise.all([
        api(`/tickets?limit=500&status=open,in_progress,assigned,waiting_for_parts,waiting_for_vendor,waiting_for_guest`),
        api('/preventive-maintenance')
      ]);
      
      const calendarItems = [
        ...(ticketRes.tickets || []).filter(t => t.resolution_due_at).map(t => ({
          ...t,
          type: 'ticket',
          date: parseISO(t.resolution_due_at),
          titleDisplay: `${t.ticket_number} - ${t.title}`
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

  async function handleSubscribe() {
    try {
      const res = await api('/calendar/token');
      setIcalUrl(res.feedUrl);
      setShowIcalModal(true);
    } catch (err) {
      error('Failed to generate calendar subscription link');
    }
  }

  const copyIcalUrl = () => {
    navigator.clipboard.writeText(icalUrl);
    success('Calendar link copied to clipboard!');
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart);
  const endDate = startOfWeek(addDays(monthEnd, 6)); // ensure grid fills out
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addDays(monthEnd, 1));
  const prevMonth = () => setCurrentDate(addDays(monthStart, -1));
  const today = () => setCurrentDate(new Date());

  const getDayItems = (day) => {
    return items.filter(item => isSameDay(item.date, day));
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div className="page-header" style={{ marginBottom: '16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title"><CalendarIcon size={24} style={{ marginRight: '8px', verticalAlign: 'text-bottom' }}/> Calendar & Reminders</h1>
            <p className="page-subtitle">Track upcoming ticket deadlines</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={handleSubscribe}>
              <LinkIcon size={16} style={{ marginRight: '4px' }} />
              Subscribe (iCal)
            </button>
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowAddMenu(!showAddMenu)}
                onBlur={() => setTimeout(() => setShowAddMenu(false), 200)}
              >
                <Plus size={16} style={{ marginRight: '4px' }} />
                Add Reminder
                <ChevronDown size={14} style={{ marginLeft: '4px' }} />
              </button>
              {showAddMenu && (
                <div style={{ 
                  position: 'absolute', top: '100%', right: 0, marginTop: '4px', 
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)', padding: '4px', zIndex: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)', minWidth: '200px'
                }}>
                  <button 
                    className="btn btn-ghost" 
                    style={{ width: '100%', justifyContent: 'flex-start', marginBottom: '4px' }}
                    onMouseDown={(e) => { e.preventDefault(); navigate('/tickets/new'); }}
                  >
                    <Ticket size={16} style={{ marginRight: '8px', color: 'var(--primary-400)' }} />
                    New IT Task / Ticket
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    style={{ width: '100%', justifyContent: 'flex-start' }}
                    onMouseDown={(e) => { e.preventDefault(); navigate('/preventive-maintenance'); }}
                  >
                    <Wrench size={16} style={{ marginRight: '8px', color: 'var(--warning)' }} />
                    New Maintenance Schedule
                  </button>
                </div>
              )}
            </div>
            <button className="btn btn-secondary" onClick={today}>Today</button>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
              <button className="btn-icon" onClick={prevMonth}>&lt;</button>
              <span style={{ fontWeight: 600, minWidth: '120px', textAlign: 'center', alignSelf: 'center' }}>{format(currentDate, "MMMM yyyy")}</span>
              <button className="btn-icon" onClick={nextMonth}>&gt;</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', overflow: 'hidden' }}>
        {loading && <div className="loading-spinner"><div className="spinner"></div></div>}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Weekdays Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '13px', textTransform: 'uppercase' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', flex: 1 }}>
              {days.map((day, i) => {
                const dayItems = getDayItems(day);
                return (
                  <div key={i} style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '8px', 
                    background: isToday(day) ? 'rgba(59, 130, 246, 0.05)' : (isSameMonth(day, monthStart) ? 'var(--bg-primary)' : 'var(--bg-secondary)'),
                    opacity: isSameMonth(day, monthStart) ? 1 : 0.5,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      fontWeight: isToday(day) ? 700 : 500, 
                      color: isToday(day) ? 'var(--primary-600)' : 'var(--text-primary)',
                      marginBottom: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span>{format(day, dateFormat)}</span>
                      {dayItems.length > 0 && <span className="badge" style={{ fontSize: '10px', padding: '2px 6px' }}>{dayItems.length} due</span>}
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {dayItems.map((item, idx) => (
                        <div 
                          key={`${item.type}-${item.id}-${idx}`} 
                          onClick={() => item.type === 'ticket' ? navigate(`/tickets/${item.id}`) : navigate('/preventive-maintenance')}
                          style={{ 
                            fontSize: '11px', 
                            padding: '4px 6px', 
                            background: item.type === 'pm' ? 'rgba(16, 185, 129, 0.1)' : (item.priority === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'), 
                            color: item.type === 'pm' ? 'var(--success)' : (item.priority === 'critical' ? 'var(--error)' : 'var(--primary-600)'),
                            borderRadius: '4px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            border: item.type === 'pm' ? '1px solid rgba(16, 185, 129, 0.2)' : 'none'
                          }}
                          title={item.titleDisplay}
                        >
                          {item.titleDisplay}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* iCal Subscribe Modal */}
      {showIcalModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal" style={{ background: 'var(--bg-primary)', padding: '24px', borderRadius: 'var(--radius-lg)', maxWidth: '500px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h2 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', display: 'flex', alignItems: 'center' }}>
              <CalendarIcon size={20} style={{ marginRight: '8px', color: 'var(--primary-500)' }} />
              Subscribe to Calendar
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px', lineHeight: 1.5 }}>
              Use the following iCal link to synchronize your IT ticketing and maintenance tasks with Microsoft Outlook, Apple Calendar, or Google Calendar. This link is secure and unique to your hotel.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <input 
                type="text" 
                value={icalUrl} 
                readOnly 
                className="form-input" 
                style={{ flex: 1, fontFamily: 'monospace', fontSize: '12px', background: 'var(--bg-elevated)' }} 
              />
              <button className="btn btn-primary" onClick={copyIcalUrl}>
                <Copy size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowIcalModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
