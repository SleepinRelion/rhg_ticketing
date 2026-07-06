import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import DailyBriefingModal from '../ui/DailyBriefingModal.jsx';
import { useSocket } from '../../context/SocketContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { WifiOff } from 'lucide-react';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { info } = useToast();

  // Check for daily briefing on first load
  useEffect(() => {
    const today = new Date().toDateString();
    const lastBriefing = localStorage.getItem('last_briefing_date');
    if (lastBriefing !== today) {
      setShowBriefing(true);
      localStorage.setItem('last_briefing_date', today);
    }
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Live toast notifications from Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleTicketUpdate = (data) => {
      if (data?.ticket_number) {
        info(`Ticket ${data.ticket_number} was updated`);
      }
    };

    const handleCommentAdded = (data) => {
      if (data?.ticket_number) {
        info(`New comment on ${data.ticket_number}`);
      }
    };

    const handleNotification = (data) => {
      if (data?.title) {
        info(data.title);
      }
    };

    socket.on('ticket:updated', handleTicketUpdate);
    socket.on('comment:added', handleCommentAdded);
    socket.on('notification', handleNotification);

    return () => {
      socket.off('ticket:updated', handleTicketUpdate);
      socket.off('comment:added', handleCommentAdded);
      socket.off('notification', handleNotification);
    };
  }, [socket, info]);

  // Offline / Online detection
  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if user is typing in an input, textarea, or contenteditable
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        navigate('/tickets/new');
      } else if (e.key === '/') {
        e.preventDefault();
        // Focus the global search input
        const searchInput = document.getElementById('global-search-input');
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  // Favicon badge for unread notifications
  useEffect(() => {
    const updateFavicon = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = '/favicon.ico';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, 32, 32);
        // Check unread count from the header's badge
        const badge = document.querySelector('.notification-bell .count');
        if (badge) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(24, 8, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'white';
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(badge.textContent, 24, 8);
        }
        const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
        link.rel = 'icon';
        link.href = canvas.toDataURL('image/png');
        document.head.appendChild(link);
      };
      img.onerror = () => { /* no favicon available */ };
    };

    updateFavicon();
    const interval = setInterval(updateFavicon, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      {/* Offline Banner */}
      {isOffline && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: 'linear-gradient(135deg, #dc2626, #ef4444)',
          color: 'white', padding: '10px 20px', textAlign: 'center',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          fontSize: '14px', fontWeight: 500, boxShadow: '0 2px 12px rgba(220, 38, 38, 0.3)',
          animation: 'slideDown 0.3s ease'
        }}>
          <WifiOff size={16} />
          You are offline. Some features may not work until your connection is restored.
        </div>
      )}

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content" style={isOffline ? { marginTop: '40px' } : {}}>
        <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
      {showBriefing && <DailyBriefingModal onClose={() => setShowBriefing(false)} />}
    </div>
  );
}

