export default function NotFoundPage() {
  return (
    <div className="empty-state" style={{ marginTop: '10vh' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 64, height: 64, opacity: 0.3, marginBottom: 16 }}>
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
        <circle cx="12" cy="12" r="10" />
      </svg>
      <h3>Page Not Found</h3>
      <p style={{ color: 'var(--text-secondary)' }}>The page you are looking for does not exist.</p>
    </div>
  );
}
