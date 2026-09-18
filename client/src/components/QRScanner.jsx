import { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function QRScanner({ onClose }) {
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let html5QrCode;
    let isComponentMounted = true;
    
    const startScanner = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 100)); // allow element to mount
        if (!isComponentMounted) return;
        
        html5QrCode = new Html5Qrcode("main-qr-reader");
        
        const onScanSuccess = (decodedText) => {
          if (isComponentMounted) {
            // Assume the decoded text is the Asset ID
            if (decodedText) {
              navigate(`/assets?scan=${encodeURIComponent(decodedText)}`);
              onClose();
            }
          }
        };

        const getConfig = (constraints) => ({
          fps: 10,
          qrbox: (viewfinderWidth) => {
            const width = Math.max(250, Math.min(viewfinderWidth * 0.7, 400));
            return { width, height: width };
          },
          videoConstraints: constraints
        });

        try {
          await html5QrCode.start({ facingMode: "environment" }, getConfig(), onScanSuccess, () => {});
        } catch (err) {
          try {
            await html5QrCode.start({ facingMode: "user" }, getConfig(), onScanSuccess, () => {});
          } catch (err2) {
            setError('Could not access camera. Please check permissions.');
          }
        }
      } catch (err) {
        setError('Error initializing scanner');
      }
    };

    startScanner();

    return () => {
      isComponentMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [navigate, onClose]);

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><QrCode size={20} /> Scan Asset</h2>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body" style={{ padding: '0' }}>
          {error ? (
            <div style={{ padding: '24px', color: 'var(--error)', textAlign: 'center' }}>{error}</div>
          ) : (
            <div id="main-qr-reader" style={{ width: '100%', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}></div>
          )}
        </div>
      </div>
    </div>
  );
}
