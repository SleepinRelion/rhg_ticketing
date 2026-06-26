import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard, Ticket, Plus, DoorOpen, HardDrive, Users, FolderOpen,
  BookOpen, BarChart3, Bell, Shield, Settings, Wrench, ClipboardList, FileUp
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const location = useLocation();

  const navItems = [
    { section: 'Main' },
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/tickets', icon: Ticket, label: 'Tickets' },
    { path: '/tickets/new', icon: Plus, label: 'Create Ticket' },

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
    { path: '/users', icon: Users, label: 'Users', roles: ['admin'] },
    { path: '/audit-logs', icon: Shield, label: 'Audit Logs', roles: ['admin'] },
    { path: '/settings', icon: Settings, label: 'Settings', roles: ['admin'] },
    { path: '/import', icon: FileUp, label: 'Import Legacy Data', roles: ['admin'] },
  ];

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand" style={{ justifyContent: 'center', padding: '16px' }}>
        <Link to="/" onClick={onClose} style={{ display: 'inline-block' }}>
          <img src={window.APP_LOGO_URL} alt="Radisson Logo" style={{ height: '40px', maxWidth: '100%', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        </Link>
      </div>

      <div className="sidebar-nav">
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
