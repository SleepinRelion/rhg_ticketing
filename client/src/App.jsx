import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const GuestPortalPage = lazy(() => import('./pages/GuestPortalPage.jsx'));
const GuestTicketStatusPage = lazy(() => import('./pages/GuestTicketStatusPage.jsx'));
const TicketsPage = lazy(() => import('./pages/TicketsPage.jsx'));
const TicketDetailPage = lazy(() => import('./pages/TicketDetailPage.jsx'));
const CreateTicketPage = lazy(() => import('./pages/CreateTicketPage.jsx'));
const RoomsPage = lazy(() => import('./pages/RoomsPage.jsx'));
const AssetsPage = lazy(() => import('./pages/AssetsPage.jsx'));
const UsersPage = lazy(() => import('./pages/UsersPage.jsx'));
const CategoriesPage = lazy(() => import('./pages/CategoriesPage.jsx'));
const KnowledgeBasePage = lazy(() => import('./pages/KnowledgeBasePage.jsx'));
const ReportsPage = lazy(() => import('./pages/ReportsPage.jsx'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage.jsx'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage.jsx'));
const PreventiveMaintenancePage = lazy(() => import('./pages/PreventiveMaintenancePage.jsx'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const ImportDataPage = lazy(() => import('./pages/ImportDataPage.jsx'));
const CalendarPage = lazy(() => import('./pages/CalendarPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

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
    <ErrorBoundary>
    <Suspense fallback={<div className="loading-spinner" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/" replace /> : <ForgotPasswordPage />} />
        <Route path="/reset-password" element={user ? <Navigate to="/" replace /> : <ResetPasswordPage />} />
        <Route path="/staff-portal" element={user ? <Navigate to="/" replace /> : <GuestPortalPage />} />
        <Route path="/staff-status" element={user ? <Navigate to="/" replace /> : <GuestTicketStatusPage />} />
        <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="tickets" element={<TicketsPage />} />
          <Route path="tickets/new" element={<CreateTicketPage />} />
          <Route path="tickets/:id" element={<TicketDetailPage />} />
          <Route path="rooms" element={<RoomsPage />} />
          <Route path="assets" element={<ProtectedRoute roles={['admin', 'manager', 'technician']}><AssetsPage /></ProtectedRoute>} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="knowledge-base" element={<KnowledgeBasePage />} />
          <Route path="preventive-maintenance" element={<PreventiveMaintenancePage />} />
          <Route path="reports" element={<ProtectedRoute roles={['admin', 'manager']}><ReportsPage /></ProtectedRoute>} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="users" element={<ProtectedRoute roles={['admin', 'manager']}><UsersPage /></ProtectedRoute>} />
          <Route path="categories" element={<ProtectedRoute roles={['admin', 'manager']}><CategoriesPage /></ProtectedRoute>} />
          <Route path="audit-logs" element={<ProtectedRoute roles={['admin', 'manager']}><AuditLogPage /></ProtectedRoute>} />
          <Route path="import" element={<ProtectedRoute roles={['admin', 'manager']}><ImportDataPage /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute roles={['admin', 'manager']}><SettingsPage /></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}
