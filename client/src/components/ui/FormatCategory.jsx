import React from 'react';

export default function FormatCategory({ name }) {
  if (typeof name !== 'string') return <>{name}</>;
  
  // Match any brackets and extract them as a subtitle
  const match = name.match(/^(.*?)\s*\((.*?)\)(.*)$/);
  
  if (match) {
    const mainText = (match[1] + (match[3] || '')).trim();
    const subText = match[2].trim();
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', lineHeight: '1.2' }}>
        <span style={{ fontWeight: 500 }}>{mainText}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{subText}</span>
      </div>
    );
  }
  
  return <span style={{ fontWeight: 500 }}>{name}</span>;
}
