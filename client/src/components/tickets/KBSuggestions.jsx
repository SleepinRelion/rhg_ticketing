import { useState, useEffect } from 'react';
import api from '../../api/client.js';
import { Lightbulb, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function KBSuggestions({ query, categoryId, discrete = true }) {
  const [suggestions, setSuggestions] = useState([]);
  const [ticketSuggestions, setTicketSuggestions] = useState([]);
  const [expanded, setExpanded] = useState(!discrete);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      setTicketSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query) params.append('title', query);
        if (categoryId) params.append('category_id', categoryId);

        const res = await api(`/knowledge-base/suggestions?${params.toString()}`);
        setSuggestions(res.suggestions || []);
        setTicketSuggestions(res.ticketSuggestions || []);
      } catch (err) {
        console.error('Failed to fetch KB suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 500); // debounce
    return () => clearTimeout(timer);
  }, [query, categoryId]);

  const totalCount = suggestions.length + ticketSuggestions.length;
  if (totalCount === 0 && !loading) return null;

  if (discrete && !expanded) {
    return (
      <div 
        onClick={() => setExpanded(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px', 
          background: 'var(--primary-50)', color: 'var(--primary-600)',
          padding: '6px 12px', borderRadius: 'var(--radius-full)',
          cursor: 'pointer', fontSize: 'var(--font-sm)', fontWeight: 500,
          border: '1px solid var(--primary-100)',
          marginTop: '8px'
        }}
      >
        <Lightbulb size={16} /> 
        {loading ? 'Thinking...' : `${totalCount} possible solution${totalCount > 1 ? 's' : ''} found`}
      </div>
    );
  }

  return (
    <div style={{
      marginTop: '12px', border: '1px solid var(--border-color)', 
      borderRadius: 'var(--radius-md)', overflow: 'hidden',
      background: 'var(--bg-elevated)'
    }}>
      <div 
        onClick={() => discrete && setExpanded(false)}
        style={{
          background: 'var(--primary-50)', padding: '10px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: discrete ? 'pointer' : 'default', borderBottom: '1px solid var(--primary-100)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary-700)', fontWeight: 600, fontSize: 'var(--font-sm)' }}>
          <Lightbulb size={16} /> Knowledge Base Suggestions
        </div>
        {discrete && <ChevronUp size={16} color="var(--primary-600)" />}
      </div>
      
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
        {loading ? (
          <div style={{ fontSize: 'var(--font-sm)', color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <>
            {suggestions.length > 0 && (
              <div style={{ marginBottom: ticketSuggestions.length > 0 ? '12px' : '0' }}>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>Official Articles</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {suggestions.map(s => (
                    <Link 
                      key={s.id} 
                      to={`/knowledge-base?article=${s.id}`} 
                      target="_blank"
                      style={{
                        display: 'block', padding: '10px', 
                        border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)',
                        textDecoration: 'none', color: 'inherit',
                        transition: 'border-color 0.2s, background 0.2s'
                      }}
                      className="hover-bg-muted"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ color: 'var(--primary-600)', fontSize: 'var(--font-sm)' }}>{s.title}</strong>
                        <ExternalLink size={14} color="var(--text-muted)" />
                      </div>
                      {s.symptoms && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {s.symptoms.replace(/<[^>]*>?/gm, '')}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {ticketSuggestions.length > 0 && (
              <div>
                <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>Solutions from Past Tickets</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ticketSuggestions.map(t => (
                    <Link 
                      key={t.id} 
                      to={`/tickets/${t.id}`} 
                      target="_blank"
                      style={{
                        display: 'block', padding: '10px', 
                        border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-sm)',
                        textDecoration: 'none', color: 'inherit',
                        transition: 'border-color 0.2s, background 0.2s',
                        background: 'var(--bg-color)'
                      }}
                      className="hover-bg-muted"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <strong style={{ color: 'var(--primary-600)', fontSize: 'var(--font-sm)' }}>{t.title}</strong>
                        <ExternalLink size={14} color="var(--text-muted)" />
                      </div>
                      {t.resolution && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          <span style={{ fontWeight: 600, color: 'var(--success-color)' }}>Resolution: </span>
                          {t.resolution.replace(/<[^>]*>?/gm, '')}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
