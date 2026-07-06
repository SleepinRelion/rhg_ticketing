import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Save, Trash2, Camera, ZoomIn, ZoomOut } from 'lucide-react';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import SearchableSelect from '../ui/SearchableSelect.jsx';

export default function BulkScanModal({ onClose, onComplete, categories, rooms }) {
  const [template, setTemplate] = useState({ name: '', category_id: '', room_id: '' });
  const [scannedAssets, setScannedAssets] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoomParams, setZoomParams] = useState({ min: 1, max: 1, step: 0.1, value: 1 });
  const { success, error } = useToast();

  const templateRef = useRef(template);
  useEffect(() => {
    templateRef.current = template;
  }, [template]);

  useEffect(() => {
    if (!isScanning) return;
    
    // Poll for the video element and check capabilities
    const checkVideo = setInterval(() => {
      const videoEl = document.querySelector('#reader video');
      if (videoEl && videoEl.srcObject) {
        const track = videoEl.srcObject.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities ? track.getCapabilities() : {};
          const settings = track.getSettings ? track.getSettings() : {};
          if (capabilities.zoom) {
            setZoomParams({
              min: capabilities.zoom.min || 1,
              max: capabilities.zoom.max || 10,
              step: capabilities.zoom.step || 0.1,
              value: settings.zoom || 1
            });
            clearInterval(checkVideo);
          }
        }
      }
    }, 1000);
    
    return () => clearInterval(checkVideo);
  }, [isScanning]);

  const handleZoomChange = (e) => {
    const val = parseFloat(e.target.value);
    setZoomParams(prev => ({ ...prev, value: val }));
    const videoEl = document.querySelector('#reader video');
    if (videoEl && videoEl.srcObject) {
      const track = videoEl.srcObject.getVideoTracks()[0];
      if (track && track.applyConstraints) {
        track.applyConstraints({ advanced: [{ zoom: val }] }).catch(err => console.warn('Zoom failed', err));
      }
    }
  };

  useEffect(() => {
    if (!isScanning) return;
    
    let html5QrCode;
    let isComponentMounted = true;
    
    const startScanner = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // allow element to mount
        if (!isComponentMounted) return;
        
        html5QrCode = new Html5Qrcode("reader");
        
        const scanConfig = { fps: 10, qrbox: { width: 250, height: 100 } };
        const onScanSuccess = (decodedText) => {
          if (isComponentMounted) {
            setScannedAssets(prev => {
              if (prev.find(a => a.serial_number === decodedText)) return prev;
              
              const currentTemplate = templateRef.current;
              const newAsset = {
                id: Date.now().toString(),
                name: currentTemplate.name || `Scanned Asset ${prev.length + 1}`,
                asset_tag: `AST-${Math.floor(Math.random() * 10000)}-${decodedText.slice(-4) || 'XXXX'}`,
                category_id: currentTemplate.category_id,
                room_id: currentTemplate.room_id,
                serial_number: decodedText
              };
              return [...prev, newAsset];
            });
            success(`Scanned: ${decodedText}`);
          }
        };
        const onScanError = () => {};

        const getConfig = (constraints) => {
          const config = { 
            fps: 10, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              // 70% of the screen width, max 400px, min 250px
              const width = Math.max(250, Math.min(viewfinderWidth * 0.7, 400));
              const height = 150; 
              return { width, height };
            }
          };
          if (constraints) config.videoConstraints = constraints;
          return config;
        };

        try {
          // Attempt 1: Environment camera, Max resolution, and Zoom (High-end Mobile)
          await html5QrCode.start(
            { facingMode: "environment" },
            getConfig({ width: { ideal: 4096 }, height: { ideal: 2160 }, advanced: [{ zoom: 2.0 }] }),
            onScanSuccess, onScanError
          );
        } catch (err1) {
          console.warn("High-res environment with zoom failed:", err1);
          if (!isComponentMounted) return;
          try {
            // Attempt 2: Environment camera, Max resolution (Standard Mobile)
            await html5QrCode.start(
              { facingMode: "environment" }, 
              getConfig({ width: { ideal: 4096 }, height: { ideal: 2160 } }),
              onScanSuccess, onScanError
            );
          } catch (err2) {
            console.warn("High-res environment failed:", err2);
            if (!isComponentMounted) return;
            try {
              // Attempt 3: Any camera, 1440p (High-end Laptop/Desktop)
              await html5QrCode.start(
                { facingMode: "user" }, 
                getConfig({ width: { ideal: 2560 }, height: { ideal: 1440 } }),
                onScanSuccess, onScanError
              );
            } catch (err3) {
              console.warn("1440p user camera failed:", err3);
              if (!isComponentMounted) return;
              try {
                // Attempt 4: Any camera, 1080p (Standard Laptop/Desktop)
                await html5QrCode.start(
                  { facingMode: "user" }, 
                  getConfig({ width: { ideal: 1920 }, height: { ideal: 1080 } }),
                  onScanSuccess, onScanError
                );
              } catch (err4) {
                console.warn("1080p user camera failed, falling back to basic:", err4);
                if (!isComponentMounted) return;
                // Attempt 5: Basic User/Any camera (Basic Laptop/Desktop)
                await html5QrCode.start({ facingMode: "user" }, getConfig(), onScanSuccess, onScanError);
              }
            }
          }
        }
        
        // If the component unmounted while the camera was starting up, stop it immediately.
        if (!isComponentMounted && html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
        }
      } catch (err) {
        console.error("Failed to start scanner:", err);
        if (isComponentMounted) {
          if (window.isSecureContext === false) {
            error("Camera access blocked: Insecure connection (HTTP).");
          } else {
            error("Camera failed to start. Please ensure you have granted camera permissions.");
          }
          setIsScanning(false);
        }
      }
    };

    startScanner();

    return () => {
      isComponentMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => html5QrCode.clear()).catch(console.error);
      }
    };
  }, [isScanning]); // DO NOT depend on `template` here, or every keystroke restarts the camera!

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
                  <div id="reader" style={{ width: '100%', borderRadius: '8px', background: '#000', overflow: 'hidden' }}></div>
                  
                  {zoomParams.max > zoomParams.min && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', padding: '0 12px' }}>
                      <ZoomOut size={16} color="var(--text-secondary)" />
                      <input 
                        type="range" 
                        min={zoomParams.min} 
                        max={zoomParams.max} 
                        step={zoomParams.step}
                        value={zoomParams.value}
                        onChange={handleZoomChange}
                        style={{ flex: 1, accentColor: 'var(--primary-500)' }}
                      />
                      <ZoomIn size={16} color="var(--text-secondary)" />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', minWidth: '30px', textAlign: 'right' }}>
                        {zoomParams.value.toFixed(1)}x
                      </span>
                    </div>
                  )}

                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '16px', alignSelf: 'center' }} onClick={() => setIsScanning(false)}>
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
                  <div key={asset.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{asset.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SN:</span>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={asset.serial_number || ''} 
                          onChange={(e) => setScannedAssets(prev => prev.map(a => a.id === asset.id ? { ...a, serial_number: e.target.value } : a))}
                          style={{ padding: '4px 8px', fontSize: '12px', height: '28px', flex: 1 }}
                          placeholder="Serial Number"
                        />
                      </div>
                    </div>
                    <button className="btn-icon" onClick={() => handleRemove(asset.id)} style={{ color: 'var(--error)', flexShrink: 0 }}><Trash2 size={16} /></button>
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
