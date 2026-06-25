import { useState, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { X, Save, Trash2, Camera } from 'lucide-react';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';

export default function BulkScanModal({ onClose, onComplete, categories, rooms }) {
  const [template, setTemplate] = useState({ name: '', category_id: '', room_id: '' });
  const [scannedAssets, setScannedAssets] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (!isScanning) return;
    
    const codeReader = new BrowserMultiFormatReader();
    let isComponentMounted = true;
    
    const startScanner = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // allow video element to mount
        
        const videoInputDevices = await codeReader.listVideoInputDevices();
        if (!videoInputDevices || videoInputDevices.length === 0) {
          throw new Error("No cameras found.");
        }
        
        // Try to find a back camera, otherwise use the first available (usually webcam)
        const backCamera = videoInputDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        const cameraId = backCamera ? backCamera.deviceId : videoInputDevices[0].deviceId;
        
        if (isComponentMounted) {
          codeReader.decodeFromVideoDevice(cameraId, 'reader', (result, err) => {
            if (result) {
              const decodedText = result.getText();
              setScannedAssets(prev => {
                if (prev.find(a => a.serial_number === decodedText)) {
                  return prev;
                }
                
                const newAsset = {
                  id: Date.now().toString(),
                  name: template.name || `Scanned Asset ${prev.length + 1}`,
                  asset_tag: `AST-${Math.floor(Math.random() * 10000)}-${decodedText.slice(-4) || 'XXXX'}`,
                  category_id: template.category_id,
                  room_id: template.room_id,
                  serial_number: decodedText
                };
                return [...prev, newAsset];
              });
              
              success(`Scanned: ${decodedText}`);
            }
          });
        }
      } catch (err) {
        console.error("Failed to start scanner:", err);
        if (window.isSecureContext === false) {
          error("Camera access blocked: Insecure connection (HTTP). Please connect via HTTPS or use localhost.");
        } else {
          error("Camera failed to start. Please ensure you have granted camera permissions.");
        }
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      isComponentMounted = false;
      codeReader.reset();
    };
  }, [isScanning, template]);

  const handleRemove = (id) => {
    setScannedAssets(prev => prev.filter(a => a.id !== id));
  };

  const handleSave = async () => {
    if (scannedAssets.length === 0) return;
    setSaving(true);
    
    try {
      await api('/assets/bulk', {
        method: 'POST',
        body: JSON.stringify({ assets: scannedAssets })
      });
      
      success(`Successfully added ${scannedAssets.length} assets`);
      onComplete();
    } catch (err) {
      error('Failed to save bulk assets');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', height: '90vh' }}>
        <div className="modal-header">
          <h2>Bulk Scan Assets</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div className="modal-body" style={{ display: 'flex', gap: '24px', overflow: 'hidden', flex: 1 }}>
          
          {/* Left Column: Template & Scanner */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <div className="card" style={{ padding: '16px', margin: 0 }}>
              <h3 className="detail-section-title" style={{ marginTop: 0 }}>Template Settings</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                These values will be automatically applied to every barcode you scan.
              </p>
              <div className="form-group">
                <label className="form-label">Asset Name</label>
                <input 
                  type="text" className="form-input" 
                  value={template.name} onChange={e => setTemplate({...template, name: e.target.value})} 
                  placeholder="e.g. Samsung 55' TV"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <SearchableSelect 
                  className="form-select" 
                  value={template.category_id} onChange={e => setTemplate({...template, category_id: e.target.value})}
                >
                  <option value="">Select...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SearchableSelect>
              </div>
              <div className="form-group">
                <label className="form-label">Default Room (Optional)</label>
                <SearchableSelect 
                  className="form-select" 
                  value={template.room_id} onChange={e => setTemplate({...template, room_id: e.target.value})}
                >
                  <option value="">None</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>Room {r.room_number}</option>)}
                </SearchableSelect>
              </div>
            </div>

            <div className="card" style={{ padding: '16px', margin: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h3 className="detail-section-title" style={{ marginTop: 0 }}>Scanner</h3>
              
              {!isScanning ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={() => setIsScanning(true)}>
                    <Camera size={16} /> Start Camera
                  </button>
                </div>
              ) : (
                <>
                  <video id="reader" style={{ width: '100%', borderRadius: '8px', background: '#000' }}></video>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px', alignSelf: 'center' }} onClick={() => setIsScanning(false)}>
                    Stop Camera
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Right Column: Scanned List */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-color)', paddingLeft: '24px' }}>
            <h3 className="detail-section-title" style={{ marginTop: 0 }}>
              Scanned List ({scannedAssets.length})
            </h3>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {scannedAssets.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px', flex: 1, justifyContent: 'center' }}>
                  <p>No barcodes scanned yet.</p>
                </div>
              ) : (
                scannedAssets.map(asset => (
                  <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>{asset.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SN: {asset.serial_number}</div>
                    </div>
                    <button className="btn-icon" onClick={() => handleRemove(asset.id)} style={{ color: 'var(--error)' }}><Trash2 size={16} /></button>
                  </div>
                ))
              )}
            </div>
            
            <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || scannedAssets.length === 0}>
                <Save size={16} /> {saving ? 'Saving...' : `Save ${scannedAssets.length} Assets`}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
