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
  const [hotels, setHotels] = useState([]);
  const [activeHotelId, setActiveHotelId] = useState(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);

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
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          style={{ display: 'none', marginRight: '8px', flexShrink: 0 }}
        >
          <Menu size={20} />
        </button>
        <div className="search-input-wrapper">
          <Search />
          <input
            type="text"
            id="global-search-input"
            className="form-input"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            style={{ width: 280 }}
          />
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
              style={{ width: '220px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', height: '36px' }}
            >
              {hotels.map(h => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
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
              {user?.role === 'admin' && (
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
