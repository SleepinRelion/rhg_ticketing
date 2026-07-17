import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../api/client.js';
import {
  LayoutDashboard, Ticket, Plus, DoorOpen, HardDrive, Users, FolderOpen,
  BookOpen, BarChart3, Bell, Shield, Settings, Wrench, ClipboardList, FileUp, Calendar
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();
  const [hotels, setHotels] = useState([]);
  const [activeHotelId, setActiveHotelId] = useState(localStorage.getItem('activeHotelId') || '');

  useEffect(() => {
    fetchHotels();
  }, []);

  async function fetchHotels() {
    try {
      const data = await api('/hotels');
      setHotels(data.hotels || []);
      const localHotelId = localStorage.getItem('activeHotelId');
      const hotelIds = (data.hotels || []).map(h => String(h.id));
      if (localHotelId && hotelIds.includes(String(localHotelId))) {
        setActiveHotelId(localHotelId);
      } else if (data.activeHotelId) {
        setActiveHotelId(data.activeHotelId);
        localStorage.setItem('activeHotelId', data.activeHotelId);
      }
    } catch {}
  }

  function handleHotelChange(e) {
    const newId = e.target.value;
    setActiveHotelId(newId);
    localStorage.setItem('activeHotelId', newId);
    window.location.reload();
  }

  const navItems = [
    { section: 'Main' },
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/tickets', icon: Ticket, label: 'Tickets' },
    { path: '/tickets/new', icon: Plus, label: 'Create Ticket' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },

    { section: 'Hotel' },
    { path: '/rooms', icon: DoorOpen, label: 'Rooms' },
    { path: '/assets', icon: HardDrive, label: 'Assets', roles: ['admin', 'manager', 'technician'] },
    { path: '/preventive-maintenance', icon: Wrench, label: 'Preventive Maint.' },

    { section: 'Resources' },
    { path: '/knowledge-base', icon: BookOpen, label: 'Knowledge Base' },
    { path: '/categories', icon: FolderOpen, label: 'Categories', roles: ['admin', 'manager'] },

    { section: 'Analytics' },
    { path: '/reports', icon: BarChart3, label: 'Reports', roles: ['admin', 'manager'] },

    { section: 'System' },
    { path: '/notifications', icon: Bell, label: 'Notifications' },
    { path: '/users', icon: Users, label: 'Users', roles: ['admin', 'manager'] },
    { path: '/audit-logs', icon: Shield, label: 'Audit Logs', roles: ['admin', 'manager'] },
    { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'manager'] },
    { path: '/import', icon: FileUp, label: 'Import Legacy Data', roles: ['admin', 'manager'] },
  ];

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand" style={{ justifyContent: 'center', padding: '16px' }}>
        <Link to="/" onClick={onClose} style={{ display: 'inline-block' }}>
          <img src={window.APP_LOGO_URL} alt="Radisson Logo" className="app-logo-img" style={{ height: '40px', maxWidth: '100%', objectFit: 'contain' }} />
        </Link>
      </div>

      <div className="sidebar-nav">
        {/* Mobile Hotel Switcher */}
        {hotels.length > 0 && (
          <div className="mobile-only-switcher" style={{ padding: '0 16px 16px 16px', display: 'none' }}>
            <div className="sidebar-section-title" style={{ padding: '0 0 8px 0' }}>Location</div>
            <select
              className="form-select"
              value={activeHotelId || ''}
              onChange={handleHotelChange}
              style={{ width: '100%', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px', borderRadius: 'var(--radius-md)' }}
            >
              {user?.role === 'manager' && hotels.length > 1 && (
                <option value="all">Global View (All Hotels)</option>
              )}
              {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
        )}
        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="sidebar-section-title">{item.section}</div>;
          }

          if (item.roles && !item.roles.includes(user?.role)) return null;

          const Icon = item.icon;
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`sidebar-link ${isActive ? 'active' : ''}`}
              end={item.path === '/'}
              onClick={onClose}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
