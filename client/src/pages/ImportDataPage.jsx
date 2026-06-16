import { useState } from 'react';
import { UploadCloud, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';

export default function ImportDataPage() {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState(null);
  const { success, error } = useToast();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls'));
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
    } else {
      error('Please drop valid Excel (.xlsx, .xls) files only.');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    setUploading(true);
    setResults(null);
    
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const data = await api('/import/legacy-excel', {
        method: 'POST',
        body: formData
      });

      setResults(data);
      success('Import completed!');
      setFiles([]);
    } catch (err) {
      error(err.message || 'Failed to import files.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Import Legacy Data</h1>
          <p className="page-subtitle">Upload Daily Intervention Reports (Excel) to migrate legacy tickets into the system.</p>
        </div>
      </div>

      <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div 
          className={`dropzone ${isDragging ? 'dragging' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: '8px',
            padding: '3rem 2rem',
            textAlign: 'center',
            backgroundColor: isDragging ? 'var(--bg-hover)' : 'var(--bg-surface)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => document.getElementById('fileUpload').click()}
        >
          <input 
            type="file" 
            id="fileUpload" 
            multiple 
            accept=".xlsx, .xls"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <UploadCloud size={48} color="var(--primary-500)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Click or drag Excel files to this area to upload</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Support for a single or bulk upload. Only .xlsx and .xls formats.</p>
        </div>

        {files.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h4 style={{ marginBottom: '1rem' }}>Selected Files ({files.length})</h4>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {files.map((file, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <File size={20} color="var(--primary-500)" />
                    <span style={{ fontSize: '0.9rem' }}>{file.name}</span>
                  </div>
                  <button className="btn-icon" onClick={() => removeFile(index)}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleUpload} 
                disabled={uploading}
              >
                {uploading ? (
                  <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', marginRight: '8px' }} /> Processing...</>
                ) : (
                  'Start Import'
                )}
              </button>
            </div>
          </div>
        )}

        {results && (
          <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--success)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--success)' }}>
              <CheckCircle size={24} />
              <h3 style={{ margin: 0, color: 'inherit' }}>Import Summary</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-600)' }}>{results.createdTickets}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Tickets Created</div>
              </div>
              <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary-600)' }}>{results.createdUsers}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Agents Auto-created</div>
              </div>
            </div>

            {results.errors && results.errors.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--error)' }}>
                  <AlertCircle size={16} />
                  <h4 style={{ margin: 0, color: 'inherit' }}>Warnings/Errors ({results.errors.length})</h4>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--error)', fontSize: '0.9rem' }}>
                  {results.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
