import React from 'react';

export default function FormatCategory({ name }) {
  if (typeof name !== 'string') return <>{name}</>;
  
  const match = name.match(/^(.*?)\s*\((.*?)\)$/);
  if (match) {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', verticalAlign: 'middle', lineHeight: '1.2' }}>
        <span style={{ fontWeight: 500 }}>{match[1].trim()}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{match[2].trim()}</span>
      </div>
    );
  }
  
  return <span>{name}</span>;
}
