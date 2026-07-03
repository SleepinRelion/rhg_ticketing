import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';
import DailyBriefingModal from '../ui/DailyBriefingModal.jsx';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
      {showBriefing && <DailyBriefingModal onClose={() => setShowBriefing(false)} />}
    </div>
  );
}
