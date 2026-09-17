import { useState, useEffect } from 'react';
import api from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { Image } from 'lucide-react';

export default function HotelsSettings() {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(null);
  const { success, error } = useToast();

  useEffect(() => {
    fetchHotels();
  }, []);

  async function fetchHotels() {
    try {
      const data = await api('/hotels');
      setHotels(data.hotels || []);
    } catch (err) {
      error('Failed to load hotels.');
    } finally {
      setLoading(false);
    }
  }

  async function handleWallpaperUpload(hotelId, file) {
    if (!file) return;
    setUploading(hotelId);
    
    const formData = new FormData();
    formData.append('wallpaper', file);
    
    try {
      const token = localStorage.getItem('token');
      const activeHotelId = localStorage.getItem('activeHotelId');
      
      const response = await fetch(`/api/hotels/${hotelId}/wallpaper`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-hotel-id': activeHotelId
        },
        body: formData
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Upload failed');
      }
      
      const { hotel } = await response.json();
      setHotels(hotels.map(h => h.id === hotel.id ? hotel : h));
      success('Wallpaper uploaded successfully');
    } catch (err) {
      error(err.message || 'Failed to upload wallpaper');
    } finally {
      setUploading(null);
    }
  }

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}><div className="spinner"></div></div>;
  }

  return (
    <div className="card" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Hotels Management</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
          Manage hotel-specific settings like login wallpapers.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {hotels.map(hotel => (
          <div key={hotel.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 500 }}>{hotel.name}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {hotel.wallpaper_url ? 'Custom wallpaper uploaded' : 'Default wallpaper'}
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {hotel.wallpaper_url && (
                <img 
                  src={hotel.wallpaper_url} 
                  alt="Wallpaper Thumbnail" 
                  style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                />
              )}
              
              <label className="btn btn-secondary" style={{ cursor: 'pointer', margin: 0, opacity: uploading === hotel.id ? 0.7 : 1 }}>
                <Image size={16} /> {uploading === hotel.id ? 'Uploading...' : 'Upload Wallpaper'}
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                  disabled={uploading === hotel.id}
                  onChange={e => handleWallpaperUpload(hotel.id, e.target.files[0])}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
