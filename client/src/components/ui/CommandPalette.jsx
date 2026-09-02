import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Ticket, User, DoorOpen } from 'lucide-react';
import { useApi } from '../../hooks/useApi.js';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const navigate = useNavigate();
  const inputRef = useRef(null);
  
  const { data, loading, execute } = useApi(null, { immediate: false });
  const results = data?.results || [];

  // Toggle palette with Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) return;
    
    const timeoutId = setTimeout(() => {
      execute(`/search?q=${encodeURIComponent(query)}`);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [query, execute]);

  // Keyboard navigation within results
  useEffect(() => {
    if (!isOpen || results.length === 0) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const selected = results[selectedIndex];
        if (selected) {
          navigate(selected.url);
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, navigate]);

  if (!isOpen) return null;

  const getIcon = (type) => {
    if (type === 'ticket') return <Ticket size={16} />;
    if (type === 'user') return <User size={16} />;
    if (type === 'room') return <DoorOpen size={16} />;
    return <Search size={16} />;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
      paddingTop: '10vh', zIndex: 9999
    }}>
      <div 
        style={{
          width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
          overflow: 'hidden', border: '1px solid var(--border-color)', margin: '0 16px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <Search size={20} style={{ color: 'var(--text-secondary)', marginRight: '12px' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            placeholder="Search tickets, rooms, or users..."
            style={{
              width: '100%', border: 'none', background: 'transparent', outline: 'none',
              fontSize: '18px', color: 'var(--text-primary)'
            }}
          />
          <button className="btn-icon" onClick={() => setIsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {query.length > 0 && query.length < 2 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Type at least 2 characters to search...
            </div>
          )}
          {loading && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Searching...
            </div>
          )}
          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No results found for "{query}"
            </div>
          )}
          
          {!loading && results.map((result, index) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => { navigate(result.url); setIsOpen(false); }}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                cursor: 'pointer', backgroundColor: selectedIndex === index ? 'var(--bg-hover)' : 'transparent',
                borderLeft: selectedIndex === index ? '3px solid var(--primary-500)' : '3px solid transparent'
              }}
            >
              <div style={{ 
                width: 32, height: 32, borderRadius: 8, backgroundColor: 'var(--bg-elevated)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'
              }}>
                {getIcon(result.type)}
              </div>
              <div>
                <div style={{ fontWeight: 500, fontSize: '15px' }}>{result.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{result.subtitle}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
          <span><kbd style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-color)' }}>↑↓</kbd> to navigate</span>
          <span><kbd style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-color)' }}>↵</kbd> to select</span>
          <span><kbd style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4, border: '1px solid var(--border-color)' }}>esc</kbd> to close</span>
        </div>
      </div>
      <div 
        style={{ position: 'absolute', inset: 0, zIndex: -1 }} 
        onClick={() => setIsOpen(false)}
      />
    </div>
  );
}
