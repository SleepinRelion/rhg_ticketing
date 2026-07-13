import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Bell, LogOut, User, Search, Menu } from 'lucide-react';
import api from '../../api/client.js';
import { formatDistanceToNow } from 'date-fns';
import SearchableSelect from '../ui/SearchableSelect.jsx';

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveResults, setLiveResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showLiveResults, setShowLiveResults] = useState(false);
  const [hotels, setHotels] = useState([]);
  const [activeHotelId, setActiveHotelId] = useState(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const searchContainerRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    fetchHotels();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false);
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) setShowLiveResults(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setLiveResults([]);
      setShowLiveResults(false);
      return;
    }

    setShowLiveResults(true);
    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await api(`/tickets?search=${encodeURIComponent(query)}&limit=5`);
        setLiveResults(res.tickets || []);
      } catch (err) {
        setLiveResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  async function fetchUnreadCount() {
    try {
      const data = await api('/notifications/unread-count');
      setUnreadCount(data.count);
    } catch {}
  }

  async function fetchHotels() {
    try {
      const data = await api('/hotels');
      setHotels(data.hotels || []);
      // Respect the user's local selection — only use server's activeHotelId as a fallback
      const localHotelId = localStorage.getItem('activeHotelId');
      const hotelIds = (data.hotels || []).map(h => String(h.id));
      if (localHotelId && hotelIds.includes(String(localHotelId))) {
        // User's local selection is valid — keep it
        setActiveHotelId(localHotelId);
      } else if (data.activeHotelId) {
        // No valid local selection — use server default
        setActiveHotelId(data.activeHotelId);
        localStorage.setItem('activeHotelId', data.activeHotelId);
      }
    } catch {}
  }

  function handleHotelChange(e) {
    const newId = e.target.value;
    setActiveHotelId(newId);
    localStorage.setItem('activeHotelId', newId);
    window.location.reload(); // Reload to refresh all data context
  }

  async function toggleNotifications() {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
    if (!showNotifications) {
      try {
        const data = await api('/notifications?limit=10');
        setNotifications(data.notifications);
      } catch {}
    }
  }

  async function markAllRead() {
    try {
      await api('/notifications/read-all', { method: 'PUT' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {}
  }

  function handleSearch(e) {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/tickets?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="btn-icon mobile-menu-btn"
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          style={{ marginRight: '8px', flexShrink: 0 }}
        >
          <Menu size={20} />
        </button>
        <div className="search-input-wrapper" ref={searchContainerRef} style={{ position: 'relative' }}>
          <Search />
          <input
            type="text"
            id="global-search-input"
            className="form-input"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            onFocus={() => { if (searchQuery.trim()) setShowLiveResults(true); }}
            style={{ width: 280 }}
          />
          {showLiveResults && searchQuery.trim() && (
            <div 
              className="notification-dropdown" 
              style={{ 
                position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '8px', zIndex: 100,
                background: 'rgba(20, 21, 26, 0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px',
                boxShadow: '0 12px 40px rgba(0,0,0,0.4)', overflow: 'hidden'
              }}
            >
              {isSearching ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                  Searching...
                </div>
              ) : liveResults.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 16px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    Tickets
                  </div>
                  {liveResults.map(t => (
                    <div 
                      key={t.id} 
                      onMouseDown={(e) => { 
                        e.preventDefault(); 
                        navigate(`/tickets/${t.id}`); 
                        setShowLiveResults(false); 
                        setSearchQuery(''); 
                      }}
                      style={{ 
                        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'all 0.2s ease', backgroundColor: 'transparent'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.paddingLeft = '20px'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.paddingLeft = '16px'; }}
                    >
                      <div style={{ 
                        width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                        backgroundColor: t.status === 'closed' ? 'var(--text-muted)' : (t.status === 'open' ? 'var(--primary-400)' : 'var(--warning)'),
                        boxShadow: `0 0 8px ${t.status === 'closed' ? 'transparent' : (t.status === 'open' ? 'var(--primary-400)' : 'var(--warning)')}`
                      }} />
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{t.ticket_number}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.title}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div 
                    style={{ padding: '12px', textAlign: 'center', cursor: 'pointer', fontSize: '13px', fontWeight: 500, color: 'var(--primary-400)', backgroundColor: 'rgba(0,0,0,0.3)', transition: 'background-color 0.2s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(var(--primary-rgb), 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.3)'}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      navigate(`/tickets?search=${encodeURIComponent(searchQuery.trim())}`);
                      setShowLiveResults(false);
                    }}
                  >
                    View all results &rarr;
                  </div>
                </div>
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
                  No tickets found matching <br/> <strong style={{ color: 'var(--text-primary)' }}>"{searchQuery}"</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* Hotel Switcher */}
        {hotels.length > 0 && (
          <div style={{ marginRight: '16px' }}>
            <SearchableSelect
              className="form-select"
              value={activeHotelId || ''}
              onChange={handleHotelChange}
              style={{ width: 250, padding: '8px 12px', background: 'var(--bg-elevated)', height: '36px' }}
            >
              {user?.role === 'manager' && hotels.length > 1 && (
                <option value="all">Global View (All Hotels)</option>
              )}
              {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </SearchableSelect>
          </div>
        )}

        {/* Notification Bell */}
        <div className="notification-bell" ref={notifRef} onClick={toggleNotifications}>
          <button className="btn-icon">
            <Bell size={18} />
          </button>
          {unreadCount > 0 && <span className="count">{unreadCount > 9 ? '9+' : unreadCount}</span>}

          {showNotifications && (
            <div className="notification-dropdown">
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '14px' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); markAllRead(); }}>
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notification-item ${!n.is_read ? 'unread' : ''}`}
                    onClick={() => {
                      if (!n.is_read) {
                        api(`/notifications/${n.id}/read`, { method: 'PUT' }).catch(() => {});
                        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                        setUnreadCount(prev => Math.max(0, prev - 1));
                      }
                      if (n.ticket_id) navigate(`/tickets/${n.ticket_id}`);
                      setShowNotifications(false);
                    }}
                  >
                    <div className="notification-item-title">{n.title}</div>
                    <div className="notification-item-message">{n.message}</div>
                    <div className="notification-item-time">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                  </div>
                ))
              )}
              <div
                style={{ padding: '10px', textAlign: 'center', borderTop: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '13px', color: 'var(--primary-400)' }}
                onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
              >
                View all notifications
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <div className="user-menu" onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}>
            {user?.avatar_url ? (
              <img 
                src={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api', '')}${user.avatar_url}` : user.avatar_url} 
                alt="Avatar" 
                className="user-avatar" 
                style={{ objectFit: 'cover', padding: 0 }} 
              />
            ) : (
              <div className="user-avatar">{user?.fullName?.charAt(0)?.toUpperCase() || 'U'}</div>
            )}
            <div>
              <div className="user-name">{user?.fullName}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>

          {showUserMenu && (
            <div className="notification-dropdown" style={{ width: 200 }}>
              <div className="notification-item" onClick={() => { navigate('/profile'); setShowUserMenu(false); }}>
                <div className="notification-item-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={14} /> My Profile
                </div>
              </div>
              {['admin', 'manager'].includes(user?.role) && (
                <div className="notification-item" onClick={() => { navigate('/settings'); setShowUserMenu(false); }}>
                  <div className="notification-item-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <User size={14} /> System Settings
                  </div>
                </div>
              )}
              <div className="notification-item" onClick={handleLogout} style={{ color: 'var(--error)' }}>
                <div className="notification-item-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'inherit' }}>
                  <LogOut size={14} /> Sign Out
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
