import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ticket, Send, CheckCircle2, Building, Building2, User, Briefcase, MapPin, Tag, Search } from 'lucide-react';
import api from '../api/client.js';
import SearchableSelect from '../components/ui/SearchableSelect.jsx';

export default function GuestPortalPage() {
  const [searchParams] = useSearchParams();
  const initialHotel = searchParams.get('hotel') || '';
  const initialRoom = searchParams.get('room') || '';

  const [hotels, setHotels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  const [formData, setFormData] = useState({
    hotel_id: initialHotel,
    guest_name: '',
    guest_position: '',
    department: '',
    title: '',
    description: '',
    category_id: '',
    room_id: initialRoom
  });
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHotelsAndCategories();
  }, []);

  useEffect(() => {
    if (formData.hotel_id) {
      fetchRooms(formData.hotel_id);
    } else {
      setRooms([]);
    }
  }, [formData.hotel_id]);

  async function fetchHotelsAndCategories() {
    try {
      const [hRes, cRes, dRes] = await Promise.all([
        api('/hotels/public'),
        api('/categories/public?ticket_type=issue'),
        api('/departments').catch(() => ({ departments: [] }))
      ]);
      setHotels(hRes.hotels || []);
      setCategories(cRes.categories || []);
      setDepartments(dRes.departments || []);
      
      if (hRes.hotels?.length === 1 && !initialHotel) {
        setFormData(prev => ({ ...prev, hotel_id: hRes.hotels[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchRooms(hotelId) {
    try {
      const res = await api(`/rooms/public/${hotelId}`);
      setRooms(res.rooms || []);
    } catch (err) {
      console.error(err);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const res = await api('/tickets/guest', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      
      setTicketNumber(res.ticket_number);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <CheckCircle2 size={64} className="text-success mx-auto" style={{ marginBottom: '1.5rem', color: 'var(--success)' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Ticket Submitted!</h2>
          <p className="text-secondary" style={{ marginBottom: '2rem' }}>
            Your request has been sent to our team.
          </p>
          <div style={{ backgroundColor: 'var(--bg-hover)', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <div className="text-secondary" style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Your Ticket Number</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-500)', letterSpacing: '2px' }}>{ticketNumber}</div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => {
            setSubmitted(false);
            setFormData(prev => ({...prev, title: '', description: '', room_id: '', category_id: ''}));
          }}>
            Submit Another Ticket
          </button>
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/login" className="text-secondary" style={{ textDecoration: 'none' }}>Return to Login</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container" style={{ padding: '2rem 1rem' }}>
      <div className="login-card" style={{ maxWidth: '600px', width: '100%' }}>
        <div className="login-header">
          <div className="login-logo">
            <img src={window.APP_LOGO_URL || "/logo.png"} alt="App Logo" className="app-logo-img" style={{ height: '60px', objectFit: 'contain' }} />
          </div>
          <h1 className="login-title">Staff Support Portal</h1>
          <p className="login-subtitle">Submit an issue directly to our team</p>
          <div style={{ marginTop: '1rem' }}>
            <Link to="/staff-status" className="btn btn-outline" style={{ display: 'inline-flex', padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
              <Search size={16} style={{ marginRight: '0.5rem' }} /> Track Existing Ticket
            </Link>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Hotel Location <span className="text-error">*</span></label>
            <div className="input-group">
              <span className="input-icon"><Building2 size={18} /></span>
              <SearchableSelect 
                className="form-input" 
                value={formData.hotel_id} 
                onChange={e => setFormData({...formData, hotel_id: e.target.value})}
                required
              >
                <option value="">Select Hotel</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </SearchableSelect>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }} className="guest-portal-grid">
            <div className="form-group">
              <label className="form-label">Your Name <span className="text-error">*</span></label>
              <div className="input-group">
                <span className="input-icon"><User size={18} /></span>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.guest_name} 
                  onChange={e => setFormData({...formData, guest_name: e.target.value})}
                  placeholder="John Doe"
                  required 
                />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Position / Title <span className="text-error">*</span></label>
              <div className="input-group">
                <span className="input-icon"><Briefcase size={18} /></span>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.guest_position} 
                  onChange={e => setFormData({...formData, guest_position: e.target.value})}
                  placeholder="e.g. Event Coordinator"
                  required 
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }} className="guest-portal-grid">
            <div className="form-group">
              <label className="form-label">Department <span className="text-error">*</span></label>
              <div className="input-group">
                <span className="input-icon"><Building size={18} /></span>
                <SearchableSelect 
                  className="form-input" 
                  value={formData.department} 
                  onChange={e => setFormData({...formData, department: e.target.value})}
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </SearchableSelect>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Room / Area</label>
              <div className="input-group">
                <span className="input-icon"><MapPin size={18} /></span>
                <SearchableSelect 
                  className="form-input" 
                  value={formData.room_id} 
                  onChange={e => setFormData({...formData, room_id: e.target.value})}
                  disabled={!formData.hotel_id}
                >
                  <option value="">Select Location</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>{r.room_number} {r.room_type ? `(${r.room_type})` : ''}</option>)}
                </SearchableSelect>
              </div>
            </div>
          </div>

          {/* Honeypot field - Bots will fill this, humans won't see it */}
          <div style={{ display: 'none' }} aria-hidden="true">
            <label>Phone Extension</label>
            <input 
              type="text" 
              name="_phone_ext"
              value={formData._phone_ext || ''}
              onChange={(e) => setFormData({...formData, _phone_ext: e.target.value})}
              tabIndex="-1" 
              autoComplete="off" 
            />
          </div>

          <hr style={{ margin: '1.5rem 0', borderColor: 'var(--border-color)', opacity: 0.5 }} />

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Issue Category</label>
            <div className="input-group">
              <span className="input-icon"><Tag size={18} /></span>
              <SearchableSelect 
                className="form-input" 
                value={formData.category_id} 
                onChange={e => setFormData({...formData, category_id: e.target.value})}
              >
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </SearchableSelect>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">Issue Summary <span className="text-error">*</span></label>
            <input 
              type="text" 
              className="form-input" 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="Briefly describe the problem"
              required 
            />
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label">Details</label>
            <textarea 
              className="form-input" 
              value={formData.description} 
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Provide any additional details that might help us resolve the issue..."
              rows={4}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? <div className="spinner" style={{ width: '20px', height: '20px' }}></div> : <><Send size={18} /> Submit Ticket</>}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/login" className="text-secondary" style={{ textDecoration: 'none', fontSize: '0.875rem' }}>Staff Login</Link>
        </div>
      </div>
    </div>
  );
}
