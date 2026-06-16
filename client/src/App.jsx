import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import GuestPortalPage from './pages/GuestPortalPage.jsx';
import GuestTicketStatusPage from './pages/GuestTicketStatusPage.jsx';
import TicketsPage from './pages/TicketsPage.jsx';
import TicketDetailPage from './pages/TicketDetailPage.jsx';
import CreateTicketPage from './pages/CreateTicketPage.jsx';
import RoomsPage from './pages/RoomsPage.jsx';
import AssetsPage from './pages/AssetsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import CategoriesPage from './pages/CategoriesPage.jsx';
import KnowledgeBasePage from './pages/KnowledgeBasePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import AuditLogPage from './pages/AuditLogPage.jsx';
import PreventiveMaintenancePage from './pages/PreventiveMaintenancePage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ImportDataPage from './pages/ImportDataPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;

  // COMPULSORY MFA CHECK
  const isProfilePage = window.location.pathname === '/profile';
  if (!(user.mfaEnabled || user.mfa_enabled) && !isProfilePage) {
    return <Navigate to="/profile?mfa_setup=true" replace />;
  }

  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading-spinner" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>;
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/staff-portal" element={user ? <Navigate to="/" replace /> : <GuestPortalPage />} />
      <Route path="/staff-status" element={user ? <Navigate to="/" replace /> : <GuestTicketStatusPage />} />
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="tickets" element={<TicketsPage />} />
        <Route path="tickets/new" element={<CreateTicketPage />} />
        <Route path="tickets/:id" element={<TicketDetailPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="assets" element={<ProtectedRoute roles={['admin', 'manager', 'technician']}><AssetsPage /></ProtectedRoute>} />
        <Route path="knowledge-base" element={<KnowledgeBasePage />} />
        <Route path="preventive-maintenance" element={<PreventiveMaintenancePage />} />
        <Route path="reports" element={<ProtectedRoute roles={['admin', 'manager']}><ReportsPage /></ProtectedRoute>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="users" element={<ProtectedRoute roles={['admin']}><UsersPage /></ProtectedRoute>} />
        <Route path="categories" element={<ProtectedRoute roles={['admin', 'manager']}><CategoriesPage /></ProtectedRoute>} />
        <Route path="audit-logs" element={<ProtectedRoute roles={['admin']}><AuditLogPage /></ProtectedRoute>} />
        <Route path="import" element={<ProtectedRoute roles={['admin']}><ImportDataPage /></ProtectedRoute>} />
        <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="settings" element={<ProtectedRoute roles={['admin']}><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
